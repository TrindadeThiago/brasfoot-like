# Prompts para Spec Kit

Prompts prontos para o fluxo Spec-Driven Development com o Spec Kit, derivados de
[`../design.md`](../design.md). Cada marco do roadmap foi dividido em features menores;
cada prompt vira uma pasta `specs/NNN-*` via `/speckit-specify`. A numeração dos
prompts é global e corresponde à numeração das specs.

## Como usar

1. Rodar **uma vez** o prompt de [`constituicao.md`](constituicao.md) com `/speckit-constitution`.
2. Para cada prompt, na ordem:
   `/speckit-specify <prompt>` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
3. Só avançar de marco quando o critério "Pronto quando…" do marco (ver `design.md` §13) for atingido.

Os prompts de specify descrevem **o quê e por quê**. Decisões de stack e arquitetura
ficam na constituição e entram no `/speckit-plan`.

## Estrutura

| Marco | Prompt | Feature | Depende de |
|---|---|---|---|
| M1 — Motor | [001](marco1/prompt001.md) | Modelo de dados e banco fictício | — |
| | [002](marco1/prompt002.md) | Motor de partida | 001 |
| | [003](marco1/prompt003.md) | Temporada de pontos corridos | 002 |
| M2 — Temporada jogável | [004](marco2/prompt004.md) | Aplicação web, novo jogo e saves | 003 |
| | [005](marco2/prompt005.md) | Escalação e táticas | 004 |
| | [006](marco2/prompt006.md) | Rodada ao vivo e telas da competição | 005 |
| M3 — Carreira | [007](marco3/prompt007.md) | Múltiplas divisões e virada de temporada | 006 |
| | [008](marco3/prompt008.md) | Finanças do clube | 007 |
| | [009](marco3/prompt009.md) | Evolução, aposentadoria e renovação do mundo | 007 |
| M4 — Mercado | [010](marco4/prompt010.md) | Contratos e mercado de transferências | 008, 009 |
| | [011](marco4/prompt011.md) | IA de transferências | 010 |
| M5 — Drama | [012](marco5/prompt012.md) | Carreira do técnico e diretoria | 008 |
| | [013](marco5/prompt013.md) | Torcida e rivalidades | 012 |
| | [014](marco5/prompt014.md) | Manchetes e histórico | 013 |
| M6 — Lançamento | [015](marco6/prompt015.md) | Saves portáteis e formato de mod | 014 |
| | [016](marco6/prompt016.md) | Polimento e publicação | 015 |
