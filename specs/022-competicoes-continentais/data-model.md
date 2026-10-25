# Data Model: Competições continentais

Tipos do motor (`packages/engine/src/continental/types.ts`) e extensões do banco e do save. Todos
os campos novos são opcionais; bancos e saves anteriores continuam válidos.

## Banco (mod)

### `Competition.countryId` opcional

```ts
interface Competition {
  id: string;
  countryId?: string;          // ausente = competição entre países (022 R1)
  name: string;
  format: CompetitionFormat;
  divisions: Division[];
  awards?: Awards;             // 022 R4
  // …economy, market, board, fans, news, schedule, discipline, fitness como antes
}
```

Regras de validação (arquivo/campo em cada mensagem):

- `countryId` ausente exige `divisions.length === 1` e `format.type ∈ { "stages", "knockout",
  "groups" }` (`continental.shape`).
- Os clubes da divisão existem, estão em alguma liga principal (020) e pertencem a **ao menos 2
  países** (`continental.single_country`, `continental.club_without_league`).
- `economy`, `market`, `board`, `fans`, `news`, `fitness` não são lidos de competição sem país; se
  declarados, a validação avisa (`continental.rules_ignored`), sem recusar.
- `mainCompetitions` e `unique.duplicate_club_in_country` ignoram essas competições.

### `Awards` (prêmios e reputação)

```ts
interface Awards {
  win?: number;                // por vitória em fase de pontos (grupos/liga)
  draw?: number;               // por empate em fase de pontos
  stage?: AwardByStage[];      // paga uma vez quando o clube começa a fase
  title?: number;              // pago ao campeão (além do prize da final, 018)
  reputation?: ReputationAward[];
  reputationCeiling?: number;  // padrão 95
}
interface AwardByStage { stage: number; phase?: number; amount: number }   // a partir de 1
interface ReputationAward { reached: { stage: number; phase?: number }; points: number }  // 1..5
```

Regras: `stage`/`phase` existem na divisão; valores não negativos; `reputation` ordenado do menos ao
mais profundo e crescente; `reputationCeiling` entre 50 e 100.

### `Division.dropIns` (ligação entre competições)

```ts
interface DropIn {
  id: string;                                  // único na divisão
  source: DropInSource;
  entry: { stage: number; phase?: number };    // onde o clube entra no destino
}
type DropInSource =
  | { kind: "position"; competitionId: string; stage: number; from: number; to: number }
  | { kind: "eliminated"; competitionId: string; stage: number; phase: number };
```

- `position`: posições `from..to` **de cada grupo** (ou da tabela) da fase `stage` da origem.
  Contagem = `grupos × (to − from + 1)`.
- `eliminated`: perdedores da fase eliminatória `phase` (a partir de 1) da fase `stage` da origem.
  Contagem = confrontos da fase.
- `entry.phase` só vale para destino eliminatório.

Regras de validação:

- Origem e destino existem; origem ≠ destino (`continental.dropin_self`).
- A contagem das fontes, somada às entradas de `berths` e às vagas diretas, fecha com o tamanho da
  fase de destino (`continental.dropin_count`).
- Ordem de datas: a primeira rodada da fase de destino cai depois da última da fase de origem
  (`continental.dropin_before_source`).
- Quem cai da fase de origem **sem** estar na lista de qualificados pode ser fonte; um clube
  qualificado na origem nunca é fonte (`continental.dropin_qualified`).

## Estado

```ts
// stages/types.ts
interface StageState {
  // …campos da 019
  /** Clubes que chegam por ligação, selados ao fim da fase de origem (022 R3). */
  incoming?: { dropInId: string; clubIds: string[] }[];
}

// stages/rules.ts
type IncomingStatus = "waiting" | "sealed";   // derivado, não guardado
```

`advanceStages` começa a fase `n` quando a fase `n − 1` terminou **e** todo `dropIn` com
`entry.stage === n` está selado (R3). A selagem é feita por `sealDropIns` (contrato) no dia de
jogos, depois de fechar as rodadas.

`Origin` (021) ganha o valor `{ kind: "dropIn"; dropInId: string; from: string; position?: number }`,
usado só na página da competição.

## Resultado da campanha

```ts
interface ClubCampaign {
  competitionId: string;
  clubId: string;
  /** Fase atual ou última alcançada (stage a partir de 1, phase opcional). */
  reached: { stage: number; phase?: number };
  status: "playing" | "eliminated" | "champion" | "moved";    // "moved" = passou à competição menor
  matches: CampaignMatch[];          // jogos disputados em ordem
  next?: { date: string; opponentId: string; home: boolean; label: string };
  awards: { source: "win" | "draw" | "stage" | "title" | "phase"; amount: number; date: string }[];
  remaining: { stage: number; phase?: number }[];   // fases ainda possíveis
}
```

`label` é código (`stage.groups.round`, `phase.quarter`), traduzido pela UI.

## Histórico

```ts
interface ContinentalEdition {
  number: number; year: number; competitionId: string;
  championId: string; runnerUpId: string;
  final: CupHistoryEntry["final"];                 // reaproveita a 018
  reached: Record<string, { stage: number; phase?: number }>;   // melhor fase por clube
  groups?: { id: string; table: HistoryRow[] }[];  // tabelas finais da fase de grupos
}
// CareerHistory.continentalHistory: ContinentalEdition[]  (uma por edição de cada competição)
```

Carreira do técnico (012): `CoachSeasonEntry.continental?: { competitionId, reached, champion }`;
`CoachCareer.continentalTitles` e `continentalBest` derivados.

## Metas e notícias

- `SeasonGoals.continental?: { competitionId: string; target: { stage: number; phase?: number } }`.
- Fatores de confiança novos: `continentalMet`, `continentalMissed` (nos `CONFIDENCE_FACTORS`).
- Manchetes: `continental.qualified` (clube e competição), `.advanced` (fase), `.eliminated`
  (fase), `.champion` (campeão e vice), `.thrashing` (placar com diferença ≥ 4).

## Regras por competição (dados, com padrão)

Campos planos opcionais, como os demais blocos de regras, lidos da competição principal do país:

```ts
// fans
continentalMatchPct?: number;      // peso do jogo da competição, % da liga (padrão 100)
continentalExpectation?: number;   // posições a mais de expectativa de quem a disputa (padrão 0)
continentalTitle?: number;         // humor do título (padrão 0)
// board
continentalTopPct?: number;        // até este % da reputação entre os participantes: semifinal (34)
continentalMidPct?: number;        // até este %: mata-mata (67); acima: passar da preliminar
continentalMet?: number;           // confiança por meta cumprida (5)
continentalMiss?: number;          // confiança por meta perdida (5)
// news.relevance
continentalAdvanced | continentalEliminated | continentalChampion | continentalRout
```

Padrões neutros mantêm bancos sem a competição idênticos.

## Save

`SAVE_FORMAT_VERSION`: 16 → 17. Migração v16 → v17: apenas carimba a versão (todos os campos novos
são opcionais). Fixtures v16 (início, meio, fim de temporada) abrem e continuam jogando.

## Exemplo de banco (resumo)

```text
competição "copa-continental" (sem countryId, schedule: weekday 3 = quarta)
  divisão 1: format stages
    fase 1  knockout preliminar (16 clubes → 8, ida e volta)
    fase 2  groups 8×4 (draw: separate country; 8 vêm da fase 1, 24 por berths entry.stage 2)
    fase 3  knockout (oitavas → final)
  berths: 40 vagas por país (liga, copa, campeão anterior) + fallback da 021
competição "copa-secundaria" (sem countryId)
  divisão 1: stages
    fase 1  knockout playoff (8 dropIns eliminated/position-3 da maior + 8 berths)
    fase 2  knockout (8 vencedores + 8 berths entry.stage 2 → final)
  dropIns: [{ source: position stage 2, from 3, to 3, entry: { stage 1 } }]
```
