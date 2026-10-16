import { describe, expect, it } from "vitest";
import { clubUnavailability } from "../../src/lineup/unavailability";
import { newSeason, testWorld } from "../season/helpers/world";
import { firstClub, serieAClubs, squadOf } from "./helpers";

describe("clubUnavailability", () => {
  it("lista só os indisponíveis do clube, com motivo e partidas restantes, ordenados", () => {
    const { clubId, squad } = firstClub();
    const other = squadOf(serieAClubs()[1] as string)[0]?.id as string;
    const [a, b, c] = squad.map((player) => player.id);
    const season = newSeason("indisponiveis");
    season.status[a as string] = { yellows: 0, suspension: 1, injury: 3 };
    season.status[b as string] = { yellows: 2, suspension: 1, injury: 0 };
    season.status[c as string] = { yellows: 1, suspension: 0, injury: 0 };
    season.status[other] = { yellows: 0, suspension: 2, injury: 0 };
    expect(clubUnavailability(season, testWorld(), clubId)).toEqual([
      { playerId: b, reason: "suspension", remaining: 1 },
      { playerId: a, reason: "injury", remaining: 3 },
    ]);
  });

  it("sem impedimentos devolve lista vazia", () => {
    expect(clubUnavailability(newSeason("limpa"), testWorld(), firstClub().clubId)).toEqual([]);
  });
});
