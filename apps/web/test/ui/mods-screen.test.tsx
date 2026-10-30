// 031 US5: Mods em cartões, estado vazio, erro ligado ao campo, relatório com texto e diálogos seguros.
import type { ModPackage } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultBankInput } from "../../src/game/default-bank";
import { t } from "../../src/i18n";
import { createModStore } from "../../src/storage/mods";
import { freshStore, renderApp } from "../helpers/app";

vi.setConfig({ testTimeout: 60000 });

let counter = 0;
const modsStore = () => createModStore(`mods-screen-${counter++}`);

function testMod(version = "1.0.0"): ModPackage {
  const bank = structuredClone(defaultBankInput()) as ModPackage;
  bank.manifest = {
    ...bank.manifest,
    id: "mod-teste",
    name: "Mod de teste",
    author: "Teste",
    version,
  };
  return bank;
}

const zipFile = (bytes: Uint8Array) =>
  new File([bytes as BlobPart], "mod.zip", { type: "application/zip" });

describe("Mods (031 US5)", () => {
  it("tem a introdução com a documentação e o exemplo, o mundo padrão, carregar, mods carregados e planilhas", async () => {
    renderApp("/mods", freshStore(), modsStore());
    await screen.findByRole("heading", { level: 1, name: t("mods.title") });
    expect(screen.getByRole("link", { name: t("mods.docs") }).getAttribute("href")).toBe(
      "/docs/mod-format.md",
    );
    expect(screen.getByRole("link", { name: t("mods.example") }).getAttribute("href")).toBe(
      "/mods/exemplo.zip",
    );
    const world = screen.getByRole("region", { name: t("mods.world") });
    expect(within(world).getByText(t("mods.world.description"))).toBeDefined();
    expect(within(world).getByRole("link", { name: t("mods.world.download") })).toBeDefined();
    expect(screen.getByLabelText(t("mods.load"))).toBeDefined();
    expect(screen.getByRole("region", { name: t("mods.list") })).toBeDefined();
    expect(screen.getByRole("region", { name: t("mods.csv.title") })).toBeDefined();
    expect(screen.getByText(t("mods.csv.help"))).toBeDefined();
  });

  it("sem mods carregados mostra o estado vazio; não existe ativar nem desativar", async () => {
    renderApp("/mods", freshStore(), modsStore());
    expect(await screen.findByText(t("mods.empty"))).toBeDefined();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: /(ativar|desativar)/i })).toBeNull();
  });

  it("mod válido entra na lista com o resumo, e Remover pede confirmação com foco no Cancelar", async () => {
    const user = userEvent.setup();
    const mods = modsStore();
    renderApp("/mods", freshStore(), mods);
    await user.upload(
      (await screen.findByLabelText(t("mods.load"))) as HTMLInputElement,
      zipFile(writeModPackage(testMod())),
    );
    const notice = await screen.findByRole("status", { name: t("mods.loadedTitle") });
    expect(within(notice).getByText(t("mods.loaded", { name: "Mod de teste" }))).toBeDefined();
    const list = screen.getByRole("region", { name: t("mods.list") });
    expect(within(list).getByText("Mod de teste")).toBeDefined();
    const remove = within(list).getByRole("button", { name: t("mods.remove") });
    await user.click(remove);
    const dialog = await screen.findByRole("dialog", { name: t("mods.removeConfirmTitle") });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialog).getByRole("button", { name: t("mods.cancel") }),
      ),
    );
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(remove);
    expect(await mods.list()).toHaveLength(1);
  });

  it("pacote recusado: o erro fica ligado ao campo e o relatório marca erro e aviso em texto", async () => {
    const user = userEvent.setup();
    renderApp("/mods", freshStore(), modsStore());
    const bank = testMod();
    (bank.clubs[0] as { reputation: number }).reputation = 999;
    const input = (await screen.findByLabelText(t("mods.load"))) as HTMLInputElement;
    await user.upload(input, zipFile(writeModPackage(bank)));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(t("mods.rejected"));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
    const report = screen.getByRole("region", { name: t("mods.report") });
    expect(within(report).getAllByText(t("mods.issue.error")).length).toBeGreaterThan(0);
  });

  it("substituir: o diálogo tem foco no Cancelar, e cancelar mantém a versão antiga", async () => {
    const user = userEvent.setup();
    const mods = modsStore();
    renderApp("/mods", freshStore(), mods);
    const input = (await screen.findByLabelText(t("mods.load"))) as HTMLInputElement;
    await user.upload(input, zipFile(writeModPackage(testMod())));
    await screen.findByText(t("mods.loaded", { name: "Mod de teste" }));
    await user.upload(input, zipFile(writeModPackage(testMod("2.0.0"))));
    const dialog = await screen.findByRole("dialog", { name: t("mods.replaceTitle") });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialog).getByRole("button", { name: t("mods.cancel") }),
      ),
    );
    await user.click(within(dialog).getByRole("button", { name: t("mods.cancel") }));
    expect((await mods.get("mod-teste"))?.summary.version).toBe("1.0.0");
  });

  it("as planilhas têm rótulo em todo campo", async () => {
    renderApp("/mods", freshStore(), modsStore());
    const panel = await screen.findByRole("region", { name: t("mods.csv.title") });
    for (const key of ["mods.csv.bank", "mods.csv.importClubs", "mods.csv.importPlayers"]) {
      expect(within(panel).getByLabelText(t(key))).toBeDefined();
    }
    expect(
      (within(panel).getByRole("button", { name: t("mods.csv.apply") }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
