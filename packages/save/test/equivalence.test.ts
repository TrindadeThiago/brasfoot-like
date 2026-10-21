import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { completeCareerDay } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  createSave,
  isCareerSeasonOver,
  managedClubId,
  type SaveFile,
  seasonStateOf,
  withDayResult,
} from "../src";
import { defaultBank, SERIE_A } from "./fixtures";

// Equivalência do banco padrão (017 R15, SC-004): confrontos, placares e totais financeiros de
// duas temporadas completas, gravados ANTES da 017, devem continuar idênticos com o calendário por
// datas. Para regravar (só com justificativa explícita): UPDATE_BASELINE=1 pnpm vitest run <arquivo>.
const BASELINE = new URL("./__fixtures__/equivalence-baseline.json", import.meta.url);
const SEEDS = ["equivalencia", "banco-padrao"];
const SEASONS = 2;
const NOW = "2026-10-21T00:00:00.000Z";

interface Capture {
  /** Uma linha por rodada de cada temporada: "nível:casa-fora:golsCasa-golsFora" dos jogos. */
  rounds: string[];
  /** Resumo financeiro de cada clube e temporada: "clube|temporada|categoria=valor,...|caixa". */
  finances: string[];
}

/** Um dia de jogos pelo caminho da 017: com o banco padrão, cada dia é uma rodada da liga. */
function playDay(save: SaveFile): SaveFile {
  const managed = managedClubId(save);
  const result = completeCareerDay(
    seasonStateOf(save),
    save.seed,
    managed,
    undefined,
    managed ? { [managed]: save.lineup } : undefined,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return withDayResult(save, result.state);
}

function capture(seed: string): Capture {
  const created = createSave({
    id: seed,
    now: NOW,
    managerName: "Ana",
    clubId: SERIE_A[0] as string,
    seed,
    defaultBank: defaultBank(),
    noFiring: true,
  });
  if (!created.ok) throw new Error("criação");
  let save = created.save;
  const rounds: string[][] = [];
  for (let season = 0; season < SEASONS; season++) {
    const played: string[] = [];
    while (!isCareerSeasonOver(save)) {
      save = playDay(save);
      const lines = save.league.divisions.flatMap((entry) =>
        entry.records
          .filter((record) => record.round === entry.nextRound - 1)
          .map(
            (record) =>
              `${entry.divisionLevel}:${record.home}-${record.away}:${record.score.home}-${record.score.away}`,
          ),
      );
      played.push(lines.join(" "));
    }
    rounds.push(played);
    const turned = advanceCareerSeason(save, NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    save = turned.save;
  }
  const finances = save.finances.seasons.map((summary) => {
    const totals = Object.entries(summary.totals)
      .map(([category, value]) => `${category}=${value}`)
      .join(",");
    return `${summary.clubId}|${summary.season}|${totals}|${summary.startCash}->${summary.endCash}`;
  });
  return { rounds: rounds.flat(), finances };
}

describe("equivalência do banco padrão com a versão anterior (017 SC-004)", () => {
  const update = process.env.UPDATE_BASELINE === "1";

  it("grava a linha de base quando pedido", () => {
    if (!update) return;
    const baseline = Object.fromEntries(SEEDS.map((seed) => [seed, capture(seed)]));
    mkdirSync(dirname(BASELINE.pathname), { recursive: true });
    writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);
  }, 600_000);

  for (const seed of SEEDS) {
    it(`seed ${seed}: confrontos, placares e finanças de ${SEASONS} temporadas iguais`, () => {
      if (update) return;
      expect(existsSync(BASELINE), "linha de base ausente").toBe(true);
      const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as Record<string, Capture>;
      const expected = baseline[seed];
      expect(expected).toBeDefined();
      const actual = capture(seed);
      expect(actual.rounds.length).toBe(expected?.rounds.length);
      actual.rounds.forEach((line, index) => {
        expect(line, `rodada ${index + 1}`).toBe(expected?.rounds[index]);
      });
      expect(actual.finances).toEqual(expected?.finances);
    }, 600_000);
  }
});
