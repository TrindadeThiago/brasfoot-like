// 028 US1: bandeja e janela de comparação (de 2 a 4 jogadores).
import { searchPlayers } from "@brasfoot-like/engine";
import { marketContextOf } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { openPlayer } from "../helpers/market";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/mercado?c=tela");
});

describe("comparação no Mercado (028)", () => {
  it("a bandeja só aparece com jogadores; Comparar exige 2; o quinto é recusado com aviso", async () => {
    const { store, save } = await storedCareer(1);
    const picks = searchPlayers(
      marketContextOf(save),
      { scope: "clubs", excludeClubId: save.clubId, positions: ["MF"] },
      { key: "strength", dir: "asc" },
    ).slice(0, 5);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    await user.selectOptions(screen.getByLabelText(t("market.filter.position")), "MF");
    await user.type(
      screen.getByLabelText(t("market.filter.strengthMax")),
      String(picks[4]?.strength ?? 0),
    );
    expect(screen.queryByRole("region", { name: t("market.tray.label") })).toBeNull();
    for (const [index, pick] of picks.entries()) {
      const modal = await openPlayer(user, pick.displayName);
      const add = within(modal).queryByRole("button", { name: t("market.modal.addCompare") });
      if (index < 4) {
        expect((add as HTMLButtonElement).disabled).toBe(false);
        await user.click(add as HTMLElement);
      } else {
        // Com quatro na comparação, o quinto não entra: o botão fica desativado e o aviso aparece.
        expect((add as HTMLButtonElement).disabled).toBe(true);
        expect(within(modal).getByText(t("market.tray.limit", { max: 4 }))).toBeDefined();
      }
      await user.click(within(modal).getByRole("button", { name: t("common.close") }));
      if (index === 0) {
        const tray = screen.getByRole("region", { name: t("market.tray.label") });
        expect(
          (within(tray).getByRole("button", { name: /Comparar selecionados/ }) as HTMLButtonElement)
            .disabled,
        ).toBe(true);
      }
    }
    const tray = screen.getByRole("region", { name: t("market.tray.label") });
    expect(within(tray).getAllByRole("listitem")).toHaveLength(4);
    await user.click(within(tray).getByRole("button", { name: /Comparar selecionados/ }));
    const panel = await screen.findByRole("dialog", { name: t("market.compare.title") });
    expect(within(panel).getAllByRole("columnheader")).toHaveLength(5);
    await user.click(within(panel).getByRole("button", { name: t("common.close") }));
    await user.click(
      within(tray).getByRole("button", {
        name: t("market.tray.remove", { name: picks[0]?.displayName ?? "" }),
      }),
    );
    expect(within(tray).getAllByRole("listitem")).toHaveLength(3);
  });
});
