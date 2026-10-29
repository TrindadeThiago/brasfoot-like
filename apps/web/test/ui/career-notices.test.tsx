// 029 US6: avisos de demissão, nova contratação e propostas com o componente de aviso.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { unemployed, withPendingOffer } from "../helpers/career-board";
import { loadSaved } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo?c=tela");
});

describe("avisos da diretoria na Início (029)", () => {
  it("a demissão usa o aviso, com o texto de hoje e a ação de dispensar", async () => {
    const { store, save } = await storedCareer(1, unemployed);
    renderApp("/jogo?c=tela", store);
    const notice = await screen.findByRole("status", { name: t("board.notice.firedTitle") });
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId)?.name ?? "";
    expect(within(notice).getByText(t("board.notice.fired", { club }))).toBeDefined();
    const user = userEvent.setup({ delay: null });
    await user.click(within(notice).getByRole("button", { name: t("board.notice.dismiss") }));
    expect((await loadSaved(store)).board.notice).toBeUndefined();
  });

  it("a nova contratação é um aviso informativo com a mesma ação", async () => {
    const { store, save } = await storedCareer(1, (current) => ({
      ...current,
      board: {
        ...current.board,
        notice: { kind: "hired", clubId: current.clubId, season: 1, round: 0 },
      },
    }));
    renderApp("/jogo?c=tela", store);
    const notice = await screen.findByRole("status", { name: t("board.notice.hiredTitle") });
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId)?.name ?? "";
    expect(within(notice).getByText(t("board.notice.hired", { club }))).toBeDefined();
    expect(within(notice).getByRole("button", { name: t("board.notice.dismiss") })).toBeDefined();
  });

  it("o aviso de propostas continua anunciado como status, com o link para a aba", async () => {
    const { store } = await storedCareer(2, withPendingOffer);
    renderApp("/jogo?c=tela", store);
    const notice = await screen.findByRole("status", { name: t("career.offers.title") });
    expect(
      within(notice).getByText(new RegExp(t("career.offers.notice", { count: 1 }))),
    ).toBeDefined();
    const link = within(notice).getByRole("link", { name: t("career.offers.open") });
    expect(link.getAttribute("href")).toContain("aba=offers");
  });

  it("a gravidade vem em texto no título, e não só na cor", async () => {
    const { store } = await storedCareer(1, unemployed);
    renderApp("/jogo?c=tela", store);
    const notice = await screen.findByRole("status", { name: t("board.notice.firedTitle") });
    expect(
      within(notice).getByRole("heading", { name: t("board.notice.firedTitle") }),
    ).toBeDefined();
  });
});
