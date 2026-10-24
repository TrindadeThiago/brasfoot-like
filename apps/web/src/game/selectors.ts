import {
  type CompletedBank,
  type Crest,
  clubDivision,
  clubStrength,
  competitionSeason,
  economyRules,
  type FormResult,
  fitnessOn,
  fitnessRules,
  type MatchRecord,
  type ModPackage,
  nextComposition,
  prizeFor,
  type Season,
  standings,
} from "@brasfoot-like/engine";
import {
  currentDayOf,
  nextFixture,
  type SaveFile,
  seasonStateOf,
  userSeason,
} from "@brasfoot-like/save";

export interface LeagueClub {
  id: string;
  /** Divisão do clube no banco (nível e nome do mod). */
  divisionLevel: number;
  divisionName: string;
  name: string;
  abbreviation: string;
  city: string;
  reputation: number;
  strength: number;
  stadiumCapacity: number;
  crest: Crest;
}

/** Clubes de todas as divisões da primeira competição com as informações da escolha (007). */
export function competitionClubs(bank: ModPackage): LeagueClub[] {
  const divisions = new Map<string, { level: number; name: string }>();
  for (const division of bank.competitions[0]?.divisions ?? []) {
    for (const clubId of division.clubIds) {
      divisions.set(clubId, { level: division.level, name: division.name });
    }
  }
  return bank.clubs
    .filter((club) => divisions.has(club.id))
    .map((club) => ({
      id: club.id,
      divisionLevel: divisions.get(club.id)?.level ?? 0,
      divisionName: divisions.get(club.id)?.name ?? "",
      name: club.name,
      abbreviation: club.abbreviation,
      city: club.city,
      reputation: club.reputation,
      strength: clubStrength(bank as CompletedBank, club.id),
      stadiumCapacity: club.stadiumCapacity,
      crest: club.crest,
    }));
}

export interface ClubResult {
  round: number;
  opponentId: string;
  isHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
  result: FormResult;
}

function asClubResult(record: MatchRecord, clubId: string): ClubResult {
  const isHome = record.home === clubId;
  const goalsFor = isHome ? record.score.home : record.score.away;
  const goalsAgainst = isHome ? record.score.away : record.score.home;
  return {
    round: record.round,
    opponentId: isHome ? record.away : record.home,
    isHome,
    goalsFor,
    goalsAgainst,
    result: goalsFor > goalsAgainst ? "W" : goalsFor === goalsAgainst ? "D" : "L",
  };
}

/**
 * V/E/D do clube num jogo. Empate decidido na prorrogação ou nos pênaltis conta para quem
 * avançou; o empate de uma ida (decidida pelo agregado) segue empate.
 */
export function matchResult(record: MatchRecord, clubId: string): FormResult {
  const result = asClubResult(record, clubId).result;
  const decision = record.decision;
  if (
    result !== "D" ||
    !decision ||
    (decision.by !== "penalties" && decision.by !== "extra-time")
  ) {
    return result;
  }
  return decision.winner === (record.home === clubId ? "home" : "away") ? "W" : "L";
}

/** Últimos `count` resultados do clube, do mais antigo para o mais recente. */
export function lastResults(season: Season, clubId: string, count = 5): ClubResult[] {
  return season.records
    .filter((record) => record.home === clubId || record.away === clubId)
    .slice(-count)
    .map((record) => asClubResult(record, clubId));
}

/** Resultado do clube numa rodada, se já disputada. */
export function resultInRound(
  season: Season,
  clubId: string,
  round: number,
): ClubResult | undefined {
  const record = season.records.find(
    (entry) => entry.round === round && (entry.home === clubId || entry.away === clubId),
  );
  return record ? asClubResult(record, clubId) : undefined;
}

export function clubPosition(season: Season, bank: CompletedBank, clubId: string): number {
  return standings(season, bank).find((row) => row.clubId === clubId)?.position ?? 0;
}

export type ManagerSituation = "champion" | "promoted" | "relegated" | "stayed";

export interface SeasonEndSummary {
  year: number;
  /** Campeão de cada divisão, por nível. */
  champions: { level: number; clubId: string; points: number; staged: boolean }[];
  /** Clubes que trocam de divisão, agrupados por destino. */
  moves: { from: number; to: number; clubs: { clubId: string; position: number }[] }[];
  mine: {
    situation: ManagerSituation;
    position: number;
    level: number;
    nextLevel: number;
    /** Premiação que o clube recebe na virada (008). */
    prize: number;
  };
}

/**
 * Resumo do fim de temporada (US3): lê as classificações finais e a composição da próxima
 * temporada do motor, sem regra própria.
 */
export function seasonEndSummary(save: SaveFile): SeasonEndSummary {
  const tables = new Map(
    save.league.divisions.map((season) => [season.divisionLevel, standings(season, save.bank)]),
  );
  const change = nextComposition(save.league, save.bank);
  const positionOf = (level: number, clubId: string) =>
    tables.get(level)?.find((row) => row.clubId === clubId)?.position ?? 0;
  const champions = save.league.divisions.map((season) => {
    const first = tables.get(season.divisionLevel)?.[0];
    return {
      level: season.divisionLevel,
      clubId: first?.clubId ?? "",
      points: first?.points ?? 0,
      staged: season.stages !== undefined,
    };
  });
  const moves: SeasonEndSummary["moves"] = [];
  for (const season of save.league.divisions) {
    const level = season.divisionLevel;
    const groups = [
      { to: level - 1, clubs: change.promoted[level] ?? [] },
      { to: level + 1, clubs: change.relegated[level] ?? [] },
    ];
    for (const group of groups) {
      if (group.clubs.length === 0) continue;
      moves.push({
        from: level,
        to: group.to,
        clubs: group.clubs.map((clubId) => ({ clubId, position: positionOf(level, clubId) })),
      });
    }
  }
  const level = userSeason(save).divisionLevel;
  const nextLevel =
    Number(
      Object.entries(change.composition).find(([, clubs]) => clubs.includes(save.clubId))?.[0],
    ) || level;
  const position = positionOf(level, save.clubId);
  const situation: ManagerSituation =
    nextLevel < level
      ? "promoted"
      : nextLevel > level
        ? "relegated"
        : position === 1
          ? "champion"
          : "stayed";
  const prize = prizeFor(
    economyRules(save.bank, save.league.competitionId),
    level,
    position,
    tables.get(level)?.length ?? 0,
    position === 1,
  );
  return {
    year: save.league.year,
    champions,
    moves,
    mine: { situation, position, level, nextLevel, prize },
  };
}

/** Data em que a condição dos jogadores vale: a do próximo jogo do clube (ou do dia atual). */
export function conditionDate(save: SaveFile): string {
  return nextFixture(save)?.date ?? currentDayOf(save)?.date ?? save.calendar.start;
}

/** Condição física (0–100) de cada jogador do clube na data do próximo jogo (017). */
export function fitnessAt(save: SaveFile): (playerId: string) => number {
  const date = conditionDate(save);
  const rules = fitnessRules(save.bank, save.league.competitionId);
  return (playerId) => fitnessOn(save.fitness, playerId, date, rules);
}

/**
 * Jogadores do clube a um amarelo de suspensão na competição (pendurados). Quem já está
 * suspenso ou lesionado não entra: o que importa é a indisponibilidade.
 */
export function hangingPlayers(save: SaveFile, competitionId: string): ReadonlySet<string> {
  const season = clubDivision(competitionSeason(seasonStateOf(save), competitionId), save.clubId);
  if (!season) return new Set();
  const limit = season.rules.yellowsForSuspension;
  const hanging = new Set<string>();
  for (const player of save.bank.players) {
    if (player.clubId !== save.clubId) continue;
    const entry = season.status[player.id];
    if (entry && entry.suspension <= 0 && entry.injury <= 0 && entry.yellows >= limit - 1) {
      hanging.add(player.id);
    }
  }
  return hanging;
}
