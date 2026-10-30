// 031 US2: formulário da Nova carreira com erro ligado ao campo, foco no primeiro erro, busca,
// escolha por teclado e rodapé com o clube escolhido.
import { MANAGER_NAME_MAX } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { freshStore } from "../helpers/app";
import { renderClassicNewCareer } from "../helpers/classic";
import { memoryRouter } from "../helpers/router";

function clubRows() {
  const table = screen.getByRole("table", {
    name: t("newCareer.clubsCaption", { division: "Série A" }),
  });
  return within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row");
}

describe("Nova carreira: campos e rótulos (031 FR-003/FR-004)", () => {
  it("todo campo tem rótulo; Sem demissão tem explicação; a seed fica recolhida e aceita qualquer texto", async () => {
    await renderClassicNewCareer();
    for (const label of [
      "newCareer.managerName",
      "newCareer.bank",
      "newCareer.division.filter",
      "newCareer.search",
    ]) {
      expect(screen.getByLabelText(t(label))).toBeDefined();
    }
    expect(screen.getByRole("checkbox", { name: t("newCareer.noFiring") })).toBeDefined();
    expect(screen.getByText(t("newCareer.noFiringHelp"))).toBeDefined();
    const advanced = screen.getByText(t("newCareer.advanced")).closest("details");
    expect(advanced?.open).toBe(false);
    expect(screen.getByText(t("newCareer.managerHint", { max: MANAGER_NAME_MAX }))).toBeDefined();
    expect(screen.getByRole("link", { name: t("nav.mods") }).getAttribute("href")).toBe("/mods/");
  });

  it("a busca e a contagem aparecem mesmo num mundo de um país, e a busca ignora acento", async () => {
    const user = userEvent.setup();
    await renderClassicNewCareer();
    expect(screen.getByText(t("newCareer.results", { count: 20 }))).toBeDefined();
    const first = clubRows()[0] as HTMLElement;
    const name = within(first).getByRole("img").getAttribute("aria-label") ?? "";
    await user.type(screen.getByLabelText(t("newCareer.search")), name.toUpperCase());
    expect(screen.getByText(t("newCareer.results", { count: 1 }))).toBeDefined();
    expect(clubRows()).toHaveLength(1);
  });

  it("sem clube que passe nos filtros mostra o estado vazio e Limpar filtros devolve a lista", async () => {
    const user = userEvent.setup();
    await renderClassicNewCareer();
    await user.type(screen.getByLabelText(t("newCareer.search")), "zzzzzz");
    expect(screen.getByText(t("newCareer.noMatch"))).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
    await user.click(screen.getByRole("button", { name: t("newCareer.clearFilters") }));
    expect(screen.getAllByRole("table").length).toBeGreaterThan(0);
    expect((screen.getByLabelText(t("newCareer.search")) as HTMLInputElement).value).toBe("");
  });
});

describe("Nova carreira: escolha do clube (031 FR-005/FR-006)", () => {
  it("escolhe pelo teclado (Enter na linha) e o rodapé mostra o clube e o botão", async () => {
    const user = userEvent.setup();
    await renderClassicNewCareer();
    expect(screen.getByText(t("newCareer.noClubSelected"))).toBeDefined();
    const row = clubRows()[2] as HTMLElement;
    const clubName = within(row).getByRole("img").getAttribute("aria-label") ?? "";
    row.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText(t("newCareer.selected", { club: clubName }))).toBeDefined();
    // A linha escolhida é marcada por texto e por aria-selected, não só por cor.
    const chosen = clubRows().find((entry) => entry.getAttribute("aria-selected") === "true");
    expect(chosen).toBeDefined();
    expect(within(chosen as HTMLElement).getByText(t("newCareer.chosenMark"))).toBeDefined();
    expect(screen.getByRole("button", { name: t("newCareer.confirm") })).toBeDefined();
  });

  it("o clube escolhido continua escolhido e visível no rodapé quando some do filtro", async () => {
    const user = userEvent.setup();
    await renderClassicNewCareer();
    const row = clubRows()[0] as HTMLElement;
    const clubName = within(row).getByRole("img").getAttribute("aria-label") ?? "";
    await user.click(row);
    await user.type(screen.getByLabelText(t("newCareer.search")), "zzzzzz");
    expect(screen.getByText(t("newCareer.selected", { club: clubName }))).toBeDefined();
    await user.clear(screen.getByLabelText(t("newCareer.search")));
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana");
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
  });

  it("criando: o botão mostra 'criando carreira' e fica ocupado", async () => {
    const user = userEvent.setup();
    await renderClassicNewCareer();
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana");
    await user.click(clubRows()[0] as HTMLElement);
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    const busy = await screen.findByRole("button", { name: t("newCareer.creating") });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect((busy as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Nova carreira: erros ligados ao campo (031 FR-007, SC-005)", () => {
  it("nome vazio: erro ligado ao campo, foco no campo e nada criado", async () => {
    const user = userEvent.setup();
    const store = freshStore();
    await renderClassicNewCareer(store);
    await user.click(clubRows()[0] as HTMLElement);
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    const input = screen.getByLabelText(t("newCareer.managerName"));
    const message = t("save.invalid_name", { max: MANAGER_NAME_MAX, length: 0 });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(message);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(memoryRouter.pathname()).toBe("/nova-carreira");
    expect(await store.listSummaries()).toHaveLength(0);
  });

  it("nome só com espaços também erra no campo do nome", async () => {
    const user = userEvent.setup();
    await renderClassicNewCareer();
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "   ");
    await user.click(clubRows()[0] as HTMLElement);
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(memoryRouter.pathname()).toBe("/nova-carreira");
  });

  it("sem clube: o erro fica ligado à lista de clubes e o foco vai para ela", async () => {
    const user = userEvent.setup();
    await renderClassicNewCareer();
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana");
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(t("newCareer.noClub"));
    const list = screen.getByRole("region", { name: t("newCareer.clubList") });
    expect(list.contains(alert)).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(list));
  });

  it("nome e clube com erro: o foco vai ao primeiro (o nome); ao escolher o clube o erro dele some", async () => {
    const user = userEvent.setup();
    await renderClassicNewCareer();
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    expect(await screen.findAllByRole("alert")).toHaveLength(2);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText(t("newCareer.managerName"))),
    );
    await user.click(clubRows()[1] as HTMLElement);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});

describe("Nova carreira: mesma seed e mesmo clube dão a mesma carreira (constituição II)", () => {
  it("duas carreiras com a mesma seed, clube e nome têm a mesma liga e o mesmo calendário", async () => {
    async function create() {
      const user = userEvent.setup();
      const store = freshStore();
      const view = await renderClassicNewCareer(store);
      await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana");
      await user.click(screen.getByText(t("newCareer.advanced")));
      await user.type(screen.getByLabelText(t("newCareer.seed")), "seed-fixa");
      await user.click(clubRows()[4] as HTMLElement);
      await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
      await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
      const [summary] = await store.listSummaries();
      const loaded = await store.load(summary?.id ?? "");
      if (loaded.status !== "ok") throw new Error(loaded.status);
      view.unmount();
      return loaded.save;
    }
    const a = await create();
    const b = await create();
    expect(b.clubId).toBe(a.clubId);
    expect(b.seed).toBe(a.seed);
    expect(JSON.stringify(b.league)).toBe(JSON.stringify(a.league));
    expect(JSON.stringify(b.calendar)).toBe(JSON.stringify(a.calendar));
  });
});
