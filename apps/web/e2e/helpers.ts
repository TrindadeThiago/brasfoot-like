import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/** Cria uma carreira pela interface e devolve o nome do clube escolhido (linha `row` da tabela). */
export async function createCareer(page: Page, manager: string, row: number): Promise<string> {
  await page.goto("/");
  await page.getByRole("link", { name: t("opening.newCareer") }).click();
  await page.getByLabel(t("newCareer.managerName")).fill(manager);
  const table = page.getByRole("table", { name: t("newCareer.clubsCaption") });
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
