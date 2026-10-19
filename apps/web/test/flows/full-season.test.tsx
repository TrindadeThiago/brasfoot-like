import { standings } from "@brasfoot-like/engine";
import { userSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { seasonEndSummary } from "../../src/game/selectors";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

describe("temporada inteira no navegador (SC-001)", () => {
  it("simula as 38 rodadas pela interface e chega ao campeão", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup();
    for (let round = 1; round <= 38; round++) {
      await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
      if (round < 38) {
        await screen.findByText(
          t("header.progress", { year: 2027, round: round + 1, total: 38, division: "Série A" }),
        );
      }
    }
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/fim-de-temporada"));
    const saved = await loadSaved(store);
    const table = standings(userSeason(saved), saved.bank);
    const champion = saved.bank.clubs.find((club) => club.id === table[0]?.clubId);
    const region = await screen.findByRole("region", {
      name: t("seasonEnd.champion", { division: "Série A" }),
    });
    expect(within(region).getByText(champion?.name ?? "")).toBeDefined();
    const summary = seasonEndSummary(saved);
    const club = saved.bank.clubs.find((entry) => entry.id === saved.clubId);
    expect(
      screen.getByText(
        t(`seasonEnd.mine.${summary.mine.situation}`, {
          club: club?.name ?? "",
          position: summary.mine.position,
          division: summary.mine.situation === "relegated" ? "Série B" : "Série A",
        }),
      ),
    ).toBeDefined();

    await user.keyboard("1");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    expect(
      (screen.getByRole("button", { name: t("home.playLive") }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByRole("link", { name: t("home.seasonEndLink") })).toBeDefined();
  }, 120_000);
});
