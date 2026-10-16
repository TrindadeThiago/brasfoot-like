# Data Model: Aplicação web, novo jogo e saves

**Feature**: `004-app-web-saves` | **Date**: 2026-10-16

Formato completo em [contracts/save-format.md](contracts/save-format.md).

## SaveFile (versão 1)

| Campo | Tipo | Regras |
|---|---|---|
| `formatVersion` | inteiro | = `SAVE_FORMAT_VERSION` (1) depois das migrações |
| `id` | string | identificador único (gerado na interface) |
| `createdAt`, `savedAt` | string ISO 8601 | relógio do dispositivo (camada de interface) |
| `managerName` | string | 1–40 caracteres, sem espaços nas pontas |
| `clubId` | Id | clube da Série A no `bank` |
| `seed` | string | seed da carreira (temporada e atributos ocultos) |
| `bank` | CompletedBank | cópia do banco padrão com atributos ocultos completos (FR-003) |
| `season` | Season | estado da temporada (feature 003) |

Invariantes: `clubId` está em `season.clubIds`; `season.seed === seed`.

## SaveSummary

| Campo | Tipo |
|---|---|
| `id` | string |
| `formatVersion` | inteiro |
| `managerName` | string |
| `clubId`, `clubName`, `clubCrest` | Id, string, Crest |
| `seasonYear` | inteiro (ano de `bank.manifest.referenceDate`) |
| `round` | inteiro (`season.nextRound`, limitado a 38) |
| `seasonOver` | boolean |
| `savedAt` | string ISO |

Gravado na mesma transação do `SaveFile`. Situação mostrada na lista: `ok`, `future_version`
(`formatVersion` > atual) ou `corrupt` (save ilegível/inválido ao abrir).

## LoadResult

`{ status: "ok"; save: SaveFile; migratedFrom?: number }` |
`{ status: "future_version"; version: number }` | `{ status: "corrupt"; reason: string }`.

## Migration

`{ from: number; migrate(raw: unknown): unknown }` — de `from` para `from + 1`; aplicadas em
sequência por `migrateSave`.

## Preferences (localStorage)

| Campo | Tipo |
|---|---|
| `lastCareerId` | string? |
| `squadSort` | `{ column, direction }`? |

Chave `brasfoot-like:preferences`. Preferências são conveniências por navegador; perdê-las não perde progresso.

## Estado da interface (memória)

`GameState { status: "idle" | "loading" | "ready" | "error"; save?: SaveFile; lastRound?:
MatchRecord[]; saving: "idle" | "saving" | "saved" | "failed"; savingMessage?: string;
conflict: boolean; error?: string }` (`savingMessage` e `error` são chaves de i18n).

Transições: `idle → loading → ready` ao abrir; `ready → ready` a cada rodada simulada
(`saving: saving → saved | failed`); `conflict = true` quando outra aba gravou depois.
