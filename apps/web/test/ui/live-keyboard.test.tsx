import { userSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, loadSaved, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "brasfoot-like:preferences",
    JSON.stringify({ autoPause: false, roundMode: "live" }),
  );
  useRoundClock();
});
afterEach(() => vi.useRealTimers());

async function tabTo(user: ReturnType<typeof userEvent.setup>, element: HTMLElement) {
  for (let step = 0; step < 120 && document.activeElement !== element; step++) await user.tab();
  expect(document.activeElement).toBe(element);
}

describe("rodada só pelo teclado (SC-007)", () => {
  it("S inicia, Espaço pausa, substitui pelo teclado, + acelera, Espaço retoma, F termina", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("button", { name: t("home.playLive") });
    await user.keyboard("s");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
    await screen.findByRole("region", { name: t("round.myMatch") });
    await elapse(15_000);
    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard(" ");
    const panel = screen.getByRole("region", { name: t("round.panel") });

    const lists = within(panel).getAllByRole("list");
    const out = within(lists[0] as HTMLElement).getAllByRole("button")[2] as HTMLElement;
    await tabTo(user, out);
    await user.keyboard("{Enter}");
    const enter = within(lists[1] as HTMLElement).getAllByRole("button")[0] as HTMLElement;
    await tabTo(user, enter);
    await user.keyboard("{Enter}");
    expect(
      within(panel).getByText(t("round.substitutionsLeft", { used: 1, limit: 5 })),
    ).toBeDefined();

    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard("+");
    expect((screen.getByLabelText(t("round.speed")) as HTMLSelectElement).value).toBe("fast");
    await user.keyboard(" ");
    expect(screen.queryByRole("region", { name: t("round.panel") })).toBeNull();
    await user.keyboard("f");
    expect(screen.getByRole("region", { name: t("home.lastRound", { round: 1 }) })).toBeDefined();
    await waitFor(async () => expect(userSeason(await loadSaved(store)).nextRound).toBe(2));
  });
});
