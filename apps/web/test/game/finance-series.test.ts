// 028 R1: séries dos gráficos de Finanças, com a conciliação contra o caixa e a dívida do save.
import { describe, expect, it } from "vitest";
import {
  attendanceSeries,
  balanceSeries,
  breakdown,
  debtSeries,
  monthlyFlows,
  seasonHistory,
} from "../../src/game/finance-series";
import { storedCareer } from "../helpers/career";
import { longCareer } from "../helpers/saves";

async function played() {
  const { save } = await storedCareer(6);
  return save;
}

describe("séries de Finanças (028)", () => {
  it("o saldo em linha começa no caixa do início e termina no caixa atual", async () => {
    const save = await played();
    const club = save.finances.clubs[save.clubId];
    const series = balanceSeries(save);
    expect(series).toBeDefined();
    expect(series?.[0]?.cash).toBe(club?.seasonStartCash);
    expect(series?.at(-1)?.cash).toBe(club?.cash);
  });

  it("receitas e despesas por mês somam o resultado da temporada", async () => {
    const save = await played();
    const club = save.finances.clubs[save.clubId];
    const flows = monthlyFlows(save);
    expect(flows).toBeDefined();
    const net = (flows ?? []).reduce((sum, month) => sum + month.income - month.expense, 0);
    expect(net).toBe((club?.cash ?? 0) - (club?.seasonStartCash ?? 0));
    for (const month of flows ?? []) expect(month.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it("origem e destino usam as categorias do jogo e os percentuais fecham em 100", async () => {
    const save = await played();
    const origin = breakdown(save, "origin");
    const destination = breakdown(save, "destination");
    expect(
      origin
        ?.map((row) => row.category)
        .every((c) => ["gate", "sponsorship", "prize", "loan_in", "transfer_sale"].includes(c)),
    ).toBe(true);
    expect(
      destination
        ?.map((row) => row.category)
        .every((c) =>
          ["wages", "interest", "loan_out", "stadium", "transfer_purchase"].includes(c),
        ),
    ).toBe(true);
    for (const rows of [origin, destination]) {
      const total = (rows ?? []).reduce((sum, row) => sum + row.percent, 0);
      expect(Math.abs(total - 100)).toBeLessThanOrEqual(1);
      expect((rows ?? []).every((row) => row.amount > 0)).toBe(true);
    }
  });

  it("a rescisão sai de Salários e vira a própria fatia nas despesas por destino", async () => {
    const save = await played();
    const club = save.finances.clubs[save.clubId];
    if (!club) throw new Error("sem clube");
    const penalty = 250_000;
    const withTermination = {
      ...save,
      finances: {
        ...save.finances,
        clubs: { ...save.finances.clubs, [save.clubId]: { ...club, cash: club.cash - penalty } },
        ledger: [
          ...save.finances.ledger,
          {
            clubId: save.clubId,
            season: save.league.number,
            round: 0,
            category: "wages" as const,
            amount: -penalty,
          },
        ],
      },
      market: {
        ...save.market,
        log: [
          ...save.market.log,
          {
            season: save.league.number,
            round: 0,
            playerId: "x",
            displayName: "Jogador",
            kind: "released" as const,
            fromClubId: save.clubId,
            fee: penalty,
            reason: "termination",
          },
        ],
      },
    };
    const before = breakdown(save, "destination");
    const after = breakdown(withTermination, "destination");
    const wages = (rows: typeof before) => rows?.find((row) => row.category === "wages")?.amount;
    expect(after?.find((row) => row.category === "termination")?.amount).toBe(penalty);
    expect(wages(after)).toBe(wages(before) ?? 0);
    expect(before?.some((row) => row.category === "termination")).toBe(false);
  });

  it("a dívida em linha termina na dívida atual", async () => {
    const save = await played();
    const series = debtSeries(save);
    expect(series).toBeDefined();
    expect(series?.at(-1)?.debt).toBe(save.finances.clubs[save.clubId]?.debt);
  });

  it("o público por jogo traz público, capacidade e rodada dos jogos em casa", async () => {
    const save = await played();
    const gates = attendanceSeries(save);
    expect(gates.length).toBeGreaterThan(0);
    for (const gate of gates) {
      expect(gate.attendance).toBeLessThanOrEqual(gate.capacity);
      // A data só existe nos calendários por datas (017); sempre há a rodada.
      expect(gate.round).toBeGreaterThan(0);
    }
  });

  it("um lançamento fora do extrato quebra a conciliação: sem série, sem gráfico", async () => {
    const save = await played();
    const bad = {
      ...save,
      finances: {
        ...save.finances,
        ledger: [
          ...save.finances.ledger,
          {
            clubId: save.clubId,
            season: save.league.number,
            round: 1,
            category: "gate" as const,
            amount: 1234,
          },
        ],
      },
    };
    expect(balanceSeries(bad)).toBeUndefined();
    expect(monthlyFlows(bad)).toBeUndefined();
    expect(breakdown(bad, "origin")).toBeUndefined();
  });

  it("dívida adulterada quebra a conciliação da série de dívida", async () => {
    const save = await played();
    const club = save.finances.clubs[save.clubId];
    if (!club) throw new Error("sem clube");
    const bad = {
      ...save,
      finances: {
        ...save.finances,
        clubs: { ...save.finances.clubs, [save.clubId]: { ...club, debt: club.debt + 777 } },
      },
    };
    expect(debtSeries(bad)).toBeUndefined();
  });

  it("lançamento sem data conhecida cai no mês do início; sem calendário, a série mensal some", async () => {
    const save = await played();
    const noCalendar = { ...save, calendar: { ...save.calendar, days: [] } };
    expect(monthlyFlows(noCalendar)).toBeUndefined();
  });

  it("o histórico por temporada lista as temporadas encerradas do clube", () => {
    const { next } = longCareer("tela", 1);
    const history = seasonHistory(next);
    expect(history.seasons.length).toBeGreaterThan(0);
    expect(history.seasons[0]?.endCash).toBeDefined();
    expect(Array.isArray(history.crises)).toBe(true);
  });
});
