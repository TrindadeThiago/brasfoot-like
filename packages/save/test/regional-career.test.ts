import { generateRegionalBank, isRegionalOnly, regionalCompetitionOf } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  createSave,
  isCareerSeasonOver,
  type SaveFile,
  userSeason,
} from "../src";
import { playDay } from "./fixtures";

// 023 (T022): carreira num banco com estaduais, de ponta a ponta no pacote de save.
const NOW = "2026-10-27T00:00:00.000Z";
const bank = generateRegionalBank({ seed: "estaduais-save", states: 3 });

function newCareer(clubId?: string): ReturnType<typeof createSave> {
  const national = bank.clubs.find((club) => !isRegionalOnly(bank, club.id));
  return createSave({
    id: "estaduais",
    now: NOW,
    managerName: "Ana",
    clubId: clubId ?? national?.id ?? "",
    seed: "carreira-estaduais",
    defaultBank: bank,
    noFiring: true,
  });
}

describe("carreira com estaduais", () => {
  it("o clube do jogador está na liga em foco e joga o estadual da região dele", () => {
    const created = newCareer();
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const save = created.save;
    expect(save.league.competitionId).toBe("liga-nacional");
    expect(userSeason(save).clubIds).toContain(save.clubId);
    const competition = regionalCompetitionOf(save.bank, save.clubId);
    expect(save.competitions.map((entry) => entry.competitionId)).toContain(competition?.id);
    // Os clubes só regionais têm finanças e torcida desde o primeiro dia.
    const regional = save.bank.clubs.find((club) => isRegionalOnly(save.bank, club.id));
    expect(save.finances.clubs[regional?.id ?? ""]).toBeDefined();
    expect(save.fans.clubs[regional?.id ?? ""]).toBeDefined();
  });

  it("um clube só regional não pode ser escolhido pelo jogador", () => {
    const regional = bank.clubs.find((club) => isRegionalOnly(bank, club.id));
    const created = newCareer(regional?.id);
    expect(created.ok).toBe(false);
  });

  it("a temporada inteira e a virada funcionam", () => {
    const created = newCareer();
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    let save: SaveFile = created.save;
    while (!isCareerSeasonOver(save)) save = playDay(save);
    const advanced = advanceCareerSeason(save, NOW);
    if (!advanced.ok) throw new Error(JSON.stringify(advanced));
    expect(advanced.save.league.number).toBe(2);
  }, 600_000);
});
