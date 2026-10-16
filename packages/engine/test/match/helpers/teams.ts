import { autoLineup } from "../../../src/match/auto-lineup";
import { FORMATIONS, type FormationId, type Posture } from "../../../src/match/formations";
import { effectiveStrength } from "../../../src/match/strength";
import type { Lineup, MatchInput, TeamInput } from "../../../src/match/types";
import type { CompletedBank, CompletedPlayer } from "../../../src/model/types";
import { generateDefaultBank } from "../../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../../src/worldgen/hidden";

let world: CompletedBank | undefined;

/** Mundo padrão com atributos ocultos completos, construído uma vez por arquivo de teste. */
export function testWorld(): CompletedBank {
  world ??= completeHiddenAttributes(
    generateDefaultBank({ seed: "brasfoot-like-default-1" }),
    "testes-partida",
  );
  return world;
}

export function clubIds(): string[] {
  return testWorld().clubs.map((club) => club.id);
}

export function squadOf(clubId: string): CompletedPlayer[] {
  return testWorld().players.filter((player) => player.clubId === clubId);
}

/**
 * Escalação simples por posição de origem: para cada vaga, o melhor jogador ainda livre
 * (pela força efetiva na vaga); os 7 melhores restantes vão para o banco.
 */
export function naturalLineup(
  squad: CompletedPlayer[],
  formation: FormationId = "4-4-2",
  posture: Posture = "balanced",
  benchSize = 7,
): Lineup {
  const used = new Set<string>();
  const starters: Record<string, string> = {};
  for (const slot of FORMATIONS[formation].slots) {
    const best = squad
      .filter((player) => !used.has(player.id))
      .sort(
        (a, b) =>
          effectiveStrength(b, slot.position) - effectiveStrength(a, slot.position) ||
          a.id.localeCompare(b.id),
      )[0];
    if (!best) throw new Error("elenco insuficiente");
    used.add(best.id);
    starters[slot.id] = best.id;
  }
  const bench = squad
    .filter((player) => !used.has(player.id))
    .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id))
    .slice(0, benchSize)
    .map((player) => player.id);
  return { formation, posture, starters, bench };
}

/** Escalação automática (com fallback que lança erro se o elenco não permitir). */
export function bestLineup(
  squad: CompletedPlayer[],
  formation: FormationId = "4-4-2",
  posture: Posture = "balanced",
): Lineup {
  const result = autoLineup({ squad, formation, posture, benchLimit: 7 });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.lineup;
}

export function teamInput(clubId: string, lineup?: Lineup, squad = squadOf(clubId)): TeamInput {
  return { clubId, squad, lineup: lineup ?? bestLineup(squad) };
}

export function makeInput(
  homeClubId: string,
  awayClubId: string,
  overrides: Partial<MatchInput> = {},
): MatchInput {
  return {
    home: teamInput(homeClubId),
    away: teamInput(awayClubId),
    seed: 1,
    ...overrides,
  };
}

/** Cópia do elenco com a força deslocada (limitada a 1–100). */
export function withStrengthDelta(squad: CompletedPlayer[], delta: number): CompletedPlayer[] {
  return squad.map((player) => ({
    ...player,
    strength: Math.min(100, Math.max(1, player.strength + delta)),
  }));
}
