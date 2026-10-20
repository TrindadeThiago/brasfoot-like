import { readFileSync } from "node:fs";
import { join } from "node:path";
import { advanceCareerSeason, createSave } from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";
import { playRounds } from "../../save/test/helpers";
import { readModPackage, writeModPackage } from "../src";
import { DEFAULT_MOD, EXAMPLE_MOD, modBank } from "./fixtures";

const PUBLIC_ZIP = join(import.meta.dirname, "../../../apps/web/public/mods/exemplo.zip");

describe("mod de exemplo (015 US3, critério de aceite 2, SC-003)", () => {
  const example = modBank(EXAMPLE_MOD);

  it("é válido e tem país e competição diferentes do padrão", () => {
    const result = readModPackage(writeModPackage(example));
    if (!result.ok) throw new Error(JSON.stringify(result.errors.slice(0, 3)));
    const standard = modBank(DEFAULT_MOD);
    expect(result.summary.id).toBe("exemplo-norvalia");
    expect(result.bank.countries.map((country) => country.id)).not.toEqual(
      standard.countries.map((country) => country.id),
    );
    expect(result.bank.competitions[0]?.name).not.toBe(standard.competitions[0]?.name);
    expect(result.summary.divisions.map((division) => division.clubs)).toEqual([12, 12]);
  });

  it("uma carreira joga a temporada inteira e a virada", () => {
    const created = createSave({
      id: "exemplo",
      now: "2026-10-20T00:00:00.000Z",
      managerName: "Ana",
      clubId: example.clubs[0]?.id ?? "",
      seed: "exemplo",
      defaultBank: example,
    });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const end = playRounds(created.save, 100);
    const turned = advanceCareerSeason(end, "2026-10-20T00:00:00.000Z");
    if (!turned.ok) throw new Error("virada");
    expect(turned.save.history).toHaveLength(end.history.length + 1);
  }, 120_000);

  it("o pacote público é o mesmo gerado a partir de mods/exemplo", () => {
    expect(new Uint8Array(readFileSync(PUBLIC_ZIP))).toEqual(writeModPackage(example));
  });
});
