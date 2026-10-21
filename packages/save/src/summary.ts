import {
  type Crest,
  isLeagueSeasonOver,
  leagueRound,
  leagueTotalRounds,
} from "@brasfoot-like/engine";
import { userDivisionLevel } from "./career";
import type { SaveFile } from "./format";

/** O necessário para a lista de carreiras, sem abrir o save inteiro (FR-007). */
export interface SaveSummary {
  id: string;
  formatVersion: number;
  managerName: string;
  clubId: string;
  clubName: string;
  clubCrest: Crest;
  /** Imagem do escudo (data URI) quando o mod tem uma (015). */
  clubCrestImage?: string;
  /** Nível da divisão do clube do jogador (007). */
  divisionLevel: number;
  /** Nome da divisão do clube do jogador, vindo do mod. */
  divisionName: string;
  seasonYear: number;
  round: number;
  totalRounds: number;
  seasonOver: boolean;
  savedAt: string;
}

/** Nome (do mod) da divisão de um nível na competição da carreira (ou na indicada). */
export function divisionNameOf(save: SaveFile, level: number, competitionId?: string): string {
  const division = save.bank.competitions
    .find((entry) => entry.id === (competitionId ?? save.league.competitionId))
    ?.divisions.find((entry) => entry.level === level);
  return division?.name ?? String(level);
}

export function seasonYearOf(save: SaveFile): number {
  return save.league.year;
}

export function summarize(save: SaveFile): SaveSummary {
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  const totalRounds = leagueTotalRounds(save.league);
  return {
    id: save.id,
    formatVersion: save.formatVersion,
    managerName: save.managerName,
    clubId: save.clubId,
    clubName: club?.name ?? save.clubId,
    clubCrest: club?.crest ?? { shape: "classic", colors: ["#888888", "#FFFFFF"], initials: "?" },
    ...(club?.crest.image && save.assets[club.crest.image]
      ? { clubCrestImage: save.assets[club.crest.image] }
      : {}),
    divisionLevel: userDivisionLevel(save),
    divisionName: divisionNameOf(save, userDivisionLevel(save)),
    seasonYear: seasonYearOf(save),
    round: Math.min(leagueRound(save.league), totalRounds),
    totalRounds,
    seasonOver: isLeagueSeasonOver(save.league),
    savedAt: save.savedAt,
  };
}

/** Atualiza só a data do último salvamento. */
export function touch(save: SaveFile, now: string): SaveFile {
  return { ...save, savedAt: now };
}
