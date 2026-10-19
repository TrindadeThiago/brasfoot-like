import clubs from "@brasfoot-like/default-mod/clubs.json" with { type: "json" };
import competitions from "@brasfoot-like/default-mod/competitions.json" with { type: "json" };
import countries from "@brasfoot-like/default-mod/countries.json" with { type: "json" };
import mod from "@brasfoot-like/default-mod/mod.json" with { type: "json" };
import players from "@brasfoot-like/default-mod/players.json" with { type: "json" };
import { joinBankFiles } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { createSave, SAVE_FORMAT_VERSION, userSeason } from "../src";

const defaultBank = () =>
  joinBankFiles({
    "mod.json": mod,
    "countries.json": countries,
    "competitions.json": competitions,
    "clubs.json": clubs,
    "players.json": players,
  });

const serieA = (competitions[0]?.divisions[0]?.clubIds ?? []) as string[];
const clubId = serieA[0] as string;

function input(overrides: Partial<Parameters<typeof createSave>[0]> = {}) {
  return {
    id: "carreira-1",
    now: "2026-10-16T12:00:00.000Z",
    managerName: "Ana Souza",
    clubId,
    seed: "seed-1",
    defaultBank: defaultBank(),
    ...overrides,
  };
}

describe("createSave (FR-001, FR-003)", () => {
  it("cria o save completo da carreira", () => {
    const result = createSave(input());
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const save = result.save;
    expect(save).toMatchObject({
      formatVersion: SAVE_FORMAT_VERSION,
      id: "carreira-1",
      createdAt: "2026-10-16T12:00:00.000Z",
      savedAt: "2026-10-16T12:00:00.000Z",
      managerName: "Ana Souza",
      clubId,
      seed: "seed-1",
    });
    expect(save.bank.players.every((player) => player.hidden.potential >= player.strength)).toBe(
      true,
    );
    expect(save.league.seed).toBe("seed-1");
    expect(save.league.divisions.every((season) => season.nextRound === 1)).toBe(true);
    expect(userSeason(save).clubIds).toContain(clubId);
    expect(save.history).toEqual([]);
  });

  it("apara o nome do técnico", () => {
    const result = createSave(input({ managerName: "  Ana  " }));
    expect(result.ok && result.save.managerName).toBe("Ana");
  });

  it.each(["", "   ", "x".repeat(41)])("rejeita nome inválido (%j)", (managerName) => {
    const result = createSave(input({ managerName }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("save.invalid_name");
  });

  it("rejeita clube fora da competição", () => {
    const outside = "clube-999";
    const result = createSave(input({ clubId: outside }));
    expect(result).toEqual({
      ok: false,
      error: { code: "save.club_not_in_league", params: { clubId: outside } },
    });
  });

  it("rejeita banco inválido", () => {
    const result = createSave(input({ defaultBank: { manifest: {} } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("save.invalid_bank");
  });

  it("mesma seed e clube ⇒ mesma carreira", () => {
    const a = createSave(input());
    const b = createSave(input({ id: "outra", now: "2026-10-17T00:00:00.000Z" }));
    if (!a.ok || !b.ok) throw new Error("falhou");
    expect(b.save.bank).toEqual(a.save.bank);
    expect(b.save.league).toEqual(a.save.league);
  });
});
