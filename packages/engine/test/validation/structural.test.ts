import { describe, expect, it } from "vitest";
import type { ValidationIssue } from "../../src/validation/issues.js";
import { validateBank } from "../../src/validation/validate.js";
import { at, makeValidBank, removeField, setRaw } from "../helpers/build-bank.js";

function errorsOf(input: unknown): ValidationIssue[] {
  const result = validateBank(input);
  return result.ok ? [] : result.errors;
}

describe("banco válido", () => {
  it("é aceito sem erros nem avisos", () => {
    const result = validateBank(makeValidBank());
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});

describe("erros estruturais", () => {
  it("campo obrigatório ausente ⇒ schema.required", () => {
    const bank = makeValidBank();
    removeField(at(bank.players, 3), "strength");
    expect(errorsOf(bank)).toEqual([
      {
        severity: "error",
        code: "schema.required",
        section: "players",
        path: [3, "strength"],
        entityId: "clube-1-jog-4",
        params: { field: "strength" },
      },
    ]);
  });

  it("tipo errado ⇒ schema.invalid_type", () => {
    const bank = makeValidBank();
    setRaw(at(bank.clubs, 1), "reputation", "alta");
    expect(errorsOf(bank)).toEqual([
      expect.objectContaining({
        code: "schema.invalid_type",
        section: "clubs",
        path: [1, "reputation"],
        entityId: "clube-2",
        params: { field: "reputation", expected: "number", received: "string" },
      }),
    ]);
  });

  it("número não inteiro ⇒ schema.not_integer", () => {
    const bank = makeValidBank();
    setRaw(at(bank.players, 0), "strength", 50.5);
    expect(errorsOf(bank)).toEqual([
      expect.objectContaining({
        code: "schema.not_integer",
        params: { field: "strength", value: 50.5 },
      }),
    ]);
  });

  it("fora da faixa ⇒ schema.out_of_range com min, max e valor", () => {
    const bank = makeValidBank();
    at(bank.players, 0).strength = 101;
    expect(errorsOf(bank)).toEqual([
      expect.objectContaining({
        code: "schema.out_of_range",
        path: [0, "strength"],
        params: { field: "strength", min: 1, max: 100, value: 101 },
      }),
    ]);
  });

  it("tamanho inválido ⇒ schema.invalid_length", () => {
    const bank = makeValidBank();
    at(bank.clubs, 0).crest.initials = "ABCDE";
    expect(errorsOf(bank)).toEqual([
      expect.objectContaining({
        code: "schema.invalid_length",
        path: [0, "crest", "initials"],
        params: { field: "crest.initials", min: 1, max: 4, length: 5 },
      }),
    ]);
  });

  it("formato inválido ⇒ schema.invalid_format", () => {
    const bank = makeValidBank();
    at(bank.clubs, 0).colors.primary = "azul";
    expect(errorsOf(bank)).toEqual([
      expect.objectContaining({
        code: "schema.invalid_format",
        path: [0, "colors", "primary"],
        params: { field: "colors.primary", format: "color", value: "azul" },
      }),
    ]);
  });

  it("valor fora do catálogo ⇒ schema.invalid_value com valores permitidos", () => {
    const bank = makeValidBank();
    setRaw(at(bank.players, 0), "position", "GOL");
    expect(errorsOf(bank)).toEqual([
      expect.objectContaining({
        code: "schema.invalid_value",
        params: { field: "position", value: "GOL", allowed: "GK, FB, CB, DM, MF, FW" },
      }),
    ]);
  });

  it("formatVersion não suportada ⇒ erro único", () => {
    const bank = makeValidBank();
    setRaw(bank.manifest, "formatVersion", 9);
    at(bank.players, 0).strength = 0;
    expect(errorsOf(bank)).toEqual([
      {
        severity: "error",
        code: "manifest.unsupported_format_version",
        section: "manifest",
        path: ["formatVersion"],
        params: { found: 9, supported: "1" },
      },
    ]);
  });

  it("formato de disputa reservado ⇒ format.unsupported sem erros derivados", () => {
    const bank = makeValidBank();
    setRaw(at(bank.competitions, 0), "format", { type: "knockout", legs: 2 });
    expect(errorsOf(bank)).toEqual([
      expect.objectContaining({
        code: "format.unsupported",
        section: "competitions",
        path: [0, "format", "type"],
        entityId: "liga",
        params: { type: "knockout" },
      }),
    ]);
  });

  it("seção ausente ou que não é lista ⇒ erro na seção", () => {
    const bank = makeValidBank();
    removeField(bank, "countries");
    setRaw(bank, "players", {});
    const codes = errorsOf(bank).map((issue) => [issue.section, issue.code]);
    expect(codes).toContainEqual(["countries", "schema.required"]);
    expect(codes).toContainEqual(["players", "schema.invalid_type"]);
  });

  it("entrada que não é objeto ⇒ erro, sem exceção", () => {
    expect(() => validateBank(null)).not.toThrow();
    expect(errorsOf(null).map((issue) => issue.code)).toEqual(["schema.invalid_type"]);
    expect(errorsOf("banco").map((issue) => issue.code)).toEqual(["schema.invalid_type"]);
  });

  it("um item inválido não impede a validação dos outros itens da seção", () => {
    const bank = makeValidBank();
    at(bank.players, 0).strength = 0;
    at(bank.players, 5).strength = 200;
    expect(errorsOf(bank).map((issue) => issue.path)).toEqual([
      [0, "strength"],
      [5, "strength"],
    ]);
  });
});

describe("avisos", () => {
  it("campo desconhecido ⇒ aviso, campo descartado e banco aceito", () => {
    const bank = makeValidBank();
    setRaw(at(bank.players, 2), "apelido", "Foguete");
    setRaw(at(bank.clubs, 0).crest, "brilho", true);
    const result = validateBank(bank);
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([
      {
        severity: "warning",
        code: "schema.unknown_field",
        section: "clubs",
        path: [0, "crest", "brilho"],
        entityId: "clube-1",
        params: { field: "crest.brilho" },
      },
      {
        severity: "warning",
        code: "schema.unknown_field",
        section: "players",
        path: [2, "apelido"],
        entityId: "clube-1-jog-3",
        params: { field: "apelido" },
      },
    ]);
    if (result.ok) {
      expect(at(result.bank.players, 2)).not.toHaveProperty("apelido");
      expect(at(result.bank.clubs, 0).crest).not.toHaveProperty("brilho");
    }
  });

  it("erro de digitação gera aviso e erro de campo obrigatório", () => {
    const bank = makeValidBank();
    const player = at(bank.players, 0);
    setRaw(player, "strenght", player.strength);
    removeField(player, "strength");
    const result = validateBank(bank);
    expect(result.ok).toBe(false);
    expect(result.warnings.map((issue) => issue.params)).toEqual([{ field: "strenght" }]);
    expect(errorsOf(bank).map((issue) => issue.code)).toEqual(["schema.required"]);
  });
});
