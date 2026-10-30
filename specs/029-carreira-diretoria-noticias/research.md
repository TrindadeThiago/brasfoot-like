# Pesquisa: Carreira, diretoria e notícias

Verificação do código e dos dados que a 029 consome. Nenhum item ficou como "NEEDS CLARIFICATION".

## R1 — Abas da Carreira

- **Decisão**: trocar os botões de aba artesanais da página por `Tabs` (025), com os mesmos ids (`board`, `fans`, `offers`, `history`, `coaches`) e `?aba=` pelo `initial`; o nome da aba Propostas leva a contagem (`Propostas (2)`).
- **Racional**: `Tabs` já dá `tablist`, setas, Home e End, e foco; os links da Início (`?aba=offers`) continuam valendo. A página já lê `useSearchParams` dentro do filho de `GameLayout`.
- **Alternativas**: manter os botões (não têm setas nem `tabpanel`); rotas por aba (quebram os links e o `?aba=`).

## R2 — Diretoria sem rolagem em 1 440 px

- **Decisão**: duas colunas: à esquerda o cartão Metas (até quatro linhas compactas, cada uma com rótulo, texto da meta e situação), à direita o cartão Confiança (valor, medidor, nível, tendência e os três motivos mais recentes). Reputação e o aviso de carreira sem demissão ficam no cartão Metas. As "mudanças por rodada" ficam num cartão abaixo com lista de altura limitada e rolagem própria.
- **Racional**: o critério pede metas e confiança com motivos sem rolagem; a lista por rodada cresce a temporada inteira e não pode empurrar a página. O e2e mede `scrollHeight <= innerHeight` em 1 440 × 900 na aba. Se não couber, o plano B é recolher o cartão das mudanças por rodada num `<details>` (T026).
- **Alternativas**: lista por rodada em `<details>` recolhido (mais um clique para um dado que hoje é aberto); manter uma coluna (estoura a altura).

## R3 — Situação das metas e níveis, em texto e símbolo

- **Decisão**:
  - Metas esportiva e financeira (`goalProgress`): `met` → "Cumprindo" (✓); `!met` → "Em risco" (!).
  - Metas continental e estadual: `result` ausente → "Em andamento" (…); `met` → "Cumprida" (✓); `missed` → "Não cumprida" (✕). A spec (FR-002) prevê as duas: o resultado da meta já decidida.
  - Nível da confiança: as faixas do medidor de hoje (`low` 30, `high` 60) viram texto: "Alta" (≥ 60), "Média" (30 a 59), "Baixa" (< 30).
  - Tendência (confiança e torcida): a de hoje (soma das três últimas mudanças) em texto ("Em alta", "Estável", "Em queda") com seta (▲ ■ ▼) `aria-hidden`.
- **Racional**: reaproveita o que o jogo já decide (`goalProgress`, `confidenceTrend`, `moodBand`); só dá nome e símbolo. Nada novo é calculado.
- **Alternativas**: criar níveis novos pela distância ao limite de demissão (regra nova, fora de escopo).

## R4 — Torcida

- **Decisão**: `FansCard` mostra faixa (`moodBand`, já em texto), valor, medidor, tendência com símbolo e os motivos recentes com o efeito; os rivais seguem ao lado. Sem motivos, estado vazio com texto.
- **Racional**: os dados e as chaves `fans.*` existem; falta a forma e o estado vazio.

## R5 — Título e texto da manchete

- **Verificação**: o motor guarda `type`, `variant`, `vars`, `extras`, `mine` e `clubIds`; a frase completa sai de `news.<tipo>.<variação>` (132 chaves, três a seis variações por tipo). Não há título curto separado do texto, nem no save.
- **Decisão**: exibir a frase como título do cartão e usar os fatos complementares (`extras`) como texto. Cartão sem `extras` não tem parágrafo de texto. Não se separa a mensagem na origem.
- **Racional**: separar na origem exigiria reescrever 132 templates em duas partes ou criar ~30 títulos por tipo, que duplicariam o que a frase já diz ("Goleada: X atropela Y"). O pedido autoriza exibir a frase como título.
- **Alternativas**: título por tipo (`news.title.<tipo>`) com a frase como texto (repete a informação e vira categoria por tipo, que o pedido tira do escopo).

## R6 — Competição e rodada de cada manchete

- **Verificação**: manchetes de jogo do clube em copa, continental e estadual levam `vars.competition` (id); fatos da liga principal (resultado, goleada, virada, zebra, clássico, sequências, título, acesso, rebaixamento) não levam. `turnover` e `clinched` também põem `competition` quando falam de uma competição. Manchetes de pessoas e transferências (`coachFired`, `coachHired`, `managerFired`, `managerHired`, `bigTransfer`) não têm competição.
- **Decisão**: `headlineCompetition(save, headline)` devolve `vars.competition` se existir; senão, a liga principal do save para os tipos de jogo da liga; senão, `undefined` ("Geral"). A rodada é a do `RoundFeed` escolhido (0 = resumo).
- **Racional**: dá a seção por competição sem mexer no motor; a lista de tipos de pessoas e transferências é constante no módulo, ao lado de `HEADLINE_TYPES`, coberta por teste que falha se um tipo novo não for classificado.
- **Alternativas**: guardar `competition` em toda manchete (muda o save).

## R7 — Agrupamento, contagens e filtros das Notícias

- **Decisão**: `groupHeadlines(save, headlines)` devolve a seção "Do seu clube" (`mine`), uma seção por competição (na ordem do banco) e "Geral"; a manchete do clube aparece em "Do seu clube" e na seção da competição, e as contagens refletem isso. O painel tem o resumo da rodada ("N manchetes, M do seu clube"), os botões Todas e Do meu clube (`aria-pressed`) e a lista de competições com contagem, cada uma um botão que filtra. O filtro de competição some manchetes de outras; Todas volta ao conjunto inteiro.
- **Racional**: o pedido tira a categoria por tipo e pede só competição e "seu clube"; a contagem vem da própria lista agrupada, então não há dois números diferentes.

## R8 — Seleção de rodada

- **Decisão**: manter o seletor de temporada e rodada (`select`) e acrescentar as setas "Rodada anterior" e "Próxima rodada", desativadas nas pontas; a ordem é a do feed (mais nova primeiro no seletor, mais antiga à esquerda nas setas). O seletor continua com as rodadas guardadas (atual e anterior) e a rodada 0 como resumo.
- **Racional**: paridade com o seletor de hoje e a navegação rápida que o pedido quer.

## R9 — Avisos com o mesmo componente

- **Verificação**: os avisos de demissão, de nova contratação e de propostas só aparecem na Início (no primeiro bloco e no grupo "Antes do jogo"); o aviso de propostas é hoje um `<p role="status">` com o link para a aba. Não há aviso desses na Carreira nem no fim de temporada.
- **Decisão**: `BoardNotice` (demissão e nova contratação) e o aviso de propostas passam a usar `Notice` (025) com `tone` (`danger` na demissão, `info` na contratação e nas propostas); o texto e a ação de dispensar não mudam, e o `role` de hoje (`status`, ou `alert` onde há) é repassado ao `Notice`, para continuarem sendo anunciados. O aviso de carreira sem demissão e o de mudança de país usam `Notice` (`info` e `warning`). A ordem de títulos dentro do grupo "Antes do jogo" é conferida no teste de a11y.
- **Racional**: consistência com 026 a 028; a gravidade já vem escrita no título do `Notice`.

## R10 — Propostas só com o teclado

- **Decisão**: cada proposta é um cartão (`article` com o nome do clube) com Aceitar e Recusar como botões na ordem natural do foco; o aviso de mudança de país vem antes dos botões e é lido junto. O foco não se perde ao aceitar (a tela muda de clube; o foco vai para o título da tela). O e2e demite o técnico, abre a Carreira e aceita uma proposta só com Tab e Enter.
- **Racional**: é o critério de aceite 1; os botões já são nativos.

## R11 — Estados vazios

- **Decisão**: `EmptyState` (025) com texto próprio em: sem propostas (e o que influencia recebê-las), sem metas avaliadas, sem motivos de confiança e de torcida, sem passagens ou temporadas, sem manchetes na rodada, sem nenhuma rodada guardada, filtro sem resultado (com o botão que volta a Todas) e clube desempregado (só a Diretoria; Torcida e Técnicos mantêm os dados de hoje, para não perder paridade, e Propostas e Histórico seguem como estão).
- **Racional**: o pedido exige estados vazios desenhados; hoje são parágrafos soltos.

## R12 — Medição e nota de versão

- **Decisão**: medir a abertura da Carreira e das Notícias antes e depois, como na 028, com a tolerância de SC-007 (mediana até 10% acima da linha de base); acrescentar o item "Nova interface, quinta parte" à nota única do 1.0.0 em `packages/i18n/locales/pt-BR/release-notes.json`; a versão não muda.

## R13 — Componentes compartilhados com a Início e o fim de temporada

- **Verificação**: `GoalsList` e `ConfidenceMeter` são usados também pelo `BoardCard` da Início; `FansCard` também aparece na Início; `goalTierText` e `financeGoalText` (em `GoalsList.tsx`) alimentam `Evaluation` (fim de temporada, escopo da 030), `ManagerHistory` e `JobOffers`.
- **Decisão**: refazer esses componentes mantendo os nomes exportados e as assinaturas; o cartão da Início passa a usar a mesma versão nova (situação e tendência em texto e símbolo), e `Evaluation` continua intacto. `home.test.tsx` e os e2e de layout e a11y da Início entram na conferência.
- **Alternativas**: versões separadas para a Início (duplicação sem ganho).

## R14 — Dica de primeiro acesso da Carreira

- **Verificação**: o `data-tip-anchor="board"` fica hoje no `tablist` da Carreira (`ui/tips/catalog.ts`, id `board`); o `Tabs` (025) não repassa atributos.
- **Decisão**: envolver o `Tabs` num `div` com `data-tip-anchor="board"`, sem mudar o `Tabs`; `tips.test.tsx` e o e2e de primeiro acesso conferem a dica.
