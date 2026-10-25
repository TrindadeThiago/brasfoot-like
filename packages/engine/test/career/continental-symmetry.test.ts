import { describe, expect, it } from "vitest";
import { completeCareerDay } from "../../src/career/day";
import { competitionSeason, currentDay } from "../../src/career/season-state";
import { compareReached, reachedByClub } from "../../src/continental/reached";
import { playerLines } from "../../src/season/record";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactState, continentalLeague, playDays } from "./continental-helpers";
import { ok } from "./qualification-helpers";

const MAJOR = CONTINENTAL_IDS.major;

describe("a IA e o jogador seguem as mesmas regras na competição (022 US6, FR-012)", () => {
  const { state, manager, seed } = compactState({ seed: "continental-simetria" });
  const end = playDays(state, "end", seed, manager);
  const season = continentalLeague(end).divisions[0];
  const awards = end.world.competitions.find((entry) => entry.id === MAJOR)?.awards;

  it("os prêmios de cada clube saem só dos resultados dele: o técnico e a IA recebem pela mesma regra", () => {
    expect(season).toBeDefined();
    if (!season || !awards) return;
    const reached = reachedByClub(end.world, season);
    const champion = [...reached].find(([, level]) => level.phase === 4)?.[0];
    const groupRounds = new Set(season.stages?.[0]?.rounds ?? []);
    for (const clubId of season.clubIds) {
      let expected = 0;
      for (const record of season.records) {
        if (!groupRounds.has(record.round)) continue;
        if (record.home !== clubId && record.away !== clubId) continue;
        const mine = record.home === clubId ? record.score.home : record.score.away;
        const other = record.home === clubId ? record.score.away : record.score.home;
        expected += mine > other ? (awards.win ?? 0) : mine === other ? (awards.draw ?? 0) : 0;
      }
      const level = reached.get(clubId);
      for (const entry of awards.stage ?? []) {
        if (level && compareReached(level, { stage: entry.stage, phase: entry.phase }) >= 0) {
          expected += entry.amount;
        }
      }
      if (clubId === champion) expected += awards.title ?? 0;
      const paid = end.finances.ledger
        .filter(
          (entry) =>
            entry.clubId === clubId && entry.category === "prize" && entry.competitionId === MAJOR,
        )
        .reduce((sum, entry) => sum + entry.amount, 0);
      expect(paid, clubId).toBe(expected);
    }
    // O técnico está entre os clubes conferidos.
    expect(season.clubIds).toContain(manager);
  }, 300_000);

  it("o desgaste vale igual: quem joga a taça perde condição, técnico ou IA", () => {
    let current = state;
    for (;;) {
      const day = currentDay(current);
      if (!day) throw new Error("a taça nunca jogou");
      if (day.slots.some((slot) => slot.competitionId === MAJOR)) break;
      current = ok(completeCareerDay(current, seed, manager)).state;
    }
    const played = ok(completeCareerDay(current, seed, manager)).state;
    const records = competitionSeason(played, MAJOR).divisions.flatMap((entry) => entry.records);
    const ai = records.find((record) => record.home !== manager && record.away !== manager);
    const mine = records.find((record) => record.home === manager || record.away === manager);
    for (const record of [ai, mine]) {
      expect(record).toBeDefined();
      const lines = playerLines(record as NonNullable<typeof record>);
      const drained = Object.entries(lines)
        .filter(([, line]) => line.minutes > 0)
        .map(([id]) => played.fitness.players[id]);
      expect(drained.length).toBeGreaterThan(0);
      expect(drained.every((entry) => entry !== undefined)).toBe(true);
    }
  }, 120_000);
});
