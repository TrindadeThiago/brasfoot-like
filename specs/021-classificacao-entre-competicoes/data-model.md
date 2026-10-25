# Data Model: Classificação entre competições

Tipos do motor (`packages/engine/src/qualification/types.ts`) e extensões do banco e do save.
Campos novos são opcionais; bancos e saves anteriores continuam válidos.

## Banco (mod): `Division.berths`

```ts
type BerthSource =
  | { kind: "position"; competitionId: string; level: number; from: number; to: number }
  | { kind: "champion"; competitionId: string }
  | { kind: "runnerUp"; competitionId: string }
  | { kind: "reached"; competitionId: string; phase: number };   // ao menos a fase (1 = 1ª)

interface Berth {
  id: string;                         // único na divisão
  source: BerthSource;                // quantos clubes: to-from+1; reached: todos que alcançaram; demais: 1
  entry?: { stage?: number; phase?: number };   // fase em que o clube entra (padrão: a primeira)
  fallback?: BerthSource[];           // ordem de repasse; o último item é o fechamento
  require?: DivisionRef[];            // o clube precisa estar numa destas divisões na temporada seguinte
  forbid?: DivisionRef[];             // não pode estar em nenhuma destas
}
interface DivisionRef { competitionId: string; level: number }
```

Regras de validação (arquivo/campo em cada mensagem):

- `source`, `fallback`, `require`, `forbid` apontam para competições, divisões e fases existentes
  (`position.level` existe; `to ≥ from`; `to ≤ tamanho da divisão`; `reached.phase` existe).
- A soma de clubes das vagas, por fase de entrada, é igual ao esperado da fase (primeira fase:
  `clubIds.length` menos entradas tardias; copas e fases: `stageParticipantCounts` e entradas).
- Em divisão com vagas, `clubIds` do banco (temporada 1) satisfaz as mesmas contagens.
- Último item de `fallback`: `position` cobrindo uma divisão inteira com ao menos o número de
  participantes do destino; sem `fallback`, a vaga não é repassável e o banco só é válido se a
  fonte é `position` de uma divisão cuja tabela inteira também é o fechamento (caso em que o
  repasse é a próxima posição da mesma tabela).
- Última divisão de uma pirâmide: `relegationSlots > 0` só com vagas externas somando o mesmo número.
- Ciclos em `require`/`forbid` (R9) → `qualification.cycle`.

## Competição de mata-mata com uma fase

`knockout.phases`: 1 a 8 fases (era 2 a 8). Final única: `legs`, `tiebreakers`, `home`/`neutral` já
existem na fase. Uma competição de uma fase tem de 2 clubes.

## Estado da temporada

```ts
// career/types.ts
interface LeagueSeason {
  // …
  /** Como cada participante chegou (R7); presente só em competições com vagas. */
  origins?: Record<string, Origin>;
}

type Origin =
  | { kind: "bank" }
  | { kind: "stay" }
  | { kind: "promotion" }
  | { kind: "berth"; berthId: string; source: BerthSource["kind"]; position?: number; from: string }
  | { kind: "pass"; berthId: string; fromClubId: string; reason: PassReason };

type PassReason = "duplicate" | "ineligible" | "require" | "forbid";
```

`from` na origem `berth` é o `competitionId` da fonte. `origins` entra no save apenas com códigos
curtos (um objeto por clube), e a UI traduz.

## Resultado da resolução

```ts
interface QualificationRecord {            // uma por temporada, guardado no histórico
  number: number; year: number;            // da temporada encerrada
  entries: {
    competitionId: string; level: number; berthId: string; clubId: string;
    via: "direct" | "pass";
    passedFrom?: { clubId: string; reason: PassReason };
  }[];
}

interface QualificationResult {
  compositions: Record<string, Record<number, string[]>>;     // por competição e nível
  entrants: Record<string, Record<number, Record<string, { stage?: number; phase?: number }>>>;
  origins: Record<string, Record<string, Origin>>;            // por competição
  record: QualificationRecord;
}
```

`entrants` só traz clubes que entram numa fase que não é a primeira; a criação das fases
(`stages/create`, copa) usa `entrants` no lugar dos `enter` estáticos do banco nas temporadas ≥ 2.

## Zonas

```ts
interface BerthZone {
  from: number; to: number;                 // posições da divisão de origem
  competitionId: string; level: number;     // destino
  entry?: { stage?: number; phase?: number };
  berthId: string;
}
interface DivisionZones {                   // career/league.ts, estendido
  level: number; promotion: number; relegation: number;
  berths: BerthZone[];
}
```

Zonas só de `source.kind === "position"` na divisão. `champion`/`runnerUp` aparecem como zona de
posição 1 e 2 quando a fonte é uma liga de divisão única; em copas, aparecem na página da competição
(chaveamento), não na tabela.

## Metas, notícias e histórico

- Meta da diretoria: nível `qualify` com `competitionId` do destino e `position` da última posição
  de vaga direta; resultado final por `QualificationRecord`.
- Notícia: `qualification` (campeão e clube do jogador) com `competitionId`, `clubId`, `via`.
- `CareerHistory.qualificationHistory: QualificationRecord[]`, uma entrada por temporada.

## Save

`SAVE_FORMAT_VERSION`: 15 → 16. Migração v15 → v16: apenas carimba a versão (todos os campos novos
são opcionais). Fixtures v15 (início, meio, fim de temporada) abrem e continuam jogando.
