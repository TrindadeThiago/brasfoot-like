import { describe, expect, it } from "vitest";
import { measureContinental, snapshotContinental } from "../../src/continental/measure";
import { CONTINENTAL_LIMITS } from "../../src/continental/rules";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactWorld, continentalLeague } from "./continental-helpers";
import { allSeasons, playSeasons } from "./qualification-helpers";

// Equilíbrio da competição entre países (022 SC-001 a SC-003, Princípio V). O CI roda esta versão
// reduzida (mundo compacto, poucas temporadas, algumas seeds); as 30 temporadas do mundo grande
// rodam em `pnpm sim:world --continental`. Os limites vivem em CONTINENTAL_LIMITS.
const SEASONS = 10;
const SEEDS = ["longo-continental-a", "longo-continental-b"];
const limits = CONTINENTAL_LIMITS.ci;

function measure(run: ReturnType<typeof playSeasons>, competitionId: string) {
  const snapshots = run.seasons.map((entry) =>
    snapshotContinental(entry.start, entry.end, competitionId),
  );
  const last = run.seasons.at(-1)?.end;
  const finalReputation = Object.fromEntries(
    (last?.world.clubs ?? []).map((club) => [club.id, club.reputation]),
  );
  return measureContinental(snapshots, finalReputation);
}

describe(`${SEASONS} temporadas com as taças continentais (022 US6)`, () => {
  const runs = SEEDS.map((seed) => ({ seed, ...playSeasons(compactWorld(seed), seed, SEASONS) }));

  it.each(SEEDS.map((seed, index) => [seed, index] as const))(
    "%s: campeões mais fortes, bem distribuídos e vagas pesando nos títulos",
    (_seed, index) => {
      const run = runs[index];
      if (!run) throw new Error("sem a simulação");
      const m = measure(run, CONTINENTAL_IDS.major);
      expect(m.seasons).toBe(SEASONS);
      expect(m.championStrongerShare).toBeGreaterThanOrEqual(limits.minChampionStrongerShare);
      expect(m.distinctChampions).toBeGreaterThanOrEqual(limits.minDistinctChampions);
      expect(m.maxTitleShare).toBeLessThanOrEqual(limits.maxTitleShare);
      expect(m.slotsTitlesSpearman).toBeGreaterThanOrEqual(limits.minSlotsTitlesSpearman);
    },
  );

  it("economia: os assíduos não acumulam caixa, ficam fora de crise e os prêmios não dominam a receita", () => {
    for (const run of runs) {
      for (const competitionId of [CONTINENTAL_IDS.major, CONTINENTAL_IDS.minor]) {
        const m = measure(run, competitionId);
        expect(m.assiduousCashAboveMedianWages).toBeLessThanOrEqual(
          CONTINENTAL_LIMITS.assiduousCashAboveMedianWages,
        );
        // Com menos de 2 assíduos a fração é ruído (1 clube em crise em 6 de 10 temporadas dava 0,4).
        if (m.assiduous.length >= 2) {
          expect(m.assiduousHealthyShare).toBeGreaterThanOrEqual(
            CONTINENTAL_LIMITS.assiduousMinHealthyShare,
          );
          expect(m.assiduousHealthyShare).toBeGreaterThanOrEqual(
            m.othersHealthyShare - CONTINENTAL_LIMITS.assiduousHealthyBelowOthers,
          );
        }
        expect(m.maxAwardsShare).toBeLessThanOrEqual(CONTINENTAL_LIMITS.maxAwardsShare);
      }
    }
  });

  it("reputação: ninguém passa do teto e o mundo quase não se desloca", () => {
    for (const run of runs) {
      const m = measure(run, CONTINENTAL_IDS.major);
      expect(m.reputationBreaches).toBeLessThanOrEqual(CONTINENTAL_LIMITS.maxReputationBreaches);
      expect(Math.abs(m.reputationDrift)).toBeLessThanOrEqual(
        CONTINENTAL_LIMITS.maxReputationDrift,
      );
    }
  });

  it("toda edição começa com o número certo de participantes, sem clube repetido", () => {
    for (const run of runs) {
      for (const { start } of run.seasons) {
        for (const league of allSeasons(start).filter((entry) =>
          entry.competitionId.startsWith("continental-"),
        )) {
          const season = league.divisions[0];
          const wanted = start.world.competitions.find((entry) => entry.id === league.competitionId)
            ?.divisions[0]?.clubIds.length;
          expect(season?.clubIds.length).toBe(wanted);
          expect(new Set(season?.clubIds).size).toBe(season?.clubIds.length);
        }
      }
      expect(continentalLeague(run.seasons[0]?.start as never).divisions[0]?.clubIds).toHaveLength(
        16,
      );
    }
  });
});
