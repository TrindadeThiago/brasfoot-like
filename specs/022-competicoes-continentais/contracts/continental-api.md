# Contrato: API do motor para competições continentais

Funções puras exportadas por `packages/engine/src/index.ts` (módulo `continental/`). Nenhuma usa
PRNG novo, relógio ou APIs de plataforma. Tipos em [data-model.md](../data-model.md).

## Escopo

```ts
isInternational(competition: Competition): boolean;       // sem countryId
internationalCompetitions(world: CompletedBank): Competition[];
participantCountries(world: CompletedBank, competitionId: string): string[];   // ordem do banco
```

## Ligação entre competições

```ts
/**
 * Sela os dropIns cuja fase de origem terminou e cuja fase de destino ainda não começou.
 * Idempotente: sem nada a selar devolve as mesmas referências. Não altera registros nem datas.
 */
sealDropIns(
  world: CompletedBank,
  seasons: readonly LeagueSeason[],
): { seasons: LeagueSeason[]; sealed: SealedDropIn[]; warnings: ContinentalWarning[] };

interface SealedDropIn { competitionId: string; dropInId: string; clubIds: string[]; fromCompetitionId: string }
type ContinentalWarning =
  | { code: "continental.dropin_late"; competitionId: string; dropInId: string }
  | { code: "continental.dropin_exhausted"; competitionId: string; dropInId: string };
```

Contrato de ordem: `clubIds` sai ordenado por (posição na fonte, id). Um clube que já está na
divisão de destino é ignorado e o próximo candidato é usado (FR-008).

`advanceStages(season, world)` (019) passa a respeitar `incoming`: a fase de destino só começa com
a fase anterior terminada e todos os `dropIns` dela selados. Sem `dropIns` o comportamento é o de
antes.

## Prêmios e bilheteria

```ts
competitionAwards(
  world: CompletedBank,
  season: Season,
  matches: readonly DayMatch[],
  startedStages: readonly number[],     // fases que começaram neste dia
): CompetitionPrize[];                  // mesmo formato de CupPrize + `source`

interface CompetitionPrize { clubId: string; amount: number; date: string;
  source: "win" | "draw" | "stage" | "title"; stage: number; phase?: number }
```

- Vitória/empate: só jogos de fases de pontos (`league`/`groups`) da competição; o mandante e o
  visitante recebem o valor declarado.
- `stage`: pago uma vez por clube, quando a fase começa e o clube é participante.
- `title`: pago no dia em que o campeão se define.
- As fases eliminatórias seguem em `cupPrizes` (018); não há pagamento duplo.
- O dia de jogos posta os prêmios com `postPrizes` (008) e a origem fica no extrato por
  `competitionId`.

## Reputação

```ts
continentalReputation(
  world: CompletedBank,
  finished: readonly LeagueSeason[],
): { clubs: Record<string, number>; changes: { clubId: string; competitionId: string; delta: number }[] };
```

Etapa de virada `continental-reputation`: aplica `delta` a `club.reputation` com teto
`awards.reputationCeiling` e `clampReputation`. Sem `awards.reputation`, não faz nada.

## Metas e diretoria

```ts
continentalGoal(world, league, clubId): SeasonGoals["continental"] | undefined;
evaluateContinental(goal, reached): "met" | "missed";
```

`startSeasonGoals` inclui `continental` quando o clube participa; `evaluateSeason` soma o fator
`continentalMet`/`continentalMissed` à confiança e o título continental aos `achievements`.

## Campanha, visão e histórico

```ts
clubCampaign(world, seasons, competitionId, clubId): ClubCampaign | undefined;
continentalView(world, season): ContinentalView;     // fases, grupos, chaveamento, origens
continentalEdition(league: LeagueSeason): ContinentalEdition | undefined;   // undefined se não terminou
```

`ContinentalView` traz, por fase: tipo, rodadas/datas, grupos com tabela e zonas (classificam,
passam à menor, eliminados), chaveamento e a origem de cada participante
(`Origin`, incluindo `dropIn`).

## Erros

`continental.dropin_exhausted` é erro de dado em execução (`SeasonError`); a validação do banco
recusa antes (`continental.dropin_count`). Nenhum caminho cria participante a menos em silêncio.

## Determinismo

Mesma entrada, mesma saída; a ordem é fase → posição → id. Salvar e carregar no meio de uma fase
de grupos ou entre a selagem e o início da fase de destino produz o mesmo resultado (teste).
