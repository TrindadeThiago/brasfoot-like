import type {
  Competition,
  GroupsStage,
  KnockoutPhase,
  ModPackage,
  ValidatedBank,
} from "../model/types";
import { validateBank } from "../validation/validate";
import { type GenerateOptions, generateDefaultBank } from "./generate";

/**
 * Banco de exemplo das fases (019): a liga nacional do banco padrão, mas com a divisão de baixo
 * disputada em 4 grupos de 5 clubes, concentrados por região, e um mata-mata de 8 clubes (quartas,
 * semifinal e final) entre os 2 primeiros de cada grupo. Os 2 finalistas sobem e os 2 piores da
 * classificação geral dos grupos caem (e a divisão de cima rebaixa 2). Serve ao mod de exemplo com
 * fases, aos testes do motor e da interface. O banco padrão do jogo não usa nada disto.
 */

export interface StagesBankOptions {
  seed?: string | number;
  names?: GenerateOptions["names"];
  manifest?: GenerateOptions["manifest"];
  /** Mantém só os `topClubs` primeiros da divisão de cima (padrão: todos os 20). */
  topClubs?: number;
}

const REGIONS = ["Norte", "Sul", "Leste", "Oeste"];
/** Clubes por região na divisão de baixo (soma 20): a primeira ocupa dois grupos. */
export const STAGES_REGION_SIZES = [7, 5, 4, 4];

const POINTS = { win: 3, draw: 1, loss: 0 };
const TIEBREAKERS: GroupsStage["tiebreakers"] = [
  "wins",
  "goal-difference",
  "goals-for",
  "head-to-head",
  "draw-lots",
];

function phase(name: string, extra: Partial<KnockoutPhase> = {}): KnockoutPhase {
  return {
    name,
    legs: 1,
    tiebreakers: ["extra-time", "penalties"],
    home: "overall",
    prize: 0,
    ...extra,
  };
}

/** Quartas de final, semifinal e final (em campo neutro), com o mando pela classificação geral. */
export function eightClubKnockout() {
  return {
    type: "knockout" as const,
    phases: [
      phase("Quartas de final"),
      phase("Semifinal"),
      phase("Final", { home: "draw", neutral: true }),
    ],
  };
}

/** Gera o banco de exemplo das fases (019). */
export function generateStagesBank(options: StagesBankOptions = {}): ValidatedBank {
  const base = generateDefaultBank({
    seed: options.seed ?? "brasfoot-like-default-1",
    divisionSize: 20,
    slots: 2,
    ...(options.names !== undefined ? { names: options.names } : {}),
    ...(options.manifest ? { manifest: options.manifest } : {}),
  });
  const bank = JSON.parse(JSON.stringify(base)) as ModPackage;
  const competition = bank.competitions[0] as Competition;
  const [top, lower] = competition.divisions;
  if (!top || !lower) throw new Error("o banco padrão deve ter duas divisões");

  if (options.topClubs !== undefined && options.topClubs < top.clubIds.length) {
    const removed = new Set(top.clubIds.slice(options.topClubs));
    top.clubIds = top.clubIds.slice(0, options.topClubs);
    bank.clubs = bank.clubs.filter((club) => !removed.has(club.id));
    bank.players = bank.players.filter((player) => !removed.has(player.clubId));
    bank.rivalries = (bank.rivalries ?? []).filter(
      (rivalry) => !rivalry.clubIds.some((clubId) => removed.has(clubId)),
    );
  }

  let cursor = 0;
  const ids = [...lower.clubIds].sort();
  STAGES_REGION_SIZES.forEach((size, index) => {
    for (const clubId of ids.slice(cursor, cursor + size)) {
      const club = bank.clubs.find((entry) => entry.id === clubId);
      if (club) club.region = REGIONS[index] as string;
    }
    cursor += size;
  });

  lower.stages = [
    {
      type: "groups",
      groupSize: 5,
      rounds: 1,
      points: POINTS,
      tiebreakers: TIEBREAKERS,
      qualified: 2,
      draw: { rules: [{ kind: "concentrate", attribute: "region" }] },
    },
    eightClubKnockout(),
  ];

  const result = validateBank(bank);
  if (!result.ok || result.warnings.length > 0) {
    const issues = result.ok ? result.warnings : [...result.errors, ...result.warnings];
    throw new Error(
      `banco de fases inválido (bug do gerador): ${JSON.stringify(issues.slice(0, 5))}`,
    );
  }
  return result.bank;
}
