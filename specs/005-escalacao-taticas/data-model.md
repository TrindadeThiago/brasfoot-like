# Data Model: Escalação e táticas

**Feature**: `005-escalacao-taticas` | **Date**: 2026-10-16

API completa em [contracts/lineup-api.md](contracts/lineup-api.md).

## Lineup (motor, já existente)

| Campo | Tipo | Regras |
|---|---|---|
| `formation` | FormationId | um dos 6 esquemas do catálogo |
| `posture` | `"defensive" \| "balanced" \| "attacking"` | |
| `starters` | `Record<slotId, playerId>` | uma entrada por vaga do esquema; vaga vazia = ausente |
| `bench` | `playerId[]` | ordem escolhida; até 12 (`SEASON_BENCH_LIMIT`) |

Invariantes de uma escalação válida: as 11 vagas preenchidas; nenhum jogador repetido entre
titulares e banco; todos do clube; nenhum suspenso/lesionado (exceto elenco curto, R6).

## LineupIssue (novo)

| Campo | Tipo |
|---|---|
| `code` | `empty_slot \| unknown_slot \| duplicate_player \| not_in_squad \| unavailable \| bench_too_large \| unknown_formation \| no_goalkeeper \| short_squad \| out_of_position` |
| `severity` | `error \| warning \| info` |
| `slotId?` | string |
| `playerId?` | string |
| `params` | `Record<string, string \| number>` (ex.: `reason`, `remaining`, `adequacy`, `max`) |

`LineupValidation = { valid: boolean; issues: LineupIssue[] }`; `valid` ⇔ nenhuma issue `error`.
Com elenco curto (menos de 11 disponíveis), `unavailable` vira `warning` (o time é completado como
o do computador). Params: `unavailable` → `reason`, `remaining`; `no_goalkeeper` e
`out_of_position` → `percent` (rendimento na vaga); `bench_too_large` → `count`, `max`;
`short_squad` → `available`, `required`.
Ordem das issues: por severidade (error, warning, info), depois pela ordem das vagas e do banco.

## LineupChange (novo)

União discriminada por `kind`:

| `kind` | Campos |
|---|---|
| `starter_replaced` | `slotId`, `outId` (quem saiu), `inId` (quem entrou), `reason` (`injury \| suspension`) |
| `bench_removed` | `outId`, `reason` |
| `short_squad` | `fielded` (indisponíveis usados para completar o time) |

## SaveFile v2 (save)

Campos da v1 (ver `specs/004-app-web-saves/data-model.md`) mais:

| Campo | Tipo | Regras |
|---|---|---|
| `formatVersion` | 2 | |
| `lineup` | Lineup | escalação do clube do jogador |
| `lineupNotice?` | LineupChange[] | trocas do último ajuste automático, até o jogador dispensar |

Migração 1 → 2: `lineup = managerAutoLineup(elenco, season.formations[clubId], "balanced",
indisponíveis atuais).lineup`; `lineupNotice` ausente.

Coerência: `season.formations[clubId] === lineup.formation` (atualizado sempre que o jogador troca
de esquema).

## Preferences (localStorage, ampliado)

| Campo | Tipo |
|---|---|
| `squadSort` | `{ column, direction }`? (já existe) |
| `squadFilter` | `{ sector: "all" \| "GK" \| "DEF" \| "MID" \| "ATT"; availability: "all" \| "available" \| "unavailable" }`? |

## Estado da interface (memória)

- `GameState` ganha `simulateIssues?: { kind: "blocked" | "confirm"; issues: LineupIssue[] }`,
  preenchido quando "Simular" encontra erros (bloqueia) ou o aviso de goleiro (pede confirmação);
  os diálogos ficam no layout do jogo, então valem para o botão e para o atalho `S`. Os problemas
  da tela de escalação são recalculados a cada render (não são guardados).
- Seleção em dois passos da tela de escalação: `{ source?: Place }`, com `Place = { kind: "slot",
  slotId } | { kind: "bench", index } | { kind: "out", playerId }`. Escolher um destino com
  `source` definido chama `placePlayer` do motor e limpa a seleção; `Esc` limpa. Se a origem for
  um lugar vazio, o jogador escolhido em seguida vai para ela (`apps/web/src/game/lineup-selection.ts`).

## Transições por rodada

1. Jogador edita → `save.lineup` atualizado e salvo (autosave, igual à 004).
2. Simular → `validateLineup`: `error` ⇒ recusa; `warning` ⇒ confirmação; ok ⇒
   `advanceSeason(…, { [clubId]: lineup })` (ou sem escalação externa no `short_squad`).
3. Depois da rodada (e ao abrir a carreira) → `adjustLineup` com os indisponíveis ⇒ `lineup`
   ajustada; as trocas se somam ao `lineupNotice` ainda não dispensado ⇒ salvo.
4. Jogador dispensa o aviso ⇒ `lineupNotice` removido.
