# Contrato: save v14, formato de mod e telas

## Save v14 (`packages/save`)

- `SAVE_FORMAT_VERSION = 14`. Migração v13 → v14: só `formatVersion = 14`. `Season.stages`,
  `Fixture.stage` e `Round.byes` são opcionais e só aparecem em temporadas criadas com divisões em
  fases; carreiras antigas seguem sem elas (o banco do save não tem `stages` nem `groups`).
- `calendarProblem` (integridade): numa divisão em fases, as rodadas de uma fase não começada podem
  ter `fixtures: []`; fases `started` têm as `fixtures` completas e coerentes com `groups` ou
  `bracket`; as rodadas das fases cobrem `calendar` em ordem.
- Fixtures: `saveV13(step)` (início, meio, fim e várias temporadas, com copa em andamento) para o
  teste de migração e de jogabilidade; um save de banco regional no meio da fase de grupos.
- `equivalence.test.ts`: sem mudança de linha de base (o mundo padrão não usa fases).

## Formato de mod (`docs/mod-format.md`)

- §5: novos `format.type` `groups` e `stages`; `division.stages`; os três tipos de fase
  (`league`, `groups`, `knockout`) com tabela de campos, padrões e limites; `draw` (potes,
  `previousStagePot`, regras `separate` e `concentrate`, `exemptPots`); `enter`; `pairing`/`pairs`
  e a origem das vagas (`A1`, `B2`, `T3`, `X1`); `home: "overall"`; `club.region`.
- Dois exemplos completos: quarta divisão regional (grupos concentrados por região → mata-mata) e
  uma competição de uma divisão com fase preliminar, grupos com potes e separação por país → mata-mata.
- Tabela de erros com os códigos `stages.*`; `format.unsupported` passa a valer só para tipos
  desconhecidos; nota de que o mod de exemplo (`mods/exemplo`) segue válido e sem fases.
- Regra de sorteio: a separação é estrita só na validação e nos testes; numa carreira o sorteio
  conclui com aviso.

## Telas (`apps/web`)

| Tela | Contrato |
|---|---|
| Competição (`/jogo/competicao`) | Para uma divisão em fases: navegação por fase (`StageNav`); fase de grupos: tabela de cada grupo (o do clube em destaque) com zona de classificação e legenda, marca da posição que dá vaga extra, aba **Classificação geral** com marcação de quem se classificaria e de quem cairia hoje; fase eliminatória: chaveamento com a origem de cada vaga ("1º do Grupo B"); aviso de sorteio quando há `DrawWarning`; fases já jogadas navegáveis |
| Início | O próximo compromisso mostra a fase e o grupo/rodada ("Grupo B, rodada 3") ou a fase eliminatória |
| Calendário | Coluna "Fase" nos jogos de divisões em fases |
| Rodada ao vivo | Sem mudança de tela; jogos eliminatórios usam o painel de pênaltis da 018 |
| Fim da temporada | Posição final de cada clube (FR-024), campeão, promovidos e rebaixados da divisão em fases |
| Histórico | Campeão e promovidos da divisão em fases na temporada |

- i18n (`ui.json`): `stages.*` (nome do tipo de fase, grupo, rodada, legenda de zona
  `stages.zone.qualified/extra/eliminated`, classificação geral, origem da vaga, navegação por fase,
  aviso de sorteio com regra e clubes), `calendar.stage`, `home.stage`. Erros em `errors.json`
  (`stages.*`). Nomes de fases e competições vêm do banco; nomes de grupos são letras geradas.
- Testes de fluxo: `apps/web/test/flows/stages.test.tsx` (banco regional: tabelas, zona, classificação
  geral, chaveamento e o aviso); e2e `apps/web/e2e/stages.spec.ts` (joga a fase de grupos e o
  mata-mata, vê o chaveamento e a posição final).
- **Testes existentes que mudam**: nenhum deve mudar (o mundo padrão não usa fases); os de contagem
  de rodadas e de abas continuam válidos. O Bracket ganha um parâmetro opcional de origem das vagas.
