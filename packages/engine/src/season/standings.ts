import type { Tiebreaker } from "../model/catalogs.js";
import type { CompletedBank } from "../model/types.js";
import { createRng } from "../rng/xoshiro.js";
import type { FormResult, MatchRecord, Season, StandingRow } from "./types.js";

interface Points {
  win: number;
  draw: number;
  loss: number;
}

function leagueFormat(
  season: Season,
  world: CompletedBank,
): { points: Points; tiebreakers: Tiebreaker[] } {
  const competition = world.competitions.find((entry) => entry.id === season.competitionId);
  if (!competition) throw new Error(`competição inexistente: ${season.competitionId}`);
  return { points: competition.format.points, tiebreakers: competition.format.tiebreakers };
}

function emptyRow(clubId: string): StandingRow {
  return {
    position: 0,
    clubId,
    points: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    redCards: 0,
    form: [],
  };
}

function accumulate(
  rows: Map<string, StandingRow>,
  records: readonly MatchRecord[],
  points: Points,
): void {
  for (const record of records) {
    const sides = [
      {
        clubId: record.home,
        scored: record.score.home,
        conceded: record.score.away,
        reds: record.stats.home.redCards,
      },
      {
        clubId: record.away,
        scored: record.score.away,
        conceded: record.score.home,
        reds: record.stats.away.redCards,
      },
    ];
    for (const side of sides) {
      const row = rows.get(side.clubId);
      if (!row) continue;
      row.played += 1;
      row.goalsFor += side.scored;
      row.goalsAgainst += side.conceded;
      row.redCards += side.reds;
      let result: FormResult;
      if (side.scored > side.conceded) {
        row.wins += 1;
        row.points += points.win;
        result = "W";
      } else if (side.scored === side.conceded) {
        row.draws += 1;
        row.points += points.draw;
        result = "D";
      } else {
        row.losses += 1;
        row.points += points.loss;
        result = "L";
      }
      row.form.push(result);
    }
  }
  for (const row of rows.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    row.form = row.form.slice(-5);
  }
}

/** Chave fixa de sorteio por clube, estável a temporada inteira (FR-013). */
function drawKey(seed: string | number, clubId: string): number {
  return createRng(`${seed}:draw:${clubId}`).next();
}

/** Pontos obtidos só nos jogos entre os clubes do grupo (minitabela do confronto direto). */
function headToHead(
  group: readonly StandingRow[],
  records: readonly MatchRecord[],
  points: Points,
): Map<string, number> {
  const ids = new Set(group.map((row) => row.clubId));
  const mini = new Map<string, StandingRow>([...ids].map((id) => [id, emptyRow(id)]));
  accumulate(
    mini,
    records.filter((record) => ids.has(record.home) && ids.has(record.away)),
    points,
  );
  return new Map([...mini].map(([id, row]) => [id, row.points]));
}

/** Valor do critério (maior = melhor) para cada clube do grupo. */
function criterionValues(
  criterion: Tiebreaker,
  group: readonly StandingRow[],
  records: readonly MatchRecord[],
  points: Points,
  seed: string | number,
): Map<string, number> {
  switch (criterion) {
    case "wins":
      return new Map(group.map((row) => [row.clubId, row.wins]));
    case "goal-difference":
      return new Map(group.map((row) => [row.clubId, row.goalDifference]));
    case "goals-for":
      return new Map(group.map((row) => [row.clubId, row.goalsFor]));
    case "head-to-head":
      return headToHead(group, records, points);
    case "fewest-red-cards":
      return new Map(group.map((row) => [row.clubId, -row.redCards]));
    case "draw-lots":
      return new Map(group.map((row) => [row.clubId, drawKey(seed, row.clubId)]));
  }
}

/** Ordena um grupo empatado aplicando os critérios em sequência, partindo-o a cada critério. */
function breakTies(
  group: StandingRow[],
  criteria: readonly Tiebreaker[],
  records: readonly MatchRecord[],
  points: Points,
  seed: string | number,
): StandingRow[] {
  if (group.length <= 1) return group;
  const [criterion, ...rest] = criteria;
  if (!criterion) return [...group].sort((a, b) => a.clubId.localeCompare(b.clubId));
  const values = criterionValues(criterion, group, records, points, seed);
  const buckets = new Map<number, StandingRow[]>();
  for (const row of group) {
    const value = values.get(row.clubId) ?? 0;
    buckets.set(value, [...(buckets.get(value) ?? []), row]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => b - a)
    .flatMap(([, bucket]) => breakTies(bucket, rest, records, points, seed));
}

/** Tabela de classificação derivada dos registros (FR-010 a FR-014). */
export function standings(season: Season, world: CompletedBank): StandingRow[] {
  const { points, tiebreakers } = leagueFormat(season, world);
  const rows = new Map(season.clubIds.map((clubId) => [clubId, emptyRow(clubId)]));
  accumulate(rows, season.records, points);
  const byPoints = new Map<number, StandingRow[]>();
  for (const row of rows.values())
    byPoints.set(row.points, [...(byPoints.get(row.points) ?? []), row]);
  const ordered = [...byPoints.entries()]
    .sort(([a], [b]) => b - a)
    .flatMap(([, group]) => breakTies(group, tiebreakers, season.records, points, season.seed));
  return ordered.map((row, index) => ({ ...row, position: index + 1 }));
}
