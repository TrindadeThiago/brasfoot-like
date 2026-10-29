// 029 US5: Notícias com cartões por manchete, seções por clube e competição, painel de filtros e setas.
import type { Headline, RoundFeed } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/noticias?c=tela");
});

/** Variáveis completas de cada tipo usado (o template exige todas). */
function varsOf(save: SaveFile, type: Headline["type"]): Headline["vars"] {
  const other = save.bank.clubs.find((club) => club.id !== save.clubId)?.id ?? save.clubId;
  if (type === "rout") {
    return { winner: save.clubId, loser: other, margin: 3, goalsHome: 4, goalsAway: 1 };
  }
  if (type === "coachHired") return { club: save.clubId, coach: "Fulano" };
  return {
    club: save.clubId,
    opponent: other,
    outcome: "win",
    goalsFor: 2,
    goalsAgainst: 1,
    streak: 0,
    streakKind: "win",
  };
}

function headline(save: SaveFile, overrides: Partial<Headline>): Headline {
  return {
    id: `h-${Math.random().toString(36).slice(2)}`,
    type: "result",
    relevance: 50,
    variant: 0,
    clubIds: [save.clubId],
    vars: varsOf(save, overrides.type ?? "result"),
    mine: false,
    ...overrides,
  };
}

/** Troca o feed por rodadas conhecidas: manchetes do clube, da liga e uma geral. */
function withFeed(build: (save: SaveFile) => Headline[][]) {
  return (save: SaveFile): SaveFile => {
    const feed: RoundFeed[] = build(save).map((headlines, index) => ({
      season: save.league.number,
      year: save.league.year,
      round: index + 1,
      headlines,
    }));
    return { ...save, news: { ...save.news, feed } };
  };
}

const standard = withFeed((save) => [
  [headline(save, { id: "a", mine: true }), headline(save, { id: "b", type: "rout" })],
  [
    headline(save, { id: "c", mine: true }),
    headline(save, { id: "d", type: "rout" }),
    headline(save, { id: "e", type: "coachHired" }),
  ],
]);

async function open(edit = standard) {
  const career = await storedCareer(3, edit);
  renderApp("/jogo/noticias?c=tela", career.store);
  const user = userEvent.setup({ delay: null });
  await screen.findByRole("combobox", { name: t("news.select") });
  return { ...career, user };
}

const articles = () => screen.queryAllByRole("article");

describe("Notícias (029)", () => {
  it("as setas de rodada navegam e ficam desativadas nas pontas", async () => {
    const { user } = await open();
    const previous = screen.getByRole("button", { name: t("news.prev") }) as HTMLButtonElement;
    const next = screen.getByRole("button", { name: t("news.next") }) as HTMLButtonElement;
    const select = screen.getByRole("combobox", { name: t("news.select") }) as HTMLSelectElement;
    const last = select.value;
    expect(next.disabled).toBe(true);
    expect(previous.disabled).toBe(false);
    await user.click(previous);
    expect(select.value).not.toBe(last);
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    await user.click(next);
    expect(select.value).toBe(last);
  });

  it("cada manchete é um cartão com competição, rodada e título", async () => {
    await open();
    const cards = articles();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      // O título é o nome acessível do cartão.
      const titleId = card.getAttribute("aria-labelledby") ?? "";
      expect(document.getElementById(titleId)?.textContent).not.toBe("");
      expect(card.textContent).toMatch(/Rodada 2/);
    }
  });

  it("agrupa em 'Do seu clube' e por competição, cada seção com a contagem", async () => {
    const { save } = await open();
    const mine = screen.getByRole("region", { name: new RegExp(t("news.group.mine")) });
    expect(within(mine).getAllByRole("article")).toHaveLength(1);
    expect(mine.textContent).toContain(t("news.group.count", { count: 1 }));
    const league = save.bank.competitions.find((entry) => entry.id === save.league.competitionId);
    const section = screen.getByRole("region", { name: new RegExp(league?.name ?? "") });
    expect(section.textContent).toContain(t("news.group.count", { count: 2 }));
    const general = screen.getByRole("region", { name: new RegExp(t("news.group.general")) });
    expect(within(general).getAllByRole("article")).toHaveLength(1);
    // Não há seção por tipo de manchete.
    const titles = screen.getAllByRole("heading", { level: 2 }).map((entry) => entry.textContent);
    expect(titles.some((title) => /Goleada|Resultado|Zebra/.test(title ?? ""))).toBe(false);
  });

  it("a manchete do clube é marcada em texto", async () => {
    await open();
    const mine = screen.getByRole("region", { name: new RegExp(t("news.group.mine")) });
    expect(within(mine).getAllByText(t("news.card.mine")).length).toBeGreaterThan(0);
    // A marca está no cartão, e não só no título da seção.
    expect(within(within(mine).getByRole("article")).getByText(t("news.card.mine"))).toBeDefined();
  });

  it("o painel traz o resumo, Todas, Do meu clube e as competições com contagem", async () => {
    const { save } = await open();
    expect(screen.getByRole("status").textContent).toBe(
      t("news.panel.summary", { count: 3, mine: 1 }),
    );
    const league = save.bank.competitions.find((entry) => entry.id === save.league.competitionId);
    expect(
      screen.getByRole("button", { name: t("news.filter.all") }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", {
        name: t("news.filter.competition", { name: league?.name ?? "", count: 2 }),
      }),
    ).toBeDefined();
  });

  it("Do meu clube filtra num clique e Todas volta", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: t("news.filter.mine") }));
    expect(articles()).toHaveLength(1);
    expect(screen.queryByRole("region", { name: new RegExp(t("news.group.general")) })).toBeNull();
    await user.click(screen.getByRole("button", { name: t("news.filter.all") }));
    expect(articles().length).toBeGreaterThan(1);
  });

  it("clicar numa competição mostra só as dela e clicar de novo tira o filtro", async () => {
    const { user, save } = await open();
    const league = save.bank.competitions.find((entry) => entry.id === save.league.competitionId);
    const button = screen.getByRole("button", {
      name: t("news.filter.competition", { name: league?.name ?? "", count: 2 }),
    });
    await user.click(button);
    expect(articles()).toHaveLength(2);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await user.click(button);
    expect(articles().length).toBeGreaterThan(2);
  });

  it("um filtro sem resultado mostra o estado vazio com o caminho de volta", async () => {
    const { user } = await open(withFeed((save) => [[headline(save, { id: "x", type: "rout" })]]));
    await user.click(screen.getByRole("button", { name: t("news.filter.mine") }));
    expect(screen.getByText(t("news.filter.noMatch"))).toBeDefined();
    await user.click(screen.getByRole("button", { name: t("news.filter.clear") }));
    expect(articles()).toHaveLength(1);
  });

  it("uma rodada sem manchetes e um jogo sem rodada guardada mostram o estado vazio", async () => {
    await open(withFeed(() => [[]]));
    expect(screen.getByText(t("news.empty"))).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("sem nenhuma rodada guardada, o estado vazio diz isso", async () => {
    const career = await storedCareer(1, (save) => ({ ...save, news: { ...save.news, feed: [] } }));
    renderApp("/jogo/noticias?c=tela", career.store);
    expect(await screen.findByText(t("news.empty"))).toBeDefined();
  });

  it("o fato complementar continua no cartão", async () => {
    await open(
      withFeed((save) => [
        [
          headline(save, {
            id: "x",
            mine: true,
            extras: [{ type: "hatTrick", vars: { player: "Zé", goals: 3, club: save.clubId } }],
          }),
        ],
      ]),
    );
    const card = articles()[0] as HTMLElement;
    expect(card.querySelectorAll("p").length).toBeGreaterThanOrEqual(2);
  });
});
