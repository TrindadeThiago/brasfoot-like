import { describe, expect, it } from "vitest";
import { weekdayOf } from "../../src/calendar/date";
import { dateOfRound } from "../../src/calendar/season-calendar";
import type { Berth, CompletedBank } from "../../src/model/types";
import { allSeasons, playSeasons } from "../career/qualification-helpers";
import { clone, superCupWorld } from "./helpers";

// Supercopa entre campeões (021 US3): final única no calendário, com repasse quando o mesmo clube vence as duas.
describe("supercopa", () => {
  const { world } = superCupWorld();
  const run = playSeasons(world, "supercopa-021", 3);

  it("é disputada na data de `schedule` e cada edição tem campeão no histórico de copas", () => {
    for (const { start } of run.seasons) {
      const date = dateOfRound(start.calendar, "supercopa-teste", 1);
      expect(date).toBeDefined();
      expect(weekdayOf(date as string)).toBe(6);
    }
    const editions = run.history.cupHistory.filter(
      (entry) => entry.competitionId === "supercopa-teste",
    );
    expect(editions.map((entry) => entry.number)).toEqual([1, 2, 3]);
    for (const edition of editions) {
      expect(edition.championId).not.toBe(edition.runnerUpId);
      expect(edition.final.score).toBeDefined();
    }
  }, 300_000);

  it("campeões diferentes: os dois campeões; mesmo campeão: o repasse completa a vaga", () => {
    const records = run.history.qualificationHistory ?? [];
    for (const record of records) {
      const liga = record.entries.find((entry) => entry.berthId === "campeao-liga");
      const copa = record.entries.find((entry) => entry.berthId === "campeao-copa");
      expect(liga && copa).toBeTruthy();
      expect(liga?.clubId).not.toBe(copa?.clubId);
      if (copa?.via === "pass") expect(copa.passedFrom?.reason).toBe("duplicate");
    }
  });

  it("forçando o mesmo campeão nas duas vagas, a segunda é repassada e a supercopa fecha em 2 clubes", () => {
    const edited = clone(world) as CompletedBank;
    const berths = edited.competitions.find((entry) => entry.id === "supercopa-teste")?.divisions[0]
      ?.berths as Berth[];
    (berths[1] as Berth).source = (berths[0] as Berth).source;
    const forced = playSeasons(edited, "supercopa-021", 2);
    const second = forced.seasons[1]?.start as NonNullable<
      (typeof forced.seasons)[number]
    >["start"];
    const cup = allSeasons(second).find((entry) => entry.competitionId === "supercopa-teste");
    expect(cup?.divisions[0]?.clubIds).toHaveLength(2);
    const record = forced.history.qualificationHistory?.[0];
    expect(record?.entries[1]?.via).toBe("pass");
    expect(record?.entries[1]?.passedFrom?.reason).toBe("duplicate");
    expect(record?.entries[1]?.clubId).not.toBe(record?.entries[0]?.clubId);
  }, 300_000);
});
