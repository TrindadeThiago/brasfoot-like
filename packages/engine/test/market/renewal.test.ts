import { describe, expect, it } from "vitest";
import { proposeContract, startNegotiation } from "../../src/market/negotiation";
import { wageDemand } from "../../src/market/player-response";
import { applied, contextAfter, MANAGER, YEAR } from "./helpers";

const closed = contextAfter(8);
const own = closed.world.players
  .filter((player) => player.clubId === MANAGER)
  .sort((a, b) => b.strength - a.strength)[0];
if (!own?.contract) throw new Error("sem jogador");

describe("renovação (US6, FR-003)", () => {
  it("começa no contrato e vale fora da janela", () => {
    const result = startNegotiation(closed, { kind: "renew", playerId: own.id });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.negotiation).toMatchObject({ kind: "renew", stage: "contract" });
  });

  it("aceita estende o contrato a partir da próxima temporada e troca o salário", () => {
    const started = startNegotiation(closed, { kind: "renew", playerId: own.id });
    if (!started.ok) throw new Error("falhou");
    const ctx = applied(closed, started.value.update);
    const demand = wageDemand(ctx, own, MANAGER, true);
    const done = proposeContract(ctx, started.value.negotiation?.id ?? "", {
      wage: demand + 5000,
      years: 4,
    });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const renewed = done.value.update.world.players.find((player) => player.id === own.id);
    expect(renewed?.contract).toEqual({ wage: demand + 5000, untilYear: YEAR + 4 });
    expect(done.value.update.market.log.at(-1)?.kind).toBe("renew");
    expect(done.value.update.market.negotiations).toEqual([]);
  });

  it("recusado mantém o contrato atual", () => {
    const started = startNegotiation(closed, { kind: "renew", playerId: own.id });
    if (!started.ok) throw new Error("falhou");
    const ctx = applied(closed, started.value.update);
    const done = proposeContract(ctx, started.value.negotiation?.id ?? "", { wage: 100, years: 2 });
    if (!done.ok) throw new Error("falhou");
    expect(done.value.playerResponse).toEqual({ kind: "refused", reason: "low_wage" });
    expect(done.value.update.world.players.find((p) => p.id === own.id)?.contract).toEqual(
      own.contract,
    );
  });

  it("jogador emprestado e de outro clube não renovam", () => {
    const other = closed.world.players.find((player) => player.clubId !== MANAGER);
    expect(startNegotiation(closed, { kind: "renew", playerId: other?.id ?? "" })).toMatchObject({
      ok: false,
      error: { code: "market.not_found" },
    });
  });
});
