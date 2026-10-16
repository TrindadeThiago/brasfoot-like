"use client";

import {
  advanceRound,
  applyRoundChange,
  finishRound,
  isRoundFinished,
  type LiveRound,
  type MatchChange,
  type MatchEvent,
  matchOf,
  type Side,
} from "@brasfoot-like/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { type RoundSpeed, readPreferences, writePreferences } from "../storage/preferences";

/** Milissegundos por passo do relógio (~98 passos por rodada: 60 s, 45 s, 30 s). */
export const TICK_MS: Record<RoundSpeed, number> = { slow: 610, normal: 460, fast: 305 };
export const SPEEDS: readonly RoundSpeed[] = ["slow", "normal", "fast"];
const MAX_TICKS_PER_UPDATE = 5;

export interface FeedItem {
  key: string;
  matchIndex: number;
  event: MatchEvent;
  mine: boolean;
}

/** Lesão ou expulsão do time do jogador entre os eventos novos (pausa automática, FR-010). */
export function shouldAutoPause(events: readonly MatchEvent[], side: Side): boolean {
  return events.some(
    (event) => (event.type === "injury" || event.type === "red_card") && event.side === side,
  );
}

function newEvents(before: LiveRound, after: LiveRound, clubId: string): FeedItem[] {
  const items: FeedItem[] = [];
  after.matches.forEach((match, index) => {
    const previous = before.matches[index]?.state.events.length ?? 0;
    const mine = match.sides.home === clubId || match.sides.away === clubId;
    for (const event of match.state.events.slice(previous)) {
      items.push({ key: `${index}-${event.seq}`, matchIndex: index, event, mine });
    }
  });
  return items;
}

/** Relógio da rodada ao vivo: velocidade, pausa, decisões e feed (research.md R3). */
export function useLiveRound(
  initial: LiveRound,
  clubId: string,
  onFinish: (round: LiveRound) => void,
) {
  const [live, setLive] = useState(initial);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeedState] = useState<RoundSpeed>(
    () => readPreferences().roundSpeed ?? "normal",
  );
  const [autoPause, setAutoPauseState] = useState(() => readPreferences().autoPause ?? true);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const liveRef = useRef(live);
  liveRef.current = live;
  const finishedRef = useRef(false);
  const finished = isRoundFinished(live);
  const side = matchOf(live, clubId)?.side;

  const update = useCallback(
    (next: LiveRound) => {
      const items = newEvents(liveRef.current, next, clubId);
      liveRef.current = next;
      setLive(next);
      if (items.length > 0) setFeed((current) => [...items.reverse(), ...current]);
      return items;
    },
    [clubId],
  );

  useEffect(() => {
    if (finished && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(liveRef.current);
    }
  }, [finished, onFinish]);

  useEffect(() => {
    if (paused || finished) return;
    let last = performance.now();
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const now = performance.now();
      const due = Math.min(
        MAX_TICKS_PER_UPDATE,
        Math.max(1, Math.floor((now - last) / TICK_MS[speed])),
      );
      last = now;
      const items = update(advanceRound(liveRef.current, due));
      if (
        autoPause &&
        side &&
        shouldAutoPause(
          items.filter((item) => item.mine).map((item) => item.event),
          side,
        )
      ) {
        setPaused(true);
        return;
      }
      if (!isRoundFinished(liveRef.current)) timer = setTimeout(step, TICK_MS[speed]);
    };
    timer = setTimeout(step, TICK_MS[speed]);
    return () => clearTimeout(timer);
  }, [paused, finished, speed, autoPause, side, update]);

  const setSpeed = useCallback((value: RoundSpeed) => {
    setSpeedState(value);
    writePreferences({ roundSpeed: value });
  }, []);

  const setAutoPause = useCallback((value: boolean) => {
    setAutoPauseState(value);
    writePreferences({ autoPause: value });
  }, []);

  const finishNow = useCallback(() => {
    update(finishRound(liveRef.current));
  }, [update]);

  const applyDecision = useCallback(
    (change: MatchChange): { ok: true } | { ok: false; code: string; limit?: number } => {
      const result = applyRoundChange(liveRef.current, clubId, change);
      if (!result.ok) {
        const limit = result.error.params.limit;
        return typeof limit === "number"
          ? { ok: false, code: result.error.code, limit }
          : { ok: false, code: result.error.code };
      }
      update(result.round);
      return { ok: true };
    },
    [clubId, update],
  );

  return {
    live,
    feed,
    paused,
    finished,
    speed,
    autoPause,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    toggle: () => setPaused((value) => !value),
    setSpeed,
    setAutoPause,
    finishNow,
    applyDecision,
  };
}
