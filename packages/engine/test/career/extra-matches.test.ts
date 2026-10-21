import { describe, expect, it } from "vitest";
import { advanceCareerDays, completeCareerDay } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { headlinesOf } from "../../src/news/feed";
import { TOURNAMENT_ID, twoCompetitionsBank } from "../fixtures/two-competitions";
import { MANAGER, newState } from "./day-helpers";

const SEED = "extras";

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

describe("torcida, diretoria e notícias reagem a jogos de outras competições (017 FR-029)", () => {
  const world = twoCompetitionsBank();

  function wednesday() {
    const state = newState(world, SEED, { systems: true });
    // Domingo, domingo; a próxima é a quarta do torneio, em que o clube do jogador joga.
    return ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER));
  }

  it("a torcida do clube muda com o resultado e ganha um motivo recente", () => {
    const before = wednesday();
    const after = ok(completeCareerDay(before, SEED, MANAGER));
    const record = after.competitions[0]?.divisions[0]?.records.find(
      (entry) => entry.home === MANAGER || entry.away === MANAGER,
    );
    if (!record) throw new Error("sem jogo");
    const own = record.home === MANAGER ? record.score.home : record.score.away;
    const other = record.home === MANAGER ? record.score.away : record.score.home;
    const delta =
      (after.fans?.clubs[MANAGER]?.mood ?? 0) - (before.fans?.clubs[MANAGER]?.mood ?? 0);
    if (own > other) expect(delta).toBeGreaterThan(0);
    else if (own < other) expect(delta).toBeLessThan(0);
    const recent = after.fans?.clubs[MANAGER]?.recent.at(-1);
    expect(recent?.factors.length).toBe(1);
    expect(recent?.value).toBe(after.fans?.clubs[MANAGER]?.mood);
  });

  it("a confiança da diretoria e as notícias registram o jogo do torneio", () => {
    const before = wednesday();
    const after = ok(completeCareerDay(before, SEED, MANAGER));
    const confidenceBefore = before.board?.clubs[MANAGER]?.confidence ?? 0;
    const recent = after.board?.clubs[MANAGER]?.recent.at(-1);
    expect(recent?.value).toBe(after.board?.clubs[MANAGER]?.confidence);
    expect(Math.abs((recent?.value ?? 0) - confidenceBefore)).toBeLessThanOrEqual(20);
    const round = 2;
    const headlines = headlinesOf(
      after.news ?? ({ feed: [], records: { league: {}, clubs: {} }, seasons: [] } as never),
      after.league.number,
      round,
    );
    const mine = headlines.find((headline) => headline.vars.competition === TOURNAMENT_ID);
    expect(mine?.type).toBe("result");
    expect(mine?.mine).toBe(true);
    expect(mine?.vars.club).toBe(MANAGER);
  });

  it("clubes que não jogaram o torneio não mudam de humor nesse dia", () => {
    const before = wednesday();
    const after = ok(completeCareerDay(before, SEED, MANAGER));
    const playing = new Set(
      after.competitions[0]?.divisions[0]?.records.flatMap((record) => [record.home, record.away]),
    );
    for (const [clubId, club] of Object.entries(after.fans?.clubs ?? {})) {
      if (playing.has(clubId)) continue;
      expect(club.mood).toBe(before.fans?.clubs[clubId]?.mood);
    }
  });

  it("é determinístico", () => {
    expect(completeCareerDay(wednesday(), SEED, MANAGER)).toEqual(
      completeCareerDay(wednesday(), SEED, MANAGER),
    );
  });
});
