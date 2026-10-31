import {
  DEFAULT_PROFILE,
  generateFootballWorld,
  type ModPackage,
  setTicketPrice,
} from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { createSave, isCareerSeasonOver, type SaveFile } from "../src";
import { playDay } from "./fixtures";

// Bug reportado: o preço do ingresso mudava sozinho. As rodadas das ligas de outros países
// rodavam a IA (preço, obras, crédito, compras e vendas) também sobre o clube do jogador.
const bank = structuredClone(
  generateFootballWorld(DEFAULT_PROFILE, "carreira-mundo"),
) as ModPackage;

describe("rodadas de outros países não mexem no clube do jogador", () => {
  it("preço, estádio, dívida e elenco só mudam por ação do jogador", () => {
    const clubId = bank.clubs.find((club) => club.countryId === "brasil")?.id as string;
    const created = createSave({
      id: "m",
      now: "2026-10-27T00:00:00.000Z",
      managerName: "Ana",
      clubId,
      seed: "carreira-mundo",
      defaultBank: bank,
      noFiring: true,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const price = setTicketPrice(
      created.save.finances,
      created.save.bank,
      created.save.league.competitionId,
      clubId,
      20,
    );
    if (!price.ok) throw new Error("preço");
    let save: SaveFile = { ...created.save, finances: price.finances };
    const capacity = save.finances.clubs[clubId]?.capacity;
    const squad = save.bank.players
      .filter((player) => player.clubId === clubId)
      .map((player) => player.id)
      .sort();
    let days = 0;
    while (!isCareerSeasonOver(save) && days < 90) {
      save = playDay(save);
      days++;
      const club = save.finances.clubs[clubId];
      expect(club?.ticketPrice).toBe(20);
      expect(club?.capacity).toBe(capacity);
      expect(club?.works).toBeUndefined();
    }
    const after = save.bank.players
      .filter((player) => player.clubId === clubId)
      .map((player) => player.id)
      .sort();
    expect(after).toEqual(squad);
    expect(
      save.market.log.filter((entry) => entry.fromClubId === clubId || entry.toClubId === clubId),
    ).toEqual([]);
  }, 600000);
});
