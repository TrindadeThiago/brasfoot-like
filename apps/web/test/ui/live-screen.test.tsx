// 030 US1: o meu jogo como numa transmissão: placar, estado, linha do tempo, estatísticas e os outros jogos.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchContext, otherMatchRows } from "../../src/game/live-view";
import type { FeedItem } from "../../src/game/useLiveRound";
import { t } from "../../src/i18n";
import { EventFeed, TIMELINE_LIMIT } from "../../src/ui/EventFeed";
import { MatchScoreboard } from "../../src/ui/live/MatchScoreboard";
import { OtherMatches } from "../../src/ui/live/OtherMatches";
import { ProgressBar } from "../../src/ui/live/ProgressBar";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { useRoundClock } from "../helpers/live";
import { advance, liveRoundOf, mineOf, played } from "../helpers/live-round";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  useRoundClock();
});
afterEach(() => vi.useRealTimers());

describe("cartão do meu jogo (030)", () => {
  it("mostra escudos, nomes, competição, mando, placar grande e o estado em texto", async () => {
    const { round, save } = await liveRoundOf();
    const mine = mineOf(round, save.clubId);
    const { container } = render(
      <MatchScoreboard
        match={mine.match}
        save={save}
        context={matchContext(save, round, mine.match)}
        mine={mine.side}
      />,
    );
    const names = save.bank.clubs
      .filter((club) => club.id === mine.match.sides.home || club.id === mine.match.sides.away)
      .map((club) => club.name);
    for (const name of names) expect(screen.getByText(name)).toBeDefined();
    expect(container.querySelectorAll("[role='img']").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("0 × 0")).toBeDefined();
    expect(screen.getByText(t("live.state.live"))).toBeDefined();
    expect(
      screen.getByText(t(mine.side === "home" ? "live.side.home" : "live.side.away")),
    ).toBeDefined();
    const competition = save.bank.competitions.find(
      (entry) => entry.id === save.league.competitionId,
    );
    expect(screen.getByText(competition?.name ?? "")).toBeDefined();
  });

  it("o estado vira intervalo, prorrogação, pênaltis e fim, sempre em texto", async () => {
    const { round, save } = await liveRoundOf();
    const mine = mineOf(round, save.clubId);
    const context = matchContext(save, round, mine.match);
    const cases: [string, string][] = [
      ["half_time", t("round.halfTime")],
      ["extra_first_half", t("live.state.extraTime")],
      ["penalties", t("round.penalties")],
      ["finished", t("round.fullTime")],
    ];
    for (const [status, text] of cases) {
      const { unmount } = render(
        <MatchScoreboard
          match={{ ...mine.match, state: { ...mine.match.state, status: status as never } }}
          save={save}
          context={context}
          mine={mine.side}
        />,
      );
      expect(screen.getByText(text)).toBeDefined();
      unmount();
    }
  });

  it("mostra a etiqueta de clássico e os expulsos de cada time com nome e minuto", async () => {
    const { round, save } = await liveRoundOf();
    const mine = mineOf(round, save.clubId);
    const playerId = save.bank.players.find(
      (player) => player.clubId === mine.match.sides.home,
    )?.id;
    if (!playerId) throw new Error("sem jogador");
    const withRed = {
      ...mine.match,
      state: {
        ...mine.match.state,
        events: [
          ...mine.match.state.events,
          {
            seq: 99,
            half: 2,
            minute: 61,
            stoppage: 0,
            type: "red_card",
            side: "home",
            playerId,
            reason: "direct",
          },
        ],
      },
    } as typeof mine.match;
    render(
      <MatchScoreboard
        match={withRed}
        save={{
          ...save,
          bank: {
            ...save.bank,
            rivalries: [
              { clubIds: [withRed.sides.home, withRed.sides.away], intensity: 3 },
            ] as never,
          },
        }}
        context={matchContext(save, round, withRed)}
        mine={mine.side}
      />,
    );
    const player = save.bank.players.find((entry) => entry.id === playerId)?.displayName ?? "";
    expect(screen.getByText(t("live.sentOffName", { player, minute: "61'" }))).toBeDefined();
    expect(screen.getByText(t("derby.badge"))).toBeDefined();
  });
});

describe("andamento, linha do tempo e estatísticas (030)", () => {
  it("a barra de andamento mostra o progresso, o relógio e o intervalo escritos", async () => {
    const { round, save } = await liveRoundOf();
    const middle = mineOf(advance(round, 30), save.clubId).match;
    render(<ProgressBar match={middle} save={save} />);
    const bar = screen.getByRole("progressbar", {
      name: t("live.progress"),
    }) as HTMLProgressElement;
    expect(bar.value).toBeGreaterThan(0);
    expect(bar.max).toBe(90);
    // O intervalo e os extremos da linha estão escritos: 0', 45' e 90'.
    for (const label of ["0'", "45'", "90'"]) expect(screen.getByText(label)).toBeDefined();
    expect(bar.getAttribute("aria-valuetext")).toMatch(/\d+'/);
  });

  it("a linha do tempo mostra só os lances do meu jogo, no máximo o teto, sem 'lances da rodada'", async () => {
    const { round, save } = await liveRoundOf();
    const finished = played(round);
    const mine = mineOf(finished, save.clubId);
    const index = finished.matches.indexOf(mine.match);
    const base: FeedItem[] = mine.match.state.events.map((event) => ({
      key: `${index}-${event.seq}`,
      matchIndex: index,
      event,
      mine: true,
    }));
    const many = Array.from({ length: 12 }, (_, copy) =>
      base.map((item) => ({ ...item, key: `${item.key}-${copy}` })),
    ).flat();
    render(<EventFeed title={t("round.myFeed")} items={many} live={finished} save={save} />);
    const log = screen.getByRole("log", { name: t("round.myFeed") });
    expect(within(log).getAllByRole("listitem").length).toBe(TIMELINE_LIMIT);
    // O quadro rola por teclado e não repete o anúncio de cada lance.
    expect(log.getAttribute("tabindex")).toBe("0");
    expect(log.getAttribute("aria-live")).toBe("off");
    expect(screen.queryByRole("heading", { name: /Lances da rodada/ })).toBeNull();
  });

  it("sem lances ainda, a linha do tempo diz isso", async () => {
    const { round, save } = await liveRoundOf();
    render(<EventFeed title={t("round.myFeed")} items={[]} live={round} save={save} />);
    expect(screen.getByText(t("live.timeline.empty"))).toBeDefined();
  });
});

describe("os outros jogos em lista (030)", () => {
  it("uma linha por jogo, com competição, minuto, nomes e placar, e o gol recente com texto", async () => {
    const { round, save } = await liveRoundOf();
    const rows = otherMatchRows(round, save, save.clubId);
    const { rerender } = render(<OtherMatches rows={rows} />);
    const list = screen.getByRole("region", { name: t("round.otherMatches") });
    expect(within(list).getAllByRole("listitem")).toHaveLength(round.matches.length - 1);
    const first = within(list).getAllByRole("listitem")[0] as HTMLElement;
    expect(first.textContent).toContain(rows[0]?.home.name);
    expect(first.textContent).toContain(rows[0]?.away.name);
    expect(first.textContent).toContain("0 × 0");
    expect(within(list).queryByText(t("live.recentGoal"))).toBeNull();
    rerender(
      <OtherMatches
        rows={rows.map((row, index) => (index === 0 ? { ...row, recent: "home" } : row))}
      />,
    );
    expect(screen.getByText(t("live.recentGoal"))).toBeDefined();
  });
});

describe("a tela da rodada (030)", () => {
  it("o jogo em destaque e os outros jogos em lista; não há 'lances da rodada'", async () => {
    const career = await storedCareer(1);
    renderApp("/jogo?c=tela", career.store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
    const mine = await screen.findByRole("region", { name: t("round.myMatch") });
    expect(within(mine).getByText(t("live.state.live"))).toBeDefined();
    expect(screen.getByRole("progressbar", { name: t("live.progress") })).toBeDefined();
    expect(screen.getByRole("log", { name: t("round.myFeed") })).toBeDefined();
    expect(screen.queryByRole("log", { name: /Lances da rodada/ })).toBeNull();
    expect(
      within(screen.getByRole("region", { name: t("round.otherMatches") })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(9);
  });
});

describe("marcas da linha do tempo (030)", () => {
  it("o gol tem a bola e, ao passar o mouse, a descrição do lance", async () => {
    const { round, save } = await liveRoundOf();
    const mine = mineOf(round, save.clubId).match;
    const player = save.bank.players.find((entry) => entry.clubId === mine.sides.home);
    if (!player) throw new Error("sem jogador");
    const withGoal = {
      ...mine,
      state: {
        ...mine.state,
        events: [
          {
            seq: 7,
            half: 1,
            minute: 22,
            stoppage: 0,
            type: "shot",
            side: "home",
            playerId: player.id,
            kind: "open",
            outcome: "goal",
          },
        ],
      },
    } as unknown as typeof mine;
    const { container } = render(<ProgressBar match={withGoal} save={save} />);
    const marker = container.querySelector("[class*='goal']") as HTMLElement;
    expect(marker.textContent).toContain("⚽");
    // A descrição está no balão da marca e cita o jogador.
    expect(marker.querySelector("[class*='tip']")?.textContent).toContain(player.displayName);
  });
});
