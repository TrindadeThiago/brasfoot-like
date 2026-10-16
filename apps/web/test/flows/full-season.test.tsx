import { standings } from "@brasfoot-like/engine";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
        await screen.findByText(t("header.progress", { year: 2027, round: round + 1, total: 38 }));
      }
    }
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/fim-de-temporada"));
    const saved = await loadSaved(store);
    const table = standings(saved.season, saved.bank);
    const champion = saved.bank.clubs.find((club) => club.id === table[0]?.clubId);
    const region = await screen.findByRole("region", { name: t("seasonEnd.champion") });
    expect(within(region).getByText(champion?.name ?? "")).toBeDefined();
    const mine = table.find((row) => row.clubId === saved.clubId);
    const club = saved.bank.clubs.find((entry) => entry.id === saved.clubId);
    expect(
      screen.getByText(
        table[0]?.clubId === saved.clubId
          ? t("seasonEnd.yourTitle", { club: club?.name ?? "" })
          : t("seasonEnd.yourPosition", { club: club?.name ?? "", position: mine?.position ?? 0 }),
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
