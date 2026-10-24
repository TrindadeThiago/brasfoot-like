import { readFileSync } from "node:fs";
import { join } from "node:path";
import { completeCareerDay, generateStagesBank, generateWorldBank } from "@brasfoot-like/engine";
import {
  advanceCareerSeason,
  createSave,
  isCareerSeasonOver,
  type SaveFile,
  seasonStateOf,
  withDayResult,
} from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";
import { readModPackage, writeModPackage } from "../src";
import { DEFAULT_MOD, EXAMPLE_MOD, modBank, STAGES_MOD, WORLD_MOD } from "./fixtures";

const PUBLIC_ZIP = join(import.meta.dirname, "../../../apps/web/public/mods/exemplo.zip");

/** Joga a temporada inteira dia a dia (liga e copa), com a escalação do jogador. */
function playSeason(start: SaveFile): SaveFile {
  let save = start;
  while (!isCareerSeasonOver(save)) {
    const result = completeCareerDay(seasonStateOf(save), save.seed, save.clubId, undefined, {
      [save.clubId]: save.lineup,
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    save = withDayResult(save, result.state);
  }
  return save;
}

describe("mod de exemplo (015 US3, critério de aceite 2, SC-003)", () => {
  const example = modBank(EXAMPLE_MOD);

  it("é válido e tem país e competição diferentes do padrão", () => {
    const result = readModPackage(writeModPackage(example));
    if (!result.ok) throw new Error(JSON.stringify(result.errors.slice(0, 3)));
    const standard = modBank(DEFAULT_MOD);
    expect(result.summary.id).toBe("exemplo-norvalia");
    expect(result.bank.countries.map((country) => country.id)).not.toEqual(
      standard.countries.map((country) => country.id),
    );
    expect(result.bank.competitions[0]?.name).not.toBe(standard.competitions[0]?.name);
    expect(result.summary.divisions.map((division) => division.clubs)).toEqual([12, 12]);
  });

  it("uma carreira joga a temporada inteira e a virada", () => {
    const created = createSave({
      id: "exemplo",
      now: "2026-10-20T00:00:00.000Z",
      managerName: "Ana",
      clubId: example.clubs[0]?.id ?? "",
      seed: "exemplo",
      defaultBank: example,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const end = playSeason(created.save);
    const turned = advanceCareerSeason(end, "2026-10-20T00:00:00.000Z");
    if (!turned.ok) throw new Error("virada");
    expect(turned.save.history).toHaveLength(end.history.length + 1);
  }, 120_000);

  it("o pacote público é o mesmo gerado a partir de mods/exemplo", () => {
    expect(new Uint8Array(readFileSync(PUBLIC_ZIP))).toEqual(writeModPackage(example));
  });
});

describe("mod de exemplo das fases (019)", () => {
  const stages = modBank(STAGES_MOD);

  it("é válido, igual ao que o gerador produz, e a divisão de baixo é em grupos e mata-mata", () => {
    const result = readModPackage(writeModPackage(stages));
    if (!result.ok) throw new Error(JSON.stringify(result.errors.slice(0, 3)));
    expect(result.summary.id).toBe("exemplo-fases");
    const generated = generateStagesBank({
      seed: "fases-1",
      manifest: {
        id: "exemplo-fases",
        name: "Fases (exemplo)",
        author: "brasfoot-like",
        version: "1.0.0",
      },
    });
    expect(result.bank).toEqual(generated);
    const lower = stages.competitions[0]?.divisions[1];
    expect(lower?.stages?.map((stage) => stage.type)).toEqual(["groups", "knockout"]);
    expect(stages.clubs.some((club) => club.region !== undefined)).toBe(true);
  });

  it("joga uma temporada inteira", () => {
    const result = readModPackage(writeModPackage(stages));
    if (!result.ok) throw new Error("mod inválido");
    const created = createSave({
      id: "fases",
      now: "2026-10-23T00:00:00.000Z",
      managerName: "Ana",
      clubId: stages.competitions[0]?.divisions[1]?.clubIds[0] as string,
      seed: "exemplo-fases",
      defaultBank: result.bank,
      noFiring: true,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const end = playSeason(created.save);
    expect(isCareerSeasonOver(end)).toBe(true);
    expect(advanceCareerSeason(end, "2026-10-24T00:00:00.000Z").ok).toBe(true);
  }, 300_000);
});

describe("mod de exemplo de vários países (020)", () => {
  const world = modBank(WORLD_MOD);

  it("é válido, igual ao que o gerador produz, com 3 países de estruturas diferentes", () => {
    const result = readModPackage(writeModPackage(world));
    if (!result.ok) throw new Error(JSON.stringify(result.errors.slice(0, 3)));
    expect(result.summary.id).toBe("exemplo-mundo");
    const generated = generateWorldBank({
      seed: "mundo-exemplo-1",
      countries: 3,
      divisionsPerCountry: 2,
      clubsPerDivision: 12,
      perCountry: [{ divisions: 1 }, { divisions: 2 }, { divisions: 2, cup: true }],
      manifest: {
        id: "exemplo-mundo",
        name: "Mundo (exemplo)",
        author: "brasfoot-like",
        version: "1.0.0",
      },
    });
    expect(world.clubs).toEqual(generated.clubs);
    expect(world.players).toEqual(generated.players);
    expect(world.competitions).toEqual(generated.competitions);
    expect(world.countries.map((country) => country.id)).toEqual(
      generated.countries.map((country) => country.id),
    );
    expect(world.countries).toHaveLength(3);
    const structure = world.countries.map((country) => {
      const own = world.competitions.filter((competition) => competition.countryId === country.id);
      return {
        divisions: own[0]?.divisions.length,
        cup: own.some((competition) => competition.format.type === "knockout"),
      };
    });
    expect(structure).toEqual([
      { divisions: 1, cup: false },
      { divisions: 2, cup: false },
      { divisions: 2, cup: true },
    ]);
    expect(world.countries[1]?.rules?.foreignLimit).toBe(5);
    const wages = world.competitions
      .filter((competition) => competition.format.type !== "knockout")
      .map((competition) => competition.economy?.wageFactorPct);
    expect(new Set(wages).size).toBe(3);
  });

  it("uma carreira num país que não é o primeiro joga alguns dias", () => {
    const clubId = world.clubs.find((club) => club.countryId === world.countries[2]?.id)?.id ?? "";
    const created = createSave({
      id: "mundo",
      now: "2026-10-24T12:00:00.000Z",
      managerName: "Ana",
      clubId,
      seed: "mundo-exemplo",
      defaultBank: world,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    let save = created.save;
    for (let day = 0; day < 6; day++) {
      const result = completeCareerDay(seasonStateOf(save), save.seed, save.clubId, undefined, {
        [save.clubId]: save.lineup,
      });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      save = withDayResult(save, result.state);
    }
    expect(save.league.competitionId).toContain(world.countries[2]?.code.toLowerCase());
  }, 60_000);
});
