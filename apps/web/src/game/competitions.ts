import {
  type Competition,
  clubFixtures,
  clubQualification,
  isLeagueSeasonOver,
  regionalCompetitionOf,
} from "@brasfoot-like/engine";
import { type SaveFile, seasonStateOf } from "@brasfoot-like/save";

/** Situação do clube numa competição, para o cartão (027 FR-002). */
export type CompetitionStatus =
  | { kind: "ongoing" }
  | { kind: "eliminated" }
  | { kind: "finished" }
  | { kind: "startsOn"; date: string }
  | { kind: "berthConfirmed" }
  | { kind: "berthPending" }
  | { kind: "notParticipating" };

export interface CompetitionEntry {
  competition: Competition;
  /** Entra em "Minhas competições": o clube joga nela ou tem a vaga confirmada. */
  mine: boolean;
  status: CompetitionStatus;
}

/**
 * Situação a partir dos jogos do clube (só a data e se já foram disputados), de a competição ter
 * acabado, de ela já existir na temporada e de o clube ter a vaga confirmada. Sem relógio: a data
 * de "começa em" é a do primeiro jogo no calendário.
 */
export function classifyCompetition(input: {
  fixtures: readonly { date: string; played: boolean }[];
  seasonOver: boolean;
  /** A competição já existe na temporada em curso (tem calendário). */
  running: boolean;
  berth: boolean;
}): CompetitionStatus {
  const { fixtures, seasonOver, running, berth } = input;
  if (fixtures.length > 0) {
    const pending = fixtures.filter((fixture) => !fixture.played);
    if (pending.length > 0) {
      const first = fixtures[0];
      return pending.length === fixtures.length && first
        ? { kind: "startsOn", date: first.date }
        : { kind: "ongoing" };
    }
    return seasonOver ? { kind: "finished" } : { kind: "eliminated" };
  }
  if (berth) return { kind: "berthConfirmed" };
  return running ? { kind: "notParticipating" } : { kind: "berthPending" };
}

/**
 * As competições do banco com a situação do clube: Minhas (joga ou tem vaga confirmada) primeiro,
 * a principal à frente e depois pela data do próximo jogo; as demais por nome. Estaduais: só o da
 * região do clube (023).
 */
export function clubCompetitions(save: SaveFile): CompetitionEntry[] {
  const state = seasonStateOf(save);
  const own = regionalCompetitionOf(save.bank, save.clubId)?.id;
  const fixtures = clubFixtures(state, save.clubId);
  const berths = new Set(
    clubQualification(save.qualificationHistory ?? [], save.clubId).map(
      (entry) => entry.competitionId,
    ),
  );
  const seasons = new Map(
    [save.league, ...save.competitions].map((season) => [season.competitionId, season]),
  );
  const entries = save.bank.competitions
    .filter((competition) => competition.regional === undefined || competition.id === own)
    .map((competition): CompetitionEntry => {
      const mine = fixtures
        .filter((fixture) => fixture.competitionId === competition.id)
        .map((fixture) => ({ date: fixture.date, played: fixture.record !== undefined }));
      const season = seasons.get(competition.id);
      const status = classifyCompetition({
        fixtures: mine,
        seasonOver: season !== undefined && isLeagueSeasonOver(season),
        running: season !== undefined,
        berth: berths.has(competition.id),
      });
      return {
        competition,
        mine: mine.length > 0 || status.kind === "berthConfirmed",
        status,
      };
    });
  const next = new Map<string, string>();
  for (const fixture of fixtures) {
    if (fixture.record === undefined && !next.has(fixture.competitionId)) {
      next.set(fixture.competitionId, fixture.date);
    }
  }
  const main = save.league.competitionId;
  return entries.sort((a, b) => {
    if (a.mine !== b.mine) return a.mine ? -1 : 1;
    if (a.competition.id === main) return -1;
    if (b.competition.id === main) return 1;
    const left = next.get(a.competition.id) ?? "9999";
    const right = next.get(b.competition.id) ?? "9999";
    return (
      left.localeCompare(right) || a.competition.name.localeCompare(b.competition.name, "pt-BR")
    );
  });
}
