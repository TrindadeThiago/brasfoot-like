import { describe, expect, it } from "vitest";
import { clubCampaign, competitionCampaign } from "../../src/continental/campaign";
import { regionalCompetitionOf } from "../../src/regional/scope";
import { playDays } from "../career/continental-helpers";
import { playToEnd, regionalState } from "../career/regional-helpers";

describe("campanha do clube no estadual (023 R8, US3)", () => {
  const { state, manager, seed } = regionalState();
  const competitionId = regionalCompetitionOf(state.world, manager)?.id ?? "";

  it("clubCampaign continua sendo o mesmo que competitionCampaign (compatibilidade com a 022)", () => {
    expect(clubCampaign).toBe(competitionCampaign);
  });

  it("no começo a campanha está jogando na fase de grupos, sem jogos e com o próximo marcado", () => {
    const campaign = competitionCampaign(state, competitionId, manager);
    expect(campaign?.status).toBe("playing");
    expect(campaign?.reached.stage).toBe(1);
    expect(campaign?.matches).toHaveLength(0);
    expect(campaign?.next?.kind).toBe("groups");
    expect(campaign?.remaining.length).toBeGreaterThan(0);
  });

  it("depois de alguns dias a campanha lista os jogos do clube", () => {
    const later = playDays(state, 3, seed, manager);
    const campaign = competitionCampaign(later, competitionId, manager);
    expect(campaign?.matches.length).toBeGreaterThan(0);
    for (const match of campaign?.matches ?? []) {
      expect([match.home, match.away]).toContain(manager);
    }
  });

  it("ao fim a campanha está encerrada: campeão ou eliminado, sem próximo jogo", () => {
    const end = playToEnd(state, seed, manager);
    const campaign = competitionCampaign(end, competitionId, manager);
    expect(["champion", "eliminated"]).toContain(campaign?.status);
    expect(campaign?.next).toBeUndefined();
  }, 300_000);

  it("um clube que não joga o estadual não tem campanha", () => {
    expect(competitionCampaign(state, competitionId, "clube-inexistente")).toBeUndefined();
  });
});
