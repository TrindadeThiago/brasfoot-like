import { expect, type Page, test } from "@playwright/test";
import {
  createCareer,
  expectNoClippedText,
  expectNoHorizontalScroll,
  setTheme,
  setViewport,
  t,
  zoomTo200,
} from "./helpers";
import { forEachScreen, type ScreenCase } from "./screens-list";

// 032 US1 (FR-001 a FR-003, SC-001): todas as telas, abas e diálogos da lista única em 1 440, 1 024,
// 768 e 600 px, com zoom de 200%, e em tablet nas duas orientações, nos dois temas: sem rolagem
// horizontal da página, sem texto cortado, controles dentro da janela e, abaixo de 768 px, a
// navegação empilhada acima do conteúdo com as dez telas.
interface Size {
  name: string;
  width: number;
  height: number;
  zoom?: boolean;
}

const SIZES: Size[] = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 1024 },
  { name: "600", width: 600, height: 900 },
  { name: "tablet paisagem 1024×600", width: 1024, height: 600 },
  { name: "zoom 200% (640 px úteis)", width: 1280, height: 800, zoom: true },
];

/** Controles visíveis cujo retângulo sai da janela pela esquerda ou pela direita. */
async function interactiveOutside(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return [...document.querySelectorAll<HTMLElement>("a[href], button, input, select, summary")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return false;
        // Dentro de um contêiner que rola na horizontal (tabela) o controle pode estar fora da vista.
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (/(auto|scroll)/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth) {
            return false;
          }
        }
        return box.right > width + 1 || box.left < -1;
      })
      .map((element) => `${element.tagName}:${(element.textContent ?? "").trim().slice(0, 30)}`)
      .slice(0, 5);
  });
}

async function check(page: Page, screen: ScreenCase, size: Size): Promise<void> {
  const label = `${screen.label} @${size.name}`;
  await expectNoHorizontalScroll(page, label);
  await expectNoClippedText(page, label);
  expect(await interactiveOutside(page), `${label}: controles fora da janela`).toEqual([]);
  const dialog = page.getByRole("dialog");
  if (await dialog.count()) {
    const box = await dialog.last().boundingBox();
    const view = page.viewportSize();
    expect(box?.x ?? 0, `${label}: diálogo à esquerda da janela`).toBeGreaterThanOrEqual(-1);
    expect(
      (box?.x ?? 0) + (box?.width ?? 0),
      `${label}: diálogo além da janela`,
    ).toBeLessThanOrEqual((view?.width ?? 0) + 1);
    expect(
      (box?.y ?? 0) + (box?.height ?? 0),
      `${label}: diálogo abaixo da janela`,
    ).toBeLessThanOrEqual((view?.height ?? 0) + 1);
  }
  if (screen.group === "club" && size.width < 768 && !size.zoom) {
    const nav = page.getByRole("navigation", { name: t("nav.menu") });
    await expect(nav.getByRole("link"), `${label}: dez telas na navegação`).toHaveCount(10);
  }
}

for (const theme of ["dark", "light"] as const) {
  test(`todas as telas em todas as larguras, tema ${theme} (032 US1)`, async ({ page }) => {
    test.setTimeout(1_500_000);
    await setTheme(page, theme);
    await createCareer(page, "Ana Souza", 1);
    const career = new URL(page.url()).searchParams.get("c") ?? "";
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    // As falhas se acumulam para a lista completa aparecer de uma vez (T006).
    const problems: string[] = [];
    await forEachScreen(page, career, async (screen) => {
      for (const size of SIZES) {
        if (size.zoom) await zoomTo200(page, size.width, size.height);
        else await setViewport(page, size.width, size.height);
        try {
          await check(page, screen, size);
        } catch (error) {
          problems.push(String((error as Error).message).split("\n")[0] ?? "erro");
        }
      }
      await setViewport(page, 1280, 800);
    });
    expect(problems).toEqual([]);
  });
}

// 032 US5 (FR-012): em tela estreita a dica de primeiro acesso fica dentro da janela e não cobre o
// elemento que ela explica.
test("dicas de primeiro acesso em 600 px: dentro da janela e sem cobrir o elemento apontado (032)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await setViewport(page, 600, 900);
  await page.goto("/");
  const tip = page.getByRole("complementary");
  await expect(tip).toBeVisible();
  const covers = async (anchorSelector: string, label: string) => {
    const [tipBox, anchorBox, view] = await Promise.all([
      tip.boundingBox(),
      page.locator(anchorSelector).first().boundingBox(),
      Promise.resolve(page.viewportSize()),
    ]);
    expect(tipBox, `${label}: dica visível`).not.toBeNull();
    expect(anchorBox, `${label}: elemento apontado visível`).not.toBeNull();
    expect(
      (tipBox?.x ?? 0) + (tipBox?.width ?? 0),
      `${label}: dica além da janela`,
    ).toBeLessThanOrEqual((view?.width ?? 0) + 1);
    const overlap =
      !!tipBox &&
      !!anchorBox &&
      tipBox.x < anchorBox.x + anchorBox.width &&
      tipBox.x + tipBox.width > anchorBox.x &&
      tipBox.y < anchorBox.y + anchorBox.height &&
      tipBox.y + tipBox.height > anchorBox.y;
    expect(overlap, `${label}: a dica cobre o elemento apontado`).toBe(false);
  };
  await covers('[data-tip-anchor="new-career"]', "menu");
  await tip.getByRole("button", { name: t("tips.start") }).click();
  // "Começar" leva o foco ao link Nova carreira; Enter abre a tela (como em first-run.spec).
  await page.keyboard.press("Enter");
  await page.getByLabel(t("newCareer.managerName")).fill("Ana Souza");
  await page.locator("tbody tr").nth(3).click();
  await page.getByRole("button", { name: t("newCareer.confirm") }).click();
  await expect(page.getByRole("complementary")).toBeVisible();
  await covers('[data-tip-anchor="play"]', "início");
});
