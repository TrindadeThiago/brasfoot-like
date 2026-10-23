import { describe, expect, it } from "vitest";
import { advanceCareerSeason, createSave, type SaveFile } from "../src";
import { defaultBank } from "./fixtures";
import { playRounds } from "./helpers";

const NOW = "2026-10-20T00:00:00.000Z";

function endOfSeason(manifestId = "default"): SaveFile {
  const bank = defaultBank() as { manifest: { id: string } };
  bank.manifest.id = manifestId;
  const created = createSave({
    id: "antigo",
    now: NOW,
    managerName: "Ana",
    clubId: "clube-001",
    seed: "adota-copa",
    defaultBank: bank,
    noFiring: true,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  return playRounds(created.save, 100);
}

const hasCup = (save: SaveFile) =>
  save.bank.competitions.some((competition) => competition.format.type === "knockout");

describe("carreiras do mundo padrão sem copa ganham a copa na virada (018)", () => {
  const old = endOfSeason();

  it("a carreira antiga não tem copa na temporada em andamento", () => {
    expect(hasCup(old)).toBe(false);
    expect(old.competitions).toHaveLength(0);
  });

  it("depois da virada o banco tem a copa e a temporada nova joga a copa", () => {
    const turned = advanceCareerSeason(old, NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const next = turned.save;
    expect(hasCup(next)).toBe(true);
    const cup = next.competitions[0];
    expect(cup?.divisions[0]?.bracket).toBeDefined();
    expect(
      next.calendar.days.some((day) =>
        day.slots.some((slot) => slot.competitionId === cup?.competitionId),
      ),
    ).toBe(true);
    expect(next.cupHistory).toEqual([]);
  });

  it("um mod (outro id de manifesto) sem copa continua sem copa", () => {
    const turned = advanceCareerSeason(endOfSeason("meu-mod"), NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    expect(hasCup(turned.save)).toBe(false);
    expect(turned.save.competitions).toHaveLength(0);
  });
});

describe("carreiras com a copa de jogo único ganham a ida e volta na virada", () => {
  /** Carreira de temporada encerrada cuja copa ainda é a antiga: jogo único, só a semifinal dupla. */
  function withOldCup(): SaveFile {
    const turned = advanceCareerSeason(endOfSeason(), NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const bank = {
      ...turned.save.bank,
      competitions: turned.save.bank.competitions.map((competition) =>
        competition.format.type === "knockout"
          ? {
              ...competition,
              format: {
                ...competition.format,
                phases: competition.format.phases.map((phase, index, all) => ({
                  ...phase,
                  legs: index === all.length - 2 ? (2 as const) : (1 as const),
                })),
              },
            }
          : competition,
      ),
    };
    return playRounds({ ...turned.save, bank }, 200);
  }

  it("a temporada nova joga as oitavas, quartas e semifinal em ida e volta", () => {
    const turned = advanceCareerSeason(withOldCup(), NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const cup = turned.save.competitions[0]?.divisions[0]?.bracket;
    expect(cup?.phases.map((phase) => phase.rounds.length)).toEqual([1, 1, 2, 2, 2, 1]);
  }, 120_000);
});
