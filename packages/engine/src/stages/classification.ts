import type { GroupsStage, LeagueStage } from "../model/types";
import { rankRows } from "../season/rank";
import type { MatchRecord, Season, StandingRow } from "../season/types";
import { type StageWorld, seasonStages } from "./rules";
import type { GroupState, Origin, OverallRow, Qualifier, StageState } from "./types";

/** Classificações das fases de pontos (grupos e pontos corridos) e seus classificados (019 R5). */

interface PointsStage {
  format: LeagueStage | GroupsStage;
  state: StageState;
}

function pointsStage(season: Season, world: StageWorld, index: number): PointsStage {
  const format = seasonStages(world, season)[index];
  const state = season.stages?.[index];
  if (!format || !state) throw new Error(`fase inexistente: ${index}`);
  if (format.type === "knockout") throw new Error(`a fase ${index} é eliminatória`);
  return { format, state };
}

/** Registros das rodadas da fase. */
function stageRecords(season: Season, state: StageState): MatchRecord[] {
  const rounds = new Set(state.rounds);
  return season.records.filter((record) => rounds.has(record.round));
}

function groupOf(state: StageState, groupId: string): GroupState {
  const group = state.groups?.find((entry) => entry.id === groupId);
  if (!group) throw new Error(`grupo inexistente: ${groupId}`);
  return group;
}

/** Tabela de um grupo: só os jogos entre os clubes dele, com a pontuação e os desempates da fase. */
export function groupStandings(
  season: Season,
  world: StageWorld,
  stageIndex: number,
  groupId: string,
): StandingRow[] {
  const { format, state } = pointsStage(season, world, stageIndex);
  const group = groupOf(state, groupId);
  const members = new Set(group.clubIds);
  const records = stageRecords(season, state).filter(
    (record) => members.has(record.home) && members.has(record.away),
  );
  return rankRows(group.clubIds, records, format.points, format.tiebreakers, season.seed, {
    drawLots: true,
  });
}

/** Uma tabela por grupo, na ordem das letras. */
export function groupTables(
  season: Season,
  world: StageWorld,
  stageIndex: number,
): { group: GroupState; rows: StandingRow[] }[] {
  const { state } = pointsStage(season, world, stageIndex);
  return [...(state.groups ?? [])]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((group) => ({ group, rows: groupStandings(season, world, stageIndex, group.id) }));
}

/** Tabela de uma fase de pontos corridos. */
export function leagueStageStandings(
  season: Season,
  world: StageWorld,
  stageIndex: number,
): StandingRow[] {
  const { format, state } = pointsStage(season, world, stageIndex);
  return rankRows(
    state.clubIds,
    stageRecords(season, state),
    format.points,
    format.tiebreakers,
    season.seed,
    { drawLots: true },
  );
}

/**
 * Classificação geral da fase de grupos (FR-018): todos os grupos juntos, sem o confronto direto
 * (que só vale dentro de um grupo) e com o sorteio pela seed por último, de modo que a ordem é
 * total e determinística.
 */
export function overallStandings(
  season: Season,
  world: StageWorld,
  stageIndex: number,
): OverallRow[] {
  const { format, state } = pointsStage(season, world, stageIndex);
  if (format.type !== "groups") throw new Error(`a fase ${stageIndex} não é de grupos`);
  const placement = new Map<string, { group: string; groupPosition: number }>();
  for (const { group, rows } of groupTables(season, world, stageIndex)) {
    for (const row of rows)
      placement.set(row.clubId, { group: group.id, groupPosition: row.position });
  }
  const rows = rankRows(
    state.clubIds,
    stageRecords(season, state),
    format.points,
    format.tiebreakers,
    season.seed,
    { skipHeadToHead: true, drawLots: true },
  );
  return rows.map((row) => ({
    ...row,
    group: placement.get(row.clubId)?.group ?? "",
    groupPosition: placement.get(row.clubId)?.groupPosition ?? row.position,
  }));
}

/**
 * Classificados da fase de pontos (FR-017), do melhor ao pior: os `qualified` primeiros de cada
 * grupo (ou da tabela) e, com `extra`, os melhores da posição seguinte pela classificação geral.
 */
export function stageQualifiers(
  season: Season,
  world: StageWorld,
  stageIndex: number,
): Qualifier[] {
  const { format } = pointsStage(season, world, stageIndex);
  const qualified = format.qualified;
  if (qualified === undefined) return [];
  if (format.type === "league") {
    return leagueStageStandings(season, world, stageIndex)
      .slice(0, qualified)
      .map((row) => ({
        clubId: row.clubId,
        groupPosition: row.position,
        overallPosition: row.position,
        extra: false,
      }));
  }
  const overall = overallStandings(season, world, stageIndex);
  const rank = new Map(overall.map((row) => [row.clubId, row.position]));
  const direct: Qualifier[] = overall
    .filter((row) => row.groupPosition <= qualified)
    .map((row) => ({
      clubId: row.clubId,
      group: row.group,
      groupPosition: row.groupPosition,
      overallPosition: rank.get(row.clubId) ?? row.position,
      extra: false,
    }));
  const extras: Qualifier[] = overall
    .filter((row) => row.groupPosition === qualified + 1)
    .slice(0, format.extra ?? 0)
    .map((row) => ({
      clubId: row.clubId,
      group: row.group,
      groupPosition: row.groupPosition,
      overallPosition: row.position,
      extra: true,
    }));
  return [...direct, ...extras].sort(
    (a, b) => a.groupPosition - b.groupPosition || a.overallPosition - b.overallPosition,
  );
}

/** De onde vem a vaga do clube (grupo e posição, tabela ou vaga extra); undefined se não se classificou. */
export function stageOrigin(
  season: Season,
  world: StageWorld,
  stageIndex: number,
  clubId: string,
): Origin | undefined {
  const qualifiers = stageQualifiers(season, world, stageIndex);
  const found = qualifiers.find((qualifier) => qualifier.clubId === clubId);
  if (!found) return undefined;
  if (found.extra) {
    const extras = qualifiers.filter((qualifier) => qualifier.extra);
    return { extra: extras.findIndex((qualifier) => qualifier.clubId === clubId) + 1 };
  }
  if (found.group !== undefined) return { group: found.group, position: found.groupPosition };
  return { table: found.groupPosition };
}
