import type { CareerSeasonState } from "../career/season-state";
import type { LeagueSeason } from "../career/types";
import { mainCompetitionOf } from "./countries";

/** A liga principal do país de um clube, entre as da carreira. */
export function mainLeagueOfClub(
  state: Pick<CareerSeasonState, "league" | "competitions" | "world">,
  clubId: string,
): LeagueSeason | undefined {
  const club = state.world.clubs.find((entry) => entry.id === clubId);
  const main = club ? mainCompetitionOf(state.world, club.countryId) : undefined;
  if (!main) return undefined;
  return [state.league, ...state.competitions].find((entry) => entry.competitionId === main.id);
}

/**
 * Troca de país do técnico (020 R2, R9): a liga principal do país do novo clube passa a ser a
 * `league` e a que era vai para `competitions`, que continua na ordem do banco. O calendário é por
 * data e não muda; nenhuma rodada se perde nem se repete. Sem efeito para um clube do mesmo país.
 * Não altera a entrada.
 */
export function switchManagerCountry(state: CareerSeasonState, clubId: string): CareerSeasonState {
  const target = mainLeagueOfClub(state, clubId);
  if (!target || target.competitionId === state.league.competitionId) return state;
  const order = new Map(state.world.competitions.map((entry, index) => [entry.id, index]));
  const competitions = [state.league, ...state.competitions]
    .filter((entry) => entry.competitionId !== target.competitionId)
    .sort((a, b) => (order.get(a.competitionId) ?? 0) - (order.get(b.competitionId) ?? 0));
  return { ...state, league: target, competitions };
}

export type SimulationKind = "full" | "summary";

/**
 * Qual simulação joga uma competição (020 FR-014/FR-015): as do país do técnico usam a completa
 * (o jogo dele, a rodada ao vivo e as do mesmo país); as dos outros países, a resumida. Função pura
 * do estado, então ao vivo = direto e salvar/carregar no meio não mudam nada; um banco de um país
 * só usa sempre a completa.
 */
export function simulationKindFor(
  state: Pick<CareerSeasonState, "league" | "world">,
  competitionId: string,
): SimulationKind {
  const country = (id: string) =>
    state.world.competitions.find((entry) => entry.id === id)?.countryId;
  return country(competitionId) === country(state.league.competitionId) ? "full" : "summary";
}
