// Verificações antes de publicar (016 contracts/release.md). Uso: pnpm check-release
// (a tag vem de RELEASE_TAG, ex.: v1.0.0, ou de GITHUB_REF_NAME em execução por tag; sem ela, a
// conferência da tag é pulada).
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseNotes } from "@brasfoot-like/i18n";
import { readModPackage } from "@brasfoot-like/modkit";
import { REPO_ROOT } from "./fs-bank";

export const MIN_SCREENSHOTS = 4;
const REQUIRED = [
  "index.html",
  "sw.js",
  "precache.json",
  "manifest.webmanifest",
  "vercel.json",
  "version.json",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Texto visível e metadados de um HTML: sem `<script>` e `<style>` (código interno do jogo). */
function visibleHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

export interface ReleaseInput {
  /** `package.json` da raiz. */
  version: string;
  /** Tag da publicação (`v1.0.0`), se houver. */
  tag?: string | undefined;
  /** Versões com notas. */
  notes: readonly string[];
  /** Pasta do build estático. */
  outDir: string;
}

/** Lista de problemas; vazia = pode publicar. */
export function checkRelease({ version, tag, notes, outDir }: ReleaseInput): string[] {
  const problems: string[] = [];
  if (tag !== undefined && tag.replace(/^v/, "") !== version) {
    problems.push(`a tag ${tag} não corresponde à versão ${version} do package.json`);
  }
  if (!notes.includes(version)) problems.push(`faltam as notas da versão ${version}`);
  if (!existsSync(outDir)) return [...problems, `build não encontrado em ${outDir}`];
  for (const file of REQUIRED) {
    if (!existsSync(join(outDir, file))) problems.push(`falta ${file} no build`);
  }
  // Mods mundo reduzido, médio e completo para download (024 R12): gerados no build, precisam
  // existir e passar na validação.
  for (const size of ["reduzido", "medio", "completo"]) {
    const zip = join(outDir, "mods", `mundo-${size}.zip`);
    if (!existsSync(zip)) {
      problems.push(`falta mods/mundo-${size}.zip no build`);
      continue;
    }
    const read = readModPackage(new Uint8Array(readFileSync(zip)));
    if (!read.ok) {
      problems.push(`mods/mundo-${size}.zip não passa na validação (${read.errors.length} erros)`);
    }
  }
  // Fonte do badge de versão do README (lido pelo shields.io no site publicado).
  const versionFile = join(outDir, "version.json");
  if (existsSync(versionFile)) {
    const published = (JSON.parse(readFileSync(versionFile, "utf8")) as { version?: string })
      .version;
    if (published !== version) {
      problems.push(`version.json diz ${published}, mas a versão é ${version}`);
    }
  }
  const shots = existsSync(join(outDir, "screenshots"))
    ? readdirSync(join(outDir, "screenshots")).filter((name) => /\.(webp|png)$/.test(name))
    : [];
  if (shots.length < MIN_SCREENSHOTS) {
    problems.push(`são necessárias ${MIN_SCREENSHOTS} capturas de tela; há ${shots.length}`);
  }
  for (const path of walk(outDir).filter((file) => /\.(html|webmanifest)$/.test(file))) {
    const content = readFileSync(path, "utf8");
    const visible = path.endsWith(".html") ? visibleHtml(content) : content;
    if (/brasfoot/i.test(visible)) {
      problems.push(`"brasfoot" visível em ${path.slice(outDir.length + 1)}`);
    }
  }
  return problems;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const { version } = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    version: string;
  };
  const problems = checkRelease({
    version,
    // O runner não deixa sobrescrever GITHUB_REF_NAME; o workflow da `main` informa RELEASE_TAG.
    tag:
      process.env.RELEASE_TAG ||
      (process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : undefined) ||
      undefined,
    notes: releaseNotes("pt-BR").map((note) => note.version),
    outDir: join(REPO_ROOT, "apps", "web", "out"),
  });
  for (const problem of problems) console.error(`✗ ${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log(`✓ versão ${version} pronta para publicar`);
}
