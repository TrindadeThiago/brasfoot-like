import { clubDivision, divisionSeason } from "../career/league";
import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import { createRng } from "../rng/xoshiro";
import type { Fixture, MatchRecord } from "../season/types";
import { divisionEconomy, economyRules } from "./rules";
import type { FinanceState } from "./types";

export interface GateEstimate {
  attendance: number;
  capacity: number;
  price: number;
  revenue: number;
}

const FORM_MATCHES = 5;

/**
 * `x` elevado a `pct`/100, com `pct` múltiplo de 25: só raiz quadrada (exata no IEEE 754) e
 * multiplicação, para o resultado ser igual em qualquer engine (Princípio II).
 */
export function powQuarters(x: number, pct: number): number {
  if (pct % 25 !== 0) throw new Error(`elasticidade não é múltipla de 25: ${pct}`);
  const root = Math.sqrt(Math.sqrt(x));
  let result = 1;
  for (let step = 0; step < pct / 25; step++) result *= root;
  return result;
}
const NOISE = 0.05;

/** Fase recente: 0,85 + 0,30 × pontos dos últimos 5 jogos antes da rodada / máximo (R5). */
function formFactor(
  records: readonly MatchRecord[],
  clubId: string,
  round: number,
  win: number,
  draw: number,
): number {
  const recent = records
    .filter((record) => record.round < round && (record.home === clubId || record.away === clubId))
    .sort((a, b) => a.round - b.round)
    .slice(-FORM_MATCHES);
  if (recent.length === 0) return 1;
  const points = recent.reduce((sum, record) => {
    const mine = record.home === clubId ? record.score.home : record.score.away;
    const other = record.home === clubId ? record.score.away : record.score.home;
    return sum + (mine > other ? win : mine === other ? draw : 0);
  }, 0);
  return 0.85 + (0.3 * points) / (win * recent.length);
}

/** Público e renda de um jogo em casa (research.md R5). `noise: false` dá a estimativa. */
export function gateFor(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  fixture: Pick<Fixture, "round" | "home" | "away" | "seed">,
  price: number,
  options: { noise?: boolean } = {},
): GateEstimate {
  const rules = economyRules(world, league.competitionId);
  const home = world.clubs.find((club) => club.id === fixture.home);
  const away = world.clubs.find((club) => club.id === fixture.away);
  const capacity = finances.clubs[fixture.home]?.capacity ?? 0;
  const season = clubDivision(league, fixture.home);
  const division = divisionEconomy(rules, season?.divisionLevel ?? 1);
  const competition = world.competitions.find((entry) => entry.id === league.competitionId);
  const points = competition?.format.points ?? { win: 3, draw: 1 };
  const records = season ? (divisionSeason(league, season.divisionLevel)?.records ?? []) : [];
  const fans =
    ((rules.fansBase + rules.fansPerReputation * (home?.reputation ?? 0)) * division.fanFactorPct) /
    100;
  const form = formFactor(records, fixture.home, fixture.round, points.win, points.draw);
  const opponent = 0.85 + (0.3 * (away?.reputation ?? 0)) / 100;
  const noise =
    options.noise === false ? 1 : 1 + (createRng(`${fixture.seed}:gate`).float() * 2 - 1) * NOISE;
  const priceFactor = Math.min(
    3,
    Math.max(0.05, powQuarters(division.referencePrice / price, rules.priceElasticityPct)),
  );
  const attendance = Math.max(
    0,
    Math.min(capacity, Math.floor(fans * form * opponent * noise * priceFactor)),
  );
  return { attendance, capacity, price, revenue: attendance * price };
}

/** Estimativa do próximo jogo em casa do clube com um preço (FR-017); nada se não houver. */
export function nextHomeGateEstimate(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  clubId: string,
  price: number,
): GateEstimate | undefined {
  const season = clubDivision(league, clubId);
  if (!season) return undefined;
  for (const round of season.calendar.slice(season.nextRound - 1)) {
    const fixture = round.fixtures.find((entry) => entry.home === clubId);
    if (fixture) return gateFor(finances, league, world, fixture, price, { noise: false });
  }
  return undefined;
}
