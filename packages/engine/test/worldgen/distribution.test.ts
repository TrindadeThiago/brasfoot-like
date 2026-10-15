import { describe, expect, it } from "vitest";
import { ageOn } from "../../src/calendar/date.js";
import { POSITIONS } from "../../src/model/catalogs.js";
import type { ModPackage } from "../../src/model/types.js";
import { generateDefaultBank } from "../../src/worldgen/generate.js";
import { completeHiddenAttributes } from "../../src/worldgen/hidden.js";
import { DISTRIBUTION_LIMITS as L, tierOf } from "../../src/worldgen/limits.js";
import { at } from "../helpers/build-bank.js";
import { TEST_SEEDS } from "../helpers/seeds.js";

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const share = <T>(items: T[], predicate: (item: T) => boolean) =>
  items.filter(predicate).length / items.length;

function within(label: string, value: number, [min, max]: readonly [number, number]) {
  expect(value, `${label} = ${value} (limite ${min}–${max})`).toBeGreaterThanOrEqual(min);
  expect(value, `${label} = ${value} (limite ${min}–${max})`).toBeLessThanOrEqual(max);
}

function topMean(bank: ModPackage, clubId: string): number {
  const strengths = bank.players
    .filter((player) => player.clubId === clubId)
    .map((player) => player.strength)
    .sort((a, b) => b - a)
    .slice(0, L.topN);
  return mean(strengths);
}

describe.each(TEST_SEEDS)("distribuição do mundo gerado — seed %s (SC-002)", (seed) => {
  const bank = generateDefaultBank({ seed });
  const players = bank.players;
  const [serieA, serieB] = at(bank.competitions, 0).divisions;
  const clubById = new Map(bank.clubs.map((club) => [club.id, club]));
  const reputationOf = (clubId: string) => clubById.get(clubId)?.reputation ?? 0;

  it("FR-030: elencos de 23 a 28 com posições nas faixas", () => {
    for (const club of bank.clubs) {
      const squad = players.filter((player) => player.clubId === club.id);
      within(`elenco de ${club.id}`, squad.length, L.squadSize);
      for (const position of POSITIONS) {
        within(
          `${position} em ${club.id}`,
          squad.filter((player) => player.position === position).length,
          L.positions[position],
        );
      }
    }
  });

  it("FR-031: camadas por reputação", () => {
    const tiersA = (serieA?.clubIds ?? []).map((id) => tierOf(reputationOf(id)));
    const tiersB = (serieB?.clubIds ?? []).map((id) => tierOf(reputationOf(id)));
    within("grandes na Série A", tiersA.filter((tier) => tier === "big").length, L.serieABig);
    within("médios na Série A", tiersA.filter((tier) => tier === "medium").length, L.serieAMedium);
    expect(tiersB.filter((tier) => tier === "big").length).toBeLessThanOrEqual(L.serieBMaxBig);
  });

  it("FR-032: escala de força contida", () => {
    const strengths = players.map((player) => player.strength);
    within("força média", mean(strengths), L.meanStrength);
    expect(share(strengths, (value) => value >= L.starThreshold)).toBeLessThanOrEqual(
      L.maxStarShare,
    );
    expect(
      share(strengths, (value) => value >= L.midRange[0] && value <= L.midRange[1]),
    ).toBeGreaterThanOrEqual(L.minMidShare);
    expect(Math.min(...strengths)).toBeGreaterThanOrEqual(L.minStrength);
  });

  it("FR-033: Série A mais forte que a B e grandes mais fortes que pequenos", () => {
    const meanA = mean((serieA?.clubIds ?? []).map((id) => topMean(bank, id)));
    const meanB = mean((serieB?.clubIds ?? []).map((id) => topMean(bank, id)));
    expect(meanA - meanB, `A ${meanA.toFixed(1)} × B ${meanB.toFixed(1)}`).toBeGreaterThanOrEqual(
      L.minGapSerieAOverB,
    );
    const idsA = serieA?.clubIds ?? [];
    const big = mean(
      idsA.filter((id) => tierOf(reputationOf(id)) === "big").map((id) => topMean(bank, id)),
    );
    const small = mean(
      idsA.filter((id) => tierOf(reputationOf(id)) === "small").map((id) => topMean(bank, id)),
    );
    expect(
      big - small,
      `grandes ${big.toFixed(1)} × pequenos ${small.toFixed(1)}`,
    ).toBeGreaterThanOrEqual(L.minGapBigOverSmallInA);
  });

  it("FR-034: idades", () => {
    const ages = players.map((player) => ageOn(player.birthDate, bank.manifest.referenceDate));
    within("idade mínima", Math.min(...ages), L.ageRange);
    within("idade máxima", Math.max(...ages), L.ageRange);
    within("idade média", mean(ages), L.meanAge);
  });

  it.each(["carreira-1", "carreira-2", "carreira-3"])(
    "FR-035: potencial dos jovens (seed da carreira %s)",
    (careerSeed) => {
      const completed = completeHiddenAttributes(bank, careerSeed);
      for (const player of completed.players) {
        expect(player.hidden.potential).toBeGreaterThanOrEqual(player.strength);
      }
      const young = completed.players.filter(
        (player) => ageOn(player.birthDate, bank.manifest.referenceDate) <= L.youngMaxAge,
      );
      const gap =
        mean(young.map((player) => player.hidden.potential)) -
        mean(young.map((player) => player.strength));
      expect(gap).toBeGreaterThanOrEqual(L.minYoungPotentialGap);
    },
  );

  it("FR-036: características", () => {
    within(
      "com ao menos 1 característica",
      share(players, (player) => player.traits.length >= 1),
      L.traitShareAtLeastOne,
    );
    expect(share(players, (player) => player.traits.length === 2)).toBeLessThanOrEqual(
      L.maxTraitShareTwo,
    );
  });
});
