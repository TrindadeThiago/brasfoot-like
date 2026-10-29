import { expect, test } from "@playwright/test";
import { createCareer, simulate, t } from "./helpers";

test("depois da primeira visita o jogo abre e continua sem rede (SC-007)", async ({
  page,
  context,
}) => {
  const club = await createCareer(page, "Ana Souza", 1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Garante que a página já é controlada pelo service worker antes de cortar a rede.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(t("opening.continue")) }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();
  await simulate(page, 1);
  await expect(
    page.getByText(t("header.progress", { year: 2027, round: 2, total: 38, division: "Série A" })),
  ).toBeVisible();
  for (const screen of ["nav.squad", "nav.competition", "nav.calendar"]) {
    await page.getByRole("link", { name: t(screen) }).click();
    await expect(page.getByRole("heading", { name: club })).toBeVisible();
  }

  // Páginas novas da 016 também abrem sem rede (vêm do precache).
  for (const [path, title] of [
    ["/sobre/", "app.name"],
    ["/configuracoes/", "settings.title"],
    ["/notas-de-versao/", "notes.title"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: t(title) })).toBeVisible();
  }

  // 025: as fontes do jogo (woff2 do próprio site) abrem do cache, sem rede.
  const families = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.status === "loaded")
      .map((face) => face.family);
  });
  expect(families.join(",")).toMatch(/Inter/);
  expect(families.join(",")).toMatch(/Space Grotesk/);
});
