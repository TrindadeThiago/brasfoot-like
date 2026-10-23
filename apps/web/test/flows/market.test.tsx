import { ageOn, searchPlayers } from "@brasfoot-like/engine";
import { currentDate, marketContextOf } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { formatMoney, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";

// A tela do mercado lista ~1.000 jogadores; sob carga os fluxos passam de 5 s.
vi.setConfig({ testTimeout: 30000 });

/** Jogadores de outros clubes, do mais fraco ao mais forte (as ofertas por eles são baratas). */
function cheapRows(save: Awaited<ReturnType<typeof storedCareer>>["save"], position = "MF") {
  return searchPlayers(
    marketContextOf(save),
    { scope: "clubs", excludeClubId: save.clubId, positions: [position as "MF"] },
    { key: "strength", dir: "asc" },
  );
}

describe("mercado — busca e comparação (US1)", () => {
  it("abre pelo cabeçalho com a janela aberta e lista jogadores", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("heading", { name: t("market.title") });
    expect(screen.getAllByText(/Janela aberta/)[0]).toBeDefined();
    const table = await screen.findByRole("table", { name: t("market.resultsCaption") });
    const count = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    const total = searchPlayers(marketContextOf(save), { excludeClubId: save.clubId }).length;
    expect(count.length).toBe(Math.min(100, total));
    expect(screen.getByText(t("market.results", { count: total }))).toBeDefined();
    expect(screen.getByRole("button", { name: t("market.showMore") })).toBeDefined();
  });

  it("filtra por posição e por livres", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    await user.selectOptions(screen.getByLabelText(t("market.filter.position")), "GK");
    const expected = searchPlayers(marketContextOf(save), {
      excludeClubId: save.clubId,
      positions: ["GK"],
    }).length;
    expect(await screen.findByText(t("market.results", { count: expected }))).toBeDefined();
    await user.selectOptions(screen.getByLabelText(t("market.filter.scope")), "free");
    expect(await screen.findByText(t("market.results", { count: 0 }))).toBeDefined();
  });

  it("compara de dois a quatro jogadores lado a lado", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    const picks = cheapRows(save).slice(0, 3);
    await user.selectOptions(screen.getByLabelText(t("market.filter.position")), "MF");
    await user.type(
      screen.getByLabelText(t("market.filter.strengthMax")),
      String(picks[2]?.strength ?? 0),
    );
    const open = screen.getByRole("button", { name: /Comparar selecionados/ });
    expect((open as HTMLButtonElement).disabled).toBe(true);
    for (const pick of picks) {
      await user.click(
        screen.getByRole("checkbox", {
          name: t("market.compare.select", { name: pick.displayName }),
        }),
      );
    }
    await user.click(screen.getByRole("button", { name: /Comparar selecionados/ }));
    const panel = await screen.findByRole("region", { name: t("market.compare.title") });
    for (const pick of picks) {
      expect(within(panel).getByRole("columnheader", { name: pick.displayName })).toBeDefined();
    }
    const normalize = (text: string) => text.replace(/\s/g, " ");
    expect(normalize(panel.textContent ?? "")).toContain(
      normalize(formatMoney(picks[0]?.wage ?? 0)),
    );
  });
});

describe("mercado — compra completa (US2, US3)", () => {
  it("oferta aceita, contrato assinado: elenco e caixa mudam", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    const target = cheapRows(save)[0];
    if (!target) throw new Error("sem alvo");
    await user.type(screen.getByLabelText(t("market.filter.text")), target.displayName);
    const row = (await screen.findByRole("cell", { name: target.displayName })).closest(
      "tr",
    ) as HTMLElement;
    await user.click(within(row).getByRole("button", { name: t("market.action.offer") }));
    const dialog = await screen.findByRole("dialog");
    const fee = within(dialog).getByLabelText(t("market.form.fee"));
    await user.clear(fee);
    await user.type(
      fee,
      String(Math.min(target.value * 3, save.finances.clubs[save.clubId]?.cash ?? 0)),
    );
    await user.click(within(dialog).getByRole("button", { name: t("market.action.offer") }));
    const wage = await within(dialog).findByLabelText(t("market.form.wage"));
    await user.clear(wage);
    await user.type(wage, String(Math.max(target.wage * 5, 50000)));
    await user.click(within(dialog).getByRole("button", { name: t("market.action.propose") }));
    expect(await within(dialog).findByText(t("market.feedback.signed"))).toBeDefined();
    await waitFor(async () => {
      const saved = await loadSaved(store);
      expect(saved.bank.players.find((player) => player.id === target.playerId)?.clubId).toBe(
        save.clubId,
      );
      expect(saved.market.negotiations).toEqual([]);
      expect(saved.finances.clubs[save.clubId]?.cash).toBeLessThan(
        save.finances.clubs[save.clubId]?.cash ?? 0,
      );
    });
  });

  it("fora da janela a oferta é bloqueada com a próxima abertura", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(6);
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    expect(screen.getAllByText(/Janela fechada/)[0]).toBeDefined();
    const target = cheapRows(save)[0];
    if (!target) throw new Error("sem alvo");
    await user.type(screen.getByLabelText(t("market.filter.text")), target.displayName);
    const row = (await screen.findByRole("cell", { name: target.displayName })).closest(
      "tr",
    ) as HTMLElement;
    await user.click(within(row).getByRole("button", { name: t("market.action.offer") }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: t("market.action.offer") }));
    expect(await within(dialog).findByRole("alert")).toBeDefined();
    expect(within(dialog).getByRole("alert").textContent).toMatch(/janela/i);
  });
});

describe("mercado — contratos e renovação (US6)", () => {
  it("a Início avisa dos contratos que terminam e o Elenco marca o último ano", async () => {
    const { store, save } = await storedCareer(1, (career) => ({
      ...career,
      bank: {
        ...career.bank,
        players: career.bank.players.map((player, index) =>
          player.clubId === career.clubId && index % 2 === 0 && player.contract
            ? { ...player, contract: { ...player.contract, untilYear: career.league.year } }
            : player,
        ),
      },
    }));
    const count = save.bank.players.filter(
      (player) =>
        player.clubId === save.clubId && (player.contract?.untilYear ?? 0) <= save.league.year,
    ).length;
    expect(count).toBeGreaterThan(0);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: t("market.notice.title") });
    expect(within(card).getByText(t("market.notice.expiring", { count }))).toBeDefined();
  });

  it("a aba Contratos mostra a idade de cada jogador", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    await user.click(screen.getByRole("tab", { name: t("market.tab.contracts") }));
    const table = await screen.findByRole("table", { name: t("market.contracts.caption") });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/[▲▼]/g, "").trim());
    const ageColumn = headers.indexOf(t("col.age"));
    expect(ageColumn).toBeGreaterThan(0);
    const reference = currentDate(save);
    const body = within(table).getAllByRole("rowgroup")[1] as HTMLElement;
    for (const row of within(body).getAllByRole("row")) {
      const cells = within(row).getAllByRole("cell");
      const player = save.bank.players.find(
        (entry) => entry.clubId === save.clubId && entry.displayName === cells[0]?.textContent,
      );
      if (!player) throw new Error("jogador da linha não encontrado");
      expect(cells[ageColumn]?.textContent).toBe(String(ageOn(player.birthDate, reference)));
    }
  });

  it("renova um atleta pela aba Contratos", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    await user.click(screen.getByRole("tab", { name: t("market.tab.contracts") }));
    const table = await screen.findByRole("table", { name: t("market.contracts.caption") });
    const body = within(table).getAllByRole("rowgroup")[1] as HTMLElement;
    const first = within(body).getAllByRole("row")[0] as HTMLElement;
    const name = within(first).getAllByRole("cell")[0]?.textContent ?? "";
    const player = save.bank.players.find(
      (entry) => entry.clubId === save.clubId && entry.displayName === name,
    );
    if (!player?.contract) throw new Error("sem jogador");
    await user.click(within(first).getByRole("button", { name: t("market.action.renew") }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: t("market.action.start") }));
    const wage = await within(dialog).findByLabelText(t("market.form.wage"));
    await user.clear(wage);
    await user.type(wage, String(player.contract.wage * 5));
    const years = within(dialog).getByLabelText(t("market.form.years"));
    await user.clear(years);
    await user.type(years, "2");
    await user.click(within(dialog).getByRole("button", { name: t("market.action.propose") }));
    expect(await within(dialog).findByText(t("market.feedback.signed"))).toBeDefined();
    await waitFor(async () => {
      const saved = await loadSaved(store);
      const renewed = saved.bank.players.find((entry) => entry.id === player.id);
      expect(renewed?.contract?.wage).toBe(player.contract?.wage ? player.contract.wage * 5 : 0);
      expect(renewed?.contract?.untilYear).toBe(
        Math.max(player.contract?.untilYear ?? 0, save.league.year + 2),
      );
    });
  });
});

describe("mercado — propostas recebidas (US4)", () => {
  async function careerWithOffer(kind: "buy" | "loan" = "buy") {
    return storedCareer(1, (career) => {
      const player = career.bank.players
        .filter((entry) => entry.clubId === career.clubId && entry.position === "MF")
        .sort((a, b) => a.strength - b.strength)[0];
      const size = (clubId: string) =>
        career.bank.players.filter((entry) => entry.clubId === clubId).length;
      const buyer = [...career.bank.clubs]
        .filter((club) => club.id !== career.clubId && career.finances.clubs[club.id])
        .sort((a, b) => size(a.id) - size(b.id) || (a.id < b.id ? -1 : 1))[0];
      if (!player || !buyer) throw new Error("sem jogador");
      return {
        ...career,
        market: {
          ...career.market,
          nextSeq: 2,
          incoming: [
            {
              id: "off-0001",
              playerId: player.id,
              fromClubId: buyer.id,
              fee: kind === "buy" ? 1_000_000 : 0,
              kind,
              expiresRound: 3,
            },
          ],
        },
      };
    });
  }

  it("mostra o cartão na Início e o selo no cabeçalho", async () => {
    const { store } = await careerWithOffer();
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: t("market.notice.title") });
    expect(within(card).getByText(t("market.notice.offers", { count: 1 }))).toBeDefined();
    expect(screen.getByRole("link", { name: /Mercado \(1\)/ })).toBeDefined();
  });

  it("aceita a proposta: o jogador é vendido e o caixa sobe", async () => {
    const user = userEvent.setup();
    const { store, save } = await careerWithOffer();
    const offer = save.market.incoming[0];
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    await user.click(screen.getByRole("tab", { name: /Propostas recebidas/ }));
    const region = await screen.findByRole("region", { name: t("market.incoming.title") });
    await user.click(within(region).getByRole("button", { name: t("market.action.accept") }));
    await waitFor(async () => {
      const saved = await loadSaved(store);
      expect(saved.market.incoming).toEqual([]);
      expect(saved.bank.players.find((player) => player.id === offer?.playerId)?.clubId).toBe(
        offer?.fromClubId,
      );
      expect(saved.finances.clubs[save.clubId]?.cash).toBe(
        (save.finances.clubs[save.clubId]?.cash ?? 0) + 1_000_000,
      );
    });
  });

  it("recusa a proposta e ela some", async () => {
    const user = userEvent.setup();
    const { store } = await careerWithOffer();
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    await user.click(screen.getByRole("tab", { name: /Propostas recebidas/ }));
    const region = await screen.findByRole("region", { name: t("market.incoming.title") });
    await user.click(within(region).getByRole("button", { name: t("market.action.refuse") }));
    expect(await within(region).findByText(t("market.incoming.empty"))).toBeDefined();
  });
});

describe("mercado — empréstimos e livres (US5, US7)", () => {
  it("pede um jogador emprestado: ele joga pelo clube e volta com a virada", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    const target = cheapRows(save)[0];
    if (!target) throw new Error("sem alvo");
    await user.type(screen.getByLabelText(t("market.filter.text")), target.displayName);
    const row = (await screen.findByRole("cell", { name: target.displayName })).closest(
      "tr",
    ) as HTMLElement;
    await user.click(within(row).getByRole("button", { name: t("market.action.loan") }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: t("market.action.loan") }));
    expect(await within(dialog).findByText(t("market.feedback.loanDone"))).toBeDefined();
    await waitFor(async () => {
      const saved = await loadSaved(store);
      const loaned = saved.bank.players.find((player) => player.id === target.playerId);
      expect(loaned?.clubId).toBe(save.clubId);
      expect(loaned?.contract?.loan?.fromClubId).toBe(target.clubId);
    });
  });

  it("contrata um livre com a janela fechada", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(6, (career) => {
      const player = career.bank.players
        .filter((entry) => entry.clubId !== career.clubId && entry.position === "MF")
        .sort((a, b) => a.strength - b.strength)[0];
      if (!player) throw new Error("sem jogador");
      const { clubId, contract: _contract, ...free } = player;
      return {
        ...career,
        bank: {
          ...career.bank,
          players: career.bank.players.filter((entry) => entry.id !== player.id),
        },
        market: {
          ...career.market,
          freeAgents: [{ player: free, lastClubId: clubId, sinceYear: career.league.year - 1 }],
        },
      };
    });
    const agent = save.market.freeAgents[0];
    if (!agent) throw new Error("sem livre");
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    expect(screen.getAllByText(/Janela fechada/)[0]).toBeDefined();
    await user.selectOptions(screen.getByLabelText(t("market.filter.scope")), "free");
    const row = (await screen.findByRole("cell", { name: agent.player.displayName })).closest(
      "tr",
    ) as HTMLElement;
    await user.click(within(row).getByRole("button", { name: t("market.action.sign") }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: t("market.action.start") }));
    const wage = await within(dialog).findByLabelText(t("market.form.wage"));
    await user.clear(wage);
    await user.type(wage, "900000");
    await user.click(within(dialog).getByRole("button", { name: t("market.action.propose") }));
    expect(await within(dialog).findByText(t("market.feedback.signed"))).toBeDefined();
    await waitFor(async () => {
      const saved = await loadSaved(store);
      expect(saved.market.freeAgents).toEqual([]);
      expect(saved.bank.players.find((player) => player.id === agent.player.id)).toMatchObject({
        clubId: save.clubId,
        contract: { wage: 900000 },
      });
    });
  });
});
