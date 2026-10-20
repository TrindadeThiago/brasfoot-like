import { exportSave } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

vi.setConfig({ testTimeout: 60000 });

let downloads: { name: string; blob: Blob }[] = [];

beforeEach(() => {
  downloads = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    downloads.push({ name: "", blob: blob as Blob });
    return "blob:teste";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const last = downloads.at(-1);
    if (last) last.name = this.download;
  });
});

afterEach(() => vi.restoreAllMocks());

function fileOf(bytes: Uint8Array, name: string): File {
  return new File([bytes as BlobPart], name, { type: "application/gzip" });
}

describe("exportar e importar save (015 US1)", () => {
  it("exporta a carreira com o nome certo", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(3);
    renderApp("/carreiras", store);
    await user.click(
      await screen.findByRole("button", {
        name: t("saves.exportLabel", { manager: save.managerName }),
      }),
    );
    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]?.name).toMatch(/\.blsave$/);
  });

  it("importa como cópia quando a carreira já existe e recusa arquivo inválido", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(3);
    renderApp("/carreiras", store);
    const input = (await screen.findByLabelText(t("saves.import"))) as HTMLInputElement;

    await user.upload(input, fileOf(new Uint8Array([1, 2, 3]), "lixo.blsave"));
    expect(await screen.findByText(t("saves.import.notASave"))).toBeDefined();
    expect(await store.listSummaries()).toHaveLength(1);

    await user.upload(input, fileOf(exportSave(save, "2026-10-20T00:00:00.000Z"), "x.blsave"));
    const dialog = await screen.findByRole("dialog", { name: t("saves.conflict.title") });
    await user.click(within(dialog).getByRole("button", { name: t("saves.conflict.copy") }));
    await waitFor(async () => expect(await store.listSummaries()).toHaveLength(2));
    const summaries = await store.listSummaries();
    expect(new Set(summaries.map((entry) => entry.round))).toEqual(new Set([3]));
  });

  it("substituir mantém uma carreira só", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(2);
    renderApp("/carreiras", store);
    const input = (await screen.findByLabelText(t("saves.import"))) as HTMLInputElement;
    await user.upload(input, fileOf(exportSave(save, "2026-10-20T00:00:00.000Z"), "x.blsave"));
    const dialog = await screen.findByRole("dialog", { name: t("saves.conflict.title") });
    await user.click(within(dialog).getByRole("button", { name: t("saves.conflict.replace") }));
    expect(
      await screen.findByText(
        t("saves.importDone", {
          manager: save.managerName,
          club: save.bank.clubs.find((club) => club.id === save.clubId)?.name ?? "",
        }),
      ),
    ).toBeDefined();
    expect(await store.listSummaries()).toHaveLength(1);
  });
});
