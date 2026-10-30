import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

// 018 US1/US2/US6: copa nacional no banco padrão — o clube da Série A entra na "Fase de 32", o
// chaveamento aparece, o jogo da copa é jogado ao vivo e liga e copa avançam juntas. Os pênaltis
// ao vivo dependem de uma seed que decida assim: estão em live-round.spec.ts (seed "pen-4") e nos testes de componente.
const FIRST_CUP_PHASE = "Fase de 32";

test("copa: avançar até o jogo da copa, ver o chaveamento e jogá-lo ao vivo (018)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await createCareer(page, "Ana Souza", 1, "Série A", { noFiring: true });
  const card = page.getByRole("region", { name: t("home.nextMatch") });

  for (let step = 0; step < 8; step++) {
    if ((await card.textContent())?.includes(FIRST_CUP_PHASE)) break;
    await page.getByRole("button", { name: t("home.simulate") }).click();
    await expect(page.getByRole("button", { name: t("home.simulate") })).toBeEnabled();
  }
  await expect(card).toContainText(FIRST_CUP_PHASE);

  await page
    .getByRole("link", { name: t("nav.competition") })
    .first()
    .click();
  await expect(page.getByRole("link", { name: t("competition.tab.bracket") })).toBeVisible();
  const bracket = page.getByRole("region", { name: t("cup.bracket") });
  await expect(bracket).toBeVisible();
  await expect(bracket).toContainText(FIRST_CUP_PHASE);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);

  await page
    .getByRole("link", { name: t("nav.home") })
    .first()
    .click();
  await page.getByRole("button", { name: t("home.playLive") }).click();
  await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();
  await page.getByLabel(t("round.autoPause")).uncheck();
  await page.getByRole("button", { name: t("round.finishNow") }).click();
  await expect(page.getByRole("article", { name: /^Resumo:/ })).toBeVisible();
});
