// Gera o mod mundo completo (024): as seis confederações do futebol com os principais países de cada
// uma, clubes, competições e jogadores fictícios, em lugares reais. Determinístico pela seed; valida o
// pacote lendo-o de volta e só termina com sucesso se ele passar.
// Uso: pnpm gen:football-world [--profile reduzido|medio|completo|<arquivo.json>] [--seed <texto>]
//        [--out <pasta>] [--folder] [--name <texto>] [--clubs-csv <arq>] [--players-csv <arq>]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  generateFootballWorld,
  type ModPackage,
  ProfileError,
  profileOfSize,
  type ValidationIssue,
  validateProfile,
  WORLD_SIZES,
  type WorldProfile,
  type WorldSize,
} from "@brasfoot-like/engine";
import { formatIssue, type Locale } from "@brasfoot-like/i18n";
import { applyCsv, readModPackage, writeModPackage } from "@brasfoot-like/modkit";
import { resolveUserPath, writeBankDir } from "./fs-bank";

const LOCALE: Locale = "pt-BR";

export const DEFAULT_SEED = "mundo-completo-1";

export interface GenOptions {
  profile: string;
  seed: string;
  /** Texto dos CSV, já lido (a leitura do arquivo é da CLI). */
  clubsCsv?: string;
  playersCsv?: string;
  name?: string;
  /** Lê um arquivo de perfil (só quando `profile` não é `padrao` nem `compacto`). */
  readProfile?: (path: string) => string;
}

export interface GenResult {
  /** 0 = ok; 1 = pacote inválido; 2 = perfil inválido; 3 = CSV inválido. */
  exitCode: number;
  lines: string[];
  zip?: Uint8Array;
  bank?: ModPackage;
  hash?: string;
}

function issueLines(issues: readonly ValidationIssue[]): string[] {
  return issues.slice(0, 20).map((issue) => `  ${issue.code} — ${formatIssue(issue, LOCALE)}`);
}

/** Nomes antigos dos perfis (`padrao`, `compacto`) continuam valendo como apelidos. */
const ALIASES: Record<string, WorldSize> = { padrao: "completo", compacto: "reduzido" };

function profileOf(options: GenOptions): WorldProfile | string {
  const alias = ALIASES[options.profile] ?? options.profile;
  if ((WORLD_SIZES as readonly string[]).includes(alias)) return profileOfSize(alias as WorldSize);
  try {
    const text = (options.readProfile ?? ((path) => readFileSync(path, "utf8")))(options.profile);
    return JSON.parse(text) as WorldProfile;
  } catch (error) {
    return `não consegui ler o perfil "${options.profile}": ${(error as Error).message}`;
  }
}

/** Gera, aplica as planilhas, empacota e valida. Não grava nada: devolve o pacote. */
export function runGenFootballWorld(options: GenOptions): GenResult {
  const loaded = profileOf(options);
  if (typeof loaded === "string") return { exitCode: 2, lines: [loaded] };
  const profile: WorldProfile = options.name
    ? { ...loaded, manifest: { ...loaded.manifest, name: options.name } }
    : loaded;
  const problems = validateProfile(profile);
  if (problems.length > 0) {
    return {
      exitCode: 2,
      lines: [
        "Perfil inválido:",
        ...problems.map((p) => `  ${p.code} ${p.path} ${JSON.stringify(p.params)}`),
      ],
    };
  }
  let bank: ModPackage;
  try {
    bank = generateFootballWorld(profile, options.seed);
  } catch (error) {
    if (error instanceof ProfileError) return { exitCode: 2, lines: [error.message] };
    throw error;
  }
  if (options.clubsCsv !== undefined || options.playersCsv !== undefined) {
    const applied = applyCsv(bank, {
      ...(options.clubsCsv !== undefined ? { clubs: options.clubsCsv } : {}),
      ...(options.playersCsv !== undefined ? { players: options.playersCsv } : {}),
    });
    if (!applied.ok) {
      return { exitCode: 3, lines: ["Planilha inválida:", ...issueLines(applied.errors)] };
    }
    bank = applied.bank;
  }
  const zip = writeModPackage(bank);
  const read = readModPackage(zip);
  if (!read.ok) {
    return {
      exitCode: 1,
      lines: ["O pacote gerado não passou na validação:", ...issueLines(read.errors)],
    };
  }
  const hash = createHash("sha256").update(zip).digest("hex");
  const confederations = profile.confederations.length;
  const lines = [
    `Mundo "${profile.manifest.name}" (perfil ${profile.id}, seed "${options.seed}")`,
    `  ${confederations} confederações, ${bank.countries.length} países, ${bank.competitions.length} competições`,
    `  ${bank.clubs.length} clubes, ${bank.players.length} jogadores`,
    `  pacote: ${(zip.length / (1024 * 1024)).toFixed(2)} MB, sha256 ${hash.slice(0, 16)}`,
  ];
  return { exitCode: 0, lines, zip, bank, hash };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const { values } = parseArgs({
    options: {
      profile: { type: "string", default: "completo" },
      seed: { type: "string", default: DEFAULT_SEED },
      out: { type: "string", default: "dist/mundo-completo" },
      folder: { type: "boolean", default: false },
      name: { type: "string" },
      "clubs-csv": { type: "string" },
      "players-csv": { type: "string" },
    },
  });
  const read = (path: string) => readFileSync(resolveUserPath(path), "utf8");
  const result = runGenFootballWorld({
    profile:
      values.profile &&
      (ALIASES[values.profile] || (WORLD_SIZES as readonly string[]).includes(values.profile))
        ? values.profile
        : resolveUserPath(values.profile ?? "completo"),
    seed: values.seed ?? DEFAULT_SEED,
    ...(values.name ? { name: values.name } : {}),
    ...(values["clubs-csv"] ? { clubsCsv: read(values["clubs-csv"]) } : {}),
    ...(values["players-csv"] ? { playersCsv: read(values["players-csv"]) } : {}),
  });
  for (const line of result.lines) console.log(line);
  if (result.exitCode === 0 && result.zip && result.bank) {
    const out = resolveUserPath(values.out ?? "dist/mundo-completo");
    mkdirSync(out, { recursive: true });
    const file = join(out, "mundo-completo.zip");
    writeFileSync(file, result.zip);
    console.log(`  gravado em ${file}`);
    if (values.folder) {
      writeBankDir(join(out, "mod"), result.bank);
      console.log(`  pasta do mod em ${join(out, "mod")}`);
    }
  }
  process.exit(result.exitCode);
}
