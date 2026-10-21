import { uiKeys } from "@brasfoot-like/i18n";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { readPreferences, writePreferences } from "../../src/storage/preferences";
import { scopesOf, shortcutById } from "../../src/ui/shortcuts";
import { pendingTip, TIPS, type Tip } from "../../src/ui/tips/catalog";
import { freshStore, renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

vi.setConfig({ testTimeout: 30000 });

const name = t("app.name");
const tipRegion = (title: string) => screen.findByRole("complementary", { name: title });

beforeEach(() => localStorage.clear());

describe("catálogo de dicas", () => {
  it("toda dica tem textos e cita só atalhos válidos na sua tela", () => {
    const keys = new Set(uiKeys());
    for (const tip of TIPS as readonly Tip[]) {
      expect(keys.has(tip.titleKey), tip.titleKey).toBe(true);
      expect(keys.has(tip.bodyKey), tip.bodyKey).toBe(true);
      if (tip.shortcutId) {
        expect(scopesOf(tip.screen)).toContain(shortcutById(tip.shortcutId).scope);
      }
    }
  });

  it("primeira pendente por ordem; pular todas esconde tudo; 'played' libera a de resultados", () => {
    const state = { dismissed: [] as string[], skipAll: false };
    const ctx = { played: false, firstRun: false };
    expect(pendingTip("game-home", state, ctx)?.id).toBe("home-next-step");
    expect(pendingTip("game-home", { ...state, dismissed: ["home-next-step"] }, ctx)).toBe(
      undefined,
    );
    expect(
      pendingTip("game-home", { ...state, dismissed: ["home-next-step"] }, { ...ctx, played: true })
        ?.id,
    ).toBe("round-direct");
    expect(pendingTip("lineup", { ...state, skipAll: true }, ctx)).toBe(undefined);
    expect(pendingTip("opening", state, ctx)).toBe(undefined);
    expect(pendingTip("opening", state, { ...ctx, firstRun: true })?.id).toBe("welcome");
  });
});

describe("dicas na interface (016 US1)", () => {
  it("boas-vindas só no primeiro acesso; Começar leva o foco a Nova carreira", async () => {
    const user = userEvent.setup();
    renderApp("/", freshStore());
    const welcome = await tipRegion(t("tips.welcome.title", { name }));
    await user.click(within(welcome).getByRole("button", { name: t("tips.start") }));
    await waitFor(() => expect(document.activeElement?.textContent).toBe(t("opening.newCareer")));
    expect(readPreferences().tips?.dismissed).toEqual(["welcome"]);
    expect(screen.queryByRole("complementary", { name: t("tips.welcome.title", { name }) })).toBe(
      null,
    );
  });

  it("quem já tem carreira não vê a boas-vindas", async () => {
    const { store } = await storedCareer(1);
    renderApp("/", store);
    await screen.findByRole("link", { name: new RegExp(t("opening.continue")) });
    expect(screen.queryByRole("complementary")).toBe(null);
  });

  it("dica da tela aparece uma vez; Esc com o foco nela dispensa; destaca o alvo", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    renderApp(`/jogo/?c=${save.id}`, store);
    const tip = await tipRegion(t("tips.home.title"));
    expect(within(tip).getByText(t("tips.home.body", { key: "S" }))).toBeDefined();
    await waitFor(() =>
      expect(
        document.querySelector('[data-tip-anchor="play"]')?.hasAttribute("data-tip-target"),
      ).toBe(true),
    );
    within(tip)
      .getByRole("button", { name: t("tips.ok") })
      .focus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("complementary")).toBe(null));
    expect(readPreferences().tips?.dismissed).toContain("home-next-step");
  });

  it("pular todas esconde as dicas até reativar nas Configurações", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    renderApp(`/jogo/escalacao/?c=${save.id}`, store);
    const tip = await tipRegion(t("tips.lineup.title"));
    await user.click(within(tip).getByRole("button", { name: t("tips.skipAll") }));
    await waitFor(() => expect(screen.queryByRole("complementary")).toBe(null));
    expect(readPreferences().tips?.skipAll).toBe(true);

    writePreferences({ tips: { dismissed: [], skipAll: false } });
    expect(await tipRegion(t("tips.lineup.title"))).toBeDefined();
  });

  it("espera um diálogo modal fechar", async () => {
    const { store, save } = await storedCareer(1);
    renderApp(`/jogo/?c=${save.id}`, store);
    await tipRegion(t("tips.home.title"));
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.append(modal);
    await waitFor(() => expect(screen.queryByRole("complementary")).toBe(null));
    modal.remove();
    expect(await tipRegion(t("tips.home.title"))).toBeDefined();
  });
});
