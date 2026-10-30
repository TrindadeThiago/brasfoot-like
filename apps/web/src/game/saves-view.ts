import type { SummaryEntry } from "../storage/indexeddb";

export interface SaveRow {
  id: string;
  status: SummaryEntry["status"];
  summary: SummaryEntry;
  /** Só a carreira em estado `ok` abre (Continuar) e exporta. */
  canOpen: boolean;
  /** Chave de i18n e parâmetros do progresso (rodada ou temporada encerrada). */
  progress: { key: "saves.progress" | "saves.seasonOver"; params: Record<string, string | number> };
}

export interface SavesView {
  /** Todas as carreiras listadas, inclusive as corrompidas e as de versão futura (podem ser apagadas). */
  count: number;
  rows: SaveRow[];
}

function rowOf(summary: SummaryEntry): SaveRow {
  const progress: SaveRow["progress"] = summary.seasonOver
    ? {
        key: "saves.seasonOver",
        params: { year: summary.seasonYear, division: summary.divisionName },
      }
    : {
        key: "saves.progress",
        params: {
          year: summary.seasonYear,
          round: summary.round,
          division: summary.divisionName,
        },
      };
  return {
    id: summary.id,
    status: summary.status,
    summary,
    canOpen: summary.status === "ok",
    progress,
  };
}

/** Carreiras salvas do mais recente ao mais antigo (a corrompida, sem data, por último). */
export function savesView(summaries: readonly SummaryEntry[]): SavesView {
  const rows = summaries
    .map(rowOf)
    .sort((a, b) => b.summary.savedAt.localeCompare(a.summary.savedAt));
  return { count: rows.length, rows };
}
