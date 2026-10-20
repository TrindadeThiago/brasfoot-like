import { describe, expect, it } from "vitest";
import { releaseManagerClub } from "../../src/market/release";
import { MANAGER, marketContext } from "./helpers";

describe("releaseManagerClub (012 R11)", () => {
  it("cancela as negociações do clube e descarta as propostas recebidas", () => {
    const context = marketContext();
    const own = context.world.players.find((player) => player.clubId === MANAGER)?.id as string;
    const other = context.world.players.find((player) => player.clubId !== MANAGER);
    const market = {
      ...context.market,
      negotiations: [
        {
          id: "n1",
          playerId: other?.id as string,
          kind: "buy" as const,
          clubId: MANAGER,
          stage: "club_offer" as const,
          openedRound: 0,
        },
      ],
      incoming: [
        {
          id: "i1",
          playerId: own,
          fromClubId: other?.clubId as string,
          fee: 1,
          kind: "buy" as const,
          expiresRound: 3,
        },
        {
          id: "i2",
          playerId: other?.id as string,
          fromClubId: MANAGER,
          fee: 1,
          kind: "buy" as const,
          expiresRound: 3,
        },
      ],
    };
    const released = releaseManagerClub({ ...context, market }, MANAGER);
    expect(released.negotiations).toEqual([]);
    expect(released.log.at(-1)).toMatchObject({
      outcome: "rejected_by_user",
      reason: "manager_left",
    });
    expect(released.incoming.map((offer) => offer.id)).toEqual(["i2"]);
  });
});
