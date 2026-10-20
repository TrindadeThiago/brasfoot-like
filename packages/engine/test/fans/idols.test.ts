import { describe, expect, it } from "vitest";
import { idolEvents, idolsOf } from "../../src/fans/idols";
import { moodChange } from "../../src/fans/mood";
import { DEFAULT_FANS } from "../../src/fans/rules";
import type { TransferRecord } from "../../src/market/types";
import { fansCareer, MANAGER, playFans } from "./helpers";

const count = DEFAULT_FANS.idolCount;

describe("ídolos (013 R6, US6)", () => {
  const career = playFans(fansCareer(), { rounds: 1 });
  const other = career.world.clubs.find((club) => club.id !== MANAGER)?.id as string;

  /** Move o jogador para outro clube e registra a transferência na rodada 1. */
  function moved(playerId: string, to: string, kind: TransferRecord["kind"], from?: string) {
    const world = structuredClone(career.world);
    const player = world.players.find((entry) => entry.id === playerId);
    if (player) player.clubId = to;
    const market = structuredClone(career.market);
    market.log.push({
      season: 1,
      round: 1,
      playerId,
      displayName: playerId,
      kind,
      fee: 1,
      ...(from ? { fromClubId: from } : {}),
      toClubId: to,
    });
    return { ...career, world, market };
  }

  it("os ídolos são os mais fortes do elenco", () => {
    const idols = idolsOf(career.world, MANAGER, count);
    const squad = career.world.players.filter((player) => player.clubId === MANAGER);
    const max = Math.max(...squad.map((player) => player.strength));
    expect(idols).toHaveLength(count);
    expect(idols[0]?.strength).toBe(max);
  });

  it("vender um ídolo derruba o humor", () => {
    const idol = idolsOf(career.world, MANAGER, count)[0];
    if (!idol) throw new Error("sem ídolo");
    const context = moved(idol.id, other, "sale", MANAGER);
    expect(idolEvents(context, MANAGER, 1, count).lost).toBe(1);
    const change = moodChange(context, MANAGER, 1);
    expect(change.factors).toContainEqual({ kind: "idolLost", amount: -DEFAULT_FANS.idolLoss });
  });

  it("emprestar um ídolo não conta como venda", () => {
    const idol = idolsOf(career.world, MANAGER, count)[0];
    if (!idol) throw new Error("sem ídolo");
    const context = moved(idol.id, other, "loan_out", MANAGER);
    expect(idolEvents(context, MANAGER, 1, count).lost).toBe(0);
  });

  it("vender um reserva não conta", () => {
    const squad = career.world.players
      .filter((player) => player.clubId === MANAGER)
      .sort((a, b) => a.strength - b.strength);
    const weakest = squad[0];
    if (!weakest) throw new Error("sem jogador");
    expect(idolEvents(moved(weakest.id, other, "sale", MANAGER), MANAGER, 1, count).lost).toBe(0);
  });

  it("contratar quem vira destaque anima; vale para clubes da IA", () => {
    const star = idolsOf(career.world, other, 1)[0];
    if (!star) throw new Error("sem destaque");
    const context = moved(star.id, MANAGER, "buy", other);
    const strongest = idolsOf(context.world, MANAGER, count).some((idol) => idol.id === star.id);
    expect(idolEvents(context, MANAGER, 1, count).signed).toBe(strongest ? 1 : 0);
    expect(idolEvents(context, other, 1, count).lost).toBe(1);
  });
});
