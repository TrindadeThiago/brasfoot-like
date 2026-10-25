import { describe, expect, it } from "vitest";
import { ensureContracts } from "../../src/market/contracts";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateWorldBank } from "../../src/worldgen/world-example";
import { allSeasons, playSeasons } from "../career/qualification-helpers";

// Limites declarados (Princípio V). O CI roda a versão reduzida; as 30 temporadas de vários países
// rodam em `pnpm sim:world --qualification` (job de simulação do release).
const SEASONS = 10;
const COUNTRIES = 3;
const CLUBS_PER_DIVISION = 8;
/** Nenhuma temporada pode terminar com participante a mais ou a menos em qualquer fase. */
const MAX_VIOLATIONS = 0;

function world() {
  const bank = completeHiddenAttributes(
    generateWorldBank({
      seed: "longo-vagas",
      countries: COUNTRIES,
      divisionsPerCountry: 2,
      clubsPerDivision: CLUBS_PER_DIVISION,
      cup: true,
      qualification: true,
    }),
    "longo-vagas",
  );
  return ensureContracts(bank, Number(bank.manifest.referenceDate.slice(0, 4)), "longo-vagas");
}

describe(`${SEASONS} temporadas com vagas entre competições (021 SC-001, SC-006)`, () => {
  const bank = world();
  const run = playSeasons(bank, "longo-vagas", SEASONS);

  it("toda competição começa com o número certo de participantes e sem clube repetido", () => {
    let violations = 0;
    for (const { start } of run.seasons) {
      for (const league of allSeasons(start)) {
        const competition = bank.competitions.find((entry) => entry.id === league.competitionId);
        for (const season of league.divisions) {
          const wanted = competition?.divisions.find(
            (division) => division.level === season.divisionLevel,
          )?.clubIds.length;
          if (season.clubIds.length !== wanted) violations++;
          if (new Set(season.clubIds).size !== season.clubIds.length) violations++;
        }
        const all = league.divisions.flatMap((season) => season.clubIds);
        if (new Set(all).size !== all.length) violations++;
      }
    }
    expect(violations).toBeLessThanOrEqual(MAX_VIOLATIONS);
  }, 600_000);

  it("a supercopa de cada país tem sempre 2 clubes do país e o histórico registra as vagas", () => {
    const records = run.history.qualificationHistory ?? [];
    expect(records).toHaveLength(SEASONS);
    for (const { start } of run.seasons) {
      for (const league of allSeasons(start).filter((entry) =>
        entry.competitionId.startsWith("supercopa-"),
      )) {
        const clubs = league.divisions[0]?.clubIds ?? [];
        expect(clubs).toHaveLength(2);
        const country = bank.competitions.find(
          (entry) => entry.id === league.competitionId,
        )?.countryId;
        expect(
          clubs.every((id) => bank.clubs.find((club) => club.id === id)?.countryId === country),
        ).toBe(true);
      }
    }
    for (const record of records) {
      const perCompetition = new Map<string, string[]>();
      for (const entry of record.entries) {
        perCompetition.set(entry.competitionId, [
          ...(perCompetition.get(entry.competitionId) ?? []),
          entry.clubId,
        ]);
      }
      for (const [competitionId, clubs] of perCompetition) {
        expect(new Set(clubs).size, `${competitionId} na temporada ${record.number}`).toBe(
          clubs.length,
        );
      }
    }
  }, 600_000);

  it("a taça alimentada tem 6 clubes por edição e os 2 da elite entram na 2ª fase (entrada tardia)", () => {
    const cups = bank.competitions.filter((entry) => entry.id.startsWith("taca-"));
    expect(cups).toHaveLength(COUNTRIES);
    for (const { start } of run.seasons) {
      for (const cup of cups) {
        const live = start.world.competitions.find((entry) => entry.id === cup.id);
        const clubs = live?.divisions[0]?.clubIds ?? [];
        expect(clubs, cup.id).toHaveLength(6);
        const entries = live?.format.type === "knockout" ? (live.format.entries ?? []) : [];
        expect(entries).toHaveLength(1);
        expect(entries[0]?.phase).toBe(1);
        expect(entries[0]?.clubIds).toHaveLength(2);
        expect(entries[0]?.clubIds.every((id) => clubs.includes(id))).toBe(true);
        const season = allSeasons(start).find((entry) => entry.competitionId === cup.id);
        expect(season?.divisions[0]?.clubIds).toEqual(clubs);
      }
    }
  }, 600_000);

  it("os participantes de cada edição são exatamente os do registro da temporada anterior", () => {
    const records = run.history.qualificationHistory ?? [];
    run.seasons.slice(1).forEach(({ start }, index) => {
      const record = records[index];
      for (const league of allSeasons(start)) {
        const wanted = (record?.entries ?? [])
          .filter((entry) => entry.competitionId === league.competitionId)
          .map((entry) => entry.clubId)
          .sort();
        if (wanted.length === 0) continue;
        const clubs = league.divisions.flatMap((division) => division.clubIds).sort();
        expect(clubs, `${league.competitionId} na temporada ${league.number}`).toEqual(wanted);
        // o mundo vivo também (as entradas tardias e o `clubIds` das divisões)
        const live = start.world.competitions.find((entry) => entry.id === league.competitionId);
        expect([...(live?.divisions.flatMap((division) => division.clubIds) ?? [])].sort()).toEqual(
          wanted,
        );
      }
    });
  }, 600_000);

  it("o repasse acontece (campeão da liga que também ganha a copa) e preenche a vaga", () => {
    const entries = (run.history.qualificationHistory ?? []).flatMap((record) => record.entries);
    const passes = entries.filter((entry) => entry.via === "pass");
    expect(passes.length).toBeGreaterThan(0);
    expect(passes.every((entry) => entry.passedFrom?.reason === "duplicate")).toBe(true);
  });

  it("é determinística: repetir com salvar e carregar no meio dá as mesmas vagas", () => {
    const again = playSeasons(bank, "longo-vagas", SEASONS, { roundTrip: true });
    expect(again.history.qualificationHistory).toEqual(run.history.qualificationHistory);
  }, 600_000);
});
