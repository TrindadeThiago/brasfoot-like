import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("brasfoot-like:preferences", JSON.stringify({ autoPause: false }));
  useRoundClock();
});
afterEach(() => vi.useRealTimers());

describe("pausa e substituições (US2, SC-003)", () => {
  it("pausa, substitui até o limite, quem saiu não volta, muda a postura e retoma", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
    await elapse(20_000);
    await user.click(screen.getByRole("button", { name: t("round.pause") }));
    const panel = screen.getByRole("region", { name: t("round.panel") });
    const mine = screen.getByRole("region", { name: t("round.myMatch") });
    const clock = within(mine).getByText(/'$/).textContent;
    await elapse(5_000);
    expect(within(mine).getByText(/'$/).textContent).toBe(clock);

    const lists = () => within(panel).getAllByRole("list");
    const onField = () => within(lists()[0] as HTMLElement).getAllByRole("button");
    const bench = () => within(lists()[1] as HTMLElement).getAllByRole("button");
    const nameIn = (button: HTMLElement) => button.querySelectorAll("span")[1]?.textContent ?? "";

    const firstOut = onField()[1] as HTMLElement;
    const outName = nameIn(firstOut);
    await user.click(firstOut);
    const inName = nameIn(bench()[0] as HTMLElement);
    await user.click(bench()[0] as HTMLElement);
    expect(
      within(panel).getByText(t("round.substitutionsLeft", { used: 1, limit: 5 })),
    ).toBeDefined();
    expect(
      within(screen.getByRole("list", { name: t("round.substituted") })).getByText(outName),
    ).toBeDefined();
    expect(bench().map(nameIn)).not.toContain(outName);
    expect(screen.getByRole("log", { name: t("round.myFeed") }).textContent).toContain(inName);

    for (let used = 2; used <= 5; used++) {
      await user.click(onField()[used] as HTMLElement);
      await user.click(bench()[0] as HTMLElement);
    }
    expect(
      within(panel).getByText(t("round.substitutionsLeft", { used: 5, limit: 5 })),
    ).toBeDefined();
    await user.click(onField()[7] as HTMLElement);
    await user.click(bench()[0] as HTMLElement);
    expect(within(panel).getByRole("status").textContent).toBe(
      t("round.error.change.limit_reached", { limit: 5 }),
    );

    await user.selectOptions(within(panel).getByLabelText(t("round.posture")), "attacking");
    expect(screen.getByRole("log", { name: t("round.myFeed") }).textContent).toMatch(/ofensiva/);

    await user.click(screen.getByRole("button", { name: t("round.resume") }));
    expect(screen.queryByRole("region", { name: t("round.panel") })).toBeNull();
    await elapse(3_000);
    expect(within(mine).getByText(/'$|Intervalo/).textContent).not.toBe(clock);
  });
});
