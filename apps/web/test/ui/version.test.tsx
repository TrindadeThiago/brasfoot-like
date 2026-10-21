// 016 US5: versão visível, notas de versão e aviso de novidades (FR-024–FR-026).
import { releaseNotes } from "@brasfoot-like/i18n";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { APP_VERSION, appName } from "../../src/app-info";
import { t } from "../../src/i18n";
import { readPreferences, writePreferences } from "../../src/storage/preferences";
import { freshStore, renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

const VERSION_TEXT = () => t("app.version", { name: appName(), version: APP_VERSION });
const WHATS_NEW = () => t("notes.whatsNew", { version: APP_VERSION });

beforeEach(() => {
  localStorage.clear();
  writePreferences({ tips: { dismissed: [], skipAll: true } });
});

describe("versão e notas (016 US5)", () => {
  it("a versão aparece na tela inicial e nas Configurações", async () => {
    const view = renderApp("/", freshStore());
    expect(await screen.findByRole("link", { name: VERSION_TEXT() })).toBeDefined();
    view.unmount();
    renderApp("/configuracoes", freshStore());
    expect(await screen.findByText(VERSION_TEXT())).toBeDefined();
  });

  it("a página de notas lista as versões da mais recente para a mais antiga", async () => {
    renderApp("/notas-de-versao", freshStore());
    expect(await screen.findByRole("heading", { level: 1, name: t("notes.title") })).toBeDefined();
    const notes = releaseNotes();
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(notes.length);
    expect(headings[0]?.textContent).toContain(notes[0]?.version);
    const first = screen.getByRole("region", { name: headings[0]?.textContent ?? "" });
    expect(within(first).getAllByRole("listitem")).toHaveLength(notes[0]?.changes.length ?? 0);
    // Ver as notas conta como já ter visto as novidades.
    expect(readPreferences().lastSeenVersion).toBe(APP_VERSION);
  });

  it("jogador novo não recebe o aviso de novidades; a versão é gravada em silêncio", async () => {
    renderApp("/", freshStore());
    await screen.findByRole("heading", { level: 1, name: t("app.name") });
    await waitFor(() => expect(readPreferences().lastSeenVersion).toBe(APP_VERSION));
    expect(screen.queryByText(WHATS_NEW())).toBeNull();
  });

  it("quem já tinha carreira (sem versão vista) recebe o aviso uma vez", async () => {
    const { store } = await storedCareer(1);
    const view = renderApp("/", store);
    const notice = await screen.findByRole("status", { name: WHATS_NEW() });
    await userEvent.setup().click(within(notice).getByRole("button", { name: t("common.close") }));
    await waitFor(() => expect(screen.queryByText(WHATS_NEW())).toBeNull());
    expect(readPreferences().lastSeenVersion).toBe(APP_VERSION);
    view.unmount();

    renderApp("/", store);
    await screen.findByRole("link", { name: new RegExp(t("opening.continue")) });
    expect(screen.queryByText(WHATS_NEW())).toBeNull();
  });

  it("versão vista diferente da atual mostra o aviso, e o link leva às notas", async () => {
    writePreferences({ lastSeenVersion: "0.9.0" });
    renderApp("/", freshStore());
    const notice = await screen.findByRole("status", { name: WHATS_NEW() });
    await userEvent
      .setup()
      .click(within(notice).getByRole("link", { name: t("notes.whatsNewLink") }));
    expect(memoryRouter.pathname()).toBe("/notas-de-versao");
    expect(readPreferences().lastSeenVersion).toBe(APP_VERSION);
  });
});
