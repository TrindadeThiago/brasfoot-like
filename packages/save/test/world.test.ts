import { generateWorldBank, type ModPackage } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  acceptManagerOffer,
  advanceCareerSeason,
  createSave,
  exportSave,
  importSave,
  isCareerSeasonOver,
  migrateSave,
  type SaveFile,
} from "../src";
import { playDay } from "./fixtures";

// 020 (T035): carreira num mundo de vários países.
const NOW = "2026-10-24T12:00:00.000Z";

function worldBank(): ModPackage {
  return structuredClone(
    generateWorldBank({
      seed: "mundo-save",
      countries: 3,
      divisionsPerCountry: 2,
      clubsPerDivision: 10,
    }),
  ) as ModPackage;
}

function newSave(countryIndex: number): SaveFile {
  const bank = worldBank();
  const country = bank.countries[countryIndex];
  const clubId = bank.clubs.find((club) => club.countryId === country?.id)?.id ?? "";
  const created = createSave({
    id: "mundo",
    now: NOW,
    managerName: "Ana",
    clubId,
    seed: "mundo-save-1",
    defaultBank: bank,
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  return created.save;
}

describe("carreira num mundo de vários países (020 FR-008, FR-021)", () => {
  it.each([0, 1, 2])(
    "começa no país %s: liga em foco do país, as outras em competitions",
    (index) => {
      const save = newSave(index);
      const country = save.bank.countries[index];
      const league = save.bank.competitions.find((entry) => entry.id === save.league.competitionId);
      expect(league?.countryId).toBe(country?.id);
      const ids = [save.league, ...save.competitions].map((entry) => entry.competitionId);
      expect(ids.sort()).toEqual(save.bank.competitions.map((entry) => entry.id).sort());
      for (const club of save.bank.clubs) {
        expect(save.finances.clubs[club.id], club.id).toBeDefined();
        expect(save.fans.clubs[club.id], club.id).toBeDefined();
        expect(save.board.clubs[club.id], club.id).toBeDefined();
      }
      expect(save.board.manager.clubId).toBe(save.clubId);
    },
  );

  it("recusa clube que não é de nenhum país do banco", () => {
    const created = createSave({
      id: "x",
      now: NOW,
      managerName: "Ana",
      clubId: "clube-inexistente",
      seed: "s",
      defaultBank: worldBank(),
    });
    expect(created.ok).toBe(false);
  });

  it("abre sem mudança depois de salvar, exportar e importar", () => {
    const save = newSave(2);
    const reopened = migrateSave(JSON.parse(JSON.stringify(save)));
    if (reopened.status !== "ok") throw new Error(JSON.stringify(reopened));
    expect(reopened.save).toEqual(save);
    const imported = importSave(exportSave(save, NOW));
    if (imported.status !== "ok") throw new Error(JSON.stringify(imported));
    expect(imported.save.clubId).toBe(save.clubId);
  });

  it("joga uma temporada inteira, vira, e a nova temporada abre", () => {
    let save = newSave(1);
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const reopened = migrateSave(JSON.parse(JSON.stringify(save)));
    expect(reopened.status).toBe("ok");
    const turned = advanceCareerSeason(save, NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    expect(turned.save.league.number).toBe(2);
    expect(turned.save.league.competitionId).toBe(save.league.competitionId);
    expect(migrateSave(JSON.parse(JSON.stringify(turned.save))).status).toBe("ok");
    // Um campeão por país na história: o do país do técnico e os dos outros.
    const champions = [...turned.save.history, ...turned.save.competitionHistory];
    expect(champions.filter((entry) => entry.number === 1)).toHaveLength(3);
  }, 240_000);
});

describe("proposta de emprego de clube de outro país (020 FR-009, FR-010)", () => {
  function withOffer(save: SaveFile, clubId: string): SaveFile {
    const board = structuredClone(save.board);
    const vacancy = {
      id: "vacancy-teste",
      clubId,
      season: save.league.number,
      round: 0,
      considered: true,
      offerId: "offer-teste",
    };
    board.vacancies.push(vacancy);
    board.offers.push({
      id: "offer-teste",
      clubId,
      season: save.league.number,
      round: 0,
      expiresRound: 99,
      goals: board.clubs[clubId]?.goals ?? board.clubs[save.clubId]?.goals ?? [],
      status: "pending",
    } as never);
    const club = board.clubs[clubId];
    if (club) {
      const coach = board.coaches.find((entry) => entry.id === club.coachId);
      if (coach) board.coaches = board.coaches.filter((entry) => entry.id !== coach.id);
      club.coachId = null;
    }
    return { ...save, board };
  }

  it("aceitar muda o clube, a liga em foco e o país do técnico, sem perder rodada", () => {
    let save = newSave(0);
    for (let day = 0; day < 6; day++) save = playDay(save);
    const target = save.bank.clubs.find((club) => club.countryId === save.bank.countries[2]?.id)
      ?.id as string;
    const offered = withOffer(save, target);
    const accepted = acceptManagerOffer(offered, "offer-teste");
    if (!accepted.ok) throw new Error(JSON.stringify(accepted.error));
    const next = accepted.save;
    expect(next.clubId).toBe(target);
    expect(next.board.manager.clubId).toBe(target);
    const country = next.bank.competitions.find(
      (c) => c.id === next.league.competitionId,
    )?.countryId;
    expect(country).toBe(save.bank.countries[2]?.id);
    expect([next.league, ...next.competitions]).toHaveLength(save.competitions.length + 1);
    expect(next.calendar).toEqual(save.calendar);
    // O clube deixado voltou para a IA e a carreira continua até a virada.
    const old = save.clubId;
    expect(next.board.clubs[old]?.coachId).not.toBeNull();
    let cursor: SaveFile = next;
    while (!isCareerSeasonOver(cursor)) cursor = playDay(cursor);
    expect(migrateSave(JSON.parse(JSON.stringify(cursor))).status).toBe("ok");
    const turned = advanceCareerSeason(cursor, NOW);
    expect(turned.ok).toBe(true);
  }, 240_000);

  it("proposta de clube do mesmo país não troca de liga", () => {
    const save = newSave(0);
    const mate = save.bank.clubs.find(
      (club) => club.countryId === save.bank.countries[0]?.id && club.id !== save.clubId,
    )?.id as string;
    const accepted = acceptManagerOffer(withOffer(save, mate), "offer-teste");
    if (!accepted.ok) throw new Error(JSON.stringify(accepted.error));
    expect(accepted.save.league.competitionId).toBe(save.league.competitionId);
    expect(accepted.save.clubId).toBe(mate);
  });
});
