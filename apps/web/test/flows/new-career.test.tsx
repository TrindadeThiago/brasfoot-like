import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { freshStore, renderApp } from "../helpers/app";
import { memoryRouter } from "../helpers/router";

function clubRows() {
  const table = screen.getByRole("table", { name: t("newCareer.clubsCaption") });
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
      screen.getByText(t("header.progress", { year: 2027, round: 1, total: 38 })),
    ).toBeDefined();
  });
});
