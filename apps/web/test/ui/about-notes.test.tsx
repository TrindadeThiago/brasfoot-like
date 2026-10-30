// 031 US6: Sobre e Notas de versão com a estrutura nova.
import { betaReleaseNotes, releaseNotes } from "@brasfoot-like/i18n";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { APP_VERSION } from "../../src/app-info";
import { isNewVersion } from "../../src/game/release-view";
import { t } from "../../src/i18n";
import { readPreferences, writePreferences } from "../../src/storage/preferences";
import { freshStore, renderApp } from "../helpers/app";

beforeEach(() => {
  localStorage.clear();
  writePreferences({ tips: { dismissed: [], skipAll: true } });
});

describe("isNewVersion (031 R12)", () => {
  it("sem versão vista todas são novas; igual ou menor que a vista não é nova", () => {
    expect(isNewVersion("1.0.0", undefined)).toBe(true);
    expect(isNewVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewVersion("1.0.0", "1.1.0")).toBe(false);
  });

  it("compara os números, não o texto: 1.10.0 é maior que 1.9.0", () => {
    expect(isNewVersion("1.10.0", "1.9.0")).toBe(true);
    expect(isNewVersion("1.9.0", "1.10.0")).toBe(false);
    expect(isNewVersion("2.0.0", "1.99.99")).toBe(true);
  });
});

describe("Sobre (031 US6)", () => {
  it("tem a apresentação, o que dá para fazer, as capturas com texto alternativo, o aviso de nomes reais, a privacidade e como levar as carreiras", async () => {
    renderApp("/sobre", freshStore());
    await screen.findByRole("heading", { level: 1, name: t("app.name") });
    expect(screen.getByText(t("about.lead", { name: t("app.name") }))).toBeDefined();
    expect(screen.getByRole("region", { name: t("about.features.title") })).toBeDefined();
    for (const shot of ["home", "round", "table", "market", "career"]) {
      const img = screen.getByAltText(t(`about.shot.${shot}`));
      expect(img.getAttribute("src")).toBe(`/screenshots/${shot}.png`);
    }
    expect(screen.getByRole("region", { name: t("about.notice.title") })).toBeDefined();
    expect(screen.getByText(t("about.free"))).toBeDefined();
    expect(screen.getByRole("region", { name: t("about.saves.title") })).toBeDefined();
    expect(screen.getByRole("link", { name: t("mods.docs") })).toBeDefined();
  });
});

describe("Notas de versão (031 US6)", () => {
  it("a versão atual vem aberta, as outras recolhidas, e quem nunca viu as notas vê a marca Nova", async () => {
    renderApp("/notas-de-versao", freshStore());
    await screen.findByRole("heading", { level: 1, name: t("notes.title") });
    const notes = releaseNotes();
    const regions = notes.map((note) =>
      screen.getByRole("region", { name: new RegExp(note.version) }),
    );
    regions.forEach((region, index) => {
      const details = region.querySelector("details") as HTMLDetailsElement;
      expect(details.open).toBe(index === 0);
    });
    expect(await within(regions[0] as HTMLElement).findByText(t("notes.new"))).toBeDefined();
    // Abrir as notas grava a versão atual como vista.
    expect(readPreferences().lastSeenVersion).toBe(APP_VERSION);
  });

  it("quem já viu esta versão não vê a marca Nova", async () => {
    writePreferences({ lastSeenVersion: APP_VERSION });
    renderApp("/notas-de-versao", freshStore());
    await screen.findByRole("heading", { level: 1, name: t("notes.title") });
    await waitFor(() => expect(readPreferences().lastSeenVersion).toBe(APP_VERSION));
    expect(screen.queryByText(t("notes.new"))).toBeNull();
  });

  it("a marca dura a visita inteira, mesmo depois de gravar a versão como vista", async () => {
    writePreferences({ lastSeenVersion: "0.9.0" });
    renderApp("/notas-de-versao", freshStore());
    expect(await screen.findByText(t("notes.new"))).toBeDefined();
    expect(readPreferences().lastSeenVersion).toBe(APP_VERSION);
    expect(screen.getByText(t("notes.new"))).toBeDefined();
  });

  it("a fase beta fica recolhida no fim, com a frase e as versões rotuladas beta", async () => {
    const user = userEvent.setup();
    renderApp("/notas-de-versao", freshStore());
    await screen.findByRole("heading", { level: 1, name: t("notes.title") });
    const beta = betaReleaseNotes();
    const details = screen
      .getByText(t("notes.beta.title"))
      .closest("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(within(details).getByText(t("notes.beta.intro"))).toBeDefined();
    const headings = within(details).getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(beta.length);
    expect(headings[0]?.textContent).toContain(`beta ${beta[0]?.version}`);
    expect(within(details).getAllByText(t("notes.beta.label"))).toHaveLength(beta.length);
    await user.click(screen.getByText(t("notes.beta.title")));
    expect(details.open).toBe(true);
  });
});
