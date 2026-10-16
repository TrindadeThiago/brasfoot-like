import { describe, expect, it } from "vitest";
import type { ValidatedBank } from "../../src/model/types";
import { validateBank } from "../../src/validation/validate";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { at, makeValidBank } from "../helpers/build-bank";

const bank = generateDefaultBank({ seed: 7 });

function validated(input: unknown): ValidatedBank {
  const result = validateBank(input);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.bank;
}

describe("completeHiddenAttributes (FR-017b)", () => {
  it("preenche os três atributos, nas faixas, com potencial ≥ força", () => {
    for (const player of completeHiddenAttributes(bank, "c").players) {
      for (const value of Object.values(player.hidden)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(100);
      }
      expect(player.hidden.potential).toBeGreaterThanOrEqual(player.strength);
    }
  });

  it("é determinístico para o mesmo banco e a mesma seed", () => {
    expect(completeHiddenAttributes(bank, "c")).toEqual(completeHiddenAttributes(bank, "c"));
  });

  it("muda com a seed da carreira", () => {
    expect(completeHiddenAttributes(bank, "c").players).not.toEqual(
      completeHiddenAttributes(bank, "d").players,
    );
  });

  it("não depende da ordem dos jogadores", () => {
    const reversed = { ...bank, players: [...bank.players].reverse() } as ValidatedBank;
    const byId = (players: { id: string }[]) =>
      new Map(players.map((player) => [player.id, player]));
    const normal = byId(completeHiddenAttributes(bank, "c").players);
    const shuffled = byId(completeHiddenAttributes(reversed, "c").players);
    for (const [id, player] of normal) {
      expect(shuffled.get(id)).toEqual(player);
    }
  });

  it("mantém os valores definidos no banco e completa só os ausentes", () => {
    const input = makeValidBank();
    at(input.players, 0).hidden = { potential: 77 };
    at(input.players, 1).hidden = { potential: 60, temperament: 5, injuryProneness: 95 };
    const first = completeHiddenAttributes(validated(input), "x");
    const second = completeHiddenAttributes(validated(input), "y");
    expect(at(first.players, 0).hidden.potential).toBe(77);
    expect(at(second.players, 0).hidden.potential).toBe(77);
    expect(at(first.players, 1).hidden).toEqual({
      potential: 60,
      temperament: 5,
      injuryProneness: 95,
    });
    expect(at(first.players, 0).hidden.temperament).toBeGreaterThanOrEqual(1);
  });

  it("não altera o banco de entrada", () => {
    const input = validated(makeValidBank());
    completeHiddenAttributes(input, "x");
    expect(input.players.every((player) => player.hidden === undefined)).toBe(true);
  });
});
