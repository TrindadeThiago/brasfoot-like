import { describe, expect, it } from "vitest";
import {
  clubDivision,
  createLeagueSeason,
  divisionSeason,
  divisionZones,
  isLeagueSeasonOver,
  leagueRound,
  leagueSeasonSeed,
} from "../../src/career/league";
import { createSeason } from "../../src/season/season";
import { serieAOptions } from "../season/helpers/world";
import { bankDivision, competitionId, newLeague, testWorld } from "./helpers";

describe("temporada da liga (R1, R3, R4)", () => {
  it("cria uma Season por divisão, por nível, com 20 clubes e a seed da carreira", () => {
    const league = newLeague("liga");
    expect(league.divisions.map((season) => season.divisionLevel)).toEqual([1, 2]);
    for (const season of league.divisions) {
      expect(season.clubIds).toHaveLength(20);
      expect(season.seed).toBe("liga");
    }
    expect(league.seed).toBe(leagueSeasonSeed("liga", 1));
    expect(league.seed).toBe("liga");
    expect(league.number).toBe(1);
    expect(league.competitionId).toBe(competitionId());
  });

  it("a Série A é idêntica à temporada isolada de antes (compatibilidade)", () => {
    const league = newLeague("compat");
    const isolated = createSeason(testWorld(), serieAOptions("compat"));
    expect(isolated.ok).toBe(true);
    if (!isolated.ok) return;
    expect(league.divisions[0]).toEqual(isolated.season);
  });

  it("deriva a seed das temporadas seguintes do número", () => {
    expect(leagueSeasonSeed("s", 1)).toBe("s");
    expect(leagueSeasonSeed("s", 3)).toBe("s:s3");
    const third = newLeague("s", { number: 3 });
    expect(third.seed).toBe("s:s3");
    expect(third.divisions.every((season) => season.seed === "s:s3")).toBe(true);
  });

  it("o ano padrão é o da data de referência do banco", () => {
    const year = Number(testWorld().manifest.referenceDate.slice(0, 4));
    expect(newLeague("ano").year).toBe(year);
    expect(newLeague("ano", { year: 2040 }).year).toBe(2040);
  });

  it("usa a composição informada", () => {
    const serieA = bankDivision(1);
    const serieB = bankDivision(2);
    const composition = {
      1: [...serieA.slice(4), ...serieB.slice(0, 4)],
      2: [...serieB.slice(4), ...serieA.slice(0, 4)],
    };
    const league = newLeague("composicao", { composition });
    expect([...(league.divisions[0]?.clubIds ?? [])].sort()).toEqual([...composition[1]].sort());
    expect([...(league.divisions[1]?.clubIds ?? [])].sort()).toEqual([...composition[2]].sort());
  });

  it.each([
    [
      "clube em duas divisões",
      () => ({
        1: bankDivision(1),
        2: [...bankDivision(2).slice(1), bankDivision(1)[0] as string],
      }),
    ],
    [
      "tamanho diferente do banco",
      () => ({
        1: [...bankDivision(1), bankDivision(2)[0] as string],
        2: bankDivision(2).slice(1),
      }),
    ],
    ["nível faltando", () => ({ 1: bankDivision(1) })],
  ])("recusa composição inválida: %s", (_label, composition) => {
    const result = createLeagueSeason(testWorld(), {
      competitionId: competitionId(),
      careerSeed: "invalida",
      composition: composition(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("season.invalid_composition");
  });

  it("recusa competição desconhecida", () => {
    const result = createLeagueSeason(testWorld(), { competitionId: "copa", careerSeed: "x" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("season.unknown_competition");
  });

  it("começa na rodada 1, não encerrada", () => {
    const league = newLeague("rodada");
    expect(leagueRound(league)).toBe(1);
    expect(isLeagueSeasonOver(league)).toBe(false);
  });

  it("encontra a divisão por nível e por clube", () => {
    const league = newLeague("busca");
    const clubB = bankDivision(2)[3] as string;
    expect(divisionSeason(league, 2)?.divisionLevel).toBe(2);
    expect(divisionSeason(league, 3)).toBeUndefined();
    expect(clubDivision(league, clubB)?.divisionLevel).toBe(2);
    expect(clubDivision(league, "clube-inexistente")).toBeUndefined();
  });

  it("lê as vagas de acesso e rebaixamento dos dados", () => {
    expect(divisionZones(testWorld(), competitionId(), 1)).toEqual({
      level: 1,
      promotion: 0,
      relegation: 4,
      berths: [],
    });
    expect(divisionZones(testWorld(), competitionId(), 2)).toEqual({
      level: 2,
      promotion: 4,
      relegation: 0,
      berths: [],
    });
  });
});
