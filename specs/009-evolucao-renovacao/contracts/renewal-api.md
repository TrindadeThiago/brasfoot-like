# Contrato: evolução e renovação no motor (`packages/engine/src/renewal/`)

Funções puras exportadas por `@brasfoot-like/engine`. Nenhuma altera a entrada. Tipos em
[data-model.md](../data-model.md).

## Estado inicial e medidas

```ts
/** Estado inicial: sequência de ids depois do maior existente, regulador neutro. */
function initialRenewal(world: CompletedBank): RenewalState;

/** Distribuição de força e idade dos jogadores dos clubes da competição numa data. */
function measureWorld(world: CompletedBank, league: LeagueSeason, date: string): WorldMeasure;

/** Banco de nomes do país (do mod ou o padrão). */
function nameBankFor(world: CompletedBank, countryId: string): { firstNames: string[]; surnames: string[] };
```

## Evolução

```ts
/** Minutos de cada jogador nas partidas da liga com rodada em [fromRound, toRound]. */
function minutesInRounds(league: LeagueSeason, fromRound: number, toRound: number): Map<string, number>;

/** Delta de força de um jogador numa evolução (R4), determinístico pela seed. */
function evolutionDelta(
  player: CompletedPlayer, age: number, participation: number, rng: Rng,
): number;

/**
 * Aplica uma evolução a todos os jogadores da competição: devolve o mundo novo e o registro.
 * `moment` = "mid" | "end"; `fromRound`/`toRound` delimitam a minutagem.
 */
function evolvePlayers(
  world: CompletedBank, league: LeagueSeason, careerSeed: string,
  moment: "mid" | "end", fromRound: number, toRound: number,
): { world: CompletedBank; record: EvolutionRecord };

/** Rodada da liga em que acontece a evolução do meio (⌈R/2⌉). */
function midSeasonRound(league: LeagueSeason): number;
```

`completeCareerRound` (008) passa a receber e devolver o mundo e o estado de renovação:

```ts
function completeCareerRound(
  league, finances, world, round, managerClubId, renewal?: RenewalState, careerSeed?: string,
): { ok: true; league; finances; world: CompletedBank; renewal?: RenewalState } | { ok: false; error };
```

Quando a rodada fechada é `midSeasonRound(league)` e `renewal` é informado, aplica
`evolvePlayers(..., "mid", 1, rodada)` e grava `renewal.lastEvolution`. `advanceCareer` idem.

## Virada

`seasonTurnover` passa a receber `options.world` e `options.renewal` e devolve `world` e `renewal`
(quando informados). Etapas padrão novas, nesta ordem, depois de `close-finance-season`:

| Etapa | Efeito |
|---|---|
| `evolve-players` | evolução do fim (minutagem das rodadas depois da do meio até o fim) |
| `retire-players` | aposentadorias (R5) |
| `regulate-world` | mede o mundo e atualiza o regulador (R8) |
| `generate-youth` | jovens de cada clube (R6) |
| `balance-squads` | reposição e dispensa até as regras de elenco (R7); monta `squadNotice` do clube do jogador |

`TurnoverContext` ganha `world` (o mundo vigente, substituível pelas etapas) e `renewal?`. As etapas
seguintes (`generate-calendars` etc.) usam `context.world`.

## Constantes exportadas

`EVOLUTION_RULES`, `RETIREMENT_RULES`, `YOUTH_RULES`, `SQUAD_RULES`, `REGULATOR_RULES`,
`STAR_THRESHOLD` (80), `DEFAULT_NAME_BANK`.
