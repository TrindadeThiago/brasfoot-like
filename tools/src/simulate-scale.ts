// O mundo grande (020 FR-019): N países, 30 temporadas sem interação, com tamanho do save, tempo
// por dia e por virada, memória e faixas por país conferidos contra SCALE_LIMITS.
// Uso: pnpm sim:world --scale [--countries 10] [--seasons 30] [--seed mundo-grande]
import { gzipSync } from "node:zlib";
import {
  CONTINENTAL_LIMITS,
  type ContinentalSnapshot,
  completeCareerDay,
  generateRegionalBank,
  generateWorldBank,
  isCountryMain,
  isRegionalOnly,
  type ModPackage,
  measureContinental,
  measureWorld,
  snapshotContinental,
} from "@brasfoot-like/engine";
import {
  advanceCareerSeason,
  createSave,
  isCareerSeasonOver,
  managedClubId,
  type SaveFile,
  SCALE_LIMITS,
  seasonStateOf,
  withDayResult,
} from "@brasfoot-like/save";

/** Faixas por país (as da 009 e da 008; o teto de força é o do jogo, ver world-long-run.test.ts). */
export const COUNTRY_LIMITS = {
  mean: [55, 63],
  p10: [43, 54],
  p50: [54, 63],
  p90: [63, 75],
  max: [78, 99],
  meanAge: [24, 27.5],
  minHealthyShare: 0.8,
} as const;

export interface SimulateScaleOptions {
  seed: string;
  countries: number;
  seasons: number;
  /** Quantas temporadas medir só de tamanho e tempo, sem as faixas por país (testes rápidos). */
  quiet?: boolean;
  /** Mostra, a cada temporada, o caixa mediano e as crises de cada país (diagnóstico). */
  detail?: boolean;
  /** Contratações internacionais da IA por clube e janela (diagnóstico; padrão do jogo). */
  international?: number;
  /** Escala econômica dos países: `uniform` deixa todos iguais (diagnóstico). */
  economy?: "varied" | "uniform";
  /**
   * Vagas entre competições (021): supercopa e taça alimentada em cada país; confere a cada
   * temporada o número de participantes de cada divisão e a unicidade dos clubes.
   */
  qualification?: boolean;
  /** Competição entre países (022): a taça continental maior, completa ou compacta. */
  continental?: "full" | "compact";
  /** Estaduais (023): um país com a liga nacional e `states` estaduais de duas divisões. */
  regional?: { states: number };
}

const NOW = "2026-10-24T12:00:00.000Z";
const MB = 1024 * 1024;
const within = (value: number, [min, max]: readonly [number, number]) =>
  value >= min && value <= max;
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

function playDay(save: SaveFile): SaveFile {
  const managed = managedClubId(save);
  const result = completeCareerDay(
    seasonStateOf(save),
    save.seed,
    managed,
    undefined,
    managed ? { [managed]: save.lineup } : undefined,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return withDayResult(save, result.state);
}

export interface ScaleReport {
  exitCode: number;
  lines: string[];
  dayMs: number;
  turnoverMs: number;
  heapBytes: number;
  startSizes: number[];
  lastRoundSizes: number[];
  exportedBytes: number;
  totalMs: number;
}

export function runSimulateScale(options: SimulateScaleOptions): ScaleReport {
  const started = performance.now();
  const bank = structuredClone(
    options.regional
      ? generateRegionalBank({ seed: options.seed, states: options.regional.states })
      : generateWorldBank({
          seed: options.seed,
          countries: options.countries,
          divisionsPerCountry: 2,
          clubsPerDivision: 20,
          cup: true,
          ...(options.qualification ? { qualification: true } : {}),
          ...(options.continental ? { continental: options.continental } : {}),
          ...(options.international !== undefined
            ? { aiInternational: options.international }
            : {}),
          ...(options.economy ? { economy: options.economy } : {}),
        }),
  ) as ModPackage;
  const first = options.regional
    ? bank.clubs.find((club) => !isRegionalOnly(bank, club.id))
    : bank.clubs.find((club) => club.countryId === bank.countries[0]?.id);
  const created = createSave({
    id: "escala",
    now: NOW,
    managerName: "Ana",
    clubId: first?.id ?? "",
    seed: options.seed,
    defaultBank: bank,
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let save = created.save;
  const lines = [
    `${options.regional ? `Mundo com estaduais — ${options.regional.states} estados` : `Mundo grande — ${options.countries} países`}, ${bank.clubs.length} clubes, ${bank.players.length} jogadores, ${options.seasons} temporadas, seed "${options.seed}"`,
    "",
    "Temp.  dia(ms)  virada(ms)  início(MB)  última rodada(MB)  heap(MB)  problemas",
  ];
  // Participantes esperados por competição e divisão: os do banco (021 SC-001).
  const expected = new Map(
    bank.competitions.flatMap((competition) =>
      competition.divisions.map(
        (division) => [`${competition.id}/${division.level}`, division.clubIds.length] as const,
      ),
    ),
  );
  let ok = true;
  let heap = 0;
  const startSizes: number[] = [];
  const lastRoundSizes: number[] = [];
  const dayTimes: number[] = [];
  const turnoverTimes: number[] = [];
  let exported = 0;
  /** Estados no início e no fim de cada temporada, para as medidas das competições entre países. */
  let continentalStart: ReturnType<typeof seasonStateOf> | undefined;
  const continentalSnapshots = new Map<string, ContinentalSnapshot[]>();
  let finalReputation: Record<string, number> = {};
  const international = bank.competitions.filter((entry) => entry.countryId === undefined);
  for (let season = 1; season <= options.seasons; season++) {
    if (options.continental) continentalStart = seasonStateOf(save);
    const startSize = JSON.stringify(save).length;
    startSizes.push(startSize);
    const seasonDays: number[] = [];
    let lastSize = 0;
    while (!isCareerSeasonOver(save)) {
      const t0 = performance.now();
      save = playDay(save);
      seasonDays.push(performance.now() - t0);
      heap = Math.max(heap, process.memoryUsage().heapUsed);
    }
    lastSize = JSON.stringify(save).length;
    lastRoundSizes.push(lastSize);
    if (options.continental && continentalStart) {
      // Só números por temporada: guardar o estado inteiro de cada uma estourava a memória.
      const end = seasonStateOf(save);
      for (const competition of international) {
        const list = continentalSnapshots.get(competition.id) ?? [];
        list.push(snapshotContinental(continentalStart, end, competition.id));
        continentalSnapshots.set(competition.id, list);
      }
      finalReputation = Object.fromEntries(
        end.world.clubs.map((club) => [club.id, club.reputation]),
      );
      continentalStart = undefined;
    }
    const problems: string[] = [];
    if (options.qualification || options.regional) {
      const state = seasonStateOf(save);
      for (const league of [state.league, ...state.competitions]) {
        const all = league.divisions.flatMap((division) => division.clubIds);
        if (new Set(all).size !== all.length) {
          problems.push(`${league.competitionId}: clube repetido`);
        }
        // Os participantes da edição são os que a resolução das vagas registrou.
        if (
          league.origins &&
          [...all].sort().join() !== Object.keys(league.origins).sort().join()
        ) {
          problems.push(`${league.competitionId}: participantes diferentes das origens`);
        }
        for (const division of league.divisions) {
          const wanted = expected.get(`${league.competitionId}/${division.divisionLevel}`);
          // Quem chegou por ligação durante a temporada (022) não conta entre os da edição.
          const arrived = Object.values(league.origins ?? {}).filter(
            (entry) => entry.kind === "dropIn",
          ).length;
          if (wanted !== undefined && division.clubIds.length - arrived !== wanted) {
            problems.push(
              `${league.competitionId}/${division.divisionLevel}: ${division.clubIds.length} clubes em vez de ${wanted}`,
            );
          }
        }
      }
    }
    if (!options.quiet) {
      const state = seasonStateOf(save);
      const date = `${save.league.year}-12-31`;
      for (const league of [state.league, ...state.competitions].filter((entry) =>
        isCountryMain(save.bank, entry.competitionId),
      )) {
        const m = measureWorld(save.bank, league, date);
        const label = league.competitionId;
        if (!within(m.mean, COUNTRY_LIMITS.mean))
          problems.push(`${label}: média ${m.mean.toFixed(1)}`);
        if (!within(m.p10, COUNTRY_LIMITS.p10)) problems.push(`${label}: p10 ${m.p10}`);
        if (!within(m.p50, COUNTRY_LIMITS.p50)) problems.push(`${label}: p50 ${m.p50}`);
        if (!within(m.p90, COUNTRY_LIMITS.p90)) problems.push(`${label}: p90 ${m.p90}`);
        if (!within(m.max, COUNTRY_LIMITS.max)) problems.push(`${label}: máx ${m.max}`);
        if (!within(m.meanAge, COUNTRY_LIMITS.meanAge))
          problems.push(`${label}: idade ${m.meanAge.toFixed(1)}`);
        const clubs = league.divisions.flatMap((division) => division.clubIds);
        const crisis = clubs.filter((id) => save.finances.clubs[id]?.inCrisis).length;
        if ((clubs.length - crisis) / clubs.length < COUNTRY_LIMITS.minHealthyShare) {
          problems.push(`${label}: ${crisis} clubes em crise`);
        }
      }
    }
    if (options.detail) {
      const state = seasonStateOf(save);
      for (const league of [state.league, ...state.competitions].filter((entry) =>
        isCountryMain(save.bank, entry.competitionId),
      )) {
        const clubs = league.divisions.flatMap((division) => division.clubIds);
        const cash = clubs.map((id) => save.finances.clubs[id]?.cash ?? 0).sort((x, y) => x - y);
        const crisis = clubs.filter((id) => save.finances.clubs[id]?.inCrisis).length;
        const wage = save.bank.competitions.find((c) => c.id === league.competitionId)?.economy
          ?.wageFactorPct;
        const own = new Set(clubs);
        const totals: Record<string, number> = {};
        for (const entry of save.finances.ledger) {
          if (own.has(entry.clubId)) {
            totals[entry.category] =
              (totals[entry.category] ?? 0) + entry.amount / clubs.length / ((wage ?? 100) / 100);
          }
        }
        const parts = Object.entries(totals)
          .map(([key, value]) => `${key}=${(value / 1e6).toFixed(2)}`)
          .join(" ");
        console.error(
          `  t${season} ${league.competitionId} salário=${wage}% caixa mediano=${((cash[Math.floor(cash.length / 2)] ?? 0) / 1e6).toFixed(1)} mi crise=${crisis} | por clube/escala (mi): ${parts}`,
        );
      }
    }
    if (season === options.seasons) {
      exported = gzipSync(JSON.stringify(save), { level: 6 }).length;
    }
    const t1 = performance.now();
    const turned = advanceCareerSeason(save, NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    save = turned.save;
    const turnoverMs = performance.now() - t1;
    turnoverTimes.push(turnoverMs);
    dayTimes.push(median(seasonDays));
    heap = Math.max(heap, process.memoryUsage().heapUsed);
    ok &&= problems.length === 0;
    lines.push(
      `${problems.length === 0 ? "✓" : "✗"} ${String(season).padStart(3)} ${median(seasonDays).toFixed(0).padStart(8)} ${turnoverMs.toFixed(0).padStart(11)} ${(startSize / MB).toFixed(2).padStart(11)} ${(lastSize / MB).toFixed(2).padStart(18)} ${(heap / MB).toFixed(0).padStart(9)}  ${problems.slice(0, 3).join("; ")}`,
    );
  }
  const totalMs = performance.now() - started;
  const dayMs = median(dayTimes);
  const turnoverMs = median(turnoverTimes);
  const last = startSizes.at(-1) ?? 0;
  const growthWindow = startSizes.slice(9, 30);
  const growth =
    growthWindow.length > 1
      ? ((growthWindow.at(-1) ?? 0) - (growthWindow[0] ?? 0)) / (growthWindow.length - 1)
      : 0;
  const full = options.seasons >= 30;
  const checks: [boolean, string][] = [
    [
      dayMs <= SCALE_LIMITS.dayMs,
      `dia de jogos (mediana): ${dayMs.toFixed(0)} ms (≤ ${SCALE_LIMITS.dayMs})`,
    ],
    [
      turnoverMs <= SCALE_LIMITS.turnoverMs,
      `virada (mediana): ${turnoverMs.toFixed(0)} ms (≤ ${SCALE_LIMITS.turnoverMs})`,
    ],
    [
      heap <= SCALE_LIMITS.heapBytes,
      `pico de heap: ${(heap / MB).toFixed(0)} MB (≤ ${SCALE_LIMITS.heapBytes / MB})`,
    ],
    [
      Math.max(0, ...lastRoundSizes) <= SCALE_LIMITS.saveLastRoundBytes,
      `maior save (última rodada): ${(Math.max(0, ...lastRoundSizes) / MB).toFixed(2)} MB (≤ ${SCALE_LIMITS.saveLastRoundBytes / MB})`,
    ],
    [
      exported <= SCALE_LIMITS.exportedBytes,
      `arquivo exportado: ${(exported / MB).toFixed(2)} MB (≤ ${SCALE_LIMITS.exportedBytes / MB})`,
    ],
  ];
  if (full) {
    checks.push(
      [
        last <= SCALE_LIMITS.saveStart31Bytes,
        `save no início da temporada 31: ${(last / MB).toFixed(2)} MB (≤ ${SCALE_LIMITS.saveStart31Bytes / MB})`,
      ],
      [
        growth <= SCALE_LIMITS.growthPerSeasonBytes,
        `crescimento por temporada (10ª–30ª): ${(growth / 1024).toFixed(0)} KB (≤ ${SCALE_LIMITS.growthPerSeasonBytes / 1024})`,
      ],
      [
        totalMs <= SCALE_LIMITS.thirtySeasonsMs,
        `30 temporadas: ${(totalMs / 60000).toFixed(1)} min (≤ ${SCALE_LIMITS.thirtySeasonsMs / 60000})`,
      ],
    );
  }
  if (options.continental) {
    // Equilíbrio das competições entre países (022 SC-001 a SC-003), com os limites declarados.
    const limits = full ? CONTINENTAL_LIMITS.full : CONTINENTAL_LIMITS.ci;
    for (const competition of bank.competitions.filter((entry) => entry.countryId === undefined)) {
      const m = measureContinental(continentalSnapshots.get(competition.id) ?? [], finalReputation);
      const major =
        competition === bank.competitions.find((entry) => entry.countryId === undefined);
      lines.push(
        "",
        `${competition.name}: ${m.seasons} edições, ${m.distinctChampions} campeões distintos, maior parcela de títulos ${(100 * m.maxTitleShare).toFixed(0)}%, campeão mais forte em ${(100 * m.championStrongerShare).toFixed(0)}% das edições, Spearman vagas×títulos ${m.slotsTitlesSpearman.toFixed(2)}`,
        `  assíduos: ${m.assiduous.length}; caixa acima da mediana ${m.assiduousCashAboveMedianWages.toFixed(2)} folhas; fora de crise ${(100 * m.assiduousHealthyShare).toFixed(0)}% (demais ${(100 * m.othersHealthyShare).toFixed(0)}%); maior parcela de prêmios na receita ${(100 * m.maxAwardsShare).toFixed(1)}%; reputação: ${m.reputationBreaches} acima do teto, deslocamento ${m.reputationDrift.toFixed(2)}`,
      );
      if (major) {
        checks.push(
          [
            m.championStrongerShare >= limits.minChampionStrongerShare,
            `${competition.name}: campeão mais forte em ${(100 * m.championStrongerShare).toFixed(0)}% das edições (≥ ${100 * limits.minChampionStrongerShare}%)`,
          ],
          [
            m.distinctChampions >= limits.minDistinctChampions,
            `${competition.name}: ${m.distinctChampions} campeões distintos (≥ ${limits.minDistinctChampions})`,
          ],
          [
            m.maxTitleShare <= limits.maxTitleShare,
            `${competition.name}: maior parcela de títulos ${(100 * m.maxTitleShare).toFixed(0)}% (≤ ${100 * limits.maxTitleShare}%)`,
          ],
          [
            m.slotsTitlesSpearman >= limits.minSlotsTitlesSpearman,
            `${competition.name}: vagas × títulos ${m.slotsTitlesSpearman.toFixed(2)} (≥ ${limits.minSlotsTitlesSpearman})`,
          ],
        );
      }
      checks.push(
        [
          m.assiduousCashAboveMedianWages <= CONTINENTAL_LIMITS.assiduousCashAboveMedianWages,
          `${competition.name}: caixa dos assíduos ${m.assiduousCashAboveMedianWages.toFixed(2)} folhas acima da mediana (≤ ${CONTINENTAL_LIMITS.assiduousCashAboveMedianWages})`,
        ],
        [
          m.assiduousHealthyShare >= CONTINENTAL_LIMITS.assiduousMinHealthyShare &&
            m.assiduousHealthyShare >=
              m.othersHealthyShare - CONTINENTAL_LIMITS.assiduousHealthyBelowOthers,
          `${competition.name}: assíduos fora de crise ${(100 * m.assiduousHealthyShare).toFixed(0)}% (≥ ${100 * CONTINENTAL_LIMITS.assiduousMinHealthyShare}% e perto dos demais)`,
        ],
        [
          m.maxAwardsShare <= CONTINENTAL_LIMITS.maxAwardsShare,
          `${competition.name}: prêmios até ${(100 * m.maxAwardsShare).toFixed(1)}% da receita (≤ ${100 * CONTINENTAL_LIMITS.maxAwardsShare}%)`,
        ],
        [
          m.reputationBreaches <= CONTINENTAL_LIMITS.maxReputationBreaches &&
            Math.abs(m.reputationDrift) <= CONTINENTAL_LIMITS.maxReputationDrift,
          `${competition.name}: reputação sem passar do teto e com deslocamento ${m.reputationDrift.toFixed(2)} (≤ ${CONTINENTAL_LIMITS.maxReputationDrift})`,
        ],
      );
    }
  }
  lines.push("");
  for (const [passed, text] of checks) {
    ok &&= passed;
    lines.push(`${passed ? "✓" : "✗"} ${text}`);
  }
  return {
    exitCode: ok ? 0 : 1,
    lines,
    dayMs,
    turnoverMs,
    heapBytes: heap,
    startSizes,
    lastRoundSizes,
    exportedBytes: exported,
    totalMs,
  };
}
