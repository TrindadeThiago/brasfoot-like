import { migrateSave } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openDB } from "idb";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { createIndexedDbStore, type SaveStore } from "../../src/storage/indexeddb";
import { renderApp } from "../helpers/app";
import { memoryRouter } from "../helpers/router";
import { careerSave } from "../helpers/saves";

let counter = 0;
function store(): { name: string; store: SaveStore } {
  const name = `fluxo-${counter++}`;
  return { name, store: createIndexedDbStore(name, migrateSave) };
}

async function createCareer(managerName: string, clubRow: number) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("link", { name: t("opening.newCareer") }));
  await user.type(screen.getByLabelText(t("newCareer.managerName")), managerName);
  const table = screen.getByRole("table", {
    name: t("newCareer.clubsCaption", { division: "Série A" }),
  });
  const row = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row")[
    clubRow
  ] as HTMLElement;
  const clubName = within(row).getByRole("img").getAttribute("aria-label") ?? "";
  await user.click(row);
  await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
  await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
  await screen.findByRole("heading", { name: clubName });
  return clubName;
}

describe("saves (US2)", () => {
  it("criar, recarregar e continuar do mesmo ponto (SC-002)", async () => {
    const { store: saves } = store();
    const first = renderApp("/", saves);
    const club = await createCareer("Ana Souza", 2);
    first.unmount();
    renderApp("/", saves);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: new RegExp(t("opening.continue")) }));
    expect(await screen.findByRole("heading", { name: club })).toBeDefined();
    expect(screen.getByText(t("header.manager", { name: "Ana Souza" }))).toBeDefined();
  });

  it("duas carreiras coexistem e a lista mostra os detalhes (SC-003)", async () => {
    const { store: saves } = store();
    await saves.save(careerSave("c1", "2026-10-16T10:00:00.000Z", 0));
    await saves.save({
      ...careerSave("c2", "2026-10-16T11:00:00.000Z", 5),
      managerName: "Bia Lima",
    });
    renderApp("/carreiras", saves);
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0] as HTMLElement).getByText(/Bia Lima/)).toBeDefined();
    expect(
      within(items[0] as HTMLElement).getByText(
        t("saves.progress", { year: 2027, round: 1, division: "Série A" }),
      ),
    ).toBeDefined();
    expect(within(items[0] as HTMLElement).getByRole("img")).toBeDefined();
    expect(within(items[1] as HTMLElement).getByText(/Ana Souza/)).toBeDefined();
  });

  it("apagar pede confirmação e só remove a escolhida", async () => {
    const { store: saves } = store();
    await saves.save(careerSave("c1", "2026-10-16T10:00:00.000Z", 0));
    await saves.save(careerSave("c2", "2026-10-16T11:00:00.000Z", 5));
    renderApp("/carreiras", saves);
    const user = userEvent.setup();
    const first = (await screen.findAllByRole("listitem"))[0] as HTMLElement;
    await user.click(within(first).getByRole("button", { name: t("saves.delete") }));
    await user.click(screen.getByRole("button", { name: t("common.cancel") }));
    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
    await user.click(
      within((await screen.findAllByRole("listitem"))[0] as HTMLElement).getByRole("button", {
        name: t("saves.delete"),
      }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: t("saves.delete") }),
    );
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect((await saves.listSummaries()).map((summary) => summary.id)).toEqual(["c1"]);
  });

  it("saves danificados e de versão futura aparecem marcados e não abrem", async () => {
    const { name, store: saves } = store();
    await saves.save({ ...careerSave("futuro"), formatVersion: 99 });
    const raw = await openDB(name, 2);
    await raw.put("saves", "lixo", "quebrado");
    raw.close();
    renderApp("/carreiras", saves);
    expect(await screen.findByText(t("saves.future"))).toBeDefined();
    expect(screen.getByText(t("saves.corrupt"))).toBeDefined();
    for (const item of screen.getAllByRole("listitem")) {
      expect(within(item).queryByRole("link", { name: t("saves.continue") })).toBeNull();
    }
  });

  it("sem carreiras, a abertura não oferece Continuar", async () => {
    const { store: saves } = store();
    renderApp("/", saves);
    expect(await screen.findByRole("link", { name: t("opening.newCareer") })).toBeDefined();
    expect(screen.queryByRole("link", { name: new RegExp(t("opening.continue")) })).toBeNull();
  });

  it("armazenamento indisponível mostra aviso", async () => {
    const broken: SaveStore = {
      listSummaries: () => Promise.reject(new DOMException("bloqueado", "SecurityError")),
      load: () => Promise.reject(new Error("x")),
      save: () => Promise.resolve({ ok: false, reason: "unavailable" }),
      remove: () => Promise.resolve(),
      exists: () => Promise.resolve(false),
    };
    renderApp("/", broken);
    expect(await screen.findByText(t("opening.storageUnavailable"))).toBeDefined();
  });
});
