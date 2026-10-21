// Cartões e trocas de posição no painel da rodada ao vivo; posição natural na escalação.
import { FORMATIONS, type LiveMatch, startLeagueRound } from "@brasfoot-like/engine";
import { managedClubId } from "@brasfoot-like/save";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { label, t } from "../../src/i18n";
import { SubstitutionPanel } from "../../src/ui/SubstitutionPanel";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";
import { careerSave } from "../helpers/saves";

/** Partida do clube do jogador no início da rodada 1, com o lado dele. */
function myMatch() {
  const save = careerSave("tela");
  const clubId = managedClubId(save) as string;
  const started = startLeagueRound(save.league, save.bank, { [clubId]: save.lineup });
  if (!started.ok) throw new Error("rodada");
  const match = started.round.matches.find((entry) =>
    Object.values(entry.sides).includes(clubId),
  ) as LiveMatch;
  const side = match.sides.home === clubId ? "home" : "away";
  return { save, match: structuredClone(match), side } as const;
}

const onFieldRows = () =>
  within(screen.getAllByRole("list")[0] as HTMLElement).getAllByRole("button");
const nameOf = (row: HTMLElement) => row.querySelectorAll("span")[1]?.textContent ?? "";

describe("painel da rodada: cartões, trocas e posição natural", () => {
  it("mostra amarelo de quem está em campo e vermelho do expulso", () => {
    const { save, match, side } = myMatch();
    const team = match.state.teams[side];
    const slots = FORMATIONS[team.formation].slots;
    const booked = team.onField[slots[3]?.id ?? ""] as string;
    const sentOff = team.onField[slots[5]?.id ?? ""] as string;
    (team.players[booked] as { yellowCards: number }).yellowCards = 1;
    const red = team.players[sentOff] as { yellowCards: number; sentOff: boolean };
    red.yellowCards = 2;
    red.sentOff = true;
    team.onField[slots[5]?.id ?? ""] = null;

    render(<SubstitutionPanel match={match} side={side} save={save} onChange={vi.fn()} />);
    const players = new Map(save.bank.players.map((player) => [player.id, player.displayName]));
    const bookedRow = onFieldRows().find((row) => nameOf(row) === players.get(booked));
    expect(
      within(bookedRow as HTMLElement).getByRole("img", {
        name: t("round.card.yellow", { count: 1 }),
      }),
    ).toBeDefined();
    const left = screen.getByRole("list", { name: t("round.substituted") });
    expect(within(left).getByText(players.get(sentOff) ?? "")).toBeDefined();
    expect(within(left).getByRole("img", { name: t("round.card.red") })).toBeDefined();
    // Só quem levou cartão tem ícone.
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("titular + outro titular troca os dois de posição, sem substituição", async () => {
    const { save, match, side } = myMatch();
    const team = match.state.teams[side];
    const onChange = vi.fn(() => ({ ok: true }) as const);
    render(<SubstitutionPanel match={match} side={side} save={save} onChange={onChange} />);
    const user = userEvent.setup();
    const [first, second] = FORMATIONS[team.formation].slots.slice(1, 3).map((slot) => slot.id);
    const a = team.onField[first as string];
    const b = team.onField[second as string];

    const names = new Map(save.bank.players.map((player) => [player.id, player.displayName]));
    await user.click(onFieldRows()[1] as HTMLElement);
    expect(screen.getByRole("status").textContent).toBe(
      t("round.selectOut", { name: names.get(a ?? "") ?? "" }),
    );
    await user.click(onFieldRows()[2] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith({
      type: "formation",
      formation: team.formation,
      assignment: { ...team.onField, [first as string]: b, [second as string]: a },
    });
    expect(screen.getByRole("status").textContent).toBe(
      t("round.swapDone", { first: names.get(a ?? "") ?? "", second: names.get(b ?? "") ?? "" }),
    );
  });

  it("jogador fora da posição natural mostra a posição de origem", () => {
    const { save, match, side } = myMatch();
    const team = match.state.teams[side];
    const slots = FORMATIONS[team.formation].slots;
    const goalkeeperSlot = slots.find((slot) => slot.position === "GK")?.id as string;
    const strikerSlot = slots.find((slot) => slot.position === "FW")?.id as string;
    const goalkeeper = team.onField[goalkeeperSlot] as string;
    team.onField[goalkeeperSlot] = team.onField[strikerSlot] ?? null;
    team.onField[strikerSlot] = goalkeeper;

    render(<SubstitutionPanel match={match} side={side} save={save} onChange={vi.fn()} />);
    expect(screen.getByText(t("lineup.natural", { position: label("position.GK") }))).toBeDefined();
    expect(screen.getByText(t("lineup.natural", { position: label("position.FW") }))).toBeDefined();
  });
});

describe("troca de posição na rodada ao vivo", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("brasfoot-like:preferences", JSON.stringify({ autoPause: false }));
    useRoundClock();
  });
  afterEach(() => vi.useRealTimers());

  it("pausa, troca dois titulares de lugar e o lance a lance registra a troca", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
    await elapse(10_000);
    await user.click(screen.getByRole("button", { name: t("round.pause") }));
    const panel = screen.getByRole("region", { name: t("round.panel") });
    const rows = () =>
      within(within(panel).getAllByRole("list")[0] as HTMLElement).getAllByRole("button");
    const before = rows().map(nameOf);

    await user.click(rows()[1] as HTMLElement);
    await user.click(rows()[2] as HTMLElement);

    const after = rows().map(nameOf);
    expect(after[1]).toBe(before[2]);
    expect(after[2]).toBe(before[1]);
    expect(
      within(panel).getByText(t("round.substitutionsLeft", { used: 0, limit: 5 })),
    ).toBeDefined();
    const feed = screen.getByRole("log", { name: t("round.myFeed") }).textContent ?? "";
    expect(feed).toContain(before[1]);
    expect(feed).toContain(before[2]);
    expect(feed).toMatch(/posição/);
  });
});

describe("escalação: posição natural", () => {
  it("cada titular mostra a posição natural", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    const pitch = await screen.findByRole("region", { name: t("lineup.pitch") });
    const filled = within(pitch)
      .getAllByRole("button")
      .filter((slot) => !slot.textContent?.includes(t("lineup.emptySlot")));
    expect(filled).toHaveLength(11);
    const prefix = t("lineup.naturalShort", { position: "" }).trim();
    for (const slot of filled) expect(slot.textContent).toContain(prefix);
  });
});
