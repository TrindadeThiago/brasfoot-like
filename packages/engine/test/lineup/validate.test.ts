import { describe, expect, it } from "vitest";
import { managerAutoLineup } from "../../src/lineup/auto";
import { validateLineup } from "../../src/lineup/validate";
import { adequacy } from "../../src/match/adequacy";
import type { Lineup } from "../../src/match/types";
import { firstClub, injured, serieAClubs, squadOf, suspended } from "./helpers";

const { squad } = firstClub();
const base = managerAutoLineup(squad, "4-4-2", "balanced", []).lineup;
const byId = new Map(squad.map((player) => [player.id, player]));
const codes = (lineup: Lineup, unavailable = [] as ReturnType<typeof injured>[]) =>
  validateLineup(lineup, squad, unavailable).issues.map(
    (issue) => `${issue.severity}:${issue.code}`,
  );

describe("validateLineup", () => {
  it("escalação automática é válida e só tem informações de fora de posição", () => {
    const result = validateLineup(base, squad, []);
    expect(result.valid).toBe(true);
    expect(result.issues.every((issue) => issue.code === "out_of_position")).toBe(true);
  });

  it("vaga vazia, vaga desconhecida, repetido e jogador de fora do clube são erros", () => {
    const empty: Lineup = { ...base, starters: { ...base.starters } };
    delete empty.starters.ls;
    expect(codes(empty)).toContain("error:empty_slot");
    expect(validateLineup(empty, squad, []).valid).toBe(false);

    expect(
      codes({ ...base, starters: { ...base.starters, xx: squad[0]?.id as string } }),
    ).toContain("error:unknown_slot");
    expect(
      codes({ ...base, bench: [...base.bench.slice(0, 11), base.starters.gk as string] }),
    ).toContain("error:duplicate_player");
    const stranger = squadOf(serieAClubs()[1] as string)[0]?.id as string;
    expect(codes({ ...base, starters: { ...base.starters, ls: stranger } })).toContain(
      "error:not_in_squad",
    );
  });

  it("indisponível entre titulares ou reservas é erro com motivo e partidas restantes", () => {
    const starter = base.starters.ls as string;
    const reserve = base.bench[0] as string;
    const result = validateLineup(base, squad, [injured(starter, 3), suspended(reserve, 1)]);
    expect(result.valid).toBe(false);
    expect(result.issues.filter((issue) => issue.code === "unavailable")).toEqual([
      {
        code: "unavailable",
        severity: "error",
        slotId: "ls",
        playerId: starter,
        params: { reason: "injury", remaining: 3 },
      },
      {
        code: "unavailable",
        severity: "error",
        playerId: reserve,
        params: { reason: "suspension", remaining: 1 },
      },
    ]);
  });

  it("banco grande demais e esquema desconhecido são erros", () => {
    const extra = squad.map((p) => p.id).filter((id) => !Object.values(base.starters).includes(id));
    expect(codes({ ...base, bench: extra.slice(0, 13) })).toContain("error:bench_too_large");
    expect(codes({ ...base, formation: "9-9-9" as Lineup["formation"] })).toEqual([
      "error:unknown_formation",
    ]);
  });

  it("jogador de linha no gol gera aviso de time sem goleiro; fora de posição informa o rendimento", () => {
    const keeper = base.starters.gk as string;
    const striker = base.starters.ls as string;
    const swapped: Lineup = { ...base, starters: { ...base.starters, gk: striker, ls: keeper } };
    const result = validateLineup(swapped, squad, []);
    expect(result.valid).toBe(true);
    expect(result.issues[0]).toEqual({
      code: "no_goalkeeper",
      severity: "warning",
      slotId: "gk",
      playerId: striker,
      params: { percent: 30 },
    });
    const out = result.issues.find(
      (issue) => issue.code === "out_of_position" && issue.slotId === "ls",
    );
    const factor = adequacy("GK", "FW");
    expect(out?.params).toEqual({ percent: Math.round(factor * 100) });
    expect(byId.get(keeper)?.position).toBe("GK");
  });

  it("menos de 11 disponíveis: aviso de elenco curto e indisponíveis viram aviso", () => {
    const ids = squad.map((player) => player.id);
    const blocked = ids.slice(0, ids.length - 10).map((id) => injured(id));
    const result = validateLineup(base, squad, blocked);
    expect(
      result.issues.some((issue) => issue.code === "short_squad" && issue.severity === "warning"),
    ).toBe(true);
    expect(
      result.issues.some((issue) => issue.code === "unavailable" && issue.severity === "error"),
    ).toBe(false);
    expect(result.valid).toBe(true);
  });

  it("ordena por gravidade: erros, avisos, informações", () => {
    const empty: Lineup = {
      ...base,
      starters: { ...base.starters, gk: base.starters.ls as string },
    };
    delete empty.starters.ls;
    const severities = validateLineup(empty, squad, []).issues.map((issue) => issue.severity);
    const rank = { error: 0, warning: 1, info: 2 };
    expect([...severities].sort((a, b) => rank[a] - rank[b])).toEqual(severities);
  });

  it("roda em menos de 1 ms", () => {
    const times: number[] = [];
    for (let run = 0; run < 50; run++) {
      const start = performance.now();
      validateLineup(base, squad, [injured(base.starters.ls as string)]);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    expect(times[25]).toBeLessThan(1);
  });
});
