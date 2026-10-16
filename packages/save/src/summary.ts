import type { Crest } from "@brasfoot-like/engine";
import type { SaveFile } from "./format";

/** O necessário para a lista de carreiras, sem abrir o save inteiro (FR-007). */
export interface SaveSummary {
  id: string;
  formatVersion: number;
  managerName: string;
  clubId: string;
  clubName: string;
  clubCrest: Crest;
  seasonYear: number;
  round: number;
  totalRounds: number;
  seasonOver: boolean;
  savedAt: string;
}

export function seasonYearOf(save: SaveFile): number {
  return Number(save.bank.manifest.referenceDate.slice(0, 4));
}

export function summarize(save: SaveFile): SaveSummary {
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  const totalRounds = save.season.calendar.length;
  return {
    id: save.id,
    formatVersion: save.formatVersion,
    managerName: save.managerName,
    clubId: save.clubId,
    clubName: club?.name ?? save.clubId,
    clubCrest: club?.crest ?? { shape: "classic", colors: ["#888888", "#FFFFFF"], initials: "?" },
    seasonYear: seasonYearOf(save),
    round: Math.min(save.season.nextRound, totalRounds),
    totalRounds,
    seasonOver: save.season.nextRound > totalRounds,
    savedAt: save.savedAt,
  };
}

/** Atualiza só a data do último salvamento. */
export function touch(save: SaveFile, now: string): SaveFile {
  return { ...save, savedAt: now };
}
