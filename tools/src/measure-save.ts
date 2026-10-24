// Tamanho de cada parte do save de um mundo grande no fim de uma temporada (020 T003).
// Uso: pnpm sim:size [--countries 10] [--seasons 1] [--seed mundo-grande]
import { parseArgs } from "node:util";
import {
  completeCareerDay,
  generateWorldBank,
  type LeagueSeason,
  type ModPackage,
} from "@brasfoot-like/engine";
import {
  advanceCareerSeason,
  createSave,
  isCareerSeasonOver,
  managedClubId,
  type SaveFile,
  seasonStateOf,
  withDayResult,
} from "@brasfoot-like/save";

const { values } = parseArgs({
  options: {
    countries: { type: "string", default: "10" },
    seasons: { type: "string", default: "1" },
    seed: { type: "string", default: "mundo-grande" },
  },
});

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;
const size = (value: unknown) => JSON.stringify(value).length;

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

function report(label: string, save: SaveFile): void {
  console.log(`\n${label}: total ${kb(size(save))}`);
  const parts = Object.entries(save)
    .map(([key, value]) => [key, size(value)] as const)
    .sort((a, b) => b[1] - a[1]);
  for (const [key, bytes] of parts.slice(0, 12)) console.log(`  ${key.padEnd(18)} ${kb(bytes)}`);
  const leagues: LeagueSeason[] = [save.league, ...save.competitions];
  const rows = leagues.map((league) => {
    const records = league.divisions.reduce((sum, season) => sum + size(season.records), 0);
    const other = league.divisions.reduce(
      (sum, season) => sum + size({ ...season, records: [] }),
      0,
    );
    return { id: league.competitionId, records, other };
  });
  console.log("  por competição (registros de jogos / resto da temporada):");
  for (const row of rows.sort((a, b) => b.records - a.records).slice(0, 6)) {
    console.log(`    ${row.id.padEnd(22)} ${kb(row.records).padStart(9)} / ${kb(row.other)}`);
  }
  console.log(
    `  bank.players ${kb(size(save.bank.players))}, bank.clubs ${kb(size(save.bank.clubs))}`,
  );
  console.log(
    `  finances.ledger ${kb(size(save.finances.ledger))}, gates ${kb(size(save.finances.gates))}, seasons ${kb(size(save.finances.seasons))}`,
  );
  console.log(
    `  market.log ${kb(size(save.market.log))}, reports ${kb(size(save.market.reports))}`,
  );
  console.log(
    `  news.feed ${kb(size(save.news.feed))}, records ${kb(size(save.news.records))}, allTime ${kb(size(save.news.allTime))}`,
  );
}

const countries = Number(values.countries);
const bank = structuredClone(
  generateWorldBank({
    seed: values.seed ?? "mundo-grande",
    countries,
    divisionsPerCountry: 2,
    clubsPerDivision: 20,
    cup: true,
  }),
) as ModPackage;
const created = createSave({
  id: "tamanho",
  now: "2026-10-24T12:00:00.000Z",
  managerName: "Ana",
  clubId: bank.clubs[0]?.id ?? "",
  seed: values.seed ?? "mundo-grande",
  defaultBank: bank,
  noFiring: true,
});
if (!created.ok) throw new Error(JSON.stringify(created.error));
let save = created.save;
report("início", save);
for (let season = 1; season <= Number(values.seasons); season++) {
  while (!isCareerSeasonOver(save)) save = playDay(save);
  report(`fim da temporada ${season}`, save);
  const turned = advanceCareerSeason(save, "2026-10-24T12:00:00.000Z");
  if (!turned.ok) throw new Error(JSON.stringify(turned.error));
  save = turned.save;
  report(`início da temporada ${season + 1}`, save);
}
