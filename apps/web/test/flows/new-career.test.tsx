import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { freshStore, renderApp } from "../helpers/app";
import { memoryRouter } from "../helpers/router";

function clubRows() {
  const table = screen.getByRole("table", {
    name: t("newCareer.clubsCaption", { division: "Série A" }),
  });
  return within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row");
}

describe("nova carreira (US1)", () => {
  it("lista os 20 clubes da Série A com as informações básicas", () => {
    renderApp("/nova-carreira", freshStore());
    const rows = clubRows();
    expect(rows).toHaveLength(20);
    expect(within(rows[0] as HTMLElement).getByRole("img")).toBeDefined();
    for (const header of [
      "col.club",
      "col.city",
      "col.reputation",
      "col.strength",
      "col.stadium",
    ]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(t(header)) })).toBeDefined();
    }
  });

  it("ordena por força", async () => {
    const user = userEvent.setup();
    renderApp("/nova-carreira", freshStore());
    await user.click(screen.getByRole("button", { name: new RegExp(t("col.strength")) }));
    await user.click(screen.getByRole("button", { name: new RegExp(t("col.strength")) }));
    const strengths = clubRows().map((row) =>
      Number((within(row).getAllByRole("cell")[3]?.textContent ?? "0").replace(",", ".")),
    );
    expect(strengths).toEqual([...strengths].sort((a, b) => b - a));
  });

  it("bloqueia nome vazio", async () => {
    const user = userEvent.setup();
    renderApp("/nova-carreira", freshStore());
    await user.click(clubRows()[0] as HTMLElement);
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(memoryRouter.pathname()).toBe("/nova-carreira");
  });

  it("cria a carreira e mostra a tela inicial do clube", async () => {
    const user = userEvent.setup();
    renderApp("/nova-carreira", freshStore());
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana Souza");
    const row = clubRows()[3] as HTMLElement;
    const clubName = within(row).getByRole("img").getAttribute("aria-label") ?? "";
    await user.click(row);
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    expect(await screen.findByText(t("header.manager", { name: "Ana Souza" }))).toBeDefined();
    expect(screen.getByRole("heading", { name: clubName })).toBeDefined();
    expect(
      screen.getByText(
        t("header.progress", { year: 2027, round: 1, total: 38, division: "Série A" }),
      ),
    ).toBeDefined();
  });

  it("o filtro alcança os 40 clubes das duas divisões (US4)", async () => {
    const user = userEvent.setup();
    renderApp("/nova-carreira", freshStore());
    expect(clubRows()).toHaveLength(20);
    const filter = screen.getByLabelText(t("newCareer.division.filter"));
    await user.selectOptions(filter, "Série B");
    const serieB = screen.getByRole("table", {
      name: t("newCareer.clubsCaption", { division: "Série B" }),
    });
    const rows = within(within(serieB).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    expect(rows).toHaveLength(20);
    expect(rows.every((row) => row.textContent?.includes("Série B"))).toBe(true);
    await user.selectOptions(filter, t("newCareer.division.all"));
    const all = screen.getByRole("table", { name: t("newCareer.clubsCaptionAll") });
    expect(
      within(within(all).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row"),
    ).toHaveLength(40);
  });

  it("carreira com clube da Série B joga a Série B (US4)", async () => {
    const user = userEvent.setup();
    renderApp("/nova-carreira", freshStore());
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Bia");
    await user.selectOptions(screen.getByLabelText(t("newCareer.division.filter")), "Série B");
    const table = screen.getByRole("table", {
      name: t("newCareer.clubsCaption", { division: "Série B" }),
    });
    const row = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    )[0] as HTMLElement;
    await user.click(row);
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    expect(
      await screen.findByText(
        t("header.progress", { year: 2027, round: 1, total: 38, division: "Série B" }),
      ),
    ).toBeDefined();
    await user.keyboard("4");
    await screen.findByRole("table", { name: t("competition.caption", { division: "Série B" }) });
  });

  it("opção sem demissão: desmarcada por padrão e gravada na carreira (012 US7)", async () => {
    const user = userEvent.setup();
    const store = freshStore();
    renderApp("/nova-carreira", store);
    const option = screen.getByRole("checkbox", { name: t("newCareer.noFiring") });
    expect((option as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(t("newCareer.noFiringHelp"))).toBeDefined();
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana Souza");
    await user.click(option);
    await user.click(clubRows()[0] as HTMLElement);
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    const [summary] = await store.listSummaries();
    const loaded = await store.load(summary?.id ?? "");
    if (loaded.status !== "ok") throw new Error(loaded.status);
    expect(loaded.save.board.manager.noFiring).toBe(true);
    expect(await screen.findByText(t("board.noFiring"))).toBeDefined();
  });
});
