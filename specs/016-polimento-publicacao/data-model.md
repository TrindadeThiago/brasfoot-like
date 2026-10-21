# Data Model: Polimento e publicação (016)

Nenhuma mudança no motor nem no formato do save (Princípio VI não se aplica: tudo abaixo vive
nas preferências do navegador ou em arquivos do build).

## Preferences (estendida) — `apps/web/src/storage/preferences.ts`

Chave localStorage existente `brasfoot-like:preferences` (não muda, para não perder as
preferências atuais). Lida por um schema Zod em que cada campo tem `.catch(<padrão>)`: valor
inválido ou desconhecido volta ao padrão sem erro (FR-012).

| Campo | Tipo | Padrão | Origem |
|---|---|---|---|
| `lastCareerId` | string? | — | existente |
| `squadSort`, `squadFilter`, `roundMode` | (como hoje) | — | existente |
| `roundSpeed` | `"slow" \| "normal" \| "fast"` | `"normal"` | existente; exposto em Configurações |
| `autoPause` | boolean | `true` | existente; exposto em Configurações |
| `theme` | `"system" \| "light" \| "dark"` | `"system"` | **novo** |
| `locale` | string (id de `LOCALES`) | `"pt-BR"` | **novo**; desconhecido → `"pt-BR"` |
| `tips` | `{ dismissed: TipId[]; skipAll: boolean }` | `{ dismissed: [], skipAll: false }` | **novo** |
| `lastSeenVersion` | string (semver)? | — | **novo** |

Regras:

- Reativar dicas (Configurações) ⇒ `tips = { dismissed: [], skipAll: false }`.
- Primeiro acesso (boas-vindas) ⇔ nenhuma carreira salva **e** `tips` ausente nas preferências.
- Aviso de novidades ⇔ `lastSeenVersion` definido e ≠ versão atual, **ou** ausente com ao menos
  uma carreira salva. Ao dispensar/abrir as notas ⇒ `lastSeenVersion = versão atual`. Sem
  carreira e sem `lastSeenVersion` ⇒ grava a versão atual em silêncio.
- Armazenamento indisponível: tudo funciona em memória na sessão (comportamento atual de
  `readPreferences`/`writePreferences`).

## Tip — `apps/web/src/ui/tips/catalog.ts`

| Campo | Tipo | Regra |
|---|---|---|
| `id` | `TipId` (união literal) | único |
| `screen` | `ScreenId` | tela onde aparece |
| `titleKey`, `bodyKey` | chave de `ui.json` | existem (teste) |
| `shortcutId` | id de `SHORTCUTS`? | se presente, existe e pertence a global ou à tela |
| `anchor` | string? | valor de `data-tip-anchor` na tela; ausente/invisível ⇒ painel no canto |
| `order` | number | ordem dentro da tela |

Ids: `welcome` (inicial), `home-next-step` (jogo), `lineup`, `round-live`, `round-direct`
(rodada), `table` (competição), `market`, `board` (carreira).

Estado: uma dica está **pendente** se `!skipAll && !dismissed.includes(id)`; a tela mostra só a
primeira pendente por `order`, e só quando não há diálogo modal aberto.

## Shortcut — `apps/web/src/ui/shortcuts.ts`

| Campo | Tipo | Regra |
|---|---|---|
| `id` | string | único |
| `keys` | string[] | valor de `KeyboardEvent.key` normalizado (minúscula p/ 1 caractere) |
| `labelKey` | chave `help.*` de `ui.json` | existe |
| `scope` | `"global"` \| `ScreenId` | — |
| `display` | chave/rótulo da tecla na ajuda | ex.: "Espaço", "+ / -" |

Invariantes (teste): nenhuma tecla em dois atalhos do mesmo escopo; nenhuma tecla de tela igual
a uma global; todo id usado por `useShortcuts` existe no registro.

`ScreenId`: `opening`, `saves`, `new-career`, `mods`, `settings`, `about`, `release-notes`,
`game-home`, `squad`, `lineup`, `competition`, `calendar`, `finance`, `history`, `market`,
`career`, `news`, `round`, `season-end`.

## ReleaseNotes — `packages/i18n/locales/pt-BR/release-notes.json`

```text
[{ version: "1.0.0", date: "2026-10-DD", changes: ["…", "…"] }, …]   // mais recente primeiro
```

Schema Zod: `version` semver, `date` ISO `YYYY-MM-DD`, `changes` com 1+ frases não vazias;
versões únicas e em ordem decrescente. A versão de `package.json` DEVE ter entrada (teste e
`check-release`).

## AppVersion

Fonte única: `version` do `package.json` raiz (passa a `1.0.0`). Exposta como
`process.env.NEXT_PUBLIC_APP_VERSION` (definida em `apps/web/next.config.ts`) e lida por
`apps/web/src/app-info.ts` (`APP_VERSION`).

## Página de apresentação (conteúdo)

Textos em `ui.json` (`about.*`); capturas em `apps/web/public/screenshots/` com nomes fixos
(`home.webp`, `round.webp`, `table.webp`, `market.webp`, `career.webp`) e `alt` traduzido.
