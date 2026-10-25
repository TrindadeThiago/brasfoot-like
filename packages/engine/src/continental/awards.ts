import type { DayMatch } from "../career/season-state";
import type { CompletedBank } from "../model/types";
import type { Season } from "../season/types";
import { championOf, compareReached, reachedByClub } from "./reached";
import type { CompetitionPrize, Reached } from "./types";

/**
 * Prêmios das regras `awards` de uma competição (022 R4) por vitória, empate, fase alcançada e
 * título. As fases eliminatórias seguem com o `prize` por confronto vencido da 018 (`cupPrizes`):
 * aqui não há pagamento duplicado. Pura: compara a temporada antes e depois do dia.
 */

/** O clube passou de `before` para `after` e `entry` está nesse intervalo? */
function crossed(before: Reached | undefined, after: Reached | undefined, entry: Reached): boolean {
  if (!after || compareReached(after, entry) < 0) return false;
  return before === undefined || compareReached(before, entry) < 0;
}

function isPointsMatch(season: Season, match: DayMatch): boolean {
  const kind = match.fixture.stage?.kind;
  if (kind) return kind === "league" || kind === "groups";
  return match.fixture.tie === undefined && season.bracket === undefined;
}

export function competitionAwards(
  world: CompletedBank,
  before: Season,
  after: Season,
  matches: readonly DayMatch[],
  date: string,
): CompetitionPrize[] {
  const awards = world.competitions.find((entry) => entry.id === after.competitionId)?.awards;
  if (!awards) return [];
  const prizes: CompetitionPrize[] = [];
  const pay = (
    clubId: string,
    amount: number | undefined,
    source: CompetitionPrize["source"],
    stage: number,
    phase?: number,
  ) => {
    if (amount === undefined || amount <= 0) return;
    prizes.push({ clubId, amount, date, source, stage, ...(phase !== undefined ? { phase } : {}) });
  };

  for (const match of matches) {
    if (!isPointsMatch(after, match)) continue;
    const { home, away } = match.record.score;
    const stage = (match.fixture.stage?.index ?? 0) + 1;
    if (home === away) {
      pay(match.fixture.home, awards.draw, "draw", stage);
      pay(match.fixture.away, awards.draw, "draw", stage);
    } else {
      pay(home > away ? match.fixture.home : match.fixture.away, awards.win, "win", stage);
    }
  }

  // Antes do primeiro jogo ninguém tinha "alcançado" nada: a 1ª fase paga no 1º dia de jogos.
  const reachedBefore =
    before.records.length === 0 ? new Map<string, Reached>() : reachedByClub(world, before);
  const reachedAfter = reachedByClub(world, after);
  for (const entry of awards.stage ?? []) {
    const target: Reached = { stage: entry.stage, phase: entry.phase };
    for (const [clubId, reached] of [...reachedAfter].sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (crossed(reachedBefore.get(clubId), reached, target)) {
        pay(clubId, entry.amount, "stage", entry.stage, entry.phase);
      }
    }
  }

  const champion = championOf(world, after);
  if (champion && !championOf(world, before)) {
    const last = after.stages?.at(-1);
    pay(champion, awards.title, "title", last ? last.index + 1 : 1);
  }
  return prizes;
}
