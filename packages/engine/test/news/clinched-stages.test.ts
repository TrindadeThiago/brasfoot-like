import { describe, expect, it } from "vitest";
import type { LeagueSeason } from "../../src/career/types";
import { clinched } from "../../src/news/clinched";
import { createNews } from "../../src/news/create";
import type { NewsContext } from "../../src/news/types";
import { createSeason } from "../../src/season/season";
import type { Season } from "../../src/season/types";
import { LOWER_LEVEL, regionalBank, STAGES_ID } from "../fixtures/stages-bank";
import { newSeason, testWorld } from "../season/helpers/world";
import {
  afterGroupsSeason,
  groupsState,
  record,
  roundRobin,
  syntheticSeason,
} from "../stages/helpers";

// 019 (T032): "título/acesso garantido" por pontos restantes não se aplica a divisões em fases.
const world = regionalBank();

function contextOf(divisions: Season[], base = world): NewsContext {
  const league: LeagueSeason = {
    competitionId: STAGES_ID,
    number: 1,
    year: 2027,
    seed: "s",
    divisions,
  };
  return { world: base, league, news: createNews(), careerSeed: "s", managerClubId: "" };
}

describe("clinched em divisões em fases", () => {
  it("não gera fatos para a divisão em fases, mesmo com um líder isolado nos pontos", () => {
    // Só o grupo A tem um vencedor com 12 pontos; os demais empatam todos os jogos.
    const base = afterGroupsSeason(world);
    const groups = Object.fromEntries(
      base.stages?.[0]?.groups?.map((group) => [group.id, group.clubIds]) ?? [],
    );
    const records = Object.entries(groups).flatMap(([id, ids]) =>
      roundRobin(ids, 1, (home, away) =>
        id === "A" ? (Number(home.slice(1)) < Number(away.slice(1)) ? [2, 0] : [0, 2]) : [1, 1],
      ),
    );
    const lower = syntheticSeason(
      world,
      [groupsState(0, groups, 1, 5), base.stages?.[1] as never],
      records,
    );
    const staged = { ...lower, calendar: base.calendar, nextRound: 9 };
    const top = createSeason(world, { competitionId: STAGES_ID, divisionLevel: 1, seed: "s" });
    if (!top.ok) throw new Error(JSON.stringify(top.error));
    const facts = clinched(contextOf([top.season, { ...staged, divisionLevel: LOWER_LEVEL }]), 8);
    expect(facts.filter((fact) => fact.vars.level === LOWER_LEVEL)).toEqual([]);
  });

  it("uma liga simples continua gerando o fato de título garantido", () => {
    const plain = testWorld();
    const season = newSeason("clinched-liga");
    const [leader, ...others] = season.clubIds;
    // O líder vence todos os jogos de uma liga reduzida: depois de muitas rodadas já é campeão.
    const records = others.map((other, index) => record(index + 1, leader as string, other, 3, 0));
    const done = { ...season, records, nextRound: 38, calendar: season.calendar };
    const league: LeagueSeason = {
      competitionId: plain.competitions[0]?.id as string,
      number: 1,
      year: 2027,
      seed: "s",
      divisions: [done],
    };
    const context: NewsContext = {
      world: plain,
      league,
      news: createNews(),
      careerSeed: "s",
      managerClubId: "",
    };
    expect(clinched(context, 37).some((fact) => fact.type === "titleClinched")).toBe(true);
  });
});
