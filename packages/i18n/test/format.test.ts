import { makeIssue } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  formatIssue,
  formatLabel,
  formatMatchError,
  formatMessage,
  messageKeys,
} from "../src/index.js";

describe("formatIssue", () => {
  it("ref.club_not_found de um jogador", () => {
    const issue = makeIssue(
      "ref.club_not_found",
      "players",
      [132, "clubId"],
      { clubId: "clube-999" },
      "jogador-00133",
    );
    expect(formatIssue(issue, "pt-BR")).toBe(
      "O jogador jogador-00133 referencia o clube clube-999, que não existe.",
    );
  });

  it("schema.out_of_range", () => {
    const issue = makeIssue(
      "schema.out_of_range",
      "players",
      [0, "strength"],
      { field: "strength", min: 1, max: 100, value: 101 },
      "jogador-00001",
    );
    expect(formatIssue(issue, "pt-BR")).toBe(
      "O campo strength vale 101, mas deve estar entre 1 e 100.",
    );
  });

  it.each([
    [0, "O clube clube-005 não tem goleiros; o mínimo é 2."],
    [1, "O clube clube-005 tem apenas 1 goleiro; o mínimo é 2."],
    [2, "O clube clube-005 tem apenas 2 goleiros; o mínimo é 3."],
  ])("squad.min_goalkeepers com %i goleiro(s)", (count, expected) => {
    const issue = makeIssue(
      "squad.min_goalkeepers",
      "clubs",
      [4],
      { clubId: "clube-005", count, min: count === 2 ? 3 : 2 },
      "clube-005",
    );
    expect(formatIssue(issue, "pt-BR")).toBe(expected);
  });

  it("usa o rótulo traduzido de características", () => {
    const issue = makeIssue(
      "player.duplicate_trait",
      "players",
      [0, "traits", 1],
      { trait: "free-kick" },
      "jogador-00001",
    );
    expect(formatIssue(issue, "pt-BR")).toContain("Cobrador de falta");
  });

  it("identifica a entidade pela posição quando não há id", () => {
    const issue = makeIssue("ref.club_not_found", "players", [4, "clubId"], { clubId: "x" });
    expect(formatIssue(issue, "pt-BR")).toContain("#5");
  });
});

describe("rótulos e mensagens gerais", () => {
  it("traduz itens de catálogo", () => {
    expect(formatLabel("position.GK", "pt-BR")).toBe("GOL");
    expect(formatLabel("position.MF", "pt-BR")).toBe("MEI");
    expect(formatLabel("trait.free-kick", "pt-BR")).toBe("Cobrador de falta");
  });

  it("formata mensagens com plural", () => {
    expect(formatMessage("cli.summary", { errors: 1, warnings: 0 }, "pt-BR")).toBe(
      "1 erro e nenhum aviso.",
    );
    expect(formatMessage("cli.summary", { errors: 3, warnings: 2 }, "pt-BR")).toBe(
      "3 erros e 2 avisos.",
    );
  });

  it("lista as chaves de mensagens de problemas", () => {
    expect(messageKeys("pt-BR")).toContain("ref.club_not_found");
  });
});

describe("formatMatchError", () => {
  it("usa as mensagens do contrato", () => {
    expect(formatMatchError({ code: "change.limit_reached", params: { limit: 5 } }, "pt-BR")).toBe(
      "O time já fez as 5 substituições permitidas.",
    );
    expect(
      formatMatchError(
        { code: "lineup.slots_mismatch", side: "home", params: { expected: 11, received: 10 } },
        "pt-BR",
      ),
    ).toBe("Mandante: a escalação preenche 10 vagas, mas o esquema tem 11.");
    expect(
      formatMatchError(
        { code: "auto_lineup.not_enough_players", params: { available: 1, required: 11 } },
        "pt-BR",
      ),
    ).toBe("Há apenas 1 jogador disponível; são necessários 11.");
  });

  it("traduz rótulos de postura", () => {
    expect(formatLabel("posture.attacking", "pt-BR")).toBe("Ofensiva");
  });
});
