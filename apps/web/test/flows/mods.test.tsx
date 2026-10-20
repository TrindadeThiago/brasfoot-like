import type { ModPackage } from "@brasfoot-like/engine";
import { toDataUri, writeModPackage } from "@brasfoot-like/modkit";
import { exportSave, importSave } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultBankInput } from "../../src/game/default-bank";
import { issueText, t } from "../../src/i18n";
import { createModStore } from "../../src/storage/mods";
import { freshStore, renderApp } from "../helpers/app";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 60000 });

let counter = 0;
const modsStore = () => createModStore(`mods-teste-${counter++}`);

/** Banco padrão como um mod com outra identificação e um clube renomeado. */
function testMod(): ModPackage {
  const bank = structuredClone(defaultBankInput()) as ModPackage;
  bank.manifest = { ...bank.manifest, id: "mod-teste", name: "Mod de teste", author: "Teste" };
  const club = bank.clubs[0];
  if (club) club.name = "Clube do Mod";
  return bank;
}

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

/** PNG mínimo (assinatura + IHDR) 64×64. */
function tinyPng(): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 64);
  view.setUint32(20, 64);
  return bytes;
}

function zipFile(bytes: Uint8Array, name = "mod.zip"): File {
  return new File([bytes as BlobPart], name, { type: "application/zip" });
}

describe("mods de terceiros (015 US2)", () => {
  it("carrega um mod válido, cria uma carreira com ele e o remove sem afetar a carreira", async () => {
    const user = userEvent.setup();
    const store = freshStore();
    const mods = modsStore();
    renderApp("/mods", store, mods);
    const input = (await screen.findByLabelText(t("mods.load"))) as HTMLInputElement;
    await user.upload(input, zipFile(writeModPackage(testMod())));
    expect(await screen.findByText(t("mods.loaded", { name: "Mod de teste" }))).toBeDefined();
    const list = screen.getByRole("region", { name: t("mods.list") });
    expect(within(list).getByText("Mod de teste")).toBeDefined();

    renderApp("/nova-carreira", store, mods);
    const bank = await screen.findByLabelText(t("newCareer.bank"));
    await waitFor(() => expect(within(bank).getAllByRole("option")).toHaveLength(2));
    await user.selectOptions(bank, "mod-teste");
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana");
    await user.click(await screen.findByText("Clube do Mod"));
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    expect(
      (await screen.findAllByRole("heading", { name: "Clube do Mod" })).length,
    ).toBeGreaterThan(0);

    await mods.remove("mod-teste");
    const [summary] = await store.listSummaries();
    const loaded = await store.load(summary?.id ?? "");
    expect(loaded.status).toBe("ok");
  });

  it("pacote com defeito mostra o relatório e não é guardado", async () => {
    const user = userEvent.setup();
    const mods = modsStore();
    renderApp("/mods", freshStore(), mods);
    const bank = testMod();
    (bank.clubs[0] as { reputation: number }).reputation = 999;
    const input = (await screen.findByLabelText(t("mods.load"))) as HTMLInputElement;
    await user.upload(input, zipFile(writeModPackage(bank)));
    expect(await screen.findByText(t("mods.rejected"))).toBeDefined();
    const report = screen.getByRole("region", { name: t("mods.report") });
    const issue = {
      severity: "error" as const,
      code: "schema.out_of_range" as const,
      section: "clubs" as const,
      path: [0, "reputation"],
      params: { field: "reputation", min: 1, max: 100, value: 999 },
      entityId: bank.clubs[0]?.id ?? "",
    };
    expect(within(report).getByText(issueText(issue))).toBeDefined();
    expect(await mods.list()).toEqual([]);
  });

  it("mod com o mesmo id pergunta se substitui", async () => {
    const user = userEvent.setup();
    const mods = modsStore();
    renderApp("/mods", freshStore(), mods);
    const input = (await screen.findByLabelText(t("mods.load"))) as HTMLInputElement;
    await user.upload(input, zipFile(writeModPackage(testMod())));
    await screen.findByText(t("mods.loaded", { name: "Mod de teste" }));
    const second = testMod();
    second.manifest = { ...second.manifest, version: "2.0.0" };
    await user.upload(input, zipFile(writeModPackage(second)));
    const dialog = await screen.findByRole("dialog", { name: t("mods.replaceTitle") });
    await user.click(within(dialog).getByRole("button", { name: t("mods.replace") }));
    await waitFor(async () => expect((await mods.get("mod-teste"))?.summary.version).toBe("2.0.0"));
  });

  it("exporta CSVs do banco padrão e gera um pacote a partir de um CSV editado (US4)", async () => {
    const user = userEvent.setup();
    const mods = modsStore();
    renderApp("/mods", freshStore(), mods);
    const panel = await screen.findByRole("region", { name: t("mods.csv.title") });
    await user.click(within(panel).getByRole("button", { name: t("mods.csv.exportClubs") }));
    await user.click(within(panel).getByRole("button", { name: t("mods.csv.exportPlayers") }));
    expect(downloads.map((download) => download.name)).toEqual([
      "padrao-clubs.csv",
      "padrao-players.csv",
    ]);
    const csv = (await downloads[0]?.blob.text()) ?? "";
    const lines = csv.replace(/^\uFEFF/, "").split("\r\n");
    const first = (lines[1] ?? "").split(",");
    first[1] = "Clube da Planilha";
    lines[1] = first.join(",");

    await user.upload(
      within(panel).getByLabelText(t("mods.csv.importClubs")),
      new File([lines.join("\r\n")], "clubs.csv", { type: "text/csv" }),
    );
    await user.click(within(panel).getByRole("button", { name: t("mods.csv.apply") }));
    expect(await within(panel).findByText(t("mods.csv.ok"))).toBeDefined();
    await user.click(within(panel).getByRole("button", { name: t("mods.csv.loadGenerated") }));
    await waitFor(async () => expect(await mods.list()).toHaveLength(1));
    const [stored] = await mods.list();
    const clubs = stored?.files["clubs.json"] as { name: string }[];
    expect(clubs.some((club) => club.name === "Clube da Planilha")).toBe(true);
  });

  it("CSV com erro mostra o relatório com a linha", async () => {
    const user = userEvent.setup();
    renderApp("/mods", freshStore(), modsStore());
    const panel = await screen.findByRole("region", { name: t("mods.csv.title") });
    await user.upload(
      within(panel).getByLabelText(t("mods.csv.importClubs")),
      new File(["id,name\nx,y\n"], "clubs.csv", { type: "text/csv" }),
    );
    await user.click(within(panel).getByRole("button", { name: t("mods.csv.apply") }));
    expect(await within(panel).findByRole("region", { name: t("mods.report") })).toBeDefined();
    expect(within(panel).queryByText(t("mods.csv.ok"))).toBeNull();
  });

  it("escudos com imagem aparecem na carreira e continuam após remover o mod e exportar (US5)", async () => {
    const user = userEvent.setup();
    const store = freshStore();
    const mods = modsStore();
    const bank = testMod();
    const club = bank.clubs[0];
    if (club) club.crest = { ...club.crest, image: "images/clube.png" };
    const png = toDataUri("png", tinyPng());
    renderApp("/mods", store, mods);
    const input = (await screen.findByLabelText(t("mods.load"))) as HTMLInputElement;
    await user.upload(input, zipFile(writeModPackage(bank, { "images/clube.png": png })));
    await screen.findByText(t("mods.loaded", { name: "Mod de teste" }));

    renderApp("/nova-carreira", store, mods);
    const select = await screen.findByLabelText(t("newCareer.bank"));
    await waitFor(() => expect(within(select).getAllByRole("option")).toHaveLength(2));
    await user.selectOptions(select, "mod-teste");
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana");
    await user.click(await screen.findByText("Clube do Mod"));
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    const images = await screen.findAllByRole("img", { name: "Clube do Mod" });
    expect(images.some((image) => image.tagName === "IMG")).toBe(true);

    await mods.remove("mod-teste");
    const [summary] = await store.listSummaries();
    renderApp("/carreiras", store, mods);
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("img", { name: "Clube do Mod" })
          .some((image) => image.tagName === "IMG"),
      ).toBe(true),
    );
    const loaded = await store.load(summary?.id ?? "");
    if (loaded.status !== "ok") throw new Error(loaded.status);
    expect(loaded.save.assets).toEqual({ "images/clube.png": png });
    const imported = importSave(exportSave(loaded.save, "2026-10-20T00:00:00.000Z"));
    if (imported.status !== "ok") throw new Error(imported.status);
    expect(imported.save.assets).toEqual({ "images/clube.png": png });
  });
});
