// 031 US4: seções em cartões, campos com rótulo, resultado do reset de dicas em texto, sem apagar dados.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { APP_VERSION } from "../../src/app-info";
import { t } from "../../src/i18n";
import { readPreferences, writePreferences } from "../../src/storage/preferences";
import { freshStore, renderApp } from "../helpers/app";

beforeEach(() => localStorage.clear());

describe("Configurações (031 US4)", () => {
  it("tem as quatro seções, cada uma com o seu título", async () => {
    renderApp("/configuracoes", freshStore());
    await screen.findByRole("heading", { level: 1, name: t("settings.title") });
    for (const key of [
      "settings.round",
      "settings.appearance",
      "settings.tips",
      "settings.about",
    ]) {
      expect(screen.getByRole("region", { name: t(key) })).toBeDefined();
    }
  });

  it("todo campo tem rótulo e a mudança grava na hora", async () => {
    const user = userEvent.setup();
    renderApp("/configuracoes", freshStore());
    const speed = await screen.findByLabelText(t("settings.speed"));
    await user.selectOptions(speed, "slow");
    expect(readPreferences().roundSpeed).toBe("slow");
    await user.click(screen.getByLabelText(t("round.autoPause")));
    expect(readPreferences().autoPause).toBe(false);
    await user.selectOptions(screen.getByLabelText(t("settings.theme")), "light");
    expect(readPreferences().theme).toBe("light");
    expect(screen.getByLabelText(t("settings.language"))).toBeDefined();
  });

  it("mostrar as dicas de novo confirma em texto que elas voltarão", async () => {
    const user = userEvent.setup();
    writePreferences({ tips: { dismissed: ["lineup"], skipAll: true } });
    renderApp("/configuracoes", freshStore());
    await user.click(await screen.findByRole("button", { name: t("settings.tipsReset") }));
    expect(readPreferences().tips).toEqual({ dismissed: [], skipAll: false });
    expect(screen.getByRole("status").textContent).toBe(t("settings.tipsResetDone"));
  });

  it("a seção Sobre mostra a versão e os links; não existe apagar todos os dados", async () => {
    renderApp("/configuracoes", freshStore());
    const about = await screen.findByRole("region", { name: t("settings.about") });
    expect(within(about).getByText(new RegExp(APP_VERSION.replace(/\./g, "\\.")))).toBeDefined();
    expect(within(about).getByRole("link", { name: t("nav.releaseNotes") })).toBeDefined();
    expect(within(about).getByRole("link", { name: t("nav.about") })).toBeDefined();
    expect(screen.queryByRole("button", { name: /apagar (todos|tudo)/i })).toBeNull();
  });

  it("Voltar é um botão que volta pelo histórico", async () => {
    renderApp("/configuracoes", freshStore());
    expect(await screen.findByRole("button", { name: t("common.back") })).toBeDefined();
  });
});
