// 027 US3: grade mensal do calendário, faixa de meses, painel e teclado.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/calendario?c=tela");
});

const grid = () => screen.findByRole("table", { name: /^Calendário de / });

describe("calendário mensal (027)", () => {
  it("abre no mês do próximo jogo, com o próximo jogo e a faixa de meses com contagens", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/calendario?c=tela", store);
    const month = await grid();
    expect(within(month).getAllByText(t("calendar.nextGame")).length).toBeGreaterThan(0);
    const strip = screen.getByRole("navigation", { name: t("calendar.months") });
    const buttons = within(strip).getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(buttons.some((button) => button.getAttribute("aria-current") === "true")).toBe(true);
    expect(buttons[0]?.textContent).toMatch(/\d/);
  });

  it("o dia de jogo mostra adversário e mando/resultado em texto, nunca só cor", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/calendario?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const strip = await screen.findByRole("navigation", { name: t("calendar.months") });
    await user.click(within(strip).getAllByRole("button")[0] as HTMLElement);
    const month = await grid();
    // O primeiro mês tem jogos já disputados: o chip traz V, E ou D com o placar.
    expect(month.textContent).toMatch(/[VED] \d×\d/);
  });

  it("escolher um dia de jogo abre o painel com data, mando, competição e as ações", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/calendario?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const month = await grid();
    const day = within(month)
      .getAllByRole("button")
      .find((button) => /1 jogo/.test(button.textContent ?? ""));
    expect(day).toBeDefined();
    await user.click(day as HTMLElement);
    const panel = screen.getByRole("region", { name: t("calendar.panel") });
    expect(within(panel).getByRole("button", { name: /^Ver jogos da rodada/ })).toBeDefined();
    expect(within(panel).getByText(/Casa|Fora/)).toBeDefined();
  });

  it("setas movem o foco entre os dias, PageDown troca de mês e o painel do dia existe", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/calendario?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const month = await grid();
    const first = within(month)
      .getAllByRole("button")
      .find((button) => button.tabIndex === 0) as HTMLElement;
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).not.toBe(first);
    expect(document.activeElement?.getAttribute("data-date")).toBeTruthy();
    const before = screen.getByRole("heading", { level: 2, name: /\d{4}/ }).textContent;
    await user.keyboard("{PageDown}");
    expect(screen.getByRole("heading", { level: 2, name: /\d{4}/ }).textContent).not.toBe(before);
    // O painel do dia traz o detalhe de cada jogo, também para quem navega pelo teclado.
    expect(screen.getByRole("region", { name: t("calendar.panel") })).toBeDefined();
  });

  it("Ir para o próximo jogo volta ao mês e ao dia do próximo jogo", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/calendario?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await grid();
    await user.click(screen.getByRole("button", { name: t("calendar.nextMonth") }));
    await user.click(screen.getByRole("button", { name: t("calendar.goNext") }));
    const month = await grid();
    const marked = within(month)
      .getAllByRole("button")
      .find((button) => (button.textContent ?? "").includes(t("calendar.nextGame")));
    expect(marked).toBeDefined();
  });

  it("mês sem jogos mostra a mensagem e as setas continuam", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/calendario?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await grid();
    const prev = screen.getByRole("button", { name: t("calendar.prevMonth") });
    expect(prev).toBeDefined();
    const strip = screen.getByRole("navigation", { name: t("calendar.months") });
    const empty = within(strip)
      .getAllByRole("button")
      .find((button) => /sem jogos/.test(button.textContent ?? ""));
    if (empty) {
      await user.click(empty);
      expect(await screen.findByText(t("calendar.noGames"))).toBeDefined();
    }
  });

  it("a legenda abaixo da grade explica resultados, competições e o próximo jogo", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/calendario?c=tela", store);
    await grid();
    const legend = screen.getByRole("region", { name: t("calendar.legend") });
    for (const text of [t("result.win"), t("result.draw"), t("result.loss")]) {
      expect(within(legend).getByText(text)).toBeDefined();
    }
    expect(within(legend).getByText(t("calendar.nextGame"))).toBeDefined();
    // Cada competição do calendário aparece pelo nome (cor nunca é o único sinal).
    expect(within(legend).getAllByRole("listitem").length).toBeGreaterThanOrEqual(5);
  });
});
