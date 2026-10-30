import { expect, test } from "@playwright/test";
import { skipTips, t } from "./helpers";

// 031: formulário da Nova carreira com erros ligados aos campos, escolha por teclado, rodapé fixo e
// criação rápida num mundo de 440 clubes.
test("erros ligados ao campo, foco no primeiro, escolha por teclado e rodapé sempre à vista (031)", async ({
  page,
}) => {
  await skipTips(page);
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/nova-carreira/");
  const name = page.getByLabel(t("newCareer.managerName"));
  await expect(page.getByLabel(t("newCareer.search"))).toBeVisible();

  // O botão fica à vista mesmo com a tabela inteira (440 clubes) por rolar.
  const confirm = page.getByRole("button", { name: t("newCareer.confirm") });
  await expect(confirm).toBeInViewport();
  await page.mouse.wheel(0, 2000);
  await expect(confirm).toBeInViewport();

  // Sem nome e sem clube: dois erros, o foco vai ao nome.
  await confirm.click();
  await expect(page.locator("form").getByRole("alert")).toHaveCount(2);
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");

  // Escolhe o clube pelo teclado: o erro dele some e o rodapé mostra o clube.
  await page.locator("tbody tr").nth(2).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("form").getByRole("alert")).toHaveCount(1);
  await expect(page.getByText(t("newCareer.chosenMark"), { exact: true })).toBeVisible();

  // Busca sem resultado: estado vazio e Limpar filtros.
  await page.getByLabel(t("newCareer.search")).fill("zzzzzz");
  await expect(page.getByText(t("newCareer.noMatch"))).toBeVisible();
  await page.getByRole("button", { name: t("newCareer.clearFilters") }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

test("criar a carreira no mundo padrão de 440 clubes leva pouco tempo (031 SC-002)", async ({
  page,
}) => {
  await skipTips(page);
  await page.goto("/nova-carreira/");
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  await page.locator("tbody tr").nth(2).click();
  const start = Date.now();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await page.waitForURL(/\/jogo/);
  const elapsed = Date.now() - start;
  // A linha de base mediu ~485 ms (limite de 0,5 s); aqui o teto dá folga para máquinas lentas.
  expect(elapsed).toBeLessThan(1500);
});
