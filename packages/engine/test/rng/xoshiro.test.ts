import { describe, expect, it } from "vitest";
import { createRng, restoreRng } from "../../src/rng/xoshiro.js";

function take(rng: { next(): number }, n: number): number[] {
  return Array.from({ length: n }, () => rng.next());
}

describe("createRng", () => {
  it("produz a mesma sequência para a mesma seed", () => {
    expect(take(createRng("abc"), 1000)).toEqual(take(createRng("abc"), 1000));
    expect(take(createRng(42), 1000)).toEqual(take(createRng(42), 1000));
  });

  it("produz sequências diferentes para seeds diferentes", () => {
    expect(take(createRng("abc"), 10)).not.toEqual(take(createRng("abd"), 10));
  });

  it("mantém uma sequência estável conhecida (snapshot entre engines)", () => {
    expect(take(createRng("test"), 8)).toMatchSnapshot();
  });

  it("gera uint32", () => {
    for (const value of take(createRng("u"), 1000)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(4294967296);
    }
  });
});

describe("state/restoreRng", () => {
  it("continua exatamente a sequência", () => {
    const rng = createRng("state");
    take(rng, 17);
    const state = rng.state();
    const restored = restoreRng(JSON.parse(JSON.stringify(state)));
    expect(take(restored, 100)).toEqual(take(rng, 100));
  });
});

describe("fork", () => {
  it("não avança o gerador pai", () => {
    const a = createRng("pai");
    const b = createRng("pai");
    a.fork("filho").next();
    expect(take(a, 10)).toEqual(take(b, 10));
  });

  it("é determinístico e depende do rótulo", () => {
    const rng = createRng("pai");
    expect(take(rng.fork("x"), 10)).toEqual(take(createRng("pai").fork("x"), 10));
    expect(take(rng.fork("x"), 10)).not.toEqual(take(rng.fork("y"), 10));
  });
});

describe("helpers", () => {
  it("float fica em [0, 1)", () => {
    const rng = createRng("float");
    for (let i = 0; i < 10000; i++) {
      const value = rng.float();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("int inclui os limites e é aproximadamente uniforme", () => {
    const rng = createRng("int");
    const counts = new Map<number, number>();
    for (let i = 0; i < 60000; i++) {
      const value = rng.int(1, 6);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(9000);
      expect(count).toBeLessThan(11000);
    }
  });

  it("int rejeita faixas inválidas", () => {
    expect(() => createRng("x").int(5, 4)).toThrow();
    expect(() => createRng("x").int(1.5, 4)).toThrow();
  });

  it("shuffle devolve uma cópia com os mesmos elementos", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = createRng("s").shuffle(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort()).toEqual(items);
  });

  it("pick escolhe um item da lista e rejeita lista vazia", () => {
    const rng = createRng("p");
    expect(["a", "b"]).toContain(rng.pick(["a", "b"]));
    expect(() => rng.pick([])).toThrow();
  });

  it("weighted nunca escolhe itens de peso zero", () => {
    const rng = createRng("w");
    for (let i = 0; i < 1000; i++) {
      expect(
        rng.weighted([
          { value: "a", weight: 0 },
          { value: "b", weight: 1 },
          { value: "c", weight: 0 },
        ]),
      ).toBe("b");
    }
  });
});
