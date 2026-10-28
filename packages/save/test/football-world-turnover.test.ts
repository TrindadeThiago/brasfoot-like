import { DEFAULT_PROFILE, generateFootballWorld, type ModPackage } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { advanceCareerSeason, createSave, isCareerSeasonOver, type SaveFile } from "../src";
import { playDay } from "./fixtures";

// 024 (T038): a virada no mundo compacto mantém o tamanho das divisões e das competições, e aplica
// acesso, rebaixamento e vagas em todos os países.
const NOW = "2026-10-27T00:00:00.000Z";
const bank = structuredClone(generateFootballWorld(DEFAULT_PROFILE, "virada-mundo")) as ModPackage;

function sizes(save: SaveFile): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const league of [save.league, ...save.competitions]) {
    result[league.competitionId] = league.divisions.map((division) => division.clubIds.length);
  }
  return result;
}

describe("virada no mundo compacto (024 US1)", () => {
  it("duas temporadas: tamanhos estáveis, acesso e rebaixamento no Brasil e vagas continentais", () => {
    const major = bank.competitions.find((c) => c.id === "continental-conmebol-maior");
    const clubId = bank.clubs.find(
      (club) => club.countryId === "brasil" && major?.divisions[0]?.clubIds.includes(club.id),
    )?.id;
    const created = createSave({
      id: "virada",
      now: NOW,
      managerName: "Ana",
      clubId: clubId ?? "",
      seed: "virada-mundo",
      defaultBank: bank,
      noFiring: true,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    let save: SaveFile = created.save;
    const first = sizes(save);
    const brazilBefore = save.league.divisions.map((d) => [...d.clubIds].sort());
    for (let season = 0; season < 2; season++) {
      while (!isCareerSeasonOver(save)) save = playDay(save);
      const turned = advanceCareerSeason(save, NOW);
      if (!turned.ok) throw new Error(JSON.stringify(turned));
      save = turned.save;
    }
    expect(save.league.number).toBe(3);
    // Divisões e competições mantêm o número de clubes (as continentais também: vagas fecham).
    expect(sizes(save)).toEqual(first);
    // O Brasil trocou clubes entre as divisões (acesso e rebaixamento valem na pirâmide de 4 níveis).
    const brazilAfter = save.league.divisions.map((d) => [...d.clubIds].sort());
    expect(JSON.stringify(brazilAfter)).not.toBe(JSON.stringify(brazilBefore));
    // Todo clube continua em exatamente uma divisão da liga do país.
    const all = brazilAfter.flat();
    expect(new Set(all).size).toBe(all.length);
    // Edições registradas: estaduais e continental.
    expect(save.regionalHistory?.length).toBe(10);
    expect(save.continentalHistory?.length).toBeGreaterThanOrEqual(10);
  }, 1_800_000);
});
