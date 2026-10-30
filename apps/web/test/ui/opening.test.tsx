// 031 US1: menu inicial com a chamada, as ações, a quantidade de carreiras, o rodapé e os avisos.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "../../src/app-info";
import { t } from "../../src/i18n";
import { writePreferences } from "../../src/storage/preferences";
import { freshStore, renderApp } from "../helpers/app";
import { memoryRouter } from "../helpers/router";
import { careerSave } from "../helpers/saves";

describe("menu inicial (031 US1)", () => {
  it("sem carreira: nome, chamada principal e as ações Nova carreira, Carreiras salvas (nenhuma) e Mods", async () => {
    writePreferences({ lastSeenVersion: APP_VERSION });
    renderApp("/", freshStore());
    expect(await screen.findByRole("heading", { level: 1, name: t("app.name") })).toBeDefined();
    expect(screen.getByText(t("opening.pitch"))).toBeDefined();
    const menu = screen.getByRole("navigation", { name: t("nav.menu") });
    expect(within(menu).getByRole("link", { name: t("opening.newCareer") })).toBeDefined();
    const saved = within(menu).getByRole("link", { name: t("opening.savedCareers") });
    await waitFor(() => expect(saved.getAttribute("aria-describedby")).not.toBeNull());
    expect(await screen.findByText(t("saves.count", { count: 0 }))).toBeDefined();
    expect(within(menu).getByRole("link", { name: t("nav.mods") })).toBeDefined();
    // Sem carreira não há Continuar.
    expect(
      within(menu).queryByRole("link", { name: new RegExp(t("opening.continue")) }),
    ).toBeNull();
  });

  it("com carreiras: Continuar mostra técnico, clube e rodada, e Carreiras salvas mostra a quantidade", async () => {
    writePreferences({ lastSeenVersion: APP_VERSION });
    const store = freshStore();
    await store.save(careerSave("a", "2026-10-16T10:00:00.000Z", 0));
    await store.save(careerSave("b", "2026-10-17T10:00:00.000Z", 1));
    renderApp("/", store);
    const link = await screen.findByRole("link", { name: new RegExp(t("opening.continue")) });
    expect(link.textContent).toMatch(/rodada/);
    expect(await screen.findByText(t("saves.count", { count: 2 }))).toBeDefined();
  });

  it("o rodapé tem Configurações, Sobre, Atalhos e a versão, que leva às notas", async () => {
    writePreferences({ lastSeenVersion: APP_VERSION });
    renderApp("/", freshStore());
    await screen.findByRole("heading", { level: 1, name: t("app.name") });
    expect(screen.getByRole("link", { name: t("nav.settings") })).toBeDefined();
    expect(screen.getByRole("link", { name: t("nav.about") })).toBeDefined();
    expect(screen.getByRole("button", { name: t("nav.help") })).toBeDefined();
    const version = screen.getByRole("link", {
      name: new RegExp(APP_VERSION.replace(/\./g, "\\.")),
    });
    await userEvent.setup().click(version);
    expect(memoryRouter.pathname()).toBe("/notas-de-versao");
  });

  it("Atalhos abre a ajuda de atalhos", async () => {
    writePreferences({ lastSeenVersion: APP_VERSION });
    renderApp("/", freshStore());
    await userEvent.setup().click(await screen.findByRole("button", { name: t("nav.help") }));
    expect(await screen.findByRole("dialog")).toBeDefined();
  });

  it("aviso de novidades em Notice, com o link para as notas e o botão de fechar", async () => {
    writePreferences({ lastSeenVersion: "0.9.0" });
    renderApp("/", freshStore());
    const notice = await screen.findByRole("status", {
      name: t("notes.whatsNew", { version: APP_VERSION }),
    });
    expect(within(notice).getByRole("link", { name: t("notes.whatsNewLink") })).toBeDefined();
    await userEvent.setup().click(within(notice).getByRole("button", { name: t("common.close") }));
    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: t("notes.whatsNew", { version: APP_VERSION }) }),
      ).toBeNull(),
    );
  });

  it("armazenamento indisponível: aviso com o texto de hoje e sem a quantidade", async () => {
    writePreferences({ lastSeenVersion: APP_VERSION });
    const store = freshStore();
    store.listSummaries = () => Promise.reject(new Error("sem armazenamento"));
    renderApp("/", store);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(t("opening.storageUnavailable"))).toBeDefined();
    expect(screen.queryByText(t("saves.count", { count: 0 }))).toBeNull();
  });
});
