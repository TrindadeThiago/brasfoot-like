import { describe, expect, it } from "vitest";
import { dateOfRound } from "../../src/calendar/season-calendar";
import { completeCareerDay, startCareerDay } from "../../src/career/day";
import { competitionSeason, currentDay } from "../../src/career/season-state";
import { finishRound } from "../../src/season/live-round";
import { playerLines } from "../../src/season/record";
import { simulationKindFor } from "../../src/world/leagues";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactState, continentalLeague, playDays } from "./continental-helpers";
import { allSeasons, ok } from "./qualification-helpers";

const records = (state: ReturnType<typeof compactState>["state"], competitionId: string) =>
  competitionSeason(state, competitionId).divisions.flatMap((season) => season.records);

describe("IA e simulação na taça continental (022 US1, FR-012, FR-014)", () => {
  it("a competição do clube em foco usa a simulação completa; as demais, a resumida", () => {
    const { state, manager } = compactState();
    expect(simulationKindFor(state, CONTINENTAL_IDS.major, manager)).toBe("full");
    const outsider = compactState({ participant: false });
    expect(simulationKindFor(outsider.state, CONTINENTAL_IDS.major, outsider.manager)).toBe(
      "summary",
    );
    expect(simulationKindFor(state, CONTINENTAL_IDS.major)).toBe("summary");
    expect(simulationKindFor(state, state.league.competitionId, manager)).toBe("full");
  });

  it("jogada a temporada, a taça é completa com o técnico dentro e resumida com ele fora", () => {
    const inside = compactState();
    const insideEnd = playDays(inside.state, "end", inside.seed, inside.manager);
    const full = records(insideEnd, CONTINENTAL_IDS.major);
    expect(full.length).toBeGreaterThan(0);
    expect(full.every((record) => record.summary !== true)).toBe(true);

    const outside = compactState({ participant: false });
    const outsideEnd = playDays(outside.state, "end", outside.seed, outside.manager);
    const summarized = records(outsideEnd, CONTINENTAL_IDS.major);
    expect(summarized.length).toBeGreaterThan(0);
    // Os jogos de mata-mata (prorrogação e pênaltis) usam sempre a simulação completa (020 R3).
    const [groups, knockout] = continentalLeague(outsideEnd).divisions[0]?.stages ?? [];
    const inRounds = (rounds: number[] | undefined) =>
      summarized.filter((record) => rounds?.includes(record.round));
    expect(inRounds(groups?.rounds).length).toBeGreaterThan(0);
    expect(inRounds(groups?.rounds).every((record) => record.summary === true)).toBe(true);
    expect(inRounds(knockout?.rounds).every((record) => record.summary !== true)).toBe(true);
    // A liga do país do técnico segue completa.
    expect(
      records(outsideEnd, outsideEnd.league.competitionId).every(
        (record) => record.summary !== true,
      ),
    ).toBe(true);
  }, 600_000);

  it("rodada ao vivo = rodada direta no dia da taça", () => {
    const { state: start, manager, seed } = compactState();
    let state = start;
    for (;;) {
      const day = currentDay(state);
      if (!day) throw new Error("a taça nunca jogou");
      if (day.slots.some((slot) => slot.competitionId === CONTINENTAL_IDS.major)) break;
      state = ok(completeCareerDay(state, seed, manager)).state;
    }
    const direct = ok(completeCareerDay(state, seed, manager)).state;
    const started = startCareerDay(state, manager);
    if (!started.ok || !started.live) throw new Error("o técnico não joga a taça hoje");
    const via = ok(completeCareerDay(state, seed, manager, finishRound(started.live))).state;
    expect(records(via, CONTINENTAL_IDS.major)).toEqual(records(direct, CONTINENTAL_IDS.major));
  }, 120_000);

  it("clubes da IA jogam quarta e domingo e rodam o elenco (rodízio e desgaste)", () => {
    const { state, manager, seed } = compactState({ seed: "rotacao" });
    const end = playDays(state, "end", seed, manager);
    const members = new Set(continentalLeague(end).divisions[0]?.clubIds ?? []);
    interface Game {
      date: string;
      competitionId: string;
      eleven: Set<string>;
    }
    const games = new Map<string, Game[]>();
    for (const league of allSeasons(end)) {
      for (const season of league.divisions) {
        for (const record of season.records) {
          const date = dateOfRound(end.calendar, league.competitionId, record.round) ?? "";
          const lines = playerLines(record);
          for (const side of ["home", "away"] as const) {
            const club = side === "home" ? record.home : record.away;
            if (!members.has(club) || club === manager) continue;
            const eleven = new Set(
              Object.entries(lines)
                .filter(([, line]) => line.side === side && line.minutes >= 60)
                .map(([id]) => id),
            );
            games.set(club, [
              ...(games.get(club) ?? []),
              { date, competitionId: league.competitionId, eleven },
            ]);
          }
        }
      }
    }
    const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
    const midweek: number[] = [];
    const rested: number[] = [];
    for (const list of games.values()) {
      list.sort((a, b) => (a.date < b.date ? -1 : 1));
      for (let index = 1; index < list.length; index++) {
        const before = list[index - 1] as Game;
        const after = list[index] as Game;
        const changed = [...before.eleven].filter((id) => !after.eleven.has(id)).length;
        const gap = days(before.date, after.date);
        if (gap <= 6 && before.competitionId !== after.competitionId) midweek.push(changed);
        else if (gap >= 7) rested.push(changed);
      }
    }
    const mean = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(midweek.length).toBeGreaterThan(20);
    expect(rested.length).toBeGreaterThan(20);
    // Com menos de uma semana entre os jogos o onze muda mais do que com a semana de descanso.
    expect(mean(midweek)).toBeGreaterThan(mean(rested));
  }, 600_000);
});
