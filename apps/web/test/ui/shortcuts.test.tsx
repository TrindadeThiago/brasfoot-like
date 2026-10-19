import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { writePreferences } from "../../src/storage/preferences";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

describe("atalhos de teclado (FR-020)", () => {
  it("1–5 navegam entre as telas mantendo a carreira", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.simulate") });
    const user = userEvent.setup();
    await user.keyboard("2");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/elenco"));
    expect(memoryRouter.searchParams().get("c")).toBe("tela");
    await user.keyboard("3");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/escalacao"));
    await user.keyboard("4");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/competicao"));
    await user.keyboard("5");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/calendario"));
    await user.keyboard("1");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
  });

  it("S abre a rodada ao vivo e D simula direto", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.playLive") });
    const user = userEvent.setup();
    await user.keyboard("d");
    expect(
      await screen.findByText(
        t("header.progress", { year: 2027, round: 2, total: 38, division: "Série A" }),
      ),
    ).toBeDefined();
    expect(memoryRouter.pathname()).toBe("/jogo");
    writePreferences({ roundMode: "live" });
    await user.keyboard("s");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
  });

  it("? abre a ajuda com todos os atalhos e Esc fecha", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.simulate") });
    const user = userEvent.setup();
    await user.keyboard("?");
    const dialog = await screen.findByRole("dialog", { name: t("help.title") });
    for (const key of [
      "help.home",
      "help.squad",
      "help.lineup",
      "help.auto",
      "help.details",
      "help.playLive",
      "help.direct",
      "help.pause",
      "help.speed",
      "help.finish",
      "help.competition",
      "help.calendar",
      "help.help",
      "help.close",
    ]) {
      expect(dialog.textContent).toContain(t(key));
    }
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("atalhos são ignorados com o foco num campo de texto", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.simulate") });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    await userEvent.setup().keyboard("2");
    expect(memoryRouter.pathname()).toBe("/jogo");
    input.remove();
  });

  it("a navegação é alcançável por Tab", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.simulate") });
    const user = userEvent.setup();
    const reached = new Set<string>();
    for (let index = 0; index < 12; index++) {
      await user.tab();
      reached.add(document.activeElement?.textContent ?? "");
    }
    for (const key of ["nav.home", "nav.squad", "nav.competition", "nav.calendar"]) {
      expect(reached.has(t(key))).toBe(true);
    }
  });
});
