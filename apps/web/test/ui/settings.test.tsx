import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_VERSION } from "../../src/app-info";
import { t } from "../../src/i18n";
import { readPreferences, writePreferences } from "../../src/storage/preferences";
import { freshStore, renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

let systemLight = false;
const mediaListeners = new Set<() => void>();

beforeEach(() => {
  localStorage.clear();
  systemLight = false;
  mediaListeners.clear();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query.includes("light") ? systemLight : false;
    },
    addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe("Configurações (016 US2)", () => {
  it("abre pela tela inicial e pelo cabeçalho do jogo", async () => {
    const user = userEvent.setup();
    renderApp("/", freshStore());
    await user.click(await screen.findByRole("link", { name: t("nav.settings") }));
    expect(memoryRouter.pathname()).toBe("/configuracoes");

    const { store, save } = await storedCareer(1);
    renderApp(`/jogo/?c=${save.id}`, store);
    const links = await screen.findAllByRole("link", { name: t("nav.settings") });
    expect(links.length).toBeGreaterThan(0);
  });

  it("velocidade e pausa automática são as mesmas preferências da rodada ao vivo (FR-009)", async () => {
    const user = userEvent.setup();
    renderApp("/configuracoes", freshStore());
    await user.selectOptions(await screen.findByLabelText(t("settings.speed")), "fast");
    await user.click(screen.getByLabelText(t("round.autoPause")));
    expect(readPreferences()).toMatchObject({ roundSpeed: "fast", autoPause: false });
    writePreferences({ roundSpeed: "slow" });
    await waitFor(() =>
      expect((screen.getByLabelText(t("settings.speed")) as HTMLSelectElement).value).toBe("slow"),
    );
  });

  it("tema vale na hora e 'seguir o sistema' acompanha o sistema", async () => {
    const user = userEvent.setup();
    renderApp("/configuracoes", freshStore());
    const select = await screen.findByLabelText(t("settings.theme"));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    await user.selectOptions(select, "light");
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    await user.selectOptions(select, "system");
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    systemLight = true;
    for (const listener of mediaListeners) listener();
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    expect(readPreferences().theme).toBe("system");
  });

  it("idioma lista só Português (Brasil); dicas voltam; versão aparece; Voltar volta", async () => {
    const user = userEvent.setup();
    writePreferences({ tips: { dismissed: ["lineup"], skipAll: true } });
    renderApp("/configuracoes", freshStore());
    const language = (await screen.findByLabelText(t("settings.language"))) as HTMLSelectElement;
    expect([...language.options].map((option) => option.text)).toEqual(["Português (Brasil)"]);
    expect(language.value).toBe("pt-BR");
    await user.click(screen.getByRole("button", { name: t("settings.tipsReset") }));
    expect(readPreferences().tips).toEqual({ dismissed: [], skipAll: false });
    expect(screen.getByText(t("settings.tipsResetDone"))).toBeDefined();
    expect(
      screen.getByText(t("app.version", { name: t("app.name"), version: APP_VERSION })),
    ).toBeDefined();
    await user.click(screen.getByRole("button", { name: t("common.back") }));
    expect(memoryRouter.pathname()).toBe("/");
  });
});
