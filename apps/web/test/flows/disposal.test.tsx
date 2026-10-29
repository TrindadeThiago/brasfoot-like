import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  memoryRouter.url = "/jogo/elenco?c=tela";
});

/** Abre o modal do jogador pelo botão do nome (026): as ações ficam dentro dele. */
async function openModal(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name: t("lineup.detailsOf", { name }) }));
  return screen.findByRole("dialog", { name });
}

/** O jogador do clube que o teste vende ou rescinde: um meia (posição com folga no elenco). */
async function setup() {
  const career = await storedCareer(1);
  const squad = career.save.bank.players.filter((player) => player.clubId === career.save.clubId);
  const target = squad.find((player) => player.position === "MF");
  if (!target) throw new Error("sem meia no elenco");
  renderApp("/jogo/elenco?c=tela", career.store);
  await screen.findByRole("table");
  return { ...career, target, user: userEvent.setup({ delay: null }) };
}

describe("Elenco: venda imediata", () => {
  it("mostra a cotação, vende, avisa e grava no save com o caixa maior", async () => {
    const { store, save, target, user } = await setup();
    const modal = await openModal(user, target.displayName);
    await user.click(
      within(modal).getByRole("button", { name: t("squad.sellOf", { name: target.displayName }) }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: t("disposal.sell.title", { name: target.displayName }),
    });
    expect(within(dialog).getByText(/paga \$/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: t("disposal.sell.confirm") }));

    await waitFor(async () => {
      const saved = await loadSaved(store);
      expect(saved.bank.players.find((player) => player.id === target.id)?.clubId).not.toBe(
        save.clubId,
      );
    });
    const saved = await loadSaved(store);
    expect(saved.finances.clubs[save.clubId]?.cash).toBeGreaterThan(
      save.finances.clubs[save.clubId]?.cash ?? 0,
    );
    expect(saved.market.log.at(-1)).toMatchObject({ kind: "sale", playerId: target.id });
    expect((await screen.findByRole("status")).textContent).toContain(target.displayName);
    // Concluída a venda, o modal fecha e o jogador sai da tabela.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.queryByRole("button", { name: t("lineup.detailsOf", { name: target.displayName }) }),
    ).toBeNull();
  });

  it("cancelar não muda nada", async () => {
    const { store, save, target, user } = await setup();
    const modal = await openModal(user, target.displayName);
    await user.click(
      within(modal).getByRole("button", { name: t("squad.sellOf", { name: target.displayName }) }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: t("disposal.sell.title", { name: target.displayName }),
    });
    await user.click(within(dialog).getByRole("button", { name: t("common.cancel") }));
    // O diálogo de venda fecha e o modal do jogador continua aberto, com o foco no botão Vender.
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(document.activeElement).toBe(
      within(modal).getByRole("button", { name: t("squad.sellOf", { name: target.displayName }) }),
    );
    const saved = await loadSaved(store);
    expect(saved.bank.players.find((player) => player.id === target.id)?.clubId).toBe(save.clubId);
  });
});

describe("Elenco: rescisão", () => {
  it("mostra a multa, rescinde, o jogador vira livre e o caixa diminui", async () => {
    const { store, save, target, user } = await setup();
    const modal = await openModal(user, target.displayName);
    await user.click(
      within(modal).getByRole("button", {
        name: t("squad.terminateOf", { name: target.displayName }),
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: t("disposal.terminate.title", { name: target.displayName }),
    });
    expect(within(dialog).getByText(/Multa de \$/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: t("disposal.terminate.confirm") }));

    await waitFor(async () => {
      const saved = await loadSaved(store);
      expect(saved.bank.players.some((player) => player.id === target.id)).toBe(false);
    });
    const saved = await loadSaved(store);
    expect(saved.market.freeAgents.some((agent) => agent.player.id === target.id)).toBe(true);
    expect(saved.finances.clubs[save.clubId]?.cash).toBeLessThan(
      save.finances.clubs[save.clubId]?.cash ?? 0,
    );
    expect(saved.lineup.bench).not.toContain(target.id);
    expect(Object.values(saved.lineup.starters)).not.toContain(target.id);
  });
});
