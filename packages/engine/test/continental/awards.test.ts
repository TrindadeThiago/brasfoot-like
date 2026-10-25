import { describe, expect, it } from "vitest";
import { completeCareerDay } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { competitionSeason, currentDay, roundMatches } from "../../src/career/season-state";
import { competitionAwards } from "../../src/continental/awards";
import type { CompetitionPrize } from "../../src/continental/types";
import type { Awards, CompletedBank } from "../../src/model/types";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactWorld, continentalLeague } from "../career/continental-helpers";
import { ok } from "../career/qualification-helpers";
import { worldState } from "../career/world-helpers";

const AWARDS: Awards = {
  win: 1000,
  draw: 400,
  stage: [
    { stage: 1, amount: 500 },
    { stage: 2, amount: 700 },
    { stage: 2, phase: 2, amount: 900 },
  ],
  title: 5000,
};

function withAwards(world: CompletedBank, awards: Awards | undefined): CompletedBank {
  return {
    ...world,
    competitions: world.competitions.map((competition) =>
      competition.id === CONTINENTAL_IDS.major
        ? { ...competition, ...(awards ? { awards } : { awards: undefined }) }
        : competition,
    ),
  } as CompletedBank;
}

/** Joga a temporada dia a dia e junta o que `competitionAwards` paga em cada dia. */
function playAwards(world: CompletedBank, seed: string) {
  const manager =
    world.competitions.find((entry) => entry.id === CONTINENTAL_IDS.major)?.divisions[0]
      ?.clubIds[0] ?? "";
  let state: CareerSeasonState = worldState(world, seed, manager);
  const prizes: CompetitionPrize[] = [];
  for (let day = currentDay(state); day; day = currentDay(state)) {
    const before = state;
    state = ok(completeCareerDay(state, seed, manager)).state;
    for (const slot of day.slots) {
      if (slot.competitionId !== CONTINENTAL_IDS.major) continue;
      const after = competitionSeason(state, slot.competitionId);
      const matches = roundMatches(after, slot.round, day.date);
      prizes.push(
        ...competitionAwards(
          state.world,
          continentalLeague(before).divisions[0] as never,
          after.divisions[0] as never,
          matches,
          day.date,
        ),
      );
    }
  }
  return { state, prizes };
}

describe("prêmios da competição entre países (022 US2, FR-015, FR-016)", () => {
  const world = withAwards(compactWorld("continental-premios"), AWARDS);
  const { state, prizes } = playAwards(world, "continental-premios");
  const season = continentalLeague(state).divisions[0];
  const groupRounds = new Set(season?.stages?.[0]?.rounds ?? []);
  const groupRecords = (season?.records ?? []).filter((record) => groupRounds.has(record.round));
  const sum = (source: CompetitionPrize["source"]) =>
    prizes
      .filter((prize) => prize.source === source)
      .reduce((total, prize) => total + prize.amount, 0);

  it("paga a vitória e o empate dos jogos da fase de pontos", () => {
    const wins = groupRecords.filter((record) => record.score.home !== record.score.away).length;
    const draws = groupRecords.length - wins;
    expect(groupRecords.length).toBe(48);
    expect(sum("win")).toBe(wins * (AWARDS.win ?? 0));
    expect(sum("draw")).toBe(draws * 2 * (AWARDS.draw ?? 0));
  });

  it("paga cada fase alcançada uma única vez por clube", () => {
    const byStage = (stage: number, phase?: number) =>
      prizes.filter(
        (prize) => prize.source === "stage" && prize.stage === stage && prize.phase === phase,
      );
    expect(byStage(1)).toHaveLength(16);
    expect(byStage(2)).toHaveLength(8);
    expect(byStage(2, 2)).toHaveLength(4);
    const keys = prizes
      .filter((prize) => prize.source === "stage")
      .map((prize) => `${prize.clubId}|${prize.stage}|${prize.phase}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(sum("stage")).toBe(16 * 500 + 8 * 700 + 4 * 900);
  });

  it("paga o título uma vez, ao campeão", () => {
    const titles = prizes.filter((prize) => prize.source === "title");
    expect(titles).toHaveLength(1);
    expect(titles[0]?.amount).toBe(5000);
  });

  it("não paga o prêmio por confronto da 018: só as fontes de awards", () => {
    expect(new Set(prizes.map((prize) => prize.source))).toEqual(
      new Set(["win", "draw", "stage", "title"]),
    );
  });

  it("a competição sem awards não paga nada", () => {
    const none = playAwards(
      withAwards(compactWorld("continental-premios"), undefined),
      "continental-premios",
    );
    expect(none.prizes).toEqual([]);
  });

  it("os prêmios entram no caixa dos clubes, com a competição de origem no extrato", () => {
    const total = prizes.reduce((acc, prize) => acc + prize.amount, 0);
    const ledger = state.finances.ledger.filter(
      (entry) => entry.category === "prize" && entry.competitionId === CONTINENTAL_IDS.major,
    );
    expect(ledger.reduce((acc, entry) => acc + entry.amount, 0)).toBe(total);
    expect(ledger.every((entry) => entry.date !== undefined)).toBe(true);
  });
});
