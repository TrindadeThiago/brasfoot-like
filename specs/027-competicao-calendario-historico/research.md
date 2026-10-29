# Research: Competição, calendário e histórico

## R1 — Critério de "Minhas competições"
- **Decisão**: `clubCompetitions(save)` devolve, para cada competição do banco, `{ competition, mine, status }`. `mine` é verdadeiro quando o clube tem jogos na temporada atual naquela competição (`clubFixtures` do estado) ou tem uma vaga confirmada para ela (`clubQualification` do histórico, quando a competição ainda não gerou jogos). Estaduais: só o da região do clube.
- **Situação do cartão**: `em disputa` (há jogos por disputar), `eliminado` (mata-mata ou fase com o clube fora e sem jogos futuros), `encerrada` (todos os jogos feitos e o clube não foi eliminado), `começa em {data}` (o primeiro jogo ainda não ocorreu e a competição não teve nenhum jogo), `não participa` (Demais).
- **Vaga em disputa** (a decisão que o prompt deixou ao plano): fica em **Demais competições** com o selo "vaga em disputa" quando existe a competição, o clube não tem jogos nem vaga confirmada, mas a competição ainda está aberta a qualificados (`participantOrigins` mostra vagas por decidir). Quando a vaga é confirmada, a competição sobe para Minhas com "começa em…".
- **Razão**: o critério fica em dados do save; Minhas continua curta e verdadeira; o jogador ainda acha a competição em Demais.
- **Alternativas**: listar vagas em disputa em Minhas (mistura "vou disputar" com "talvez"); lista fixa por tipo de competição (contra o gate III).

## R2 — Cartões no lugar da faixa de abas
- **Decisão**: `CompetitionList` com `Tabs` de duas abas (Minhas e Demais); cada competição é um cartão que é um link (`competitionHref`), com `aria-current="page"` no escolhido, nome, país (ou "entre países"), formato e situação. Em Demais, seletor de país e contagem. O parâmetro `comp` na URL continua escolhendo a competição, então atalhos, links de outras telas (Início, Mercado) e e2e seguem iguais.
- **Dois cliques (SC-001)**: Competição → cartão da continental ou do estadual (Minhas, a aba padrão) → a página já abre no chaveamento/classificação com o painel de campanha. Para quem está em Demais, o seletor de país não conta clique extra além da aba.
- **Alternativas**: `<select>` por competição (não mostra situação); manter faixa de abas (não escala).

## R3 — Seções da competição
- **Decisão**: as seções Classificação, Resultados e Artilharia continuam rotas (`/jogo/competicao`, `/resultados`, `/artilharia`) com `CompetitionTabs` reestilizado; divisões continuam `DivisionTabs`; fases `StageNav`/`StageView`; chaveamento `Bracket`; campanha `CampaignPanel`; origem das vagas `ParticipantOrigins`. Mudam o contêiner (cartão selecionado em cima, depois seções) e o aviso "seu clube não participa" (novo `Notice` info) quando não há jogos do clube na competição.
- **Competição que não começou**: um bloco com início (primeira data), vaga (origem) e formato, no lugar da tabela vazia.
- **Razão**: paridade e menor risco; os e2e de copa, continental, estadual e fases acham os elementos pelas mesmas rotas e nomes.

## R4 — Zonas, forma e destaque do clube
- **Decisão**: `StandingsTable` já marca zonas com texto e legenda (FR-006 da 017); mantém e acrescenta o rótulo textual em cada linha de zona para leitores de tela se faltar, e o destaque do clube por borda lateral + `aria-current`. Forma recente por `FormChips` (texto V/E/D). O `Bracket` ganha o destaque do clube do jogador e o "caminho": as rodadas em que o clube jogou ganham um selo "seu caminho" e o confronto atual/final fica marcado.
- **Razão**: cor nunca é o único sinal (FR-019).

## R5 — Calendário mensal
- **Decisão**: `calendarMonths(fixtures, todayISO)` agrupa `ClubFixture` por mês (`AAAA-MM`) e monta as semanas (domingo a sábado, convenção brasileira) com os jogos de cada dia; devolve também a contagem por mês, o mês do próximo jogo e o dia atual. A tela mostra faixa de meses (botões com a contagem), setas, a grade (`role="grid"` com tabindex móvel e setas do teclado) e o painel do jogo escolhido, com gols e cartões e as ações Resumo e Ver jogos (a lista dos jogos do mês foi retirada por decisão do jogador).
- **URL**: `?mes=AAAA-MM`; sem ele, abre no mês do próximo jogo (ou no último mês com jogos se a temporada acabou). "Ir para o próximo jogo" navega para esse mês e foca o dia.
- **Dia com vários jogos**: a célula mostra todos (até 3 compactos; acima disso, "+n" com o dia selecionável que abre todos no painel), nunca esconde.
- **Faixa de cor**: por resultado nos disputados (V/E/D também em texto) e por competição nos futuros (nome da competição no texto do painel e da lista).
- **Alternativas**: biblioteca de calendário (dependência e estilo próprio, contra o gate VIII de leveza); mês com `<table>` simples (sem navegação por setas).

## R6 — Histórico
- **Decisão**: trocar o `tablist` feito à mão por `Tabs` da 025 (setas, Home e End); estados vazios com `EmptyState` por aba antes da primeira temporada encerrada; ligação "Ver trajetória como técnico" para `/jogo/carreira/?aba=history`; tabelas largas em `DataTable` com a opção de primeira coluna fixa. O parâmetro `t` (temporada aberta) e a aba de estaduais condicional ficam como estão.

## R7 — Primeira coluna fixa e tabelas largas
- **Decisão**: opção `stickyFirst` no `DataTable` (a primeira coluna com `position: sticky; left: 0` sobre o fundo da superfície); usada em Classificação, Resultados de temporadas passadas e tabelas largas do Histórico. O quadro já rola (025).

## R8 — Desempenho
- **Decisão**: `calendarMonths` e `clubCompetitions` são O(jogos) e O(competições × jogos), memoizados por save/mês; a grade renderiza um mês por vez (≈ 35 células); `StandingsTable` e a forma recente de 20 clubes e o `Bracket` de 32 clubes passam por um teste de tempo (render ≤ 1 s) e por um e2e que mede a abertura da continental no mundo padrão. Listas de competições do mundo completo (dezenas de países) rendem só o país escolhido em Demais.
- **Alternativas**: virtualização (desnecessária nos tamanhos medidos).

## R9 — Testes
- Unidade: `clubCompetitions` (participa, eliminado, começa em, vaga confirmada, vaga em disputa, estadual); `calendarMonths` (meses, semanas, dias com 2 jogos, mês sem jogos, mês do próximo jogo, temporada encerrada); componentes (cartões, abas, grade com teclado, painel, lista, histórico com vazio).
- E2E: `calendar`, `cup`, `continental`, `regional`, `stages`, `qualification` atualizados aos novos seletores; `layout` (as telas nas três larguras), `a11y` (as telas e o calendário em grade), `keyboard` (cartões e grade do calendário), dois cliques à continental e ao estadual.

## R10 — Dicas e atalhos
- **Decisão**: manter `data-tip-anchor="table"` na classificação; atalhos e ajuda da 016 inalterados; sem dica nova.

## R11 — Nota de versão e entrega
- Itens da 027 acrescentados à nota única do 1.0.0 no mesmo PR; versão inalterada; PR com base `release/v1.0.0`.
