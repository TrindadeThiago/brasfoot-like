import { describe, expect, it } from "vitest";
import { berthSize } from "../../src/qualification/pools";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { generateWorldBank } from "../../src/worldgen/world-example";
import blocklist from "../fixtures/blocklist.json" with { type: "json" };

function major(bank: ReturnType<typeof generateWorldBank>) {
  const competition = bank.competitions.find((entry) => entry.id === CONTINENTAL_IDS.major);
  if (!competition) throw new Error("sem a competição continental");
  return competition;
}

function perCountry(bank: ReturnType<typeof generateWorldBank>) {
  const country = new Map(bank.clubs.map((club) => [club.id, club.countryId]));
  const counts = new Map<string, number>();
  for (const id of major(bank).divisions[0]?.clubIds ?? []) {
    const value = country.get(id) ?? "?";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

describe("banco de teste com a competição continental (022)", () => {
  it("compacta: 16 clubes em 4 grupos, vagas por país e mais vagas para o país mais forte", () => {
    const bank = generateWorldBank({
      seed: "continental-compact",
      countries: 5,
      divisionsPerCountry: 1,
      clubsPerDivision: 8,
      cup: true,
      continental: "compact",
    });
    const competition = major(bank);
    const division = competition.divisions[0];
    expect(competition.countryId).toBeUndefined();
    expect(division?.clubIds).toHaveLength(16);
    const total = (division?.berths ?? []).reduce(
      (sum, berth) => sum + berthSize(bank, berth.source),
      0,
    );
    expect(total).toBe(16);
    expect(competition.format.type).toBe("stages");
    expect(competition.schedule).toEqual({ weekday: 2, startWeek: 2, everyWeeks: 1 });

    const counts = perCountry(bank);
    expect(counts.size).toBe(5);
    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(4);
    const strongest = [...bank.competitions]
      .filter((entry) => entry.economy?.wageFactorPct !== undefined && entry.countryId)
      .sort((a, b) => (b.economy?.wageFactorPct ?? 0) - (a.economy?.wageFactorPct ?? 0))[0];
    const most = Math.max(...counts.values());
    expect(counts.get(strongest?.countryId ?? "")).toBe(most);
  });

  it("completa: 40 clubes, 16 na preliminar e 24 direto aos grupos, em 10 países", () => {
    const bank = generateWorldBank({
      seed: "continental-full",
      countries: 10,
      divisionsPerCountry: 1,
      clubsPerDivision: 12,
      cup: true,
      continental: "full",
    });
    const competition = major(bank);
    const division = competition.divisions[0];
    expect(division?.clubIds).toHaveLength(40);
    expect(competition.format.type === "stages" && competition.format.stages).toHaveLength(3);
    const stages = competition.format.type === "stages" ? competition.format.stages : [];
    expect(stages[1]?.enter).toHaveLength(24);
    const draw = stages[1]?.type === "groups" ? stages[1].draw : undefined;
    expect(draw?.rules).toEqual([{ kind: "separate", attribute: "country" }]);
    const counts = perCountry(bank);
    expect(counts.size).toBe(10);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(8);
    expect(Math.max(...counts.values())).toBeGreaterThan(Math.min(...counts.values()));
  }, 120_000);

  it("é determinístico: mesma seed, mesmo banco", () => {
    const options = {
      seed: "continental-det",
      countries: 5,
      divisionsPerCountry: 1,
      clubsPerDivision: 8,
      cup: true,
      continental: "compact",
    } as const;
    expect(major(generateWorldBank(options))).toEqual(major(generateWorldBank(options)));
  });

  it("mundo pequeno demais não gera a competição", () => {
    expect(() =>
      generateWorldBank({
        seed: "continental-small",
        countries: 3,
        divisionsPerCountry: 1,
        clubsPerDivision: 8,
        continental: "compact",
      }),
    ).toThrow();
  });

  it("os nomes da competição são fictícios (Princípio IV)", () => {
    const bank = generateWorldBank({
      seed: "continental-names",
      countries: 5,
      divisionsPerCountry: 1,
      clubsPerDivision: 8,
      continental: "compact",
    });
    const competition = major(bank);
    const texts = [
      competition.name,
      ...competition.divisions.map((division) => division.name),
      ...(competition.format.type === "stages"
        ? competition.format.stages.flatMap((stage) =>
            stage.type === "knockout" ? stage.phases.map((phase) => phase.name) : [],
          )
        : []),
    ].map((text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase());
    const terms = [...blocklist.competitions, ...blocklist.places, ...blocklist.clubs].map((term) =>
      term.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(),
    );
    const hits = texts.flatMap((text) => terms.filter((term) => text.includes(term)));
    expect(hits).toEqual([]);
  });
});
