import { cupEntry, cupSeasonOf, knockoutFormat, standings } from "@brasfoot-like/engine";
import { type SaveFile, userSeason } from "@brasfoot-like/save";
import { type ManagerSituation, type SeasonEndSummary, seasonEndSummary } from "./selectors";

export interface ClubResult {
  situation: ManagerSituation;
  position: number;
  level: number;
  /** Divisão em que o clube joga na próxima temporada. */
  nextLevel: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

/** Resultado do clube na divisão: a situação do resumo e a linha da classificação final. */
export function clubResult(
  save: SaveFile,
  summary: SeasonEndSummary = seasonEndSummary(save),
): ClubResult {
  const season = userSeason(save);
  const row = standings(season, save.bank).find((entry) => entry.clubId === save.clubId);
  return {
    situation: summary.mine.situation,
    position: summary.mine.position,
    level: summary.mine.level,
    nextLevel: summary.mine.nextLevel,
    points: row?.points ?? 0,
    played: row?.played ?? 0,
    wins: row?.wins ?? 0,
    draws: row?.draws ?? 0,
    losses: row?.losses ?? 0,
    goalsFor: row?.goalsFor ?? 0,
    goalsAgainst: row?.goalsAgainst ?? 0,
    goalDifference: row?.goalDifference ?? 0,
  };
}

export type CampaignKind = "league" | "cup" | "continental" | "regional" | "other";

export interface CampaignRow {
  competitionId: string;
  kind: CampaignKind;
  /** Posição final (só na liga). */
  position?: number;
  /** Nome da fase alcançada numa copa; `champion` quando ganhou. */
  phase?: { name: string; champion: boolean };
  /** Fase alcançada numa competição entre países ou no estadual, como a diretoria guarda. */
  reached?: { stage: number; phase?: number | undefined };
  /** Resultado da meta continental ou estadual, quando já decidido. */
  goal?: "met" | "missed";
  prize: number;
  /** Já foi lançado no extrato? A premiação da liga só é paga na virada da temporada. */
  paid: boolean;
}

export interface Campaign {
  rows: CampaignRow[];
  total: number;
}

/**
 * Campanha do clube por competição (030 R10): a liga sempre; copas pela fase alcançada;
 * continental e estadual pela avaliação da diretoria; e qualquer prêmio já lançado no extrato.
 * Competição sem nenhum dado do clube não gera linha.
 */
export function campaign(
  save: SaveFile,
  summary: SeasonEndSummary = seasonEndSummary(save),
): Campaign {
  const paid = new Map<string, number>();
  for (const entry of save.finances.ledger) {
    if (
      entry.clubId === save.clubId &&
      entry.category === "prize" &&
      entry.competitionId !== undefined &&
      entry.season === save.league.number
    ) {
      paid.set(entry.competitionId, (paid.get(entry.competitionId) ?? 0) + entry.amount);
    }
  }
  const rows: CampaignRow[] = [
    {
      competitionId: save.league.competitionId,
      kind: "league",
      position: summary.mine.position,
      prize: summary.mine.prize,
      paid: false,
    },
  ];
  const has = (id: string) => rows.some((row) => row.competitionId === id);
  for (const league of save.competitions) {
    if (!cupSeasonOf(league) || has(league.competitionId)) continue;
    const reached = cupEntry(league)?.reached[save.clubId];
    if (reached === undefined) continue;
    const phases = knockoutFormat(save.bank, league.competitionId).phases;
    const champion = reached >= phases.length;
    rows.push({
      competitionId: league.competitionId,
      kind: "cup",
      phase: { name: phases[Math.min(reached, phases.length) - 1]?.name ?? "", champion },
      prize: paid.get(league.competitionId) ?? 0,
      paid: paid.has(league.competitionId),
    });
  }
  const evaluation = save.board.evaluation;
  if (evaluation?.clubId === save.clubId) {
    for (const [kind, goal] of [
      ["continental", evaluation.continental],
      ["regional", evaluation.regional],
    ] as const) {
      if (!goal || has(goal.competitionId)) continue;
      rows.push({
        competitionId: goal.competitionId,
        kind,
        ...(goal.reached ? { reached: goal.reached } : {}),
        ...(goal.result ? { goal: goal.result } : {}),
        prize: paid.get(goal.competitionId) ?? 0,
        paid: paid.has(goal.competitionId),
      });
    }
  }
  for (const [competitionId, amount] of paid) {
    if (has(competitionId)) continue;
    rows.push({ competitionId, kind: "other", prize: amount, paid: true });
  }
  return { rows, total: rows.reduce((sum, row) => sum + row.prize, 0) };
}
