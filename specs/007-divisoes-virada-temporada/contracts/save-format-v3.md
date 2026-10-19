# Contrato: formato de save v3 (`packages/save`)

Complementa o contrato do save da 004/005. `SAVE_FORMAT_VERSION = 3`.

## Estrutura

```ts
interface SaveFile {
  formatVersion: 3;
  id: string;
  createdAt: string;
  savedAt: string;
  managerName: string;
  clubId: string;
  seed: string;              // careerSeed
  bank: CompletedBank;       // cópia do mod, nunca alterada pela virada
  league: LeagueSeason;      // substitui `season` (v2)
  history: SeasonHistoryEntry[];
  lineup: Lineup;
  lineupNotice?: LineupChange[];
}
```

## Criação (`createSave`)

- Aceita qualquer `clubId` presente em alguma divisão da primeira competição do banco; senão
  `save.club_not_in_league` (mesmo código; texto passa a "não disputa a competição").
- `league = createLeagueSeason(bank, { competitionId, careerSeed: seed })`; `history = []`.
- A escalação inicial usa a `Season` da divisão do clube.

## Novas funções do pacote

```ts
function userSeason(save: SaveFile): Season;           // divisão que contém save.clubId
function userDivisionLevel(save: SaveFile): number;
function seasonYearOf(save: SaveFile): number;         // league.year (antes: ano do banco)
function currentDate(save: SaveFile): string;          // seasonDate(referenceDate, league.year)

/**
 * Virada da carreira (atômica): seasonTurnover + esquema do clube do jogador = lineup.formation
 * + escalação ajustada às ausências herdadas. Devolve o save novo (não salva).
 */
function advanceCareerSeason(save: SaveFile, now: string):
  | { ok: true; save: SaveFile }
  | { ok: false; error: SeasonError };
```

`SaveSummary` ganha `divisionLevel: number`; `seasonYear` = `league.year`; `round`/`totalRounds`/
`seasonOver` vêm da liga (`leagueRound`, maior calendário, `isLeagueSeasonOver`).

## Migração v2 → v3

1. `year` = ano de `bank.manifest.referenceDate`; `number = 1`; `seed = save.seed`.
2. A `season` v2 vira a divisão do seu nível (`season.divisionLevel`, hoje 1).
3. Para cada outra divisão da competição: `createSeason` com a mesma seed e
   `advanceSeason(…, { rounds: season.nextRound - 1 })` — fica na mesma rodada (ou encerrada).
4. `league.divisions` ordenado por nível; `history = []`; remove `season`; `formatVersion = 3`.

Determinística: o mesmo save v2 sempre gera o mesmo v3.

## Validação ao abrir

Além das regras atuais (envelope, banco, escalação): `league.divisions.length ≥ 1`; toda
`Season` com `seed === league.seed`; `league.seed === leagueSeasonSeed(save.seed, league.number)`;
o clube do jogador em exatamente uma divisão; divisões não encerradas com o mesmo `nextRound`.
Qualquer falha → `corrupt`.

## Fixtures e testes

- Builders `saveV2MidSeason()` (rodada 10) e `saveV2SeasonOver()` (38 rodadas) em `test/fixtures.ts`:
  abrem, migram para v3, a Série A é idêntica à v2, a Série B está na mesma rodada, e o encerrado
  aceita `advanceCareerSeason`.
- v1 → v3 em cadeia continua abrindo (fixture v1 existente).
