import type { Competition, ModPackage } from "@brasfoot-like/engine";
import { completeCareerDay } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  createSave,
  isCareerSeasonOver,
  managedClubId,
  seasonStateOf,
  withDayResult,
} from "../src";
import { defaultBank, SERIE_A, SERIE_B } from "./fixtures";

const NOW = "2026-10-21T00:00:00.000Z";

/** Banco padrão com um torneio de 10 clubes da principal numa agenda dada (017 R14). */
function bankWithTournament(schedule: Competition["schedule"]): ModPackage {
  const bank = JSON.parse(JSON.stringify(defaultBank())) as ModPackage;
  const main = bank.competitions[0] as Competition;
  bank.competitions.push({
    id: "torneio-teste",
    countryId: main.countryId,
    name: "Torneio de Teste",
    format: JSON.parse(JSON.stringify(main.format)),
    divisions: [
      {
        level: 1,
        name: "Divisão única",
        clubIds: [...[...SERIE_A].sort().slice(0, 6), ...[...SERIE_B].sort().slice(0, 4)],
        promotionSlots: 0,
        relegationSlots: 0,
      },
    ],
    ...(schedule ? { schedule } : {}),
  });
  return bank;
}

function create(bank: unknown) {
  return createSave({
    id: "calendario",
    now: NOW,
    managerName: "Ana",
    clubId: SERIE_A[0] as string,
    seed: "calendario",
    defaultBank: bank,
  });
}

describe("createSave com várias competições (017 US1)", () => {
  it("banco padrão: sem secundárias e calendário só da liga", () => {
    const result = create(defaultBank());
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.save.competitions).toEqual([]);
    expect(result.save.calendar.days).toHaveLength(38);
    expect(result.save.competitionHistory).toEqual([]);
    expect(result.save.fitness).toEqual({ players: {} });
  });

  it("duas competições: o save guarda a secundária e o calendário das duas", () => {
    const result = create(bankWithTournament({ weekday: 3, startWeek: 1, everyWeeks: 2 }));
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.save.competitions.map((season) => season.competitionId)).toEqual([
      "torneio-teste",
    ]);
    expect(result.save.calendar.days.flatMap((day) => day.slots)).toHaveLength(38 + 18);
  });

  it("datas impossíveis ⇒ banco inválido, antes da carreira começar", () => {
    const result = create(bankWithTournament({ weekday: 7, startWeek: 1, everyWeeks: 2 }));
    expect(result).toEqual({
      ok: false,
      error: { code: "save.invalid_bank", params: { issues: 1 } },
    });
  });
});

describe("virada de temporada com duas competições (017 FR-040)", () => {
  it("a nova temporada traz as duas competições, o histórico do torneio e a condição cheia", () => {
    const created = create(bankWithTournament({ weekday: 3, startWeek: 1, everyWeeks: 2 }));
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    let save = created.save;
    while (!isCareerSeasonOver(save)) {
      const managed = managedClubId(save);
      const day = completeCareerDay(seasonStateOf(save), save.seed, managed, undefined, {
        [managed]: save.lineup,
      });
      if (!day.ok) throw new Error(JSON.stringify(day.error));
      save = withDayResult(save, day.state);
    }
    expect(Object.keys(save.fitness.players).length).toBeGreaterThan(0);
    const turned = advanceCareerSeason(save, NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const next = turned.save;
    expect(next.league.number).toBe(2);
    expect(next.competitions.map((season) => season.number)).toEqual([2]);
    expect(next.calendar.days.flatMap((day) => day.slots)).toHaveLength(38 + 18);
    expect(next.fitness).toEqual({ players: {} });
    expect(next.competitionHistory).toHaveLength(1);
    expect(next.competitionHistory[0]?.competitionId).toBe("torneio-teste");
    expect(next.history).toHaveLength(1);
  }, 300_000);
});
