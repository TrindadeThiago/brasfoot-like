import { expect, test } from "@playwright/test";
import { createCareer, skipTips, t } from "./helpers";

/** Texto de `saves.count` (o helper `t` não resolve plural ICU). */
const count = (n: number) =>
  n === 0 ? "Nenhuma carreira" : n === 1 ? "1 carreira" : `${n} carreiras`;

// Roteiro do quickstart da 031 (itens 1 a 8) de ponta a ponta, numa só carreira. O item 3 (mundo de
// 440 clubes) está em new-career.spec.ts e o 9 (temas e larguras) em a11y.spec.ts e layout.spec.ts.
test("quickstart 031, itens 1 a 8: menu, nova carreira, carreiras, configurações, mods, sobre, notas e atalhos", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await skipTips(page);

  // 1. Menu sem carreira: chamada, ações com a quantidade, rodapé.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: t("app.name") })).toBeVisible();
  await expect(page.getByText(t("opening.pitch"))).toBeVisible();
  await expect(page.getByText(count(0))).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(t("opening.continue")) })).toHaveCount(0);
  for (const key of ["nav.settings", "nav.about"]) {
    await expect(page.getByRole("link", { name: t(key) })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: t("nav.help") })).toBeVisible();

  // O cartão inteiro é clicável, inclusive o texto de descrição (regressão: a descrição cobria o link).
  // Clique de mouse no ponto da descrição: o `click()` do locator acusaria o link como interceptador.
  const detail = await page.getByText(t("opening.modsDetail")).boundingBox();
  await page.mouse.click((detail?.x ?? 0) + 10, (detail?.y ?? 0) + (detail?.height ?? 0) / 2);
  await expect(page).toHaveURL(/\/mods\//);
  await page.goto("/");

  // 2. Nova carreira: criar e voltar ao menu com Continuar e a quantidade.
  const club = await createCareer(page, "Ana Souza", 2);
  await page.goto("/");
  await expect(page.getByRole("link", { name: new RegExp(t("opening.continue")) })).toBeVisible();
  await expect(page.getByText(count(1))).toBeVisible();

  // 4. Carreiras salvas: exportar, apagar (cancelar e confirmar), importar, inválido e conflito.
  await page.goto("/carreiras/");
  await expect(page.getByText(count(1))).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: t("saves.exportLabel", { manager: "Ana Souza" }) })
    .click();
  const file = await (await downloadEvent).path();

  await page.getByRole("button", { name: t("saves.delete") }).click();
  const confirm = page.getByRole("dialog", { name: t("saves.confirmDeleteTitle") });
  await expect(confirm.getByRole("button", { name: t("common.cancel") })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirm).toHaveCount(0);
  await expect(page.getByText(count(1))).toBeVisible();
  await page.getByRole("button", { name: t("saves.delete") }).click();
  await confirm.getByRole("button", { name: t("saves.delete") }).click();
  await expect(page.getByText(t("saves.empty"), { exact: true })).toBeVisible();

  const input = page.getByLabel(t("saves.import"));
  await input.setInputFiles({
    name: "lixo.json",
    mimeType: "application/json",
    buffer: Buffer.from("nada"),
  });
  await expect(page.locator("form, main").getByText(t("saves.import.notASave"))).toBeVisible();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await input.setInputFiles(file);
  await expect(page.getByText(t("saves.importDone", { manager: "Ana Souza", club }))).toBeVisible();
  // Importar o mesmo arquivo de novo: conflito de id, com o foco no Cancelar; copiar mantém as duas.
  await input.setInputFiles(file);
  const conflict = page.getByRole("dialog", { name: t("saves.conflict.title") });
  await expect(conflict.getByRole("button", { name: t("saves.conflict.cancel") })).toBeFocused();
  await conflict.getByRole("button", { name: t("saves.conflict.copy") }).click();
  await expect(page.getByText(count(2))).toBeVisible();

  // 5. Configurações: tema e velocidade valem na hora.
  await page.goto("/configuracoes/");
  await page.getByLabel(t("settings.theme")).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel(t("settings.speed")).selectOption("slow");
  await page.getByRole("button", { name: t("settings.tipsReset") }).click();
  await expect(page.getByText(t("settings.tipsResetDone"))).toBeVisible();

  // 6. Mods: pacote inválido, mundo padrão, mod carregado (o clássico da carreira), remover.
  await page.goto("/mods/");
  await expect(page.getByRole("link", { name: t("mods.world.download") })).toBeVisible();
  const load = page.getByLabel(t("mods.load"));
  await load.setInputFiles({
    name: "ruim.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("não é zip"),
  });
  await expect(page.locator("main").getByText(t("mods.rejected"))).toBeVisible();
  await expect(load).toHaveAttribute("aria-invalid", "true");
  const list = page.getByRole("region", { name: t("mods.list") });
  await expect(list.getByRole("button", { name: t("mods.remove") })).toHaveCount(1);
  await list.getByRole("button", { name: t("mods.remove") }).click();
  const removing = page.getByRole("dialog", { name: t("mods.removeConfirmTitle") });
  await expect(removing.getByRole("button", { name: t("mods.cancel") })).toBeFocused();
  await removing.getByRole("button", { name: t("mods.remove") }).click();
  await expect(page.getByText(t("mods.empty"))).toBeVisible();
  await expect(page.getByRole("region", { name: t("mods.csv.title") })).toBeVisible();

  // 7. Sobre (capturas carregam) e notas de versão (atual aberta, beta recolhida).
  await page.goto("/sobre/");
  await page.waitForLoadState("networkidle");
  const widths = await page
    .locator("figure img")
    .evaluateAll((images) => images.map((image) => (image as HTMLImageElement).naturalWidth));
  expect(widths).toHaveLength(5);
  expect(widths.every((width) => width > 0)).toBe(true);
  await page.goto("/notas-de-versao/");
  await expect(page.locator("details").first()).toHaveJSProperty("open", true);
  const beta = page
    .getByText(t("notes.beta.title"), { exact: true })
    .locator("xpath=ancestor::details[1]");
  await expect(beta).toHaveJSProperty("open", false);

  // 8. Ajuda de atalhos pelo menu, e foco devolvido ao fechar.
  await page.goto("/");
  const help = page.getByRole("button", { name: t("nav.help") });
  await help.click();
  await expect(page.getByRole("dialog", { name: t("help.title") })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
});

test("menu com o armazenamento do navegador indisponível mostra o aviso (quickstart 1)", async ({
  page,
}) => {
  await skipTips(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException("bloqueado", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.locator("main").getByText(t("opening.storageUnavailable"))).toBeVisible();
});
