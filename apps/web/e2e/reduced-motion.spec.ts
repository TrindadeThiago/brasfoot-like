import { expect, test } from "@playwright/test";
import { createCareer, skipTips, t } from "./helpers";

// 032 US2 (FR-007): com a preferência do sistema por movimento reduzido, nenhuma animação ou
// transição passa de ~0 ms nas telas que animam, e a mudança vale na hora, sem recarregar.
test.use({ reducedMotion: "reduce" });

/** Elementos cuja duração de transição ou animação passa do mínimo (0,01 ms) ou que rolam suavemente. */
async function animated(page: import("@playwright/test").Page): Promise<string[]> {
  return page.evaluate(() => {
    const seconds = (value: string) =>
      value.split(",").map((part) => Number.parseFloat(part) * (part.includes("ms") ? 0.001 : 1));
    return [...document.querySelectorAll<HTMLElement>("*")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const long = [...seconds(style.transitionDuration), ...seconds(style.animationDuration)];
        return long.some((value) => value > 0.0001) || style.scrollBehavior === "smooth";
      })
      .map((element) => `${element.tagName}.${element.className}`)
      .slice(0, 5);
  });
}

test("movimento reduzido: nada anima nas telas com barra de andamento, diálogos, abas e medidores (032)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await createCareer(page, "Ana Souza", 1);
  const career = new URL(page.url()).searchParams.get("c") ?? "";
  const problems: string[] = [];
  const check = async (label: string) => {
    for (const item of await animated(page)) problems.push(`${label}: ${item}`);
  };

  for (const path of [
    "/",
    "/jogo/",
    "/jogo/elenco/",
    "/jogo/financas/",
    "/jogo/carreira/",
    "/jogo/mercado/",
  ]) {
    await page.goto(path === "/" ? path : `${path}?c=${career}`);
    await page.waitForLoadState("networkidle");
    await check(path);
  }
  // Diálogo aberto.
  await page.goto(`/jogo/elenco/?c=${career}`);
  await page
    .getByRole("button", { name: /^Detalhes de / })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await check("modal do jogador");
  await page.keyboard.press("Escape");
  // Rodada ao vivo (barra de andamento e medidores).
  await page.goto(`/jogo/?c=${career}`);
  await page.getByRole("button", { name: t("home.playLive") }).click();
  await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();
  await check("rodada ao vivo");
  await page.getByRole("button", { name: t("round.pause") }).click();
  await check("rodada pausada");
  expect(problems).toEqual([]);
});

test("a preferência de movimento reduzido ligada durante o jogo vale na hora, sem recarregar (032)", async ({
  page,
}) => {
  await skipTips(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/jogo/");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await animated(page)).toEqual([]);
});
