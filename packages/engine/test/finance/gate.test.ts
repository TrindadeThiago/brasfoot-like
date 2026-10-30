import { describe, expect, it } from "vitest";
import { advanceLeague } from "../../src/career/league-round";
import { gateFor, nextHomeGateEstimate } from "../../src/finance/gate";
import type { MatchRecord } from "../../src/season/types";
import { career, fixtureOf, testWorld, withCapacity, withReputation } from "./helpers";

const { league, finances } = career("publico");
const fixture = fixtureOf(league, 1, 1);
const big = withCapacity(finances, fixture.home, 200_000);
const price = finances.clubs[fixture.home]?.ticketPrice ?? 10;

describe("bilheteria (R5, FR-006 a FR-010)", () => {
  it("público inteiro, limitado pela capacidade; renda = público × preço", () => {
    const capacity = finances.clubs[fixture.home]?.capacity ?? 0;
    const gate = gateFor(finances, league, testWorld(), fixture, 1);
    expect(Number.isInteger(gate.attendance)).toBe(true);
    expect(gate.attendance).toBeLessThanOrEqual(capacity);
    expect(gate.capacity).toBe(capacity);
    expect(gate.revenue).toBe(gate.attendance * gate.price);
    expect(gate.price).toBe(1);
  });

  it("ruído reproduzível e dentro de ±5%", () => {
    const noisy = gateFor(big, league, testWorld(), fixture, price);
    const again = gateFor(big, league, testWorld(), fixture, price);
    const clean = gateFor(big, league, testWorld(), fixture, price, { noise: false });
    expect(noisy).toEqual(again);
    expect(Math.abs(noisy.attendance - clean.attendance)).toBeLessThanOrEqual(
      Math.ceil(clean.attendance * 0.05) + 1,
    );
    expect(gateFor(big, league, testWorld(), fixture, price, { noise: false })).toEqual(clean);
  });

  it("cresce com a reputação do mandante e do adversário", () => {
    const at = (world = testWorld()) =>
      gateFor(big, league, world, fixture, price, { noise: false }).attendance;
    expect(at(withReputation(fixture.home, 90))).toBeGreaterThan(
      at(withReputation(fixture.home, 30)),
    );
    expect(at(withReputation(fixture.away, 90))).toBeGreaterThan(
      at(withReputation(fixture.away, 30)),
    );
  });

  it("boa fase atrai mais público que má fase", () => {
    const played = advanceLeague(league, testWorld(), { rounds: 5 });
    if (!played.ok) throw new Error("falhou");
    const next = fixtureOf(played.league, 1, 6);
    const club = next.home;
    const fakeForm = (winning: boolean) => {
      const copy = structuredClone(played.league);
      const season = copy.divisions[0];
      if (!season) throw new Error("sem divisão");
      season.records = season.records.map((record): MatchRecord => {
        if (record.home !== club && record.away !== club) return record;
        const mineHome = record.home === club;
        const [mine, other] = winning ? [3, 0] : [0, 3];
        return {
          ...record,
          score: mineHome ? { home: mine, away: other } : { home: other, away: mine },
        };
      });
      return copy;
    };
    const roomy = withCapacity(finances, club, 200_000);
    const good = gateFor(roomy, fakeForm(true), testWorld(), next, price, { noise: false });
    const bad = gateFor(roomy, fakeForm(false), testWorld(), next, price, { noise: false });
    expect(good.attendance).toBeGreaterThan(bad.attendance);
  }, 30000);

  it("o mesmo clube atrai menos público na Série B", () => {
    const serieA = gateFor(big, league, testWorld(), fixture, price, { noise: false });
    const demoted = structuredClone(league);
    const [a, b] = demoted.divisions;
    if (!a || !b) throw new Error("sem divisões");
    a.divisionLevel = 2;
    b.divisionLevel = 1;
    const serieB = gateFor(big, demoted, testWorld(), fixture, price, { noise: false });
    expect(serieB.attendance).toBeLessThan(serieA.attendance);
  });
});

describe("preço do ingresso (US2, SC-004)", () => {
  const estimate = (value: number) =>
    gateFor(big, league, testWorld(), fixture, value, { noise: false });

  it("+10% no preço reduz o público em pelo menos 5% quando o estádio não lota", () => {
    const base = estimate(price);
    expect(base.attendance).toBeLessThan(base.capacity);
    const higher = estimate(Math.round(price * 1.1));
    expect(higher.attendance).toBeLessThanOrEqual(base.attendance * 0.95);
  });

  it("−10% aumenta o público e reduz a renda por torcedor", () => {
    const base = estimate(price);
    const lower = estimate(Math.round(price * 0.9));
    expect(lower.attendance).toBeGreaterThan(base.attendance);
    expect(lower.revenue / lower.attendance).toBeLessThan(base.revenue / base.attendance);
  });

  it("o público nunca sobe quando o preço sobe", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let value = 5; value <= 200; value += 5) {
      const { attendance } = estimate(value);
      expect(attendance).toBeLessThanOrEqual(previous);
      previous = attendance;
    }
  });

  it("estimativa do próximo jogo em casa = cálculo sem ruído", () => {
    const club = fixture.home;
    const next = nextHomeGateEstimate(finances, league, testWorld(), club, 20);
    expect(next).toEqual(gateFor(finances, league, testWorld(), fixture, 20, { noise: false }));
    const over = structuredClone(league);
    for (const season of over.divisions) season.nextRound = season.calendar.length + 1;
    expect(nextHomeGateEstimate(finances, over, testWorld(), club, 20)).toBeUndefined();
  });
});

describe("preço do ingresso sem ótimo no teto da faixa (auditoria A6)", () => {
  it("com estádio pequeno, a receita cai passado o preço que lota e o máximo da faixa nunca é o ótimo", () => {
    const small = withCapacity(finances, fixture.home, 2000);
    const revenueAt = (value: number) =>
      gateFor(small, league, testWorld(), fixture, value, { noise: false });
    const prices = Array.from({ length: 196 }, (_, index) => index + 5);
    const best = prices.reduce((top, value) =>
      revenueAt(value).revenue > revenueAt(top).revenue ? value : top,
    );
    expect(best).toBeLessThan(200);
    // Preço inteiro: o ótimo lota o estádio, ou chega a 1% da lotação.
    expect(revenueAt(best).attendance).toBeGreaterThanOrEqual(revenueAt(best).capacity * 0.99);
    expect(revenueAt(200).revenue).toBeLessThan(revenueAt(best).revenue);
    // Acima do preço que lota, quanto mais caro, menos receita.
    for (let value = best; value < 200; value += 5) {
      expect(revenueAt(value + 5).revenue).toBeLessThanOrEqual(revenueAt(value).revenue);
    }
  });
});
