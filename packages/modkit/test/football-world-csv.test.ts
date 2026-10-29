import {
  completeCareerDay,
  DEFAULT_PROFILE,
  generateFootballWorld,
  isRegionalOnly,
} from "@brasfoot-like/engine";
import {
  createSave,
  isCareerSeasonOver,
  type SaveFile,
  seasonStateOf,
  withDayResult,
} from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";
import { applyCsv, clubsToCsv, playersToCsv, readModPackage, writeModPackage } from "../src";

// 024 (T050): exportar → editar → importar → carreira, no mundo compacto.
describe("ciclo de planilhas no mundo compacto (024 US3)", () => {
  const bank = generateFootballWorld(DEFAULT_PROFILE, "planilha");

  it("exporta, troca nomes, importa e o pacote continua válido", () => {
    const clubs = clubsToCsv(bank).replace(bank.clubs[0]?.name ?? "", "Meu Clube");
    const players = playersToCsv(bank);
    const applied = applyCsv(bank, { clubs, players });
    if (!applied.ok) throw new Error(JSON.stringify(applied.errors.slice(0, 3)));
    expect(applied.bank.clubs[0]?.name).toBe("Meu Clube");
    const read = readModPackage(writeModPackage(applied.bank));
    expect(read.ok).toBe(true);
  });

  it("uma carreira usa os nomes novos", () => {
    const clubs = clubsToCsv(bank).replace(bank.clubs[0]?.name ?? "", "Meu Clube");
    const applied = applyCsv(bank, { clubs });
    if (!applied.ok) throw new Error("planilha");
    const club = applied.bank.clubs.find((entry) => !isRegionalOnly(applied.bank, entry.id));
    const created = createSave({
      id: "planilha",
      now: "2026-10-27T00:00:00.000Z",
      managerName: "Ana",
      clubId: club?.id ?? "",
      seed: "planilha",
      defaultBank: applied.bank,
      noFiring: true,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    let save: SaveFile = created.save;
    expect(save.bank.clubs.some((entry) => entry.name === "Meu Clube")).toBe(true);
    for (let day = 0; day < 3 && !isCareerSeasonOver(save); day++) {
      const result = completeCareerDay(seasonStateOf(save), save.seed, save.clubId, undefined, {
        [save.clubId]: save.lineup,
      });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      save = withDayResult(save, result.state);
    }
    expect(save.bank.clubs.some((entry) => entry.name === "Meu Clube")).toBe(true);
  });
});
