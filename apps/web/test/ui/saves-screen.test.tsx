// 031 US3: carreiras salvas em cartões, apagar com confirmação, importar com erros ligados ao campo.

import { migrateSave } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openDB } from "idb";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { createIndexedDbStore } from "../../src/storage/indexeddb";
import { freshStore, renderApp } from "../helpers/app";
import { memoryRouter } from "../helpers/router";
import { careerSave } from "../helpers/saves";

function file(content: string, name: string): File {
  return new File([content], name, { type: "application/json" });
}

describe("Carreiras salvas (031 US3)", () => {
  it("cada cartão mostra técnico, clube, divisão, temporada, rodada e data; a quantidade vem em texto", async () => {
    const store = freshStore();
    await store.save(careerSave("c1", "2026-10-16T10:00:00.000Z", 0));
    await store.save({
      ...careerSave("c2", "2026-10-17T10:00:00.000Z", 5),
      managerName: "Bia Lima",
    });
    renderApp("/carreiras", store);
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(screen.getByText(t("saves.count", { count: 2 }))).toBeDefined();
    const first = within(items[0] as HTMLElement);
    expect(first.getByText(/Bia Lima/)).toBeDefined();
    expect(
      first.getByText(t("saves.progress", { year: 2027, round: 1, division: "Série A" })),
    ).toBeDefined();
    expect(first.getByText(/Salva em/)).toBeDefined();
    expect(first.getByRole("link", { name: t("saves.continue") })).toBeDefined();
    expect(first.getByRole("button", { name: t("saves.delete") })).toBeDefined();
  });

  it("os botões do cartão se chamam como sempre e são descritos pela carreira", async () => {
    const store = freshStore();
    await store.save(careerSave("c1", "2026-10-16T10:00:00.000Z", 0));
    renderApp("/carreiras", store);
    const del = await screen.findByRole("button", { name: t("saves.delete") });
    expect(del.getAttribute("aria-describedby")).not.toBeNull();
    expect(
      screen.getByRole("link", { name: t("saves.continue") }).getAttribute("aria-describedby"),
    ).not.toBeNull();
  });

  it("apagar: o diálogo cita técnico e clube, o foco inicial é o Cancelar e Esc cancela e devolve o foco", async () => {
    const store = freshStore();
    await store.save(careerSave("c1", "2026-10-16T10:00:00.000Z", 0));
    renderApp("/carreiras", store);
    const user = userEvent.setup();
    const del = await screen.findByRole("button", { name: t("saves.delete") });
    await user.click(del);
    const dialog = await screen.findByRole("dialog", { name: t("saves.confirmDeleteTitle") });
    expect(dialog.textContent).toContain("Ana Souza");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialog).getByRole("button", { name: t("common.cancel") }),
      ),
    );
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(del);
    expect(await store.listSummaries()).toHaveLength(1);
  });

  it("apagar a última carreira mostra o estado vazio com Nova carreira e Importar", async () => {
    const store = freshStore();
    await store.save(careerSave("c1", "2026-10-16T10:00:00.000Z", 0));
    renderApp("/carreiras", store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: t("saves.delete") }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: t("saves.delete") }),
    );
    expect(await screen.findByText(t("saves.empty"))).toBeDefined();
    expect(screen.getByRole("link", { name: t("opening.newCareer") }).getAttribute("href")).toBe(
      "/nova-carreira/",
    );
    expect(screen.getByRole("button", { name: t("saves.import") })).toBeDefined();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("carreira danificada e de versão futura têm marcação em texto, sem Continuar, e podem ser apagadas", async () => {
    const name = `saves-screen-${Math.random()}`;
    const store = createIndexedDbStore(name, migrateSave);
    await store.save({ ...careerSave("futuro"), formatVersion: 99 });
    const raw = await openDB(name, 2);
    await raw.put("saves", "lixo", "quebrado");
    raw.close();
    renderApp("/carreiras", store);
    expect(await screen.findByText(t("saves.future"))).toBeDefined();
    expect(screen.getByText(t("saves.corrupt"))).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    for (const item of screen.getAllByRole("listitem")) {
      expect(within(item).queryByRole("link", { name: t("saves.continue") })).toBeNull();
      expect(within(item).getByRole("button", { name: t("saves.delete") })).toBeDefined();
    }
  });

  it("importar arquivo que não é carreira mostra o erro ligado ao campo e não importa nada", async () => {
    const store = freshStore();
    renderApp("/carreiras", store);
    const user = userEvent.setup();
    const input = (await screen.findByLabelText(t("saves.import"))) as HTMLInputElement;
    await user.upload(input, file("não sou uma carreira", "x.json"));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(t("saves.import.notASave"));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
    expect(await store.listSummaries()).toHaveLength(0);
  });

  it("o estado vazio sem erro mostra a dica do arquivo e sem carreiras não há lista", async () => {
    renderApp("/carreiras", freshStore());
    expect(await screen.findByText(t("saves.empty.hint"))).toBeDefined();
    expect(screen.getByText(t("saves.importHint"))).toBeDefined();
    expect(memoryRouter.pathname()).toBe("/carreiras");
  });

  it("armazenamento indisponível mostra o aviso em texto", async () => {
    const store = freshStore();
    store.listSummaries = () => Promise.reject(new Error("bloqueado"));
    renderApp("/carreiras", store);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(t("opening.storageUnavailable"))).toBeDefined();
  });
});
