import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { simulateMatch } from "../../src/match/engine";
import { clubIds, makeInput } from "./helpers/teams";

// 018 (T001): os 90 minutos da partida não mudam. Resultados de 200 partidas gravados ANTES da
// prorrogação e dos pênaltis; sem `decider`, o motor deve continuar produzindo exatamente isto.
// Para regravar (só com justificativa explícita): UPDATE_BASELINE=1 pnpm vitest run <arquivo>.
const BASELINE = new URL("./__fixtures__/baseline.json", import.meta.url);
const MATCHES = 200;

interface Entry {
  score: [number, number];
  events: number;
  hash: string;
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

function capture(): Entry[] {
  const ids = clubIds();
  const entries: Entry[] = [];
  for (let index = 0; index < MATCHES; index++) {
    const home = ids[index % ids.length] as string;
    let away = ids[(index * 7 + 3) % ids.length] as string;
    if (away === home) away = ids[(index + 1) % ids.length] as string;
    const result = simulateMatch(makeInput(home, away, { seed: `base-${index}` }));
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    entries.push({
      score: [result.result.score.home, result.result.score.away],
      events: result.result.events.length,
      hash: hash(JSON.stringify(result.result.events)),
    });
  }
  return entries;
}

describe("os 90 minutos da partida não mudam (018 T001)", () => {
  const update = process.env.UPDATE_BASELINE === "1";

  it("grava a linha de base quando pedido", () => {
    if (!update) return;
    mkdirSync(dirname(BASELINE.pathname), { recursive: true });
    writeFileSync(BASELINE, `${JSON.stringify(capture(), null, 2)}\n`);
  }, 120_000);

  it(`${MATCHES} partidas iguais às gravadas antes da prorrogação`, () => {
    if (update) return;
    expect(existsSync(BASELINE), "linha de base ausente").toBe(true);
    const expected = JSON.parse(readFileSync(BASELINE, "utf8")) as Entry[];
    const actual = capture();
    expect(actual).toHaveLength(expected.length);
    actual.forEach((entry, index) => {
      expect(entry, `partida ${index}`).toEqual(expected[index]);
    });
  }, 120_000);
});
