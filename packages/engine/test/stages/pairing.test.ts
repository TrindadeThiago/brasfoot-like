import { describe, expect, it } from "vitest";
import { type PairEntry, pairByPosition, pairByTable } from "../../src/stages/pairing";

// 019 (T018): chaveamento por posição depois de uma fase de pontos (research.md R7).
function entry(
  clubId: string,
  group: string | undefined,
  groupPosition: number,
  overallPosition: number,
  extra: Partial<PairEntry> = {},
): PairEntry {
  return {
    clubId,
    ...(group ? { group } : {}),
    groupPosition,
    overallPosition,
    extra: false,
    reputation: 50,
    division: 1,
    ...extra,
  };
}

/** 4 grupos, 2 classificados: vencedores A1…D1 (gerais 1–4) e segundos A2…D2 (gerais 5–8). */
function eight(): PairEntry[] {
  return [
    entry("A1", "A", 1, 1),
    entry("B1", "B", 1, 2),
    entry("C1", "C", 1, 3),
    entry("D1", "D", 1, 4),
    entry("A2", "A", 2, 5),
    entry("B2", "B", 2, 6),
    entry("C2", "C", 2, 7),
    entry("D2", "D", 2, 8),
  ];
}

const groupOf = (pair: { home: string; away: string }) => [pair.home[0], pair.away[0]];

describe("pairByPosition", () => {
  it("o i-ésimo melhor enfrenta o i-ésimo pior: vencedores contra segundos de outros grupos", () => {
    const pairs = pairByPosition(eight(), { home: "draw", seed: "s" });
    expect(pairs).toHaveLength(4);
    for (const pair of pairs) {
      const [a, b] = groupOf(pair);
      expect(a).not.toBe(b);
      expect([pair.home, pair.away].filter((id) => id.endsWith("1"))).toHaveLength(1);
    }
    expect(new Set(pairs.flatMap((pair) => [pair.home, pair.away])).size).toBe(8);
  });

  it("é determinístico e não depende da ordem de entrada", () => {
    const a = pairByPosition(eight(), { home: "draw", seed: "s" });
    const b = pairByPosition([...eight()].reverse(), { home: "draw", seed: "s" });
    expect(b).toEqual(a);
  });

  it("evita o mesmo grupo trocando o parceiro com o vizinho que resolve", () => {
    // sem a troca, A1 (1º geral) enfrentaria A2 (último geral)
    const entries = [
      entry("A1", "A", 1, 1),
      entry("B1", "B", 1, 2),
      entry("C1", "C", 1, 3),
      entry("D1", "D", 1, 4),
      entry("B2", "B", 2, 5),
      entry("C2", "C", 2, 6),
      entry("D2", "D", 2, 7),
      entry("A2", "A", 2, 8),
    ];
    const pairs = pairByPosition(entries, { home: "draw", seed: "s" });
    for (const pair of pairs) expect(groupOf(pair)[0]).not.toBe(groupOf(pair)[1]);
  });

  it("mantém o par quando nenhuma troca resolve (um grupo só)", () => {
    const entries = [entry("A1", "A", 1, 1), entry("A2", "A", 2, 2)];
    const pairs = pairByPosition(entries, { home: "draw", seed: "s" });
    expect(pairs).toHaveLength(1);
    expect(new Set([pairs[0]?.home, pairs[0]?.away])).toEqual(new Set(["A1", "A2"]));
  });

  it("com vagas extras, as extras enfrentam os vencedores de grupo", () => {
    const winners = ["A", "B", "C", "D"].map((g, i) => entry(`${g}1`, g, 1, i + 1));
    const seconds = ["A", "B", "C", "D"].map((g, i) => entry(`${g}2`, g, 2, i + 5));
    const extras = ["A", "B", "C", "D"].map((g, i) => entry(`${g}3`, g, 3, i + 9, { extra: true }));
    const pairs = pairByPosition([...winners, ...seconds, ...extras], { home: "draw", seed: "s" });
    expect(pairs).toHaveLength(6);
    const withWinner = pairs.filter((pair) =>
      [pair.home, pair.away].some((id) => id.endsWith("1")),
    );
    expect(withWinner).toHaveLength(4);
    for (const pair of withWinner) {
      const other = [pair.home, pair.away].find((id) => !id.endsWith("1")) ?? "";
      expect(other.endsWith("3")).toBe(true);
    }
  });

  it("fase de pontos corridos: 1 contra o último, 2 contra o penúltimo", () => {
    const table = [1, 2, 3, 4].map((position) =>
      entry(`T${position}`, undefined, position, position),
    );
    const pairs = pairByPosition(table, { home: "ranking", seed: "s" });
    expect(pairs.map((pair) => new Set([pair.home, pair.away]))).toEqual([
      new Set(["T1", "T4"]),
      new Set(["T2", "T3"]),
    ]);
  });
});

describe("mandante", () => {
  it("ranking: maior reputação em casa", () => {
    const entries = [
      entry("T1", undefined, 1, 1, { reputation: 10 }),
      entry("T2", undefined, 2, 2, { reputation: 90 }),
    ];
    expect(pairByPosition(entries, { home: "ranking", seed: "s" })[0]?.home).toBe("T2");
  });

  it("overall: melhor colocado na classificação geral em casa", () => {
    const entries = [entry("A1", "A", 1, 1), entry("B2", "B", 2, 7)];
    expect(pairByPosition(entries, { home: "overall", seed: "s" })[0]?.home).toBe("A1");
    const swapped = [entry("A2", "A", 2, 9), entry("B1", "B", 1, 3)];
    expect(pairByPosition(swapped, { home: "overall", seed: "s" })[0]?.home).toBe("B1");
  });

  it("division: o de divisão mais baixa (nível maior) em casa", () => {
    const entries = [
      entry("T1", undefined, 1, 1, { division: 1 }),
      entry("T2", undefined, 2, 2, { division: 3 }),
    ];
    expect(pairByPosition(entries, { home: "division", seed: "s" })[0]?.home).toBe("T2");
  });

  it("draw: sorteio determinístico pela seed, nos dois sentidos conforme a seed", () => {
    const entries = [entry("T1", undefined, 1, 1), entry("T2", undefined, 2, 2)];
    const hosts = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map(
        (seed) => pairByPosition(entries, { home: "draw", seed })[0]?.home,
      ),
    );
    expect(hosts).toEqual(new Set(["T1", "T2"]));
    expect(pairByPosition(entries, { home: "draw", seed: "a" })).toEqual(
      pairByPosition(entries, { home: "draw", seed: "a" }),
    );
  });
});

describe("pairByTable", () => {
  const entries = (): PairEntry[] => [
    entry("A1", "A", 1, 1),
    entry("B1", "B", 1, 2),
    entry("A2", "A", 2, 3),
    entry("B2", "B", 2, 4),
    entry("A3", "A", 3, 5, { extra: true }),
    entry("B3", "B", 3, 6, { extra: true }),
  ];

  it("cruza as origens da tabela, em ordem, e aplica a regra de mando", () => {
    const pairs = pairByTable(
      entries(),
      [
        ["A1", "B2"],
        ["B1", "A2"],
        ["X1", "X2"],
      ],
      { home: "overall", seed: "s" },
    );
    expect(pairs).toEqual([
      { home: "A1", away: "B2" },
      { home: "B1", away: "A2" },
      { home: "A3", away: "B3" },
    ]);
  });

  it("T usa a posição na tabela de pontos corridos", () => {
    const table = [1, 2, 3, 4].map((position) =>
      entry(`T${position}`, undefined, position, position),
    );
    const pairs = pairByTable(
      table,
      [
        ["T1", "T3"],
        ["T2", "T4"],
      ],
      { home: "overall", seed: "s" },
    );
    expect(pairs.map((pair) => new Set([pair.home, pair.away]))).toEqual([
      new Set(["T1", "T3"]),
      new Set(["T2", "T4"]),
    ]);
  });

  it("recusa origem inexistente, clube repetido e tabela que deixa classificados de fora", () => {
    const options = { home: "draw", seed: "s" } as const;
    expect(() => pairByTable(entries(), [["Z9", "A1"]], options)).toThrow();
    expect(() => pairByTable(entries(), [["A1", "A1"]], options)).toThrow();
    expect(() =>
      pairByTable(
        entries(),
        [
          ["A1", "B2"],
          ["A1", "B1"],
        ],
        options,
      ),
    ).toThrow();
    expect(() => pairByTable(entries(), [["A1", "B2"]], options)).toThrow();
  });
});
