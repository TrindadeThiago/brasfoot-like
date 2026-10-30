// 030 R2, R4, R5, R7: progresso, estado, expulsos, anúncios e os outros jogos da rodada ao vivo.
import type { MatchEvent, MatchState } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  announcementsOf,
  type FeedItem,
  markersOf,
  otherMatchRows,
  phaseOf,
  progressOf,
  RECENT_GOAL_TICKS,
  recentGoal,
  sentOffOf,
  shootoutWinner,
  tagOf,
} from "../../src/game/live-view";
import { advance, liveRoundOf, mineOf, played } from "../helpers/live-round";

const withStatus = (state: MatchState, status: MatchState["status"]): MatchState => ({
  ...state,
  status,
});

function item(event: Partial<MatchEvent> & { type: MatchEvent["type"] }, mine = true): FeedItem {
  return {
    key: `${event.type}-${Math.random()}`,
    matchIndex: 0,
    event: { seq: 1, half: 1, minute: 10, stoppage: 0, ...event } as MatchEvent,
    mine,
  };
}

describe("estado e progresso do jogo (030)", () => {
  it("o estado traduz o status do motor: intervalo, prorrogação, pênaltis e fim", async () => {
    const { round, save } = await liveRoundOf();
    const { state } = mineOf(round, save.clubId).match;
    expect(phaseOf(withStatus(state, "first_half"))).toBe("live");
    expect(phaseOf(withStatus(state, "not_started"))).toBe("live");
    expect(phaseOf(withStatus(state, "half_time"))).toBe("halftime");
    // O intervalo da prorrogação conta como intervalo; a partida abandonada, como fim.
    expect(phaseOf(withStatus(state, "extra_half_time"))).toBe("halftime");
    expect(phaseOf(withStatus(state, "extra_first_half"))).toBe("extraTime");
    expect(phaseOf(withStatus(state, "extra_second_half"))).toBe("extraTime");
    expect(phaseOf(withStatus(state, "penalties"))).toBe("penalties");
    expect(phaseOf(withStatus(state, "finished"))).toBe("finished");
    expect(phaseOf(withStatus(state, "abandoned"))).toBe("finished");
  });

  it("o progresso vai de 0 a 100% em 90 minutos e usa 120 na prorrogação", async () => {
    const { round, save } = await liveRoundOf();
    const start = mineOf(round, save.clubId).match.state;
    expect(progressOf(start)).toMatchObject({ minute: 0, total: 90, halftimeAt: 45, percent: 0 });
    const middle = mineOf(advance(round, 30), save.clubId).match.state;
    const progress = progressOf(middle);
    expect(progress.percent).toBeGreaterThan(0);
    expect(progress.percent).toBeLessThan(100);
    const end = mineOf(played(round), save.clubId).match.state;
    expect(progressOf(end).percent).toBe(100);
    const extra = { ...end, extraTime: true, status: "extra_first_half" as const };
    expect(progressOf(extra).total).toBe(120);
    expect(progressOf(extra).halftimeAt).toBe(105);
    expect(progressOf(withStatus(end, "penalties")).percent).toBe(100);
  });
});

describe("expulsos e anúncios (030)", () => {
  it("os expulsos do meu jogo trazem o lado, o jogador e o minuto", async () => {
    const { round, save } = await liveRoundOf();
    const { state } = mineOf(round, save.clubId).match;
    const sent = {
      ...state,
      events: [
        ...state.events,
        {
          seq: 9,
          half: 2,
          minute: 61,
          stoppage: 0,
          type: "red_card",
          side: "home",
          playerId: "p1",
          reason: "direct",
        },
      ] as MatchEvent[],
    };
    expect(sentOffOf(sent)).toEqual([{ side: "home", playerId: "p1", minute: 61, stoppage: 0 }]);
    expect(sentOffOf(state)).toEqual([]);
  });

  it("anuncia todos os lances elegíveis do meu jogo, em ordem, e nenhum de outro jogo", () => {
    const batch: FeedItem[] = [
      item({
        type: "shot",
        side: "home",
        playerId: "a",
        kind: "open",
        outcome: "goal",
        seq: 5,
      } as never),
      item({
        type: "shot",
        side: "home",
        playerId: "a",
        kind: "open",
        outcome: "saved",
        seq: 6,
      } as never),
      item({ type: "injury", side: "home", playerId: "b", severity: "minor", seq: 7 } as never),
      item({ type: "half_time", seq: 8 }),
      item({ type: "yellow_card", side: "home", playerId: "c", seq: 9 } as never),
      item({ type: "red_card", side: "away", playerId: "d", reason: "direct", seq: 10 } as never),
      item(
        {
          type: "shot",
          side: "away",
          playerId: "e",
          kind: "open",
          outcome: "goal",
          seq: 11,
        } as never,
        false,
      ),
    ];
    const announced = announcementsOf(batch).map((entry) => entry.event.type);
    // Gol, lesão, intervalo e expulsão do meu jogo; defesa, cartão amarelo e o gol de outro jogo ficam de fora.
    expect(announced).toEqual(["shot", "injury", "half_time", "red_card"]);
    expect(announcementsOf(batch).map((entry) => entry.event.seq)).toEqual([5, 7, 8, 10]);
  });

  it("anuncia também fim de jogo, prorrogação, intervalo da prorrogação e cobrança de pênalti", () => {
    const types = [
      "full_time",
      "extra_time_start",
      "extra_half_time",
      "shootout_kick",
      "shootout_end",
    ] as const;
    const batch = types.map((type, index) =>
      item({
        type,
        seq: index + 1,
        side: "home",
        outcome: "goal",
        order: 0,
        winner: "home",
      } as never),
    );
    expect(announcementsOf(batch)).toHaveLength(types.length);
  });

  it("não repete o mesmo lance em dois lotes e ignora lances sem texto de anúncio", () => {
    const goal = item({
      type: "shot",
      side: "home",
      playerId: "a",
      kind: "open",
      outcome: "goal",
    } as never);
    expect(announcementsOf([goal, goal])).toHaveLength(1);
    expect(
      announcementsOf([
        item({
          type: "substitution",
          side: "home",
          outId: "x",
          inId: "y",
          slotId: "s",
          automatic: false,
        } as never),
      ]),
    ).toEqual([]);
    expect(announcementsOf([])).toEqual([]);
  });
});

describe("os outros jogos da rodada (030)", () => {
  it("uma linha por jogo da divisão do jogador, sem o meu jogo, com placar e relógio", async () => {
    const { round, save } = await liveRoundOf();
    const rows = otherMatchRows(round, save, save.clubId);
    expect(rows).toHaveLength(round.matches.length - 1);
    for (const row of rows) {
      expect(row.home.clubId).not.toBe(save.clubId);
      expect(row.away.clubId).not.toBe(save.clubId);
      expect(row.score).toEqual({ home: 0, away: 0 });
      expect(row.minute).toBe("0'");
    }
  });

  it("o gol recente aparece por poucos passos e depois some", async () => {
    const { round, save } = await liveRoundOf();
    let current = round;
    let found: { index: number; ticks: number } | undefined;
    // Joga passo a passo até algum jogo marcar um gol.
    for (let step = 0; step < 100 && !found; step++) {
      current = advance(current, 1);
      current.matches.forEach((match, index) => {
        if (!found && match.state.score.home + match.state.score.away > 0) {
          found = { index, ticks: current.tick };
        }
      });
    }
    expect(found).toBeDefined();
    const match = current.matches[found?.index ?? 0];
    if (!match) throw new Error("sem jogo");
    expect(recentGoal(match)).toBeDefined();
    const later = advance(current, RECENT_GOAL_TICKS + 1);
    const same = later.matches[found?.index ?? 0];
    if (!same) throw new Error("sem jogo");
    expect(recentGoal(same)).toBeUndefined();
    expect(save.clubId).toBeDefined();
  });
});

describe("vencedor dos pênaltis (030)", () => {
  it("só há vencedor depois do evento de fim da disputa", async () => {
    const { round, save } = await liveRoundOf();
    const { state } = mineOf(round, save.clubId).match;
    expect(shootoutWinner(state)).toBeUndefined();
    const ended = {
      ...state,
      events: [
        ...state.events,
        { seq: 200, half: 3, minute: 120, stoppage: 0, type: "shootout_end", winner: "away" },
      ] as MatchEvent[],
    };
    expect(shootoutWinner(ended)).toBe("away");
  });
});

describe("marcas da linha do tempo da partida (030)", () => {
  it("gols, cartões e lesões entram no minuto em que aconteceram, e o resto não", async () => {
    const { round, save } = await liveRoundOf();
    const { state } = mineOf(round, save.clubId).match;
    const events = [
      { seq: 1, half: 1, minute: 9, stoppage: 0, type: "yellow_card", side: "home", playerId: "a" },
      {
        seq: 2,
        half: 1,
        minute: 22,
        stoppage: 0,
        type: "injury",
        side: "away",
        playerId: "b",
        severity: "minor",
      },
      {
        seq: 3,
        half: 1,
        minute: 45,
        stoppage: 0,
        type: "shot",
        side: "home",
        playerId: "a",
        kind: "open",
        outcome: "goal",
      },
      {
        seq: 4,
        half: 1,
        minute: 50,
        stoppage: 0,
        type: "shot",
        side: "home",
        playerId: "a",
        kind: "open",
        outcome: "saved",
      },
      {
        seq: 5,
        half: 2,
        minute: 90,
        stoppage: 0,
        type: "red_card",
        side: "away",
        playerId: "c",
        reason: "direct",
      },
    ] as MatchEvent[];
    const markers = markersOf({ ...state, events });
    expect(markers.map((marker) => marker.kind)).toEqual(["yellow", "injury", "goal", "red"]);
    expect(markers.map((marker) => marker.percent)).toEqual([10, (22 / 90) * 100, 50, 100]);
  });
});

describe("etiqueta do lance (030)", () => {
  it("cada lance recebe a etiqueta do seu tipo", () => {
    const tag = (event: object) =>
      tagOf({ seq: 1, half: 1, minute: 1, stoppage: 0, ...event } as MatchEvent);
    expect(tag({ type: "kickoff" })).toBe("start");
    expect(tag({ type: "half_time" })).toBe("halftime");
    expect(tag({ type: "full_time" })).toBe("end");
    expect(tag({ type: "shot", kind: "open", outcome: "goal" })).toBe("goal");
    expect(tag({ type: "shot", kind: "penalty", outcome: "goal" })).toBe("penalty");
    expect(tag({ type: "yellow_card" })).toBe("card");
    expect(tag({ type: "red_card" })).toBe("card");
    expect(tag({ type: "injury" })).toBe("injury");
    expect(tag({ type: "substitution" })).toBe("change");
    expect(tag({ type: "extra_time_start" })).toBe("extra");
    expect(tag({ type: "shootout_kick" })).toBe("shootout");
  });
});
