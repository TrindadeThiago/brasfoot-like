# Data Model: Fundação visual e estrutura do jogo

Sem mudança em saves, motor ou dados de jogo.

## ThemeTokens (CSS)
- Papéis: fundo, barra lateral, superfície, superfície elevada, borda, borda de controle, texto, texto secundário, destaque, texto sobre destaque, perigo, aviso, info.
- Dois conjuntos: padrão (escuro) e `:root[data-theme="light"]`.
- Regra: pares texto/superfície ≥ 4,5:1; borda de controle ≥ 3:1.
- Escolha de tema: preferência existente `"system" | "dark" | "light"` (padrão `"system"`, reserva escuro). Inalterada.

## NavScreen
- `path`, `labelKey` (i18n), `icon`, `club: boolean`, `counter?: "market" | "offers"`.
- 10 itens; `availableScreens(save)` filtra por carreira; `screenHref(path, careerId)`.

## AttentionCounter
- Derivado do save: Mercado = `save.market.incoming.length`; Carreira = ofertas pendentes `save.board.offers`. Zero → sem selo.

## ShellVariant
- `club`: barra lateral + cabeçalho de tela (clube, técnico, série, temporada, rodada).
- `focus`: sem barra lateral (rodada, fim de temporada, menu, nova carreira, carreiras, configurações, mods, sobre, notas), com Voltar quando fora da carreira.

## ReleaseNote / BetaReleaseNote
- Mesmo esquema: `version` semver, `date` YYYY-MM-DD, `changes` ≥ 1; versões únicas e estritamente decrescentes dentro de cada arquivo.
- `release-notes.json`: [1.0.0]. `release-notes-beta.json`: 23 notas (1.10.0 … primeira), exibidas como "beta X.Y.Z".
- Invariante: `notes[0].version === package.json version`.
