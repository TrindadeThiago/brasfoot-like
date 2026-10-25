import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { cupSeasonOf } from "../../src/knockout/history";
import { cupChampion } from "../../src/knockout/tie";
import type { Berth, CompletedBank } from "../../src/model/types";
import { resolveQualification } from "../../src/qualification/resolve";
import { standings } from "../../src/season/standings";
import { allSeasons } from "../career/qualification-helpers";
import {
  baseWorld,
  clone,
  type Ids,
  playedOnce,
  resolveOnce,
  superCup,
  superCupWorld,
} from "./helpers";

const SEED = "resolve-021";

function tables(end: ReturnType<typeof playedOnce>["end"], ids: Ids) {
  const league = allSeasons(end).find((entry) => entry.competitionId === ids.league);
  const top = standings(
    league?.divisions[0] as NonNullable<typeof league>["divisions"][0],
    end.world,
  );
  const cup = cupChampion(
    cupSeasonOf(
      allSeasons(end).find((entry) => entry.competitionId === ids.cup) as NonNullable<
        typeof league
      >,
    ) as never,
  );
  return { champion: top[0]?.clubId, runnerUp: top[1]?.clubId, top, cup };
}

describe("resolveQualification (021 R2, R3)", () => {
  const { world, ids } = superCupWorld();

  it("vagas diretas: campeões da liga e da copa; sempre 2 participantes sem repetição", () => {
    const { end, result } = resolveOnce(world, SEED);
    const found = tables(end, ids);
    const next = result.compositions["supercopa-teste"]?.[1] ?? [];
    expect(next).toHaveLength(2);
    expect(new Set(next).size).toBe(2);
    expect(result.record.entries.map((entry) => entry.berthId)).toEqual([
      "campeao-liga",
      "campeao-copa",
    ]);
    const liga = result.record.entries.find((entry) => entry.berthId === "campeao-liga");
    expect(liga?.clubId).toBe(found.champion);
    expect(liga?.via).toBe("direct");
    if (found.champion !== found.cup?.championId) {
      expect(next.sort()).toEqual([found.champion, found.cup?.championId].sort());
    } else {
      // Mesmo campeão nas duas: a segunda vaga é repassada ao vice da liga.
      const copa = result.record.entries.find((entry) => entry.berthId === "campeao-copa");
      expect(copa?.via).toBe("pass");
      expect(copa?.passedFrom).toEqual({ clubId: found.champion, reason: "duplicate" });
      expect(copa?.clubId).toBe(found.runnerUp);
    }
  });

  it("é determinística", () => {
    const first = resolveOnce(world, SEED).result;
    const second = resolveOnce(world, SEED).result;
    expect(second).toEqual(first);
  });

  /** Estado jogado uma vez e um resolvedor com vagas editadas. */
  function withBerths(edit: (berths: Berth[], ids: Ids) => void, clubs?: string[]) {
    const edited = clone(world) as CompletedBank;
    const cup = edited.competitions.find((entry) => entry.id === "supercopa-teste");
    if (!cup) throw new Error("sem supercopa");
    const berths = cup.divisions[0]?.berths as Berth[];
    edit(berths, ids);
    if (clubs) (cup.divisions[0] as { clubIds: string[] }).clubIds = clubs;
    return edited;
  }
  const played = playedOnce(world, SEED);
  const run = (edited: CompletedBank) =>
    resolveQualification({
      world: { ...played.end.world, competitions: edited.competitions },
      finished: allSeasons(played.end),
      compositions: played.compositions,
      number: 1,
      year: played.end.league.year,
    });

  it("mesmo clube em duas vagas entra uma vez e a segunda repassa pela ordem de fallback", () => {
    const edited = withBerths((berths) => {
      (berths[1] as Berth).source = { kind: "champion", competitionId: ids.league };
    });
    const outcome = run(edited);
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
    const entries = outcome.result.record.entries;
    expect(entries[1]?.via).toBe("pass");
    expect(entries[1]?.passedFrom?.reason).toBe("duplicate");
    expect(outcome.result.compositions["supercopa-teste"]?.[1]).toHaveLength(2);
  });

  it("require: clube que não está na divisão seguinte é repassado", () => {
    const found = tables(played.end, ids);
    const bottom = ids.second[0] as string;
    const nextTop = played.compositions[ids.league]?.[1] ?? [];
    // exige estar na divisão 2 da temporada seguinte: o campeão (que fica na 1) não serve
    const edited = withBerths((berths) => {
      (berths[0] as Berth).require = [{ competitionId: ids.league, level: 2 }];
    });
    const outcome = run(edited);
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
    const first = outcome.result.record.entries.find((entry) => entry.berthId === "campeao-liga");
    expect(first?.via).toBe("pass");
    expect(first?.passedFrom?.reason).toBe("require");
    const nextSecond = played.compositions[ids.league]?.[2] ?? [];
    expect(nextSecond).toContain(first?.clubId);
    expect(nextTop).toContain(found.champion);
    expect(bottom).toBeDefined();
  });

  it("forbid: clube numa divisão proibida é repassado", () => {
    const found = tables(played.end, ids);
    const edited = withBerths((berths) => {
      (berths[0] as Berth).forbid = [{ competitionId: ids.league, level: 1 }];
    });
    const outcome = run(edited);
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
    const first = outcome.result.record.entries.find((entry) => entry.berthId === "campeao-liga");
    expect(first?.passedFrom).toEqual({ clubId: found.champion, reason: "forbid" });
    expect(first?.clubId).not.toBe(found.champion);
  });

  it("clube extinto é repassado", () => {
    const found = tables(played.end, ids);
    const gone = {
      ...played.end.world,
      clubs: played.end.world.clubs.filter((club) => club.id !== found.champion),
    };
    const outcome = resolveQualification({
      world: { ...gone, competitions: played.end.world.competitions } as CompletedBank,
      finished: allSeasons(played.end),
      compositions: played.compositions,
      number: 1,
      year: 1,
    });
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
    const first = outcome.result.record.entries.find((entry) => entry.berthId === "campeao-liga");
    expect(first?.passedFrom?.reason).toBe("ineligible");
  });

  it("fechamento esgotado vira qualification.exhausted com competição e vaga", () => {
    const edited = withBerths((berths) => {
      (berths[0] as Berth).fallback = [];
      (berths[0] as Berth).require = [{ competitionId: ids.league, level: 2 }];
    });
    const outcome = run(edited);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("qualification.exhausted");
      expect(outcome.error.params).toEqual({
        competitionId: "supercopa-teste",
        berthId: "campeao-liga",
      });
    }
  });

  it("fonte sem temporada encerrada vira qualification.source_missing", () => {
    const edited = withBerths((berths) => {
      (berths[0] as Berth).source = { kind: "champion", competitionId: "nao-existe" };
    });
    const outcome = run(edited);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error.code).toBe("qualification.source_missing");
  });

  it("sem vagas no banco, nada é resolvido", () => {
    const plain = playedOnce(baseWorld().world, SEED);
    const outcome = resolveQualification({
      world: plain.end.world,
      finished: allSeasons(plain.end),
      compositions: plain.compositions,
      number: 1,
      year: 1,
    });
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
    expect(outcome.result.compositions).toEqual({});
    expect(outcome.result.record.entries).toEqual([]);
  });

  it("nextComposition continua sendo a fonte das pirâmides", () => {
    const league = allSeasons(played.end).find((entry) => entry.competitionId === ids.league);
    expect(played.compositions[ids.league]).toEqual(
      nextComposition(league as NonNullable<typeof league>, played.end.world).composition,
    );
    expect(superCup(ids, [], []).id).toBe("supercopa-teste");
    expect(baseWorld().ids.league).toBe(ids.league);
  });
});

describe("rebaixado e vagas de outras competições (021)", () => {
  const { world, ids } = superCupWorld();
  const played = playedOnce(world, "rebaixado-021");
  const league = allSeasons(played.end).find((entry) => entry.competitionId === ids.league);
  const relegated =
    nextComposition(league as NonNullable<typeof league>, played.end.world).relegated[1] ?? [];
  const last = relegated.at(-1) as string;
  const lastPosition = standings(
    (league as NonNullable<typeof league>).divisions[0] as never,
    played.end.world,
  ).find((row) => row.clubId === last)?.position as number;

  /** Vagas do rebaixado: a da liga exige a divisão de cima; a de outra competição não exige nada. */
  function run(otherPath: boolean) {
    const edited = clone(world) as CompletedBank;
    const cup = edited.competitions.find((entry) => entry.id === "supercopa-teste");
    const source = {
      kind: "position",
      competitionId: ids.league,
      level: 1,
      from: lastPosition,
      to: lastPosition,
    } as const;
    const closing = {
      kind: "position",
      competitionId: ids.league,
      level: 1,
      from: 1,
      to: 8,
    } as const;
    const berths: Berth[] = [
      {
        id: "pela-liga",
        source,
        require: [{ competitionId: ids.league, level: 1 }],
        fallback: [closing],
      },
      {
        id: "por-outra",
        source: otherPath
          ? source
          : { kind: "position", competitionId: ids.league, level: 1, from: 1, to: 1 },
        fallback: [closing],
      },
    ];
    (cup?.divisions[0] as { berths?: Berth[] }).berths = berths;
    const outcome = resolveQualification({
      world: { ...played.end.world, competitions: edited.competitions },
      finished: allSeasons(played.end),
      compositions: played.compositions,
      number: 1,
      year: 2027,
    });
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
    return outcome.result.record.entries;
  }

  it("o rebaixado perde a vaga ligada à divisão de cima, mas mantém a conquistada por outra competição", () => {
    expect(relegated.length).toBeGreaterThan(0);
    const entries = run(true);
    const byLeague = entries.find((entry) => entry.berthId === "pela-liga");
    const byOther = entries.find((entry) => entry.berthId === "por-outra");
    expect(byLeague?.passedFrom).toEqual({ clubId: last, reason: "require" });
    expect(byLeague?.clubId).not.toBe(last);
    expect(byOther?.clubId).toBe(last);
    expect(byOther?.via).toBe("direct");
  });
});
