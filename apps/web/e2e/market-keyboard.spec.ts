import { expect, type Locator, type Page, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

// 028 SC-002: contratar um livre, fazer uma oferta recusada, ajustar a contraproposta e renovar um
// contrato, só com o teclado: o foco vai ao controle (Tab) e a ação é Enter, Espaço ou digitação.

/** Foca o controle e o aciona com Enter. */
async function press(page: Page, control: Locator): Promise<void> {
  await control.focus();
  await expect(control).toBeFocused();
  await page.keyboard.press("Enter");
}

/** Digita num campo já focado (sem clicar). */
async function typeInto(page: Page, field: Locator, text: string): Promise<void> {
  await field.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(text);
}

test("mercado só com o teclado: livre, oferta recusada, contraproposta e renovação (028)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await createCareer(page, "Ana Souza", 1);

  // Um jogador do elenco fica livre (rescisão pelo modal do Elenco), para haver um livre a contratar.
  await page.keyboard.press("2");
  const squadName = page.getByRole("button", { name: /^Detalhes de / }).nth(20);
  const freeName = ((await squadName.getAttribute("aria-label")) ?? "").replace(
    /^Detalhes de /,
    "",
  );
  await press(page, squadName);
  const player = page.getByRole("dialog", { name: freeName });
  await press(page, player.getByRole("button", { name: /^Rescindir/ }));
  const terminate = page.getByRole("dialog", {
    name: t("disposal.terminate.title", { name: freeName }),
  });
  await press(page, terminate.getByRole("button", { name: t("disposal.terminate.confirm") }));

  // Mercado: filtrar por livres e contratar pelo teclado.
  await page.keyboard.press("m");
  await expect(page).toHaveURL(/mercado/);
  await page.getByLabel(t("market.filter.scope")).selectOption("free");
  const freeButton = page.getByRole("button", { name: t("lineup.detailsOf", { name: freeName }) });
  await press(page, freeButton);
  const modal = page.getByRole("dialog", { name: freeName });
  await press(page, modal.getByRole("button", { name: t("market.action.sign") }));
  const sign = page.getByRole("dialog", { name: t("market.dialog.free", { name: freeName }) });
  await press(page, sign.getByRole("button", { name: t("market.action.start") }));
  await typeInto(page, sign.getByLabel(t("market.form.wage")), "900000");
  await press(page, sign.getByRole("button", { name: t("market.action.propose") }));
  await expect(sign.getByText(t("market.feedback.signed"))).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sign).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);

  // Oferta recusada, com o motivo em texto, e ajuste da proposta.
  await page.getByLabel(t("market.filter.scope")).selectOption("clubs");
  await page.getByLabel(t("market.filter.position")).selectOption("MF");
  await page.getByLabel(t("market.filter.strengthMax")).fill("48");
  const target = page.getByRole("button", { name: /^Detalhes de / }).first();
  const targetName = ((await target.getAttribute("aria-label")) ?? "").replace(/^Detalhes de /, "");
  await press(page, target);
  const targetModal = page.getByRole("dialog", { name: targetName });
  await press(page, targetModal.getByRole("button", { name: t("market.action.offer") }));
  const offer = page.getByRole("dialog", { name: t("market.dialog.buy", { name: targetName }) });
  const fee = offer.getByLabel(t("market.form.fee"));
  await typeInto(page, fee, "1");
  await press(page, offer.getByRole("button", { name: t("market.action.offer") }));
  await expect(offer.getByText(new RegExp(t("market.feedback.clubRefused")))).toBeVisible();
  // Fecha com Esc (o foco volta ao modal), ajusta o valor e tenta de novo; se o clube fizer
  // contraproposta, aceita pelo teclado.
  await page.keyboard.press("Escape");
  await expect(offer).toHaveCount(0);
  await press(page, targetModal.getByRole("button", { name: t("market.action.offer") }));
  await typeInto(page, fee, "3000000");
  await press(page, offer.getByRole("button", { name: t("market.action.offer") }));
  const counter = offer.getByRole("button", { name: t("market.action.accept") });
  if (await counter.isVisible()) await press(page, counter);
  await expect(offer.getByLabel(t("market.form.wage"))).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(offer).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Renovação pelo modal do Elenco.
  await page.keyboard.press("2");
  const own = page.getByRole("button", { name: /^Detalhes de / }).first();
  await press(page, own);
  // O nome vem do modal aberto: a ordem do Elenco pode mudar entre ler o botão e acioná-lo.
  const ownModal = page.getByRole("dialog");
  const ownName = (await ownModal.getByRole("heading", { level: 2 }).textContent()) ?? "";
  await press(page, ownModal.getByRole("button", { name: /^Renovar/ }));
  const renew = page.getByRole("dialog", { name: t("market.dialog.renew", { name: ownName }) });
  await press(page, renew.getByRole("button", { name: t("market.action.start") }));
  await typeInto(page, renew.getByLabel(t("market.form.wage")), "9000000");
  await press(page, renew.getByRole("button", { name: t("market.action.propose") }));
  await expect(
    renew.getByText(t("market.feedback.signed")).or(renew.getByRole("alert")),
  ).toBeVisible();
});
