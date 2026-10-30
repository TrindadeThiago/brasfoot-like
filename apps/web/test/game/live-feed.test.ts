// 030 R4, R7, FR-025: o feed da rodada tem teto, não toca o motor e entrega os anúncios por lote.
import { finishRound, isRoundFinished } from "@brasfoot-like/engine";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FEED_LIMIT, useLiveRound } from "../../src/game/useLiveRound";
import { elapse, useRoundClock } from "../helpers/live";
import { liveRoundOf } from "../helpers/live-round";

beforeEach(() => {
  localStorage.clear();
  useRoundClock();
});
afterEach(() => vi.useRealTimers());

describe("feed da rodada ao vivo (030)", () => {
  it("o estado guarda só os lances do meu jogo, até o teto, e os eventos do motor ficam inteiros", async () => {
    const { round, save } = await liveRoundOf();
    const { result } = renderHook(() => useLiveRound(round, save.clubId, () => undefined));
    act(() => result.current.finishNow());
    const total = result.current.live.matches.reduce(
      (sum, match) => sum + match.state.events.length,
      0,
    );
    // Uma rodada de 10 jogos tem bem mais lances do que o teto, mas a tela só guarda os do meu jogo.
    expect(total).toBeGreaterThan(FEED_LIMIT);
    expect(result.current.feed.length).toBeGreaterThan(0);
    expect(result.current.feed.length).toBeLessThanOrEqual(FEED_LIMIT);
    expect(result.current.feed.every((item) => item.mine)).toBe(true);
    // Os eventos do motor não são tocados.
    expect(result.current.live.matches.flatMap((match) => match.state.events)).toHaveLength(total);
  });

  it("o teto descarta os lances mais antigos do meu jogo", async () => {
    const { round, save } = await liveRoundOf();
    const { result } = renderHook(() => useLiveRound(round, save.clubId, () => undefined));
    for (let index = 0; index < 5; index++) {
      act(() => {
        result.current.applyDecision({
          type: "posture",
          posture: index % 2 ? "attacking" : "defensive",
        });
      });
    }
    expect(result.current.feed.length).toBeLessThanOrEqual(FEED_LIMIT);
  });

  it("a mesma seed e as mesmas decisões dão a mesma partida, com o feed limitado ou não (FR-025)", async () => {
    const { round, save } = await liveRoundOf();
    const expected = finishRound(round);
    const { result } = renderHook(() => useLiveRound(round, save.clubId, () => undefined));
    // Pelo relógio da interface, passo a passo, até acabar.
    for (let index = 0; index < 120 && !isRoundFinished(result.current.live); index++) {
      await elapse(2_000);
    }
    expect(isRoundFinished(result.current.live)).toBe(true);
    expect(result.current.live.matches.map((match) => match.state.score)).toEqual(
      expected.matches.map((match) => match.state.score),
    );
    expect(result.current.live.matches.map((match) => match.state.events)).toEqual(
      expected.matches.map((match) => match.state.events),
    );
  });

  it("entrega os anúncios do meu jogo de cada lote a quem pediu", async () => {
    const { round, save } = await liveRoundOf();
    const batches: number[] = [];
    const { result } = renderHook(() =>
      useLiveRound(
        round,
        save.clubId,
        () => undefined,
        (items) => batches.push(items.length),
      ),
    );
    act(() => result.current.finishNow());
    // O lote do fim inclui o intervalo, o fim do jogo e o que mais houve no meu jogo.
    expect(batches.length).toBeGreaterThan(0);
    expect(batches.every((size) => size > 0)).toBe(true);
    expect(batches.reduce((sum, size) => sum + size, 0)).toBeGreaterThanOrEqual(2);
  });
});
