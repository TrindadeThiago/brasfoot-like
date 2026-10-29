// 029 US3: propostas de emprego avaliadas com tudo para decidir e aceitas só com o teclado.
import { type BoardState, seasonGoals } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { JobOffers } from "../../src/ui/board/JobOffers";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { unemployed } from "../helpers/career-board";
import { loadSaved } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/carreira?c=tela&aba=offers");
});

/** Abre uma proposta de outro clube do mesmo país. */
function withOffer() {
  return (save: SaveFile): SaveFile => {
    const board: BoardState = structuredClone(save.board);
    const target = Object.keys(board.clubs).find((id) => id !== save.clubId) as string;
    board.offers.push({
      id: "offer-x",
      clubId: target,
      season: 1,
      round: 0,
      expiresRound: 9,
      goals: seasonGoals(
        { world: save.bank, league: save.league, finances: save.finances },
        target,
        board.manager.reputation,
      ),
      status: "pending",
    });
    return { ...save, board };
  };
}

describe("Propostas (029)", () => {
  it("cada proposta mostra clube, divisão e posição, reputação, metas esperadas e validade", async () => {
    const { store, save } = await storedCareer(4, withOffer());
    renderApp("/jogo/carreira?c=tela&aba=offers", store);
    const offer = save.board.offers.find((entry) => entry.id === "offer-x");
    const club = save.bank.clubs.find((entry) => entry.id === offer?.clubId);
    const card = await screen.findByRole("article", { name: club?.name ?? "" });
    const text = card.textContent ?? "";
    expect(text).toMatch(/º colocado/);
    expect(text).toContain(t("career.offers.reputation", { value: club?.reputation ?? 0 }));
    expect(text).toMatch(/Metas esperadas:/);
    expect(text).toMatch(/Vale (até|por mais)/);
    expect(within(card).getByRole("button", { name: t("career.offers.accept") })).toBeDefined();
    expect(within(card).getByRole("button", { name: t("career.offers.decline") })).toBeDefined();
  });

  it("proposta do mesmo país não traz o aviso", async () => {
    const { store } = await storedCareer(4, withOffer());
    renderApp("/jogo/carreira?c=tela&aba=offers", store);
    await screen.findByRole("button", { name: t("career.offers.accept") });
    expect(screen.queryByRole("region", { name: t("career.offers.abroadTitle") })).toBeNull();
  });

  it("demitido aceita uma proposta só com o teclado e o foco não se perde", async () => {
    const { store, save } = await storedCareer(4, (current) => withOffer()(unemployed(current)));
    renderApp("/jogo/carreira?c=tela&aba=offers", store);
    const user = userEvent.setup({ delay: null });
    const accept = await screen.findByRole("button", { name: t("career.offers.accept") });
    accept.focus();
    expect(document.activeElement).toBe(accept);
    await user.keyboard("{Enter}");
    const saved = await vi.waitFor(async () => {
      const next = await loadSaved(store);
      expect(next.board.manager.clubId).not.toBeNull();
      return next;
    });
    expect(saved.board.manager.clubId).toBe(
      save.board.offers.at(-1)?.clubId ?? saved.board.manager.clubId,
    );
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: t("career.title") }));
  });

  it("recusar a única proposta mostra o estado vazio com a reputação", async () => {
    const { store, save } = await storedCareer(4, withOffer());
    renderApp("/jogo/carreira?c=tela&aba=offers", store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: t("career.offers.decline") }));
    expect(await screen.findByText(t("career.offers.empty"))).toBeDefined();
    expect(
      screen.getByText(t("career.offers.emptyDetail", { value: save.board.manager.reputation })),
    ).toBeDefined();
  });

  it("com a rodada ao vivo as ações ficam desativadas e o motivo aparece escrito", async () => {
    const { save } = await storedCareer(4, withOffer());
    render(<JobOffers save={save} disabled onAccept={() => {}} onDecline={() => {}} />);
    expect(
      (screen.getByRole("button", { name: t("career.offers.accept") }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText(t("career.offers.locked"))).toBeDefined();
  });

  it("o contador da barra lateral acompanha as propostas pendentes", async () => {
    const { store } = await storedCareer(4, withOffer());
    renderApp("/jogo/carreira?c=tela", store);
    expect(await screen.findByRole("link", { name: /Carreira.*\(1\)/ })).toBeDefined();
  });
});
