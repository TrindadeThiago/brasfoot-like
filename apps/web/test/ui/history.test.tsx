// 027 US4: Histórico com abas, estados vazios explicativos e ligação à trajetória do técnico.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";
import { longCareer } from "../helpers/saves";

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/historico?c=tela");
});

describe("Histórico (027)", () => {
  it("antes da primeira temporada encerrada, cada aba explica o que vai aparecer", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/historico?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("tablist", { name: t("history.tablist") });
    expect(screen.getByText(t("history.empty"))).toBeDefined();
    for (const tab of ["titles", "scorers", "records", "clubs"]) {
      await user.click(screen.getByRole("tab", { name: t(`history.tab.${tab}`) }));
      expect(screen.getByText(t(`history.empty.${tab}`))).toBeDefined();
    }
  });

  it("as abas de Copas, Continental e Estaduais só existem quando fazem sentido", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/historico?c=tela", store);
    await screen.findByRole("tablist");
    const names = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(names).toContain(t("history.tab.seasons"));
    expect(names).not.toContain(t("history.tab.regional"));
  });

  it("setas do teclado trocam de aba e a ligação à trajetória do técnico existe", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/historico?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const first = (await screen.findAllByRole("tab"))[0] as HTMLElement;
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getAllByRole("tab")[1]?.getAttribute("aria-selected")).toBe("true");
    expect(
      screen.getByRole("link", { name: t("history.managerLink") }).getAttribute("href"),
    ).toContain("aba=history");
  });

  it("depois de uma temporada encerrada, a lista traz a temporada e a classificação final abre", async () => {
    const { next } = longCareer("tela", 1);
    const { store } = await storedCareer(1, () => next);
    renderApp("/jogo/historico?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const table = await screen.findByRole("table", { name: t("history.caption") });
    const link = within(table).getAllByRole("link")[0] as HTMLElement;
    await user.click(link);
    expect(memoryRouter.url).toContain("t=");
  }, 60_000);
});
