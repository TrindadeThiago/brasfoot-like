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
| M7 — Copas | [017](marco7/prompt017.md) | Calendário multi-competição | 016 |
| | [018](marco7/prompt018.md) | Mata-mata e copa nacional | 017 |
| | [019](marco7/prompt019.md) | Fase de grupos e competições em fases | 018 |
| M8 — Mundo | [020](marco8/prompt020.md) | Vários países e simulação em escala | 017 |
| | [021](marco8/prompt021.md) | Classificação entre competições | 018, 020 |
| M9 — Futebol sul-americano | [022](marco9/prompt022.md) | Competições continentais | 019, 021 |
| | [023](marco9/prompt023.md) | Estaduais | 019, 021 |
| | [024](marco9/prompt024.md) | Mod do futebol sul-americano | 022, 023 |
| M10 — Nova interface | [025](marco10/prompt025.md) | Fundação visual e estrutura do jogo | 016 |
| | [026](marco10/prompt026.md) | Telas do clube: Início, Elenco e Escalação | 025 |
| | [027](marco10/prompt027.md) | Competição, calendário e histórico | 025 |
| | [028](marco10/prompt028.md) | Mercado e finanças | 025 |
| | [029](marco10/prompt029.md) | Carreira, diretoria e notícias | 025 |
| | [030](marco10/prompt030.md) | Rodada ao vivo e fim de temporada | 025, 026 |
| | [031](marco10/prompt031.md) | Telas de entrada e configuração | 025 |
| | [032](marco10/prompt032.md) | Telas estreitas, acessibilidade e fechamento do marco | 026 a 031 |

O marco 10 é uma refatoração só visual: não muda motor, regras nem saves. As decisões de design que
os prompts 025 a 032 compartilham estão em [`../interface-nova.md`](../interface-nova.md). Cada
feature que muda o que o jogador vê termina com a nota de versão e a subida de versão no mesmo PR,
**exceto no marco 10**, que segue o fluxo abaixo.

**Fluxo do marco 10.** O marco é desenvolvido na branch `release/v1.0.0`, cortada da `main` depois do
PR de documentação. Cada feature (025 a 031) sai de uma branch própria dessa branch e volta para ela
por um PR com `release/v1.0.0` como base; esses merges não publicam nada, porque o release só
dispara na `main`, que fica congelada durante o marco. A versão do jogo vai para **1.0.0 já na 025**
(as versões 1.0.0 a 1.10.0 viram a fase beta, com tags `beta-vX.Y.Z`) e as features só enriquecem a
nota única do 1.0.0. A 032 fecha o marco e o lançamento é um PR de `release/v1.0.0` para a `main`,
com merge commit. Detalhes em [`../interface-nova.md`](../interface-nova.md), seção 6.
