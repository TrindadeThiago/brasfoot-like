import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { writePreferences } from "../../src/storage/preferences";
import { SHORTCUTS } from "../../src/ui/shortcuts";
import { freshStore, renderApp } from "../helpers/app";
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

  it("D apertado várias vezes seguidas joga uma rodada por tecla (016: fila da rodada direta)", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.simulate") });
    await userEvent.setup().keyboard("ddd");
    expect(
      await screen.findByText(
        t("header.progress", { year: 2027, round: 4, total: 38, division: "Série A" }),
      ),
    ).toBeDefined();
  });

  it("? abre a ajuda com os atalhos gerais e os desta tela, e Esc fecha", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.simulate") });
    const user = userEvent.setup();
    await user.keyboard("?");
    const dialog = await screen.findByRole("dialog", { name: t("help.title") });
    const general = within(dialog).getByRole("region", { name: t("help.group.global") });
    for (const key of [
      "help.help",
      "help.settings",
      "help.close",
      "help.home",
      "help.squad",
      "help.lineup",
      "help.competition",
      "help.calendar",
      "help.playLive",
      "help.direct",
    ]) {
      expect(general.textContent).toContain(t(key));
    }
    // Atalhos de outras telas não aparecem aqui.
    expect(dialog.textContent).not.toContain(t("help.pause"));
    expect(dialog.textContent).not.toContain(t("help.auto"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("a ajuda segue o registro: cada tela lista os seus atalhos", async () => {
    const { store } = await storedCareer(1);
    const user = userEvent.setup();
    for (const [url, screenId] of [
      ["/jogo/escalacao?c=tela", "lineup"],
      ["/jogo/competicao?c=tela", "competition"],
    ] as const) {
      const view = renderApp(url, store);
      await screen.findByRole("heading", { level: 1 });
      await user.keyboard("?");
      const dialog = await screen.findByRole("dialog", { name: t("help.title") });
      const own = within(dialog).getByRole("region", { name: t("help.group.screen") });
      const expected = SHORTCUTS.filter(
        (entry) => entry.scope === screenId && !("hidden" in entry && entry.hidden),
      );
      expect(expected.length).toBeGreaterThan(0);
      for (const entry of expected) expect(own.textContent).toContain(t(entry.labelKey));
      view.unmount();
    }
  });

  it("? funciona fora do jogo: inicial, carreiras, nova carreira, mods e configurações", async () => {
    const store = freshStore();
    const user = userEvent.setup();
    for (const [url, heading] of [
      ["/", "app.name"],
      ["/carreiras", "saves.title"],
      ["/nova-carreira", "newCareer.title"],
      ["/mods", "mods.title"],
      ["/configuracoes", "settings.title"],
    ] as const) {
      const view = renderApp(url, store);
      await screen.findByRole("heading", { level: 1, name: t(heading) });
      await user.keyboard("?");
      const dialog = await screen.findByRole("dialog", { name: t("help.title") });
      expect(dialog.textContent, url).toContain(t("help.settings"));
      expect(dialog.textContent, url).not.toContain(t("help.home"));
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      view.unmount();
    }
  });

  it("a inicial tem o botão Atalhos e , abre as configurações", async () => {
    renderApp("/", freshStore());
    await screen.findByRole("heading", { level: 1, name: t("app.name") });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: t("nav.help") }));
    expect(await screen.findByRole("dialog", { name: t("help.title") })).toBeDefined();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.keyboard(",");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/configuracoes"));
  });

  it(", abre as configurações também dentro do jogo", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.simulate") });
    await userEvent.setup().keyboard(",");
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/configuracoes"));
  });

  it("atalhos são ignorados com o foco num campo de texto", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.simulate") });
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    await userEvent.setup().keyboard("2?,");
    expect(memoryRouter.pathname()).toBe("/jogo");
    expect(screen.queryByRole("dialog")).toBeNull();
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
