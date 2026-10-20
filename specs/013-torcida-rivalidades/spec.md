# Feature Specification: Torcida e rivalidades

**Feature Branch**: `013-torcida-rivalidades`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Humor da torcida e rivalidades entre clubes (ver docs/design.md §10) — prompt `docs/speckit-prompts/marco5/prompt013.md`."

## Contexto

Segunda feature do Marco 5 (Drama). Hoje o público de cada jogo depende da reputação do clube, da
fase recente, do adversário e do preço do ingresso (008), e a diretoria (012) julga o técnico só por
resultados, metas e finanças. Não existe torcida com memória: uma sequência ruim não esvazia o
estádio de forma duradoura, vender o principal jogador não irrita ninguém e todos os jogos valem o
mesmo. Esta feature dá a cada clube uma torcida com humor, que reage a resultados, à campanha em
relação ao que se esperava, à saída e chegada de ídolos e aos clássicos. O humor enche ou esvazia o
estádio e pressiona a diretoria. Rivalidades passam a ser dados do banco (pares de clubes com
intensidade), o banco fictício padrão ganha as suas, e os clássicos aparecem em destaque e pesam mais
na torcida e na diretoria. Manchetes (014), protestos e vestiário ficam fora.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Humor da torcida que reage aos resultados (Priority: P1)

Cada clube tem uma torcida com humor que sobe com vitórias e campanhas acima do esperado e cai com
derrotas e campanhas abaixo do esperado. O jogador vê o humor da torcida do seu clube, a tendência e
os motivos recentes.

**Why this priority**: é a base de todos os efeitos (público, diretoria, clássicos) e do primeiro
critério de aceite.

**Independent Test**: simular sequências de vitórias e de derrotas e conferir que o humor muda no
sentido esperado, com o motivo exibido.

**Acceptance Scenarios**:

1. **Given** uma sequência de derrotas, **When** as rodadas terminam, **Then** o humor da torcida cai
   a cada derrota.
2. **Given** uma sequência de vitórias, **When** as rodadas terminam, **Then** o humor sobe.
3. **Given** um clube bem abaixo da posição esperada para seu elenco, **When** as rodadas passam,
   **Then** o humor tende a cair mesmo com resultados alternados; acima da posição esperada, tende a
   subir.
4. **Given** qualquer momento da carreira empregada, **When** o jogador olha a Início, **Then** vê o
   humor da torcida (faixa e valor), a tendência recente e os principais motivos.
5. **Given** um período sem jogos ruins nem bons (resultados medianos dentro do esperado), **When** as
   rodadas passam, **Then** o humor volta aos poucos para um patamar neutro.

---

### User Story 2 - Humor que enche ou esvazia o estádio (Priority: P1)

O humor da torcida entra no cálculo do público de cada jogo em casa: torcida animada lota, torcida
insatisfeita esvazia.

**Why this priority**: é o efeito econômico mensurável do primeiro critério de aceite.

**Independent Test**: comparar o público estimado e real do mesmo jogo com o humor alto e baixo.

**Acceptance Scenarios**:

1. **Given** dois cenários iguais exceto pelo humor da torcida, **When** o jogo em casa acontece,
   **Then** o público com humor alto é maior que com humor baixo (respeitada a capacidade do
   estádio).
2. **Given** uma sequência de derrotas, **When** o clube joga em casa nas rodadas seguintes, **Then**
   o público médio cai de forma mensurável em relação ao período anterior.
3. **Given** a tela de finanças, **When** o jogador vê a estimativa de bilheteria do próximo jogo,
   **Then** ela já considera o humor atual.

---

### User Story 3 - Rivalidades como dados e clássicos com peso extra (Priority: P1)

Rivalidades são pares de clubes com uma intensidade, definidas no banco do jogo e no formato de mod.
O banco fictício padrão vem com rivalidades geradas. Jogos entre rivais são clássicos: vencer um
clássico anima mais a torcida e a diretoria; perder pesa mais que uma derrota comum.

**Why this priority**: os clássicos são o segundo pilar da feature e fazem parte dos dois critérios
de aceite.

**Independent Test**: comparar o efeito de uma derrota num clássico e numa partida comum sobre o
humor e a confiança da diretoria; carregar mods com rivalidades válidas e inválidas.

**Acceptance Scenarios**:

1. **Given** dois clubes rivais, **When** um perde o clássico, **Then** o humor da sua torcida e a
   confiança da diretoria caem mais do que cairiam numa derrota contra um não rival.
2. **Given** dois clubes rivais, **When** um vence o clássico, **Then** humor e confiança sobem mais
   que numa vitória comum.
3. **Given** uma rivalidade de intensidade maior, **When** o clássico acontece, **Then** o peso extra
   é maior que o de uma rivalidade de intensidade menor.
4. **Given** um mod com rivalidades entre clubes existentes, **When** é carregado, **Then** as
   rivalidades são aceitas.
5. **Given** um mod com rivalidade envolvendo clube inexistente, um clube com ele mesmo, um par
   repetido ou intensidade fora da faixa, **When** é validado, **Then** é rejeitado com mensagem que
   indica o arquivo, a rivalidade e o campo inválido.
6. **Given** o banco fictício padrão, **When** o jogo começa, **Then** existem rivalidades, cada clube
   tem pelo menos um rival e nenhum tem mais que o máximo definido.

---

### User Story 4 - Clássicos em destaque (Priority: P2)

Os clássicos aparecem destacados no calendário, na Início (próximo jogo) e na rodada ao vivo.

**Why this priority**: dá visibilidade ao peso extra, mas o efeito já existe sem o destaque.

**Independent Test**: abrir calendário, Início e rodada numa rodada com clássico e conferir o
destaque.

**Acceptance Scenarios**:

1. **Given** um clássico no calendário do clube, **When** o jogador abre o calendário, **Then** o jogo
   aparece marcado como clássico.
2. **Given** o próximo jogo é um clássico, **When** o jogador abre a Início, **Then** o próximo jogo
   aparece marcado como clássico.
3. **Given** uma rodada com clássicos (de qualquer clube), **When** a rodada ao vivo ou o resultado da
   rodada é exibido, **Then** os clássicos aparecem marcados.

---

### User Story 5 - Torcida pressiona a diretoria (Priority: P2)

O humor da torcida entra na confiança da diretoria (012): torcida muito insatisfeita derruba a
confiança aos poucos; torcida animada ajuda a segurar o técnico.

**Why this priority**: fecha o ciclo resultado → torcida → diretoria do design, mas depende do humor
já existir.

**Independent Test**: com resultados iguais, comparar a confiança da diretoria com torcida muito
insatisfeita e com torcida animada.

**Acceptance Scenarios**:

1. **Given** torcida muito insatisfeita, **When** a rodada termina, **Then** a confiança da diretoria
   recebe uma parcela negativa identificada como pressão da torcida.
2. **Given** torcida animada, **When** a rodada termina, **Then** a confiança recebe uma parcela
   positiva identificada como apoio da torcida.
3. **Given** humor na faixa neutra, **When** a rodada termina, **Then** a torcida não altera a
   confiança.

---

### User Story 6 - Ídolos: vender irrita, contratar anima (Priority: P2)

Vender ou perder um ídolo da torcida (um dos jogadores mais importantes do elenco) derruba o humor;
contratar um jogador de alto nível anima a torcida.

**Why this priority**: conecta o mercado (010/011) à torcida, mas é um efeito pontual.

**Independent Test**: vender o jogador mais forte do elenco e conferir a queda do humor; contratar
um jogador de destaque e conferir a alta.

**Acceptance Scenarios**:

1. **Given** um ídolo do clube, **When** ele é vendido ou sai de graça, **Then** o humor cai, com o
   motivo "saída de ídolo".
2. **Given** um ídolo emprestado ou que se aposenta, **When** ele deixa o clube, **Then** o humor não
   cai pela regra de venda (aposentadoria não é decisão do clube).
3. **Given** a contratação de um jogador que passa a ser um dos destaques do elenco, **When** ela é
   concluída, **Then** o humor sobe, com o motivo "contratação de destaque".
4. **Given** clubes da IA, **When** vendem ou contratam destaques, **Then** suas torcidas reagem pelas
   mesmas regras.

---

### Edge Cases

- Humor limitado à escala (sem passar dos limites, mesmo com sequências longas).
- Clássico entre clubes de divisões diferentes não acontece na liga; a rivalidade continua existindo
  e volta a valer quando os dois estiverem na mesma divisão.
- Um par de clubes com rivalidade definida duas vezes (A–B e B–A) é tratado como repetido e rejeitado.
- Mod sem rivalidades é válido; o jogo funciona sem clássicos.
- Rivalidade com intensidade mínima ainda conta como clássico, com peso extra pequeno.
- Estádio lotado: humor alto não passa da capacidade; a bilheteria não cresce além dela.
- Técnico desempregado (012): o indicador de humor da Início não aparece; as torcidas de todos os
  clubes continuam reagindo.
- Clube rebaixado ou promovido: o humor atravessa a virada, aproximando-se do neutro, e o acesso dá
  um impulso enquanto o rebaixamento tira.
- Ídolo que é ídolo de dois clubes ao mesmo tempo não existe: ídolos são definidos pelo elenco atual.
- Saves antigos abrem com humor neutro para todos os clubes e, se o banco for o padrão, com as
  rivalidades do banco padrão; com outro banco, sem rivalidades.
- Mesma seed e mesmas decisões produzem o mesmo humor, público e confiança, inclusive após salvar e
  carregar.

## Requirements *(mandatory)*

### Functional Requirements

**Humor da torcida**

- **FR-001**: Cada clube DEVE ter um humor da torcida numa escala de 0 a 100, com faixas nomeadas
  (ex.: revoltada, insatisfeita, neutra, animada, eufórica), começando neutro.
- **FR-002**: O humor DEVE ser atualizado a cada rodada a partir do resultado do jogo do clube, da
  distância entre a posição atual e a posição esperada para o elenco e de eventos da rodada
  (clássicos, saída e chegada de destaques).
- **FR-003**: Sem estímulos fortes, o humor DEVE voltar gradualmente a um patamar neutro.
- **FR-004**: Cada mudança de humor DEVE registrar os fatores que a causaram (ex.: vitória, derrota,
  clássico vencido, clássico perdido, abaixo do esperado, acima do esperado, saída de ídolo,
  contratação de destaque) para exibição ao jogador.
- **FR-005**: Na virada de temporada, o humor DEVE se aproximar do neutro e receber um impulso por
  título ou acesso e uma queda por rebaixamento.

**Efeitos**

- **FR-006**: O humor DEVE multiplicar o público dos jogos em casa (estimativa e jogo real), com fator
  maior que 1 acima do neutro e menor que 1 abaixo, limitado pela capacidade do estádio.
- **FR-007**: O humor DEVE entrar na confiança da diretoria (012) como fator próprio ("pressão da
  torcida" ou "apoio da torcida"), sem efeito na faixa neutra.

**Rivalidades e clássicos**

- **FR-008**: O formato do banco/mod DEVE aceitar uma lista de rivalidades, cada uma com dois clubes e
  uma intensidade numa escala definida (ex.: 1 a 3).
- **FR-009**: A validação DEVE rejeitar rivalidades com clube inexistente, com o mesmo clube dos dois
  lados, pares repetidos (em qualquer ordem) e intensidade fora da faixa, com mensagens que indiquem
  o arquivo, a rivalidade e o campo.
- **FR-010**: O banco fictício padrão DEVE trazer rivalidades geradas por regra determinística
  (proximidade regional e clubes grandes da mesma divisão), com cada clube tendo entre 1 e o máximo
  definido de rivais.
- **FR-011**: Um jogo entre rivais DEVE ser um clássico; resultados de clássicos DEVEM ter peso extra,
  proporcional à intensidade, no humor da torcida e na confiança da diretoria, para os dois clubes.
- **FR-012**: Clássicos DEVEM aparecer destacados no calendário do clube, no próximo jogo da Início e
  nos jogos da rodada (ao vivo e resultados).

**Ídolos e mercado**

- **FR-013**: Os ídolos de um clube DEVEM ser os seus jogadores mais fortes (um número pequeno
  definido por dados), calculados pelo elenco atual.
- **FR-014**: A venda ou liberação de um ídolo DEVE reduzir o humor da torcida do clube; a contratação
  de um jogador que entra entre os ídolos DEVE aumentá-lo. Empréstimos de volta e aposentadorias não
  contam como venda.
- **FR-015**: As mesmas regras de humor, clássicos e ídolos DEVEM valer para o clube do jogador e para
  os clubes da IA.

**Visibilidade**

- **FR-016**: O jogador DEVE ver, na Início, o humor da torcida do seu clube (faixa e valor), a
  tendência e os três motivos mais recentes; e, numa tela de clube/carreira, a lista de rivais do seu
  clube com a intensidade.

**Determinismo, dados, saves e textos**

- **FR-017**: Humor, público e efeitos na diretoria DEVEM ser determinísticos: mesmo estado, mesma
  seed e mesmas decisões produzem os mesmos resultados, inclusive após salvar e carregar.
- **FR-018**: Os parâmetros do humor (pesos de resultado, expectativa, clássicos, ídolos, retorno ao
  neutro, faixas, efeito no público e na diretoria) DEVEM ser dados versionados, não regras fixas.
- **FR-019**: O formato de save DEVE ganhar nova versão com migração: saves antigos abrem com humor
  neutro para todos os clubes e com as rivalidades do banco padrão quando o banco do save for o
  padrão.
- **FR-020**: Todos os textos novos (faixas, fatores, clássico, rivais) DEVEM passar pelo sistema de
  traduções.

### Key Entities *(include if feature involves data)*

- **Rivalidade**: par de clubes (sem ordem) e intensidade; parte do banco/mod.
- **Humor da torcida**: por clube — valor (0–100), faixa, mudanças recentes com fatores.
- **Clássico**: jogo da liga entre dois clubes rivais (derivado do calendário e das rivalidades).
- **Ídolo**: jogador entre os mais fortes do elenco atual do clube (derivado, não guardado).
- **Regras da torcida**: parâmetros versionados de humor, clássicos, ídolos, público e diretoria.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em simulações, uma sequência de 5 derrotas reduz o humor da torcida em pelo menos 15
  pontos e o público médio em casa nas 3 rodadas seguintes em pelo menos 5% em relação às 3 anteriores
  (estádio não lotado).
- **SC-002**: Perder um clássico de intensidade máxima reduz o humor e a confiança da diretoria em
  pelo menos 1,5 vez o efeito de uma derrota comum no mesmo cenário.
- **SC-003**: 100% dos mods com rivalidades inválidas (clube inexistente, mesmo clube, par repetido,
  intensidade fora da faixa) são rejeitados com mensagem que aponta a rivalidade; mods válidos com
  rivalidades carregam sem erro.
- **SC-004**: No banco padrão, todo clube tem ao menos um rival e cada divisão tem ao menos 4
  clássicos por turno.
- **SC-005**: Em simulações longas de 30 temporadas, o humor médio das torcidas fica entre 35 e 65 e
  as receitas de bilheteria continuam dentro dos limites econômicos já existentes (008).
- **SC-006**: O jogador identifica em até 5 segundos, na Início, o humor da torcida e se o próximo
  jogo é um clássico.
- **SC-007**: Repetir uma carreira com a mesma seed e as mesmas decisões produz exatamente o mesmo
  humor e público, inclusive com salvar e carregar no meio.
- **SC-008**: Saves da versão anterior abrem sem erro e seguem jogáveis com humor e clássicos.

## Assumptions

- A posição esperada usada pela torcida é a mesma expectativa da diretoria (012): posto do clube na
  divisão pela força do elenco e reputação.
- Ídolos são os jogadores mais fortes do elenco atual (padrão: os 3 mais fortes); histórico e tempo de
  clube ficam para quando houver histórico de lendas.
- A torcida não altera a reputação do clube nesta feature.
- O efeito no público multiplica o modelo de bilheteria existente (008); preço, capacidade, fase e
  adversário continuam como estão.
- Para o banco padrão, a "região" vem de uma regra do gerador (agrupamento determinístico dos clubes),
  pois o banco atual não tem regiões nem cidades repetidas; mods podem definir as rivalidades que
  quiserem.
- A intensidade das rivalidades vai de 1 a 3 (regional, tradicional, maior clássico); cada clube tem
  no máximo 3 rivais no banco padrão.
- Jogos de copa não existem; clássicos são só da liga.
- Manchetes (014), protestos, eventos especiais e vestiário ficam fora; a feature deixa o humor e os
  clássicos disponíveis para as manchetes futuras.
- Valores concretos (pesos, faixas, fatores de público) são definidos no plano como dados versionados
  e calibrados por simulação longa.
