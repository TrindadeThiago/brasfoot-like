import { generateWorldBank, type ModPackage, mainCompetitionOf } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { createSave, migrateSave, type SaveFile } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { createIndexedDbStore } from "../../src/storage/indexeddb";
import { createModStore } from "../../src/storage/mods";
import { freshStore, renderApp } from "../helpers/app";
import { renderClassicNewCareer } from "../helpers/classic";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 90000 });

let counter = 0;

/** Mundo de 3 países, 2 divisões de 10 clubes cada. */
function worldMod(): ModPackage {
  const bank = structuredClone(
    generateWorldBank({
      seed: "mundo-web",
      countries: 3,
      divisionsPerCountry: 2,
      clubsPerDivision: 10,
      manifest: { id: "mundo-teste", name: "Mundo de teste", author: "Teste", version: "1.0.0" },
    }),
  ) as ModPackage;
  return bank;
}

async function installWorld() {
  const user = userEvent.setup();
  const store = freshStore();
  const mods = createModStore(`mundo-${counter++}`);
  renderApp("/mods", store, mods);
  const input = (await screen.findByLabelText(t("mods.load"))) as HTMLInputElement;
  const file = new File([writeModPackage(worldMod()) as BlobPart], "mundo.zip", {
    type: "application/zip",
  });
  await user.upload(input, file);
  expect(await screen.findByText(t("mods.loaded", { name: "Mundo de teste" }))).toBeDefined();
  renderApp("/nova-carreira", store, mods);
  const bank = await screen.findByLabelText(t("newCareer.bank"));
  await waitFor(() => expect(within(bank).getAllByRole("option")).toHaveLength(2));
  await user.selectOptions(bank, "mundo-teste");
  return { user, store, mods };
}

function rowsOfTable(): HTMLElement[] {
  const table = screen.getAllByRole("table")[0] as HTMLElement;
  return within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row");
}

describe("nova carreira num mundo de vários países (020 US1)", () => {
  it("filtra por país e por divisão, e busca pelo nome", async () => {
    const { user } = await installWorld();
    const country = await screen.findByLabelText(t("newCareer.country.filter"));
    const names = within(country)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(names).toHaveLength(4);
    expect(names.at(-1)).toBe(t("newCareer.country.all"));

    // Começa no primeiro país, na divisão principal.
    await waitFor(() => expect(rowsOfTable()).toHaveLength(10));
    expect(screen.getByText(t("newCareer.results", { count: 10 }))).toBeDefined();

    // Outro país: seus clubes.
    await user.selectOptions(country, names[1] as string);
    await waitFor(() => expect(rowsOfTable()).toHaveLength(10));
    const second = rowsOfTable().map((row) => row.textContent);

    // Todos os países, divisão 1: 30 clubes, e a coluna de país aparece.
    await user.selectOptions(country, t("newCareer.country.all"));
    await user.selectOptions(
      screen.getByLabelText(t("newCareer.division.filter")),
      t("newCareer.division.level", { level: 1 }),
    );
    await waitFor(() => expect(rowsOfTable()).toHaveLength(30));
    expect(screen.getByRole("columnheader", { name: new RegExp(t("col.country")) })).toBeDefined();
    expect(second.every((text) => text !== null)).toBe(true);

    // Busca por parte do nome.
    const first = rowsOfTable()[0] as HTMLElement;
    const clubName = within(first).getByRole("img").getAttribute("aria-label") ?? "";
    await user.type(screen.getByLabelText(t("newCareer.search")), clubName.slice(0, 6));
    await waitFor(() => expect(rowsOfTable().length).toBeLessThan(30));
    expect(rowsOfTable().length).toBeGreaterThan(0);
  });

  it("começa a carreira num clube de outro país", async () => {
    const { user } = await installWorld();
    const country = await screen.findByLabelText(t("newCareer.country.filter"));
    const names = within(country)
      .getAllByRole("option")
      .map((option) => option.textContent as string);
    await user.selectOptions(country, names[2] as string);
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana");
    await waitFor(() => expect(rowsOfTable()).toHaveLength(10));
    const row = rowsOfTable()[4] as HTMLElement;
    const clubName = within(row).getByRole("img").getAttribute("aria-label") ?? "";
    await user.click(row);
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    expect((await screen.findAllByRole("heading", { name: clubName })).length).toBeGreaterThan(0);
  });
});

describe("nova carreira no mundo padrão (020 FR-020)", () => {
  it("sem filtro de país, sem coluna de país e sem contagem", async () => {
    await renderClassicNewCareer();
    expect(screen.queryByLabelText(t("newCareer.country.filter"))).toBeNull();
    expect(screen.queryByLabelText(t("newCareer.search"))).toBeNull();
    expect(screen.queryByRole("columnheader", { name: new RegExp(t("col.country")) })).toBeNull();
  });
});

describe("consulta às ligas de outros países (020 US1)", () => {
  async function worldSave(): Promise<{
    store: ReturnType<typeof createIndexedDbStore>;
    save: SaveFile;
  }> {
    const bank = worldMod();
    const clubId = bank.clubs.find((club) => club.countryId === bank.countries[1]?.id)?.id ?? "";
    const created = createSave({
      id: "mundo",
      now: "2026-10-24T12:00:00.000Z",
      managerName: "Ana Souza",
      clubId,
      seed: "teste-web-mundo",
      defaultBank: bank,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const store = createIndexedDbStore(`mundo-save-${counter++}`, migrateSave);
    await store.save(created.save);
    return { store, save: created.save };
  }

  it("seletor de país na competição leva à tabela da liga do outro país", async () => {
    const user = userEvent.setup();
    const { store, save } = await worldSave();
    renderApp("/jogo/competicao?c=mundo", store);
    // Os países de fora ficam em "Demais competições" (027): o seletor filtra os cartões.
    await user.click(await screen.findByRole("tab", { name: t("competition.others") }));
    const country = await screen.findByLabelText(t("competition.country"));
    const [first] = save.bank.countries;
    const league = mainCompetitionOf(save.bank, first?.id ?? "");
    await user.selectOptions(country, first?.name ?? "");
    await user.click(await screen.findByRole("link", { name: league?.name ?? "" }));
    await waitFor(() =>
      expect(memoryRouter.url).toContain(`comp=liga-${first?.code.toLowerCase()}`),
    );
  });
});

describe("mercado e propostas entre países (020 US2)", () => {
  async function stored(edit?: (save: SaveFile) => SaveFile) {
    const bank = worldMod();
    const clubId = bank.clubs.find((club) => club.countryId === bank.countries[0]?.id)?.id ?? "";
    const created = createSave({
      id: "mundo",
      now: "2026-10-24T12:00:00.000Z",
      managerName: "Ana Souza",
      clubId,
      seed: "teste-web-mundo",
      defaultBank: bank,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const save = edit ? edit(created.save) : created.save;
    const store = createIndexedDbStore(`mundo-mercado-${counter++}`, migrateSave);
    await store.save(save);
    return { store, save };
  }

  it("o mercado filtra por país e mostra a coluna de país", async () => {
    const user = userEvent.setup();
    const { store, save } = await stored();
    renderApp("/jogo/mercado?c=mundo", store);
    const filter = await screen.findByLabelText(t("market.filter.country"));
    expect(screen.getByRole("columnheader", { name: new RegExp(t("col.country")) })).toBeDefined();
    const second = save.bank.countries[1];
    await user.selectOptions(filter, second?.name ?? "");
    await waitFor(() => {
      const table = screen.getAllByRole("table")[0] as HTMLElement;
      const body = within(table).getAllByRole("rowgroup")[1] as HTMLElement;
      const rows = within(body).getAllByRole("row");
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row.textContent).toContain(second?.code ?? "?");
    });
  });

  it("o limite de estrangeiros do país aparece no mercado", async () => {
    const { store } = await stored((save) => {
      const own = save.bank.clubs.find((club) => club.id === save.clubId)?.countryId;
      const country = save.bank.countries.find((entry) => entry.id === own);
      if (country) country.rules = { foreignLimit: 3 };
      return save;
    });
    renderApp("/jogo/mercado?c=mundo", store);
    expect(await screen.findByText(t("market.foreignLimit", { count: 0, limit: 3 }))).toBeDefined();
  });

  it("proposta de outro país mostra o país e, ao aceitar, leva a carreira para lá", async () => {
    const user = userEvent.setup();
    const { store, save } = await stored((base) => {
      const target = base.bank.clubs.find((club) => club.countryId === base.bank.countries[2]?.id)
        ?.id as string;
      const board = structuredClone(base.board);
      board.vacancies.push({
        id: "vacancy-teste",
        clubId: target,
        season: base.league.number,
        round: 0,
        considered: true,
        offerId: "offer-teste",
      });
      board.offers.push({
        id: "offer-teste",
        clubId: target,
        season: base.league.number,
        round: 0,
        expiresRound: 99,
        goals: board.clubs[base.clubId]?.goals,
        status: "pending",
      } as never);
      const club = board.clubs[target];
      if (club) club.coachId = null;
      return { ...base, board };
    });
    const target = save.bank.clubs.find((club) => club.countryId === save.bank.countries[2]?.id);
    renderApp("/jogo/carreira?c=mundo&aba=offers", store);
    const card = await screen.findByRole("article", { name: target?.name ?? "" });
    expect(
      within(card).getByText(
        t("career.offers.country", { country: save.bank.countries[2]?.name ?? "" }),
      ),
    ).toBeDefined();
    // O aviso de mudança de país (029) vem antes das ações.
    const warning = within(card).getByRole("region", { name: t("career.offers.abroadTitle") });
    const accept = within(card).getByRole("button", { name: t("career.offers.accept") });
    expect(warning.compareDocumentPosition(accept) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(accept);
    await waitFor(async () => {
      const [summary] = await store.listSummaries();
      const loaded = await store.load(summary?.id ?? "");
      if (loaded.status !== "ok") throw new Error("não abriu");
      expect(loaded.save.clubId).toBe(target?.id);
    });
  });
});
