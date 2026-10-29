// 028 FR-018 / SC-001: a lista do mercado é montada uma vez e os filtros só filtram em cima dela;
// com o mundo padrão (10 565 jogadores) e com o completo (≈ 39 000) respondem em até 200 ms.
import {
  DEFAULT_PROFILE,
  filterRows,
  generateFootballWorld,
  type MarketRow,
  type ModPackage,
  marketRows,
} from "@brasfoot-like/engine";
import { createSave, marketContextOf } from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";

function median(values: number[]): number {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
}

function rowsOf(seed: string): MarketRow[] {
  const bank = generateFootballWorld(DEFAULT_PROFILE, seed) as ModPackage;
  const club = bank.competitions[0]?.divisions[0]?.clubIds[0] as string;
  const result = createSave({
    id: "perf",
    now: "2026-10-24T12:00:00.000Z",
    managerName: "Ana Souza",
    clubId: club,
    seed,
    defaultBank: bank,
    noFiring: true,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return marketRows(marketContextOf(result.save));
}

describe("desempenho dos filtros do Mercado (028)", () => {
  const rows = rowsOf("perf-mercado");

  it("o mundo padrão tem dezenas de milhares de linhas montadas de uma vez", () => {
    expect(rows.length).toBeGreaterThan(5000);
  });

  it("filtrar por posição, força, idade e nome responde em até 200 ms (mediana de 5)", () => {
    const filters = [
      { positions: ["FW" as const], strength: [60, 90] as [number, number] },
      { age: [18, 24] as [number, number], maxWage: 40_000 },
      { text: "silva" },
      { scope: "free" as const },
      { contractUntilMax: 2028, strength: [50, 100] as [number, number] },
    ];
    for (const filter of filters) {
      const times: number[] = [];
      for (let run = 0; run < 5; run++) {
        const start = performance.now();
        filterRows(rows, filter, { key: "strength", dir: "desc" });
        times.push(performance.now() - start);
      }
      if (process.env.PERF_LOG)
        console.info("PERF", rows.length, JSON.stringify(filter), median(times).toFixed(1));
      expect(median(times), JSON.stringify(filter)).toBeLessThan(200);
    }
  });
});
