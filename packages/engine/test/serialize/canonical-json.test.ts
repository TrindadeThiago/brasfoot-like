import { describe, expect, it } from "vitest";
import { toCanonicalJson } from "../../src/serialize/canonical-json";

describe("toCanonicalJson", () => {
  it("ordena chaves recursivamente e mantém a ordem dos arrays", () => {
    const value = { b: 1, a: { d: [3, 1, 2], c: "x" } };
    expect(toCanonicalJson(value)).toBe(
      '{\n  "a": {\n    "c": "x",\n    "d": [\n      3,\n      1,\n      2\n    ]\n  },\n  "b": 1\n}\n',
    );
  });

  it("gera a mesma saída independentemente da ordem de construção", () => {
    const first = { x: 1, y: { p: true, q: null } };
    const second = { y: { q: null, p: true }, x: 1 };
    expect(toCanonicalJson(first)).toBe(toCanonicalJson(second));
  });

  it("termina com quebra de linha", () => {
    expect(toCanonicalJson([])).toBe("[]\n");
  });

  it("omite propriedades undefined", () => {
    expect(toCanonicalJson({ a: undefined, b: 1 })).toBe('{\n  "b": 1\n}\n');
  });

  it("rejeita números não finitos", () => {
    expect(() => toCanonicalJson({ a: Number.NaN })).toThrow();
    expect(() => toCanonicalJson([Number.POSITIVE_INFINITY])).toThrow();
  });
});
