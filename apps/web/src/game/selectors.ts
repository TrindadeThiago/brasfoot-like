import {
  type CompletedBank,
  type Crest,
  clubStrength,
  economyRules,
  type FormResult,
  type MatchRecord,
  type ModPackage,
  nextComposition,
  prizeFor,
  type Season,
  standings,
} from "@brasfoot-like/engine";
import { type SaveFile, userSeason } from "@brasfoot-like/save";

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

export interface NextFixture {
  round: number;
  opponentId: string;
  isHome: boolean;
}

/** Próximo jogo do clube (ou nada, se a temporada acabou ou o clube folga). */
export function nextFixture(season: Season, clubId: string): NextFixture | undefined {
  const round = season.calendar[season.nextRound - 1];
  const fixture = round?.fixtures.find((entry) => entry.home === clubId || entry.away === clubId);
  if (!round || !fixture) return undefined;
  const isHome = fixture.home === clubId;
  return { round: round.number, opponentId: isHome ? fixture.away : fixture.home, isHome };
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
  champions: { level: number; clubId: string; points: number }[];
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
    return { level: season.divisionLevel, clubId: first?.clubId ?? "", points: first?.points ?? 0 };
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
