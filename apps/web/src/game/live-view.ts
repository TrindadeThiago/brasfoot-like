import {
  type LiveMatch,
  type LiveRound,
  type MatchEvent,
  type MatchState,
  matchTicks,
  type Side,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { t } from "../i18n";
import { phaseLabel } from "../ui/cup/phase";
import { clockText } from "../ui/event-text";

/** Lance de uma partida da rodada, como a interface guarda e narra (`useLiveRound`). */
export interface FeedItem {
  key: string;
  matchIndex: number;
  event: MatchEvent;
  mine: boolean;
}

export type MatchPhase = "live" | "halftime" | "extraTime" | "penalties" | "finished";

/**
 * Estado do jogo em cinco valores: o intervalo da prorrogação conta como intervalo e a partida
 * abandonada, como fim (030 R2); antes do apito inicial o jogo está "ao vivo" aos 0'.
 */
export function phaseOf(state: MatchState): MatchPhase {
  switch (state.status) {
    case "half_time":
    case "extra_half_time":
      return "halftime";
    case "extra_first_half":
    case "extra_second_half":
      return "extraTime";
    case "penalties":
      return "penalties";
    case "finished":
    case "abandoned":
      return "finished";
    default:
      return "live";
  }
}

export interface MatchProgress {
  minute: number;
  /** 90, ou 120 quando há prorrogação. */
  total: number;
  /** Minuto do intervalo: 45, ou 105 na prorrogação. */
  halftimeAt: number;
  percent: number;
}

/** Quanto da partida já passou, para a barra de andamento. */
export function progressOf(state: MatchState): MatchProgress {
  const extra =
    state.extraTime === true ||
    state.status === "extra_first_half" ||
    state.status === "extra_half_time" ||
    state.status === "extra_second_half" ||
    state.shootout !== undefined;
  const total = extra ? 120 : 90;
  const over = phaseOf(state) === "finished" || state.status === "penalties";
  const minute = over ? total : Math.min(total, state.clock.minute);
  return {
    minute,
    total,
    halftimeAt: extra ? 105 : 45,
    percent: over ? 100 : Math.round((minute / total) * 1000) / 10,
  };
}

export interface SentOff {
  side: Side;
  playerId: string;
  minute: number;
  stoppage: number;
}

/** Expulsos da partida (vermelho direto ou segundo amarelo), com o minuto. */
export function sentOffOf(state: MatchState): SentOff[] {
  const sent: SentOff[] = [];
  for (const event of state.events) {
    if (event.type === "red_card") {
      sent.push({
        side: event.side,
        playerId: event.playerId,
        minute: event.minute,
        stoppage: event.stoppage,
      });
    }
  }
  return sent;
}

/** Lances do meu jogo que merecem anúncio para leitor de tela (030 R7). */
function announced(event: MatchEvent): boolean {
  switch (event.type) {
    case "shot":
      return event.outcome === "goal";
    case "red_card":
    case "injury":
    case "half_time":
    case "extra_half_time":
    case "full_time":
    case "extra_time_start":
    case "shootout_kick":
    case "shootout_end":
      return true;
    default:
      return false;
  }
}

/**
 * Todos os lances do lote que o leitor de tela deve ouvir, em ordem: só os do meu jogo e nunca os
 * de outros jogos, sem repetir nenhum.
 */
export function announcementsOf(batch: readonly FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return batch
    .filter((item) => {
      if (!item.mine || !announced(item.event) || seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    })
    .sort((a, b) => a.event.seq - b.event.seq);
}

/** O gol de um jogo some do destaque depois de tantos passos do relógio. */
export const RECENT_GOAL_TICKS = 5;

/** Passo do relógio do motor em que o relógio `clock` cai (mesma conta de `matchTicks`). */
function ticksAt(state: MatchState, clock: { half: number; minute: number; stoppage: number }) {
  const { half, minute, stoppage } = clock;
  const regulation = 90 + (state.stoppage.first ?? 0) + (state.stoppage.second ?? 0);
  if (half >= 3) return regulation + (minute - 90);
  if (half === 1) return minute + stoppage;
  return 45 + (state.stoppage.first ?? 0) + (minute - 45) + stoppage;
}

/** Lado do último gol do jogo, se ele saiu há poucos passos; `undefined` caso contrário. */
export function recentGoal(match: LiveMatch): { side: Side } | undefined {
  const { state } = match;
  for (let index = state.events.length - 1; index >= 0; index--) {
    const event = state.events[index];
    if (event?.type !== "shot" || event.outcome !== "goal") continue;
    const age = matchTicks(state) - ticksAt(state, event);
    return age < RECENT_GOAL_TICKS ? { side: event.side } : undefined;
  }
  return undefined;
}

export interface OtherMatchRow {
  key: string;
  competition: string;
  minute: string;
  home: { clubId: string; name: string };
  away: { clubId: string; name: string };
  score: Record<Side, number>;
  recent: Side | undefined;
}

/** Os outros jogos da divisão do jogador, uma linha por jogo (o meu jogo fica de fora). */
export function otherMatchRows(live: LiveRound, save: SaveFile, clubId: string): OtherMatchRow[] {
  const mine = live.matches.find(
    (match) => match.sides.home === clubId || match.sides.away === clubId,
  );
  const level = mine?.divisionLevel ?? live.matches[0]?.divisionLevel;
  const competition =
    save.bank.competitions.find((entry) => entry.id === live.competitionId)?.name ?? "";
  const club = (id: string) => {
    const found = save.bank.clubs.find((entry) => entry.id === id);
    return { clubId: id, name: found?.shortName ?? id };
  };
  return live.matches
    .filter((match) => match !== mine && match.divisionLevel === level)
    .map((match) => ({
      key: `${match.fixture.home}-${match.fixture.away}`,
      competition,
      minute: clockText(match.state),
      home: club(match.sides.home),
      away: club(match.sides.away),
      score: match.state.score,
      recent: recentGoal(match)?.side,
    }));
}

export interface MatchContext {
  competition: string;
  /** Fase de copa, grupo ou pontos corridos de uma divisão em fases; nada nos demais jogos. */
  phase: string | undefined;
  neutral: boolean;
}

/** Competição, fase ou grupo e campo neutro do jogo (030 R3), só com o que a partida traz. */
export function matchContext(save: SaveFile, live: LiveRound, match: LiveMatch): MatchContext {
  const competitionId = live.competitionId ?? save.league.competitionId;
  const competition =
    save.bank.competitions.find((entry) => entry.id === competitionId)?.name ?? "";
  const { fixture } = match;
  let phase: string | undefined;
  if (fixture.tie) phase = phaseLabel(save, competitionId, fixture.round);
  else if (fixture.stage?.kind === "groups" && fixture.stage.group) {
    phase = t("live.phase.group", { group: fixture.stage.group });
  } else if (fixture.stage?.kind === "league") phase = t("live.phase.league");
  return { competition, phase, neutral: fixture.neutral === true };
}

/** Quem venceu a disputa de pênaltis, quando ela já acabou (o evento `shootout_end`). */
export function shootoutWinner(state: MatchState): Side | undefined {
  for (let index = state.events.length - 1; index >= 0; index--) {
    const event = state.events[index];
    if (event?.type === "shootout_end") return event.winner;
  }
  return undefined;
}

export type MarkerKind = "goal" | "yellow" | "red" | "injury";

export interface TimelineMarker {
  key: string;
  kind: MarkerKind;
  side: Side;
  minute: number;
  /** Posição na barra de andamento, de 0 a 100. */
  percent: number;
  /** O lance, para a descrição que aparece ao passar o mouse. */
  event: MatchEvent;
}

/** Gols, cartões e lesões do jogo no minuto em que aconteceram, para a linha do tempo da barra (030). */
export function markersOf(state: MatchState): TimelineMarker[] {
  const { total } = progressOf(state);
  const markers: TimelineMarker[] = [];
  for (const event of state.events) {
    let kind: MarkerKind | undefined;
    if (event.type === "shot" && event.outcome === "goal") kind = "goal";
    else if (event.type === "yellow_card") kind = "yellow";
    else if (event.type === "red_card") kind = "red";
    else if (event.type === "injury") kind = "injury";
    if (!kind || !("side" in event)) continue;
    markers.push({
      key: `${event.seq}`,
      kind,
      side: event.side,
      minute: event.minute,
      percent: Math.min(100, Math.max(0, (event.minute / total) * 100)),
      event,
    });
  }
  return markers;
}

export type EventTag =
  | "start"
  | "halftime"
  | "end"
  | "goal"
  | "card"
  | "injury"
  | "change"
  | "penalty"
  | "extra"
  | "shootout";

/** Etiqueta do lance na linha do tempo ("Gol", "Cartão", "Lesão"…); o texto narrado vem de `eventText`. */
export function tagOf(event: MatchEvent): EventTag {
  switch (event.type) {
    case "kickoff":
    case "second_half":
      return "start";
    case "half_time":
    case "extra_half_time":
      return "halftime";
    case "full_time":
    case "extra_time_end":
    case "abandoned":
      return "end";
    case "extra_time_start":
      return "extra";
    case "shootout_start":
    case "shootout_kick":
    case "shootout_end":
      return "shootout";
    case "penalty_awarded":
      return "penalty";
    case "shot":
      return event.kind === "penalty" ? "penalty" : "goal";
    case "yellow_card":
    case "red_card":
      return "card";
    case "injury":
      return "injury";
    default:
      return "change";
  }
}
