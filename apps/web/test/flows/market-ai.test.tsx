import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";

vi.setConfig({ testTimeout: 30000 });

describe("resumo da janela no app (011 US7)", () => {
  it("depois que a janela fecha, a Início avisa e o resumo lista as transferências", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(6);
    const report = save.market.reports.at(-1);
    if (!report) throw new Error("sem resumo");
    expect(report.transfers.length).toBeGreaterThan(0);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: t("market.notice.title") });
    expect(within(card).getByText(t("market.report.notice", { year: report.year }))).toBeDefined();

    await user.click(within(card).getByRole("link", { name: t("market.report.open") }));
    const title = t("market.report.title", { window: report.window, year: report.year });
    const section = await screen.findByRole("region", { name: title });
    const table = within(section).getByRole("table", { name: t("market.report.highlights") });
    const top = report.transfers[0];
    if (!top) throw new Error("sem transferência");
    expect(within(table).getAllByRole("cell", { name: top.displayName }).length).toBeGreaterThan(0);
  });

  it("dispensar o aviso grava o resumo como visto", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(6);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: t("market.notice.title") });
    await user.click(within(card).getByRole("button", { name: t("market.report.dismiss") }));
    await waitFor(async () => {
      const saved = await loadSaved(store);
      expect(saved.market.reportSeen).toBe(save.market.reports.at(-1)?.id);
    });
  });

  it("a rodada simulada pelo app movimenta o mercado entre clubes da IA", async () => {
    const { save } = await storedCareer(3);
    const deals = save.market.log.filter(
      (entry) =>
        entry.outcome === undefined && entry.kind === "sale" && entry.toClubId !== save.clubId,
    );
    expect(deals.length).toBeGreaterThan(0);
  });
});
