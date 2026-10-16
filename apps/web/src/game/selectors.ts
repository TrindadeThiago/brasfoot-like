import {
  type CompletedBank,
  type Crest,
  clubStrength,
  type FormResult,
  type MatchRecord,
  type ModPackage,
  type Season,
  standings,
} from "@brasfoot-like/engine";

export interface LeagueClub {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  reputation: number;
  strength: number;
  stadiumCapacity: number;
  crest: Crest;
}

/** Clubes da Série A (divisão de nível 1 da primeira competição) com as informações da escolha. */
export function leagueClubs(bank: ModPackage): LeagueClub[] {
  const league = bank.competitions[0]?.divisions.find((division) => division.level === 1);
  const ids = new Set(league?.clubIds ?? []);
  return bank.clubs
    .filter((club) => ids.has(club.id))
    .map((club) => ({
      id: club.id,
      name: club.name,
      abbreviation: club.abbreviation,
      city: club.city,
      reputation: club.reputation,
      strength: clubStrength(bank as CompletedBank, club.id),
      stadiumCapacity: club.stadiumCapacity,
      crest: club.crest,
    }));
}

export function seasonYear(bank: ModPackage): number {
  return Number(bank.manifest.referenceDate.slice(0, 4));
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
