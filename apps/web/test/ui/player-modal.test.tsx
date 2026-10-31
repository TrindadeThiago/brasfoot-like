// 026 US2: modal do jogador do Elenco — detalhes, ações e foco.

import { formatMarketError } from "@brasfoot-like/i18n";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";
import { careerSave } from "../helpers/saves";

beforeEach(() => {
  localStorage.clear();
  memoryRouter.url = "/jogo/elenco?c=tela";
});

async function openFirst(edit?: Parameters<typeof storedCareer>[1]) {
  const career = await storedCareer(1, edit);
  const player = career.save.bank.players.find(
    (entry) => entry.clubId === career.save.clubId && entry.position === "MF",
  );
  if (!player) throw new Error("sem meia");
  renderApp("/jogo/elenco?c=tela", career.store);
  await screen.findByRole("table");
  const user = userEvent.setup({ delay: null });
  await user.click(
    screen.getByRole("button", { name: t("lineup.detailsOf", { name: player.displayName }) }),
  );
  const modal = await screen.findByRole("dialog", { name: player.displayName });
  return { ...career, player, user, modal };
}

describe("modal do jogador (026)", () => {
  it("mostra barras, dados do contrato, salário, valor de mercado e estatísticas", async () => {
    const { modal, player } = await openFirst();
    expect(within(modal).getAllByRole("meter")).toHaveLength(2);
    for (const key of [
      "player.nationality",
      "player.traits",
      "player.contract",
      "player.wage",
      "player.marketValue",
      "player.evolution",
      "player.season",
    ]) {
      expect(within(modal).getByText(t(key))).toBeDefined();
    }
    expect(
      within(modal).getByText(String(player.strength), { selector: "[role=meter]" }),
    ).toBeDefined();
    for (const name of [t("squad.renew"), t("squad.sell"), t("squad.terminate")]) {
      expect(within(modal).getByRole("button", { name: new RegExp(`^${name}`) })).toBeDefined();
    }
  });

  it("Vender abre a cotação por cima; cancelar volta o foco ao botão Vender", async () => {
    const { modal, player, user } = await openFirst();
    const sell = within(modal).getByRole("button", {
      name: t("squad.sellOf", { name: player.displayName }),
    });
    await user.click(sell);
    await screen.findByRole("dialog", {
      name: t("disposal.sell.title", { name: player.displayName }),
    });
    // Esc fecha só o diálogo do topo.
    await user.keyboard("{Escape}");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(document.activeElement).toBe(sell);
  });

  it("Rescindir mostra a multa antes de confirmar", async () => {
    const { modal, player, user } = await openFirst();
    await user.click(
      within(modal).getByRole("button", {
        name: t("squad.terminateOf", { name: player.displayName }),
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: t("disposal.terminate.title", { name: player.displayName }),
    });
    expect(within(dialog).getByText(/Multa de \$/)).toBeDefined();
  });

  it("Renovar abre a negociação de contrato com a ação de começar", async () => {
    const { modal, player, user } = await openFirst();
    await user.click(
      within(modal).getByRole("button", { name: t("squad.renewOf", { name: player.displayName }) }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: t("market.dialog.renew", { name: player.displayName }),
    });
    expect(within(dialog).getByRole("button", { name: t("market.action.start") })).toBeDefined();
  });

  it("fechar devolve o foco ao botão do nome", async () => {
    const { modal, player, user } = await openFirst();
    await user.click(within(modal).getByRole("button", { name: t("common.close") }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: t("lineup.detailsOf", { name: player.displayName }) }),
    );
  });

  it("jogador emprestado não renova, com o motivo escrito", async () => {
    const career = await storedCareer(1, (save) => ({
      ...save,
      bank: {
        ...save.bank,
        players: save.bank.players.map((entry, _index, all) => {
          const first = all.find((p) => p.clubId === save.clubId && p.position === "MF");
          return entry.id === first?.id && entry.contract
            ? {
                ...entry,
                contract: {
                  ...entry.contract,
                  loan: {
                    fromClubId: save.bank.clubs.find((club) => club.id !== save.clubId)?.id ?? "",
                    untilYear: save.league.year + 1,
                  },
                },
              }
            : entry;
        }),
      },
    }));
    const player = career.save.bank.players.find(
      (entry) => entry.clubId === career.save.clubId && entry.position === "MF",
    );
    renderApp("/jogo/elenco?c=tela", career.store);
    await screen.findByRole("table");
    const user = userEvent.setup({ delay: null });
    await user.click(
      screen.getByRole("button", {
        name: t("lineup.detailsOf", { name: player?.displayName ?? "" }),
      }),
    );
    const modal = await screen.findByRole("dialog", { name: player?.displayName ?? "" });
    expect(
      (
        within(modal).getByRole("button", {
          name: new RegExp(`^${t("squad.renew")}`),
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(within(modal).getByText(t("player.loanNoRenew"))).toBeDefined();
  });

  it("Rescindir fica habilitado no meio da temporada", async () => {
    const { modal } = await openFirst();
    const terminate = within(modal).getByRole("button", {
      name: new RegExp(`^${t("squad.terminate")}`),
    }) as HTMLButtonElement;
    expect(terminate.disabled).toBe(false);
  });

  it("com a temporada encerrada, Rescindir fica desabilitado e o motivo aparece (A9)", async () => {
    const total = careerSave("tela").league.divisions[0]?.calendar.length ?? 0;
    const career = await storedCareer(total + 1);
    const player = career.save.bank.players.find(
      (entry) => entry.clubId === career.save.clubId && entry.position === "MF",
    );
    renderApp("/jogo/elenco?c=tela", career.store);
    await screen.findByRole("table");
    const user = userEvent.setup({ delay: null });
    await user.click(
      screen.getByRole("button", {
        name: t("lineup.detailsOf", { name: player?.displayName ?? "" }),
      }),
    );
    const modal = await screen.findByRole("dialog", { name: player?.displayName ?? "" });
    const terminate = within(modal).getByRole("button", {
      name: new RegExp(`^${t("squad.terminate")}`),
    }) as HTMLButtonElement;
    expect(terminate.disabled).toBe(true);
    expect(
      within(modal).getByText(
        formatMarketError({ code: "market.season_over", params: {} }, "pt-BR"),
      ),
    ).toBeDefined();
  });
});
