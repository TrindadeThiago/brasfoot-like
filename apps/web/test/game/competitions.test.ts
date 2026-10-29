// 027 US1: critério de "Minhas competições" e situação do clube em cada uma.
import { describe, expect, it } from "vitest";
import { classifyCompetition, clubCompetitions } from "../../src/game/competitions";
import { careerSave } from "../helpers/saves";

const fixture = (date: string, played: boolean) => ({ date, played });

describe("situação do clube numa competição (027)", () => {
  it("sem nenhum jogo disputado e jogos pela frente: começa em (data do primeiro jogo)", () => {
    const status = classifyCompetition({
      fixtures: [fixture("2027-01-10", false), fixture("2027-01-17", false)],
      seasonOver: false,
      running: true,
      berth: false,
    });
    expect(status).toEqual({ kind: "startsOn", date: "2027-01-10" });
  });

  it("com jogos feitos e ainda por fazer: em disputa", () => {
    expect(
      classifyCompetition({
        fixtures: [fixture("2027-01-10", true), fixture("2027-01-17", false)],
        seasonOver: false,
        running: true,
        berth: false,
      }).kind,
    ).toBe("ongoing");
  });

  it("sem jogos por fazer e competição aberta: eliminado; competição encerrada: encerrada", () => {
    const fixtures = [fixture("2027-01-10", true)];
    expect(
      classifyCompetition({ fixtures, seasonOver: false, running: true, berth: false }).kind,
    ).toBe("eliminated");
    expect(
      classifyCompetition({ fixtures, seasonOver: true, running: true, berth: false }).kind,
    ).toBe("finished");
  });

  it("sem jogos: vaga confirmada, não participa ou vaga em disputa", () => {
    expect(
      classifyCompetition({ fixtures: [], seasonOver: false, running: true, berth: true }).kind,
    ).toBe("berthConfirmed");
    expect(
      classifyCompetition({ fixtures: [], seasonOver: false, running: true, berth: false }).kind,
    ).toBe("notParticipating");
    expect(
      classifyCompetition({ fixtures: [], seasonOver: false, running: false, berth: false }).kind,
    ).toBe("berthPending");
  });
});

describe("clubCompetitions (027)", () => {
  it("a competição do clube vai para Minhas, começando em uma data, e o resto para Demais", () => {
    const save = careerSave("tela");
    const entries = clubCompetitions(save);
    const mine = entries.filter((entry) => entry.mine);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine[0]?.competition.id).toBe(save.league.competitionId);
    expect(mine[0]?.status.kind).toBe("startsOn");
    for (const entry of entries.filter((item) => !item.mine)) {
      expect(entry.status.kind).not.toBe("ongoing");
    }
    // Toda competição do banco aparece exatamente uma vez.
    expect(new Set(entries.map((entry) => entry.competition.id)).size).toBe(entries.length);
  });
});
