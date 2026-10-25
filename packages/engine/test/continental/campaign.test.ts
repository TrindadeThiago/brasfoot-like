import { describe, expect, it } from "vitest";
import { dateOfRound } from "../../src/calendar/season-calendar";
import { currentDay } from "../../src/career/season-state";
import { clubCampaign } from "../../src/continental/campaign";
import { campaignStatuses } from "../../src/continental/status";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import {
  compactState,
  continentalChampion,
  continentalLeague,
  playDays,
} from "../career/continental-helpers";

const MAJOR = CONTINENTAL_IDS.major;

describe("campanha do clube na competição entre países (022 US4, FR-022)", () => {
  const { state, manager, seed } = compactState({ seed: "continental-campanha" });

  it("quem não disputa a competição não tem campanha", () => {
    const outsider = state.world.clubs.find(
      (club) =>
        !continentalLeague(state).divisions[0]?.clubIds.includes(club.id) &&
        !state.world.competitions
          .filter((entry) => entry.countryId === undefined)
          .some((entry) => entry.divisions[0]?.clubIds.includes(club.id)),
    );
    expect(outsider).toBeDefined();
    expect(clubCampaign(state, MAJOR, outsider?.id ?? "")).toBeUndefined();
  });

  it("no meio da fase de grupos: jogos disputados, próxima partida e fases possíveis", () => {
    const middle = playDays(state, 8, seed, manager);
    const campaign = clubCampaign(middle, MAJOR, manager);
    expect(campaign?.status).toBe("playing");
    expect(campaign?.reached).toEqual({ stage: 1 });
    const played = campaign?.matches ?? [];
    expect(played.length).toBeGreaterThan(0);
    for (const match of played) {
      expect([match.home, match.away]).toContain(manager);
      expect(match.kind).toBe("groups");
      expect(match.date).toBe(dateOfRound(middle.calendar, MAJOR, match.round));
    }
    expect(played.map((match) => match.stageRound)).toEqual(played.map((_, index) => index + 1));
    const next = campaign?.next;
    expect(next?.kind).toBe("groups");
    expect((next?.date ?? "") > (currentDay(middle)?.date ?? "")).toBe(true);
    expect(typeof next?.home).toBe("boolean");
    expect(next?.opponentId).toBeDefined();
    expect(campaign?.remaining[0]).toEqual({ stage: 2 });
    expect(campaign?.remaining.at(-1)).toEqual({ stage: 2, phase: 4 });
    expect(campaign?.remaining).toHaveLength(5);
  });

  it("os prêmios da campanha batem com o extrato do clube", () => {
    const middle = playDays(state, 8, seed, manager);
    const campaign = clubCampaign(middle, MAJOR, manager);
    const ledger = middle.finances.ledger.filter(
      (entry) =>
        entry.clubId === manager && entry.category === "prize" && entry.competitionId === MAJOR,
    );
    expect(campaign?.awards.reduce((sum, award) => sum + award.amount, 0)).toBe(
      ledger.reduce((sum, entry) => sum + entry.amount, 0),
    );
    expect(campaign?.awards.length).toBeGreaterThan(0);
  });

  it("no fim: o campeão chegou à última fase e quem caiu nos grupos desceu à menor", () => {
    const end = playDays(state, "end", seed, manager);
    const champion = continentalChampion(end) as string;
    const title = clubCampaign(end, MAJOR, champion);
    expect(title?.status).toBe("champion");
    expect(title?.reached).toEqual({ stage: 2, phase: 4 });
    expect(title?.next).toBeUndefined();
    expect(title?.remaining).toEqual([]);
    expect(title?.matches).toHaveLength(11);

    const season = continentalLeague(end).divisions[0];
    const statuses = season ? campaignStatuses(end.world, season) : new Map();
    const droppedOut = [...statuses].filter(([, status]) => status === "eliminated");
    const states = droppedOut.map(([clubId]) => clubCampaign(end, MAJOR, clubId)?.status);
    // Os terceiros dos grupos foram para a menor; os quartos ficaram de fora.
    expect(states.filter((status) => status === "moved")).toHaveLength(4);
    expect(states.filter((status) => status === "eliminated").length).toBeGreaterThan(0);
    for (const status of states) {
      expect(status === "moved" || status === "eliminated").toBe(true);
    }
  });
});
