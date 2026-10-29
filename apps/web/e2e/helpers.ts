import { readFileSync } from "node:fs";
import { join } from "node:path";
import { joinBankFiles, type ModPackage } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { expect, type Page } from "@playwright/test";

const UI: Record<string, string> = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../packages/i18n/locales/pt-BR/ui.json"), "utf8"),
);

/** Texto da interface (só substituições simples, suficiente para localizar elementos). */
export function t(key: string, values: Record<string, string | number> = {}): string {
  const template = UI[key];
  if (template === undefined) throw new Error(`chave inexistente: ${key}`);
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}

/**
 * Desliga as dicas do primeiro acesso (016) nos testes que não são sobre elas: só define `tips`
 * se o teste ainda não definiu, preservando as outras preferências.
 */
export async function skipTips(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const key = "brasfoot-like:preferences";
    const prefs = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (prefs.tips === undefined) {
      localStorage.setItem(
        key,
        JSON.stringify({ ...prefs, tips: { dismissed: [], skipAll: true } }),
      );
    }
  });
}

/**
 * Seed fixa das carreiras do e2e: com seed aleatória, eventos de partida (expulsão, lesão,
 * demissão) mudavam de uma execução para outra e os testes falhavam ao acaso no CI.
 */
export const E2E_SEED = "e2e";

const CLASSIC_NAME = "Mundo clássico (e2e)";

/**
 * O mundo clássico (um país, Série A e B de 20 clubes) era o padrão do jogo até a 1.10. Os testes que
 * dependem de uma liga de 20 clubes o instalam como mod (como um jogador faria) e o escolhem na nova
 * carreira; o mundo padrão atual tem os seus próprios testes.
 */
function classicZip(): Buffer {
  const dir = join(import.meta.dirname, "../../../mods/default");
  const file = (name: string) => JSON.parse(readFileSync(join(dir, name), "utf8"));
  const bank = joinBankFiles({
    "mod.json": { ...file("mod.json"), id: "classico", name: CLASSIC_NAME },
    "countries.json": file("countries.json"),
    "competitions.json": file("competitions.json"),
    "clubs.json": file("clubs.json"),
    "players.json": file("players.json"),
    "rivalries.json": file("rivalries.json"),
  }) as ModPackage;
  return Buffer.from(writeModPackage(bank));
}

/** Instala o mundo clássico na página de mods e volta à abertura. */
export async function installClassicWorld(page: Page): Promise<void> {
  await page.goto("/mods/");
  const list = page.getByRole("region", { name: t("mods.list") });
  if ((await list.getByText(CLASSIC_NAME).count()) > 0) return;
  await page
    .getByLabel(t("mods.load"))
    .setInputFiles({ name: "classico.zip", mimeType: "application/zip", buffer: classicZip() });
  await expect(list.getByText(CLASSIC_NAME)).toBeVisible();
}

/** Escolhe o mundo clássico no seletor de mundo da nova carreira. */
export async function selectClassicWorld(page: Page): Promise<void> {
  await page.getByLabel(t("newCareer.bank")).selectOption({ label: CLASSIC_NAME });
}

/**
 * Cria uma carreira pela interface e devolve o nome do clube escolhido (linha `row` da tabela da
 * divisão `division`). A seed é fixa (`E2E_SEED`) para o teste jogar sempre a mesma carreira.
 */
export async function createCareer(
  page: Page,
  manager: string,
  row: number,
  division = "Série A",
  options: { noFiring?: boolean; seed?: string } = {},
): Promise<string> {
  await skipTips(page);
  await installClassicWorld(page);
  await page.goto("/");
  await page.getByRole("link", { name: t("opening.newCareer") }).click();
  await selectClassicWorld(page);
  await page.getByLabel(t("newCareer.managerName")).fill(manager);
  await page.getByText(t("newCareer.advanced")).click();
  await page.getByLabel(t("newCareer.seed")).fill(options.seed ?? E2E_SEED);
  if (options.noFiring) {
    await page.getByRole("checkbox", { name: t("newCareer.noFiring") }).check();
  }
  if (division !== "Série A") {
    await page.getByLabel(t("newCareer.division.filter")).selectOption({ label: division });
  }
  const table = page.getByRole("table", { name: t("newCareer.clubsCaption", { division }) });
  const clubRow = table.locator("tbody tr").nth(row);
  const club = (await clubRow.getByRole("img").getAttribute("aria-label")) ?? "";
  await clubRow.click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();
  return club;
}

export async function simulate(page: Page, times: number): Promise<void> {
  for (let index = 0; index < times; index++) {
    const before = await page.getByText(/rodada \d+ de 38/).textContent();
    await page.getByRole("button", { name: t("home.simulate") }).click();
    await expect(page.getByText(/rodada \d+ de 38/)).not.toHaveText(before ?? "");
  }
}

/**
 * Simula a temporada inteira (liga e copa) com o atalho "d", até a tela de fim de temporada. Os
 * dias de copa não mudam a rodada da liga no cabeçalho, então espera o botão voltar a ficar livre.
 */
export async function simulateSeason(page: Page): Promise<void> {
  for (let day = 0; day < 140; day++) {
    if (/fim-de-temporada/.test(page.url())) return;
    await page.keyboard.press("d");
    await page.waitForTimeout(100);
    if (/fim-de-temporada/.test(page.url())) return;
    const button = page.getByRole("button", { name: t("home.simulate") });
    // Fora da Início não há botão: um respiro basta para a simulação do dia terminar.
    // O botão some se a simulação do dia leva ao fim da temporada: isso também encerra a espera.
    if ((await button.count()) > 0) {
      await expect
        .poll(
          async () =>
            /fim-de-temporada/.test(page.url()) ||
            (await button.isEnabled({ timeout: 500 }).catch(() => false)),
          { timeout: 30_000 },
        )
        .toBe(true);
    } else await page.waitForTimeout(250);
  }
}
