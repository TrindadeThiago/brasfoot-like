import type { HistoryRow } from "../career/types";
import type { CupHistoryEntry } from "../knockout/history";

/** Fase alcançada numa competição em fases: `stage` e `phase` partem de 1 (022 data-model). */
export interface Reached {
  stage: number;
  phase?: number | undefined;
}

/** Aviso de ligação entre competições que não impede a temporada (022 R3). */
export type ContinentalWarning =
  | { code: "continental.dropin_late"; competitionId: string; dropInId: string }
  | { code: "continental.dropin_exhausted"; competitionId: string; dropInId: string };

/** Ligação selada ao fim da fase de origem: os clubes que entram na competição de destino. */
export interface SealedDropIn {
  competitionId: string;
  dropInId: string;
  clubIds: string[];
  fromCompetitionId: string;
}

/** Prêmio pago pelas regras `awards` da competição (022 R4). */
export interface CompetitionPrize {
  clubId: string;
  amount: number;
  date: string;
  source: "win" | "draw" | "stage" | "title";
  stage: number;
  phase?: number | undefined;
}

export type CampaignStatus = "playing" | "eliminated" | "champion" | "moved";

/** Onde um jogo cai na competição: tipo da fase e, no mata-mata, fase e perna. */
export interface CampaignSpot {
  /** Fase da sequência (a partir de 1). */
  stage: number;
  kind: "league" | "groups" | "knockout";
  /** Mata-mata: fase (a partir de 1) e perna. */
  phase?: number | undefined;
  leg?: number | undefined;
  /** Fase de pontos: rodada dentro da fase (a partir de 1). */
  stageRound?: number | undefined;
}

export interface CampaignMatch extends CampaignSpot {
  date: string;
  round: number;
  home: string;
  away: string;
  score: { home: number; away: number };
}

export interface CampaignAward {
  amount: number;
  date: string;
}

/** Campanha de um clube numa competição entre países (022 data-model). */
export interface ClubCampaign {
  competitionId: string;
  clubId: string;
  /** Fase atual ou última alcançada. */
  reached: Reached;
  status: CampaignStatus;
  matches: CampaignMatch[];
  next?: (CampaignSpot & { date: string; opponentId: string; home: boolean }) | undefined;
  /** Prêmios que o clube recebeu na competição nesta temporada, pelo extrato. */
  awards: CampaignAward[];
  /** Fases ainda possíveis de alcançar, da mais próxima ao título. */
  remaining: Reached[];
}

/** Uma edição encerrada de uma competição entre países, para o histórico (022 R8). */
export interface ContinentalEdition {
  number: number;
  year: number;
  competitionId: string;
  championId: string;
  runnerUpId: string;
  final: CupHistoryEntry["final"];
  /** Melhor fase alcançada por cada clube (o campeão vale a última). */
  reached: Record<string, Reached>;
  /** Tabelas finais da fase de grupos, quando houve. */
  groups?: { id: string; table: HistoryRow[] }[];
}
