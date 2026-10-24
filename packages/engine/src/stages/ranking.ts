import { tieState } from "../knockout/tie";
import type { CompletedBank } from "../model/types";
import { emptyRow } from "../season/rank";
import type { Season, StandingRow } from "../season/types";
import { leagueStageStandings, overallStandings } from "./classification";
import { cupView } from "./cup-view";
import { seasonStages } from "./rules";
import type { DrawWarning } from "./types";

/** Posição final de uma divisão em fases (019 FR-024, research.md R8). */

/** Reputação do clube, para desempatar quando não há classificação anterior. */
function byReputation(world: CompletedBank): (a: string, b: string) => number {
  const reputation = (id: string) => world.clubs.find((club) => club.id === id)?.reputation ?? 0;
  return (a, b) => reputation(b) - reputation(a) || (a < b ? -1 : a > b ? 1 : 0);
}

/** Clubes da fase eliminatória do mais longe ao menos longe, desempatando pela fase de pontos anterior. */
function orderKnockout(
  season: Season,
  world: CompletedBank,
  index: number,
  clubs: readonly string[],
): string[] {
  const view = cupView(season, world, index);
  const reached = new Map<string, number>();
  for (const phase of view.bracket?.phases ?? []) {
    for (const tie of phase.ties) {
      reached.set(tie.home, Math.max(reached.get(tie.home) ?? 0, phase.index));
      reached.set(tie.away, Math.max(reached.get(tie.away) ?? 0, phase.index));
      const state = tieState(view, phase.index, tie.id);
      // quem já venceu o confronto fica à frente de quem caiu nele, mesmo antes da fase seguinte
      if (state.winner)
        reached.set(state.winner, Math.max(reached.get(state.winner) ?? 0, phase.index + 0.5));
    }
  }
  const ranks = view.cupView?.ranks ?? {};
  const fallback = byReputation(world);
  return [...clubs].sort(
    (a, b) =>
      (reached.get(b) ?? -1) - (reached.get(a) ?? -1) ||
      (ranks[a] ?? Number.MAX_SAFE_INTEGER) - (ranks[b] ?? Number.MAX_SAFE_INTEGER) ||
      fallback(a, b),
  );
}

function orderPoints(
  season: Season,
  world: CompletedBank,
  index: number,
  clubs: readonly string[],
): string[] {
  const format = seasonStages(world, season)[index];
  const rows =
    format?.type === "groups"
      ? overallStandings(season, world, index)
      : leagueStageStandings(season, world, index);
  const position = new Map(rows.map((row) => [row.clubId, row.position]));
  return [...clubs].sort(
    (a, b) =>
      (position.get(a) ?? Number.MAX_SAFE_INTEGER) - (position.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}

/**
 * Todos os clubes da divisão em ordem de posição final (FR-024): da última fase para a primeira,
 * os clubes da fase que ainda não foram ordenados formam um bloco — numa fase eliminatória, do que
 * foi mais longe (campeão e vice primeiro) ao que caiu antes, desempatando pela classificação
 * geral da fase de pontos anterior; numa fase de pontos, pela classificação geral ou pela tabela.
 * Vale a qualquer momento: é a posição "se a temporada acabasse agora".
 */
export function finalOrder(season: Season, world: CompletedBank): string[] {
  const states = season.stages ?? [];
  const placed: string[] = [];
  const seen = new Set<string>();
  for (let index = states.length - 1; index >= 0; index--) {
    const state = states[index];
    if (!state?.started) continue;
    const clubs = state.clubIds.filter((id) => !seen.has(id));
    const ordered =
      state.kind === "knockout"
        ? orderKnockout(season, world, index, clubs)
        : orderPoints(season, world, index, clubs);
    for (const id of ordered) {
      placed.push(id);
      seen.add(id);
    }
  }
  const rest = season.clubIds.filter((id) => !seen.has(id)).sort(byReputation(world));
  return [...placed, ...rest];
}

/** Linhas de `standings()` de uma divisão em fases: a posição final e as estatísticas da fase de pontos. */
export function stagedStandings(season: Season, world: CompletedBank): StandingRow[] {
  const formats = seasonStages(world, season);
  const latest = new Map<string, StandingRow>();
  (season.stages ?? []).forEach((state, index) => {
    const format = formats[index];
    if (!state.started || !format || format.type === "knockout") return;
    const rows =
      format.type === "groups"
        ? overallStandings(season, world, index)
        : leagueStageStandings(season, world, index);
    for (const row of rows) {
      const {
        group: _group,
        groupPosition: _groupPosition,
        ...plain
      } = row as StandingRow & {
        group?: string;
        groupPosition?: number;
      };
      latest.set(row.clubId, plain);
    }
  });
  return finalOrder(season, world).map((clubId, index) => ({
    ...(latest.get(clubId) ?? emptyRow(clubId)),
    clubId,
    position: index + 1,
  }));
}

/** Avisos dos sorteios de grupos da divisão: separações que a carreira teve de afrouxar (019 FR-014). */
export function drawWarnings(season: Season): DrawWarning[] {
  return (season.stages ?? []).flatMap((state) => state.warnings ?? []);
}
