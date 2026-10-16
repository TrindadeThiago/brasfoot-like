import { describe, expect, it } from "vitest";
import { validateBank } from "../../src/validation/validate";
import { at, makeValidBank, setRaw } from "../helpers/build-bank";

describe("vários defeitos (SC-004)", () => {
  it("N defeitos independentes produzem N erros, em ordem determinística", () => {
    const bank = makeValidBank();
    at(bank.countries, 0).code = "tst";
    at(bank.competitions, 0).format.tiebreakers = ["wins", "wins"];
    at(bank.clubs, 2).abbreviation = "AAA";
    at(bank.clubs, 5).stadiumCapacity = 10;
    at(bank.players, 20).strength = 0;
    at(bank.players, 40).nationalityId = "pais-9";

    const result = validateBank(bank);
    expect(result.ok).toBe(false);
    const errors = result.ok ? [] : result.errors;
    expect(errors.map((issue) => [issue.section, issue.path, issue.code])).toEqual([
      ["countries", [0, "code"], "schema.invalid_format"],
      ["competitions", [0, "format", "tiebreakers", 1], "format.duplicate_tiebreaker"],
      ["clubs", [2, "abbreviation"], "unique.duplicate_abbreviation"],
      ["clubs", [5, "stadiumCapacity"], "schema.out_of_range"],
      ["players", [20, "strength"], "schema.out_of_range"],
      ["players", [40, "nationalityId"], "ref.country_not_found"],
    ]);
    expect(validateBank(bank)).toEqual(result);
  });

  it("M campos desconhecidos em banco válido ⇒ aceito com M avisos", () => {
    const bank = makeValidBank();
    setRaw(bank.manifest, "site", "https://exemplo");
    setRaw(at(bank.clubs, 3), "mascote", "Tatu");
    setRaw(at(bank.players, 7), "apelido", "Foguete");
    const result = validateBank(bank);
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(3);
  });

  it("clube estruturalmente inválido não gera 'clube inexistente' nos jogadores (sem cascata)", () => {
    const bank = makeValidBank();
    at(bank.clubs, 0).colors.primary = "azul";
    const result = validateBank(bank);
    const errors = result.ok ? [] : result.errors;
    expect(errors.map((issue) => issue.code)).toEqual(["schema.invalid_format"]);
  });

  it("jogador estruturalmente inválido não gera erro de tamanho de elenco (sem cascata)", () => {
    const bank = makeValidBank();
    at(bank.players, 0).strength = 0;
    const result = validateBank(bank);
    const errors = result.ok ? [] : result.errors;
    expect(errors.map((issue) => issue.code)).toEqual(["schema.out_of_range"]);
  });
});
