"use client";

import {
  clubDivision,
  competitionSeason,
  divisionSeason,
  type LeagueSeason,
  type Season,
} from "@brasfoot-like/engine";
import { nextFixture, type SaveFile, seasonStateOf } from "@brasfoot-like/save";
import { useSearchParams } from "next/navigation";

/**
 * Competição escolhida na URL (`comp`); sem ela (ou com valor inválido), a do próximo jogo do
 * clube, e na falta dele a principal (017 FR-037).
 */
export function useCompetition(save: SaveFile): { competitionId: string; league: LeagueSeason } {
  const params = useSearchParams();
  const requested = params?.get("comp") ?? undefined;
  const known = (id: string | undefined) =>
    id !== undefined && save.bank.competitions.some((entry) => entry.id === id);
  const competitionId = known(requested)
    ? (requested as string)
    : (nextFixture(save)?.competitionId ?? save.league.competitionId);
  const state = seasonStateOf(save);
  const available = known(competitionId) ? competitionId : save.league.competitionId;
  return { competitionId: available, league: competitionSeason(state, available) };
}

/** Divisão escolhida na URL (`d`); padrão e valor inválido: a do clube do jogador na competição. */
export function useDivision(save: SaveFile): {
  competitionId: string;
  league: LeagueSeason;
  level: number;
  season: Season;
} {
  const { competitionId, league } = useCompetition(save);
  const params = useSearchParams();
  const requested = Number(params?.get("d"));
  const chosen = Number.isInteger(requested) ? divisionSeason(league, requested) : undefined;
  const season = chosen ?? clubDivision(league, save.clubId) ?? league.divisions[0];
  if (!season) throw new Error("competição sem divisões");
  return { competitionId, league, level: season.divisionLevel, season };
}

/** Link de uma tela da competição numa divisão (e competição, quando não é a do próximo jogo). */
export function divisionHref(
  path: string,
  careerId: string,
  level: number,
  competitionId?: string,
): string {
  const comp = competitionId ? `&comp=${competitionId}` : "";
  return `${path}/?c=${careerId}&d=${level}${comp}`;
}

/** Link de uma tela da competição escolhendo a competição (a divisão volta ao padrão). */
export function competitionHref(path: string, careerId: string, competitionId: string): string {
  return `${path}/?c=${careerId}&comp=${competitionId}`;
}
