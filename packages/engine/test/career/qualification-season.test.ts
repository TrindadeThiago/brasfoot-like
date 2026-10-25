import { describe, expect, it } from "vitest";
import { clubFixtures } from "../../src/career/season-state";
import {
  clubQualification,
  participantOrigins,
  qualificationOutcome,
} from "../../src/qualification/queries";
import { superCupWorld } from "../qualification/helpers";
import { allSeasons, playSeasons } from "./qualification-helpers";

describe("temporada com competição alimentada (021 US2)", () => {
  const { world, ids } = superCupWorld();
  const { seasons, history } = playSeasons(world, "temporada-vagas", 3);

  it("quem se classificou joga a supercopa no calendário da temporada seguinte", () => {
    for (const { start } of seasons) {
      const cup = allSeasons(start).find((entry) => entry.competitionId === "supercopa-teste");
      const participants = cup?.divisions[0]?.clubIds ?? [];
      expect(participants).toHaveLength(2);
      for (const clubId of participants) {
        const games = clubFixtures(start, clubId).filter(
          (fixture) => fixture.competitionId === "supercopa-teste",
        );
        expect(games, clubId).toHaveLength(1);
      }
      const outsider = ids.top.find((clubId) => !participants.includes(clubId)) as string;
      expect(
        clubFixtures(start, outsider).filter(
          (fixture) => fixture.competitionId === "supercopa-teste",
        ),
      ).toHaveLength(0);
    }
  }, 300_000);

  it("os participantes mudam com o resultado e seguem o registro da classificação", () => {
    const record = history.qualificationHistory?.[0];
    const second = seasons[1]?.start;
    const cup = allSeasons(second as NonNullable<typeof second>).find(
      (entry) => entry.competitionId === "supercopa-teste",
    );
    const fromRecord = (record?.entries ?? [])
      .filter((entry) => entry.competitionId === "supercopa-teste")
      .map((entry) => entry.clubId)
      .sort();
    expect([...(cup?.divisions[0]?.clubIds ?? [])].sort()).toEqual(fromRecord);
  });
});

describe("consultas da classificação (021 contratos)", () => {
  const { world } = superCupWorld();
  const { seasons, history } = playSeasons(world, "consultas-vagas", 2);
  const records = history.qualificationHistory ?? [];

  it("participantOrigins devolve a origem de cada participante", () => {
    const second = seasons[1]?.start as NonNullable<(typeof seasons)[number]>["start"];
    const origins = participantOrigins(second, "supercopa-teste");
    const clubs = allSeasons(second).find((entry) => entry.competitionId === "supercopa-teste");
    expect(Object.keys(origins).sort()).toEqual([...(clubs?.divisions[0]?.clubIds ?? [])].sort());
  });

  it("qualificationOutcome e clubQualification leem o registro", () => {
    const outcome = qualificationOutcome(records, 1, "supercopa-teste");
    expect(outcome.map((entry) => entry.berthId)).toEqual(["campeao-liga", "campeao-copa"]);
    const club = outcome[0]?.clubId as string;
    expect(
      clubQualification(records.slice(0, 1), club).map((entry) => entry.competitionId),
    ).toContain("supercopa-teste");
    expect(qualificationOutcome(records, 99, "supercopa-teste")).toEqual([]);
  });
});

describe("histórico de classificações (021 FR-019)", () => {
  const { world } = superCupWorld();
  const { history } = playSeasons(world, "historico-vagas", 3);
  const records = history.qualificationHistory ?? [];

  it("guarda um registro por temporada, pequeno e em ordem", () => {
    expect(records.map((record) => record.number)).toEqual([1, 2, 3]);
    for (const record of records) {
      expect(record.entries.length).toBe(2);
      expect(record.entries.every((entry) => entry.competitionId === "supercopa-teste")).toBe(true);
      expect(JSON.stringify(record).length).toBeLessThan(2000);
    }
  });

  it("o caminho de cada vaga fica registrado: direta ou repasse com motivo", () => {
    for (const entry of records.flatMap((record) => record.entries)) {
      if (entry.via === "pass") {
        expect(entry.passedFrom?.reason).toBeDefined();
      } else {
        expect(entry.passedFrom).toBeUndefined();
      }
    }
  });
});
