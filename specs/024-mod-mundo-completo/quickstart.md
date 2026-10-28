# Quickstart: validar o mod mundo completo

> **Revisão (1.10.0)**: os mundos médio e completo foram descartados — a rodada da liga ficava pesada demais
> (travamentos) com dezenas de milhares de jogadores. O **mundo padrão** passou a ser o reduzido (24 países
> nas seis confederações, Brasil em quatro divisões com estaduais), gerado dentro do jogo e também
> disponível para baixar (`mundo-padrao.zip`); o antigo país fictício único saiu da lista de nova carreira.
> Onde este documento fala em três tamanhos, vale só o reduzido.

Guia de validação ponta a ponta. Os comandos usam os scripts do monorepo.

## Pré-requisitos

- Node 22 e `pnpm install` feitos.
- Branch `024-mod-mundo-completo` com a implementação concluída.

## 1. Testes do gerador

```bash
pnpm --filter @brasfoot-like/engine exec vitest run football-world blocklist
```

Esperado: perfil válido; geografia e nomes com os mínimos; países com pirâmides e vagas corretas;
mesma seed, mesmo banco; bloqueio sem nomes reais de clubes e competições.

## 2. Gerar e validar o pacote

```bash
pnpm gen:football-world --profile reduzido --seed teste --out /tmp/mundo
pnpm gen:football-world --profile reduzido --seed teste --out /tmp/mundo2
cmp /tmp/mundo/mundo-completo.zip /tmp/mundo2/mundo-completo.zip
pnpm validate-bank /tmp/mundo/mundo-completo   # com --folder
```

Esperado: a ferramenta termina com código 0; `cmp` não acusa diferença; `validate-bank` aceita o pacote.
Repita com `--seed outra` e confira que o mundo muda.

## 3. Trocar nomes por CSV

```bash
pnpm gen:football-world --profile reduzido --clubs-csv meus-clubes.csv --players-csv meus-jogadores.csv
```

Esperado: o pacote vale e traz os nomes das planilhas; erro de CSV aponta linha e coluna.

## 4. Carreira de teste e simulação

```bash
pnpm --filter @brasfoot-like/save exec vitest run football-world
pnpm --filter @brasfoot-like/engine exec vitest run long-run
FOOTBALL_WORLD_SEASONS=30 pnpm --filter @brasfoot-like/engine exec vitest run long-run   # 30 temporadas do reduzido
pnpm sim:world --football-world --profile reduzido --seasons 3
pnpm sim:world --football-world --profile medio --seasons 1
pnpm sim:world --football-world --profile completo --seasons 1
```

Esperado: uma temporada no Brasil passa por estadual, liga, copa e continental sem conflito de datas;
o mundo reduzido roda 30 temporadas sem erro e dentro das faixas; o médio e o completo fecham uma
temporada dentro de `SCALE_LIMITS.mediumWorld` e `fullWorld` (medidas em `baseline.md`).

## 5. Escolher o mundo no jogo e baixar na página de Mods

```bash
pnpm build:web
pnpm --filter web exec playwright test football-world
```

Esperado: na nova carreira há três tamanhos (reduzido, médio, completo) com aviso de peso; o mundo é
gerado na hora, os países aparecem por confederação e a carreira começa. A página de Mods tem o link dos
três `.zip`, que passam na validação do jogo e aceitam planilha.
