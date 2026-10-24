import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { generateCalendar } from "../../src/season/calendar";
import { advanceSeason } from "../../src/season/season";
import { standings } from "../../src/season/standings";
import { newSeason, testWorld } from "./helpers/world";

// 019 (T001): a liga não muda. Calendários e tabelas gravados ANTES das fases; uma `Season` sem
// `stages` deve continuar produzindo exatamente isto (spec FR-034, SC-009).
// Para regravar (só com justificativa explícita): UPDATE_BASELINE=1 pnpm vitest run <arquivo>.
const BASELINE = new URL("./__fixtures__/stages-freeze.json", import.meta.url);

interface Frozen {
  calendars: Record<string, string>;
  standings: Record<string, string>;
}

/** Hash FNV-1a de 32 bits do texto, em hexadecimal. */
function hash(text: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value.toString(16);
}

function clubs(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `c${String(index + 1).padStart(2, "0")}`);
}

function calendars(): Record<string, string> {
  const out: Record<string, string> = {};
  const sizes = [4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 19, 20];
  let seedIndex = 0;
  for (const size of sizes) {
    for (const turns of [1, 2]) {
      const seed = `freeze-${seedIndex++}`;
      out[`${size}x${turns}:${seed}`] = hash(
        JSON.stringify(generateCalendar(clubs(size), turns, seed)),
      );
    }
  }
  return out;
}

function table(season: ReturnType<typeof newSeason>): string {
  return hash(JSON.stringify(standings(season, testWorld())));
}

function tables(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const seed of ["freeze-liga-1", "freeze-liga-2"]) {
    const season = newSeason(seed);
    const middle = advanceSeason(season, testWorld(), { rounds: 10 });
    if (!middle.ok) throw new Error(JSON.stringify(middle.error));
    out[`${seed}:r10`] = table(middle.season);
    const end = advanceSeason(middle.season, testWorld(), { toEnd: true });
    if (!end.ok) throw new Error(JSON.stringify(end.error));
    out[`${seed}:fim`] = table(end.season);
  }
  return out;
}

describe("a liga não muda (019 T001)", () => {
  const update = process.env.UPDATE_BASELINE === "1";

  it("grava a linha de base quando pedido", () => {
    if (!update) return;
    const baseline: Frozen = { calendars: calendars(), standings: tables() };
    mkdirSync(dirname(BASELINE.pathname), { recursive: true });
    writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);
  }, 120_000);

  it("os 24 calendários continuam idênticos", () => {
    if (update) return;
    expect(existsSync(BASELINE), "linha de base ausente").toBe(true);
    const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as Frozen;
    expect(calendars()).toEqual(baseline.calendars);
  });

  it("as tabelas da Série A continuam idênticas", () => {
    if (update) return;
    expect(existsSync(BASELINE), "linha de base ausente").toBe(true);
    const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as Frozen;
    expect(tables()).toEqual(baseline.standings);
  }, 120_000);
});
