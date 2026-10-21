# Contrato: save v13, formato de mod e telas

## Save v13 (`packages/save`)

- `SAVE_FORMAT_VERSION = 13`; campo novo `cupHistory`. Migração v12 → v13 só preenche `cupHistory: []`;
  as copas já vivem em `competitions` (R1), e carreiras sem copa no banco continuam sem ela.
- `calendarProblem` (integridade): rodadas da copa podem ter `fixtures: []` até a fase ser sorteada;
  fases `drawn` têm as `fixtures` completas e coerentes com os `ties`.
- Fixtures: `saveV12(step)` em `test/fixtures.ts` (início, meio, fim e várias temporadas) e um save
  com a copa no meio (fase 3) para o teste de migração e de jogabilidade.
- `advanceCareerSeason` repassa/recebe `cupHistory`.

## Formato de mod (`docs/mod-format.md`)

- §5: `format.type: "knockout"` com `phases`, `entries`, campos de cada fase, padrão de cada campo,
  exemplo de copa de 8 clubes (jogo único + ida e volta + final neutra) e regra "uma só divisão".
- Tabela de erros com os 7 códigos `knockout.*`; `format.unsupported` passa a citar só `groups`.
- O mod de exemplo (`mods/exemplo`) ganha uma copa pequena de exemplo (gerada pelo gerador).

## Telas (`apps/web`)

| Tela | Contrato |
|---|---|
| Competição (`/jogo/competicao/*`) | Para uma copa selecionada nas abas de competição: **Chaveamento** (colunas por fase, confrontos com placar, classificado em destaque, fases futuras "a definir"), **Resultados** (por fase, jogos e agregado, prorrogação e pênaltis), **Artilharia**; abas de divisão não aparecem |
| Início | O próximo compromisso mostra a fase e, em ida e volta, a perna |
| Calendário | Coluna "Fase" nos jogos da copa; a copa aparece no filtro de competição |
| Rodada ao vivo | Relógio até 120', aviso de prorrogação, painel de **pênaltis** com cada cobrança (cobrador, gol/defesa/trave/fora) e o placar da série; placar de 90/120 separado; substituição na prorrogação |
| Fim da temporada | Campeão e vice da copa (seção de outras competições) |
| Histórico | Aba **Copas**: campeão e vice por edição, títulos por clube; campanha do clube no histórico do técnico |
| Carreira (diretoria) | Meta de copa do clube (fase mínima), quando houver |

- i18n: `cup.*` (fases, chaveamento, resultados, "a definir", prorrogação, pênaltis, formas de
  decisão), `news.cup*` (variações), `fans.factor.cupOut/cupTitle`, `board.factor.cupGoal`,
  `live.shootout.*`, `history.tab.cups`. Nomes de fases e da copa vêm do banco.
- Testes de fluxo: `apps/web/test/flows/cup.test.tsx`; e2e: `apps/web/e2e/cup.spec.ts` (carreira no
  banco padrão joga liga e copa, vê o chaveamento, decide um empate nos pênaltis ao vivo).
- **Testes existentes que mudam** com o banco padrão ganhando a copa (R14): os de contagem de
  jogos/linhas do calendário do clube, abas de competição, Início e e2e que assumiam uma só
  competição. O teste de equivalência (`packages/save/test/equivalence.test.ts`) passa a gerar o
  banco **sem a copa** (filtra a competição) para continuar provando a identidade da liga com a
  versão anterior (SC-007).
