import { expect, type Page } from "@playwright/test";
import { classicZip, simulateSeason, t } from "./helpers";

/**
 * Lista única das telas, abas e diálogos do jogo (032 T003). A varredura de acessibilidade
 * (`a11y.spec.ts`) e a matriz responsiva (`responsive.spec.ts`) percorrem a mesma lista, para as duas
 * verificações não divergirem. Cada item vive num grupo de estado: `outside` (sem carreira aberta),
 * `club` (telas do clube), `live` (rodada ao vivo pausada) e `season-end` (fim de temporada).
 */
export type ScreenGroup = "outside" | "club" | "live" | "season-end";

export interface ScreenCase {
  /** Nome para mensagens de erro. */
  label: string;
  group: ScreenGroup;
  /** Caminho (sem `?c=`); as telas do clube e de foco recebem a carreira. */
  path?: string;
  /** Leva a tela ao estado que o item descreve (abre a aba ou o diálogo). */
  open?: (page: Page) => Promise<void>;
  /** Volta ao estado anterior (fecha o diálogo). */
  close?: (page: Page) => Promise<void>;
}

const pressEscape = async (page: Page) => {
  await page.keyboard.press("Escape");
};

const details = (page: Page) =>
  page
    .getByRole("button", { name: /^Detalhes de / })
    .first()
    .click();

/** Caminhos das telas de fora da carreira. */
export const OUTSIDE_PATHS = [
  "/",
  "/carreiras/",
  "/nova-carreira/",
  "/mods/",
  "/configuracoes/",
  "/sobre/",
  "/notas-de-versao/",
];

/** Caminhos das dez telas do clube. */
export const CLUB_PATHS = [
  "/jogo/",
  "/jogo/elenco/",
  "/jogo/escalacao/",
  "/jogo/competicao/",
  "/jogo/competicao/resultados/",
  "/jogo/competicao/artilharia/",
  "/jogo/calendario/",
  "/jogo/financas/",
  "/jogo/historico/",
  "/jogo/mercado/",
  "/jogo/carreira/",
  "/jogo/noticias/",
];

const FINANCE_TABS = ["overview", "flow", "gate", "stadium", "credit", "history"];
const CAREER_TABS = ["board", "fans", "offers", "history", "coaches"];

export const SCREENS: ScreenCase[] = [
  ...OUTSIDE_PATHS.map((path): ScreenCase => ({ label: path, group: "outside", path })),
  {
    label: "/carreiras/ (apagar)",
    group: "outside",
    path: "/carreiras/",
    open: async (page) => {
      await page
        .getByRole("button", { name: t("saves.delete") })
        .first()
        .click();
      await expect(page.getByRole("dialog", { name: t("saves.confirmDeleteTitle") })).toBeVisible();
    },
    close: pressEscape,
  },
  {
    label: "/nova-carreira/ (erros)",
    group: "outside",
    path: "/nova-carreira/",
    open: async (page) => {
      await page.getByRole("button", { name: t("newCareer.confirm") }).click();
      await expect(page.locator("form").getByRole("alert").first()).toBeVisible();
    },
  },
  {
    label: "/mods/ (remover)",
    group: "outside",
    path: "/mods/",
    open: async (page) => {
      await page
        .getByRole("region", { name: t("mods.list") })
        .getByRole("button", { name: t("mods.remove") })
        .first()
        .click();
      await expect(page.getByRole("dialog", { name: t("mods.removeConfirmTitle") })).toBeVisible();
    },
    close: pressEscape,
  },
  {
    label: "/mods/ (substituir)",
    group: "outside",
    path: "/mods/",
    open: async (page) => {
      await page.getByLabel(t("mods.load")).setInputFiles({
        name: "classico.zip",
        mimeType: "application/zip",
        buffer: classicZip(),
      });
      await expect(page.getByRole("dialog", { name: t("mods.replaceTitle") })).toBeVisible();
    },
    close: pressEscape,
  },
  {
    label: "/ (ajuda de atalhos)",
    group: "outside",
    path: "/",
    open: async (page) => {
      await page.getByRole("button", { name: t("nav.help") }).click();
      await expect(page.getByRole("dialog", { name: t("help.title") })).toBeVisible();
    },
    close: pressEscape,
  },

  ...CLUB_PATHS.map((path): ScreenCase => ({ label: path, group: "club", path })),
  {
    label: "/jogo/elenco/ (modal)",
    group: "club",
    path: "/jogo/elenco/",
    open: async (page) => {
      await details(page);
      await expect(page.getByRole("dialog")).toBeVisible();
    },
    close: pressEscape,
  },
  {
    label: "/jogo/mercado/ (modal)",
    group: "club",
    path: "/jogo/mercado/",
    open: async (page) => {
      await details(page);
      await expect(page.getByRole("dialog")).toBeVisible();
    },
    close: pressEscape,
  },
  {
    label: "/jogo/mercado/ (bandeja de comparação)",
    group: "club",
    path: "/jogo/mercado/",
    open: async (page) => {
      await details(page);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: t("market.modal.addCompare") })
        .click();
      await page.keyboard.press("Escape");
    },
  },
  {
    label: "/jogo/mercado/ (oferta)",
    group: "club",
    path: "/jogo/mercado/",
    open: async (page) => {
      await details(page);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: t("market.action.offer") })
        .click();
    },
    close: async (page) => {
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
    },
  },
  ...FINANCE_TABS.map(
    (key): ScreenCase => ({
      label: `/jogo/financas/ (${key})`,
      group: "club",
      path: "/jogo/financas/",
      open: async (page) => {
        await page.getByRole("tab", { name: t(`finance.tab.${key}`) }).click();
      },
    }),
  ),
  ...CAREER_TABS.map(
    (key): ScreenCase => ({
      label: `/jogo/carreira/ (${key})`,
      group: "club",
      path: "/jogo/carreira/",
      open: async (page) => {
        await page.getByRole("tab", { name: new RegExp(`^${t(`career.tab.${key}`)}`) }).click();
      },
    }),
  ),
  {
    label: "/jogo/noticias/ (do meu clube)",
    group: "club",
    path: "/jogo/noticias/",
    open: async (page) => {
      const mine = page.getByRole("button", { name: t("news.filter.mine") });
      if (await mine.count()) await mine.click();
    },
  },
  {
    label: "/jogo/ (ajuda de atalhos)",
    group: "club",
    path: "/jogo/",
    open: async (page) => {
      await page.keyboard.press("?");
      await expect(page.getByRole("dialog", { name: t("help.title") })).toBeVisible();
    },
    close: pressEscape,
  },

  { label: "/jogo/rodada/", group: "live" },
  {
    label: "/jogo/rodada/ (Meu time)",
    group: "live",
    open: async (page) => {
      await expect(page.getByRole("region", { name: t("round.panel") })).toBeVisible();
    },
  },
  {
    label: "/jogo/rodada/ (sair)",
    group: "live",
    open: async (page) => {
      await page.getByRole("button", { name: t("round.leave") }).click();
      await expect(page.getByRole("dialog", { name: t("round.leaveTitle") })).toBeVisible();
    },
    close: pressEscape,
  },

  { label: "/jogo/fim-de-temporada/", group: "season-end" },
];

/** Leva a página ao estado inicial de um grupo (uma vez por grupo). */
async function enterGroup(page: Page, career: string, group: ScreenGroup): Promise<void> {
  if (group === "live") {
    await page.goto(`/jogo/?c=${career}`);
    await page.getByRole("button", { name: t("home.playLive") }).click();
    await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();
    await page.getByRole("button", { name: t("round.pause") }).click();
  } else if (group === "season-end") {
    await page.goto(`/jogo/?c=${career}`);
    await simulateSeason(page);
    await expect(page).toHaveURL(/fim-de-temporada/);
  }
}

/**
 * Percorre a lista: para cada item, vai à tela, leva-a ao estado do item, chama `visit` (que
 * verifica o que precisar) e volta ao estado anterior. `career` é o id da carreira aberta.
 */
export async function forEachScreen(
  page: Page,
  career: string,
  visit: (screen: ScreenCase) => Promise<void>,
  only?: (screen: ScreenCase) => boolean,
): Promise<void> {
  let current: ScreenGroup | undefined;
  for (const screen of SCREENS) {
    if (only && !only(screen)) continue;
    if (screen.group !== current) {
      await enterGroup(page, career, screen.group);
      current = screen.group;
    }
    if (screen.group === "outside" && screen.path) await page.goto(screen.path);
    if (screen.group === "club" && screen.path) {
      await page.goto(`${screen.path}?c=${career}`);
      await expect(page.getByRole("navigation", { name: t("nav.menu") })).toBeVisible();
    }
    await screen.open?.(page);
    await visit(screen);
    await screen.close?.(page);
  }
}
