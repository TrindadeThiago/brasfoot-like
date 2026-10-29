import { type ConfidenceChange, goalProgress, type MoodChange } from "@brasfoot-like/engine";
import { boardContextOf, type SaveFile } from "@brasfoot-like/save";

/** Tendência da confiança ou da torcida: soma das três últimas mudanças (029 R3). */
export type Trend = "up" | "flat" | "down";

/** Símbolo da tendência; o texto sempre vai junto, a cor só reforça. */
export const TREND_SYMBOL: Record<Trend, string> = { up: "▲", flat: "■", down: "▼" };

export function trendOf(recent: readonly { delta: number }[]): Trend {
  const sum = recent.slice(-3).reduce((total, change) => total + change.delta, 0);
  return sum > 0 ? "up" : sum < 0 ? "down" : "flat";
}

export type ConfidenceLevel = "high" | "medium" | "low";

/** As faixas do medidor da diretoria: 60 ou mais, de 30 a 59 e abaixo de 30. */
export function confidenceLevel(value: number): ConfidenceLevel {
  return value >= 60 ? "high" : value >= 30 ? "medium" : "low";
}

export type GoalKind = "sport" | "finance" | "continental" | "regional";
/** `onTrack` e `atRisk` valem para as metas medidas na hora; `met` e `missed`, para as já decididas. */
export type GoalStatus = "onTrack" | "atRisk" | "inProgress" | "met" | "missed";

export interface GoalRow {
  kind: GoalKind;
  status: GoalStatus;
}

/** Metas do clube do técnico com a situação de cada uma; nada se desempregado ou sem metas. */
export function goalRows(save: SaveFile): GoalRow[] | undefined {
  const clubId = save.board.manager.clubId;
  if (!clubId) return undefined;
  const goals = save.board.clubs[clubId]?.goals;
  const progress = goalProgress(boardContextOf(save), clubId);
  if (!goals || !progress) return undefined;
  const live = (met: boolean): GoalStatus => (met ? "onTrack" : "atRisk");
  const decided = (result: "met" | "missed" | undefined): GoalStatus => result ?? "inProgress";
  const rows: GoalRow[] = [
    { kind: "sport", status: live(progress.sport.met) },
    { kind: "finance", status: live(progress.finance.met) },
  ];
  if (goals.continental) {
    rows.push({ kind: "continental", status: decided(goals.continental.result) });
  }
  if (goals.regional) rows.push({ kind: "regional", status: decided(goals.regional.result) });
  return rows;
}

/** Fatores das mudanças mais recentes, do mais novo ao mais antigo. */
export function reasonsOf<Change extends ConfidenceChange | MoodChange>(
  recent: readonly Change[],
  limit: number,
) {
  return [...recent]
    .reverse()
    .flatMap((change) =>
      change.factors.map((factor, index) => ({ ...factor, id: `${change.round}-${index}` })),
    )
    .slice(0, limit);
}

/** Mudanças por rodada, da mais nova à mais antiga (a lista original não muda). */
export function roundChanges<Change extends ConfidenceChange | MoodChange>(
  recent: readonly Change[],
): Change[] {
  return [...recent].reverse();
}
