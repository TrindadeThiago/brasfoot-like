# Feature Specification: Manchetes e histórico

**Feature Branch**: `014-manchetes-historico`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Notícias/manchetes geradas a partir de eventos e o histórico do mundo (ver docs/design.md §10) — prompt `docs/speckit-prompts/marco5/prompt014.md`."

## Contexto

Última feature do Marco 5 (Drama). O jogo já produz muitos eventos — gols e viradas nas partidas,
classificação, demissões de técnicos (012), humor da torcida e clássicos (013), transferências e
resumos de janela (011), acesso e rebaixamento — mas eles aparecem espalhados em telas técnicas e
nada é lembrado além da classificação final de cada temporada. Esta feature transforma esses
eventos em manchetes escritas como um jornal esportivo, com contexto ("terceira derrota seguida",
"maior goleada da história do clube"), e guarda a memória do mundo: campeões, títulos por clube,
artilheiros históricos, recordes e lendas de cada clube, ao lado da trajetória do técnico. O
critério do marco é que uma temporada "conte uma história". Coletivas interativas, vestiário e
imagens ficam fora.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Feed de manchetes da rodada (Priority: P1)

A cada rodada, o jogador vê um feed de notícias com manchetes sobre o seu clube, a liga e o
mercado, ordenadas por relevância: hat-trick, goleada, virada, fim de jejum, zebra, clássico,
demissão de técnico, grande transferência, título e rebaixamento matemáticos, entre outras.

**Why this priority**: é o coração da feature e do critério "toda rodada gera ao menos uma manchete
sobre o clube do jogador".

**Independent Test**: simular rodadas e conferir que cada uma gera um feed com ao menos uma manchete
sobre o clube do jogador, além de manchetes de outros clubes quando houver eventos relevantes.

**Acceptance Scenarios**:

1. **Given** qualquer rodada jogada com o técnico empregado, **When** a rodada termina, **Then** o
   feed tem ao menos uma manchete sobre o clube do jogador (no mínimo sobre o resultado do jogo).
2. **Given** um jogador que marca 3 gols numa partida, **When** a rodada termina, **Then** há uma
   manchete de hat-trick com o nome do jogador e do clube.
3. **Given** uma vitória por 4 ou mais gols de diferença, uma virada, uma vitória de clube muito
   mais fraco sobre um muito mais forte (zebra) ou um clássico, **When** a rodada termina, **Then**
   há uma manchete do tipo correspondente.
4. **Given** um técnico demitido, uma transferência de grande valor ou um clube matematicamente
   campeão ou rebaixado, **When** a rodada termina, **Then** há uma manchete sobre o fato.
5. **Given** uma rodada com muitos eventos, **When** o feed é exibido, **Then** as manchetes mais
   relevantes vêm primeiro e o feed mostra no máximo um número limitado delas, sem repetir o mesmo
   fato.
6. **Given** a Início depois de uma rodada, **When** o jogador olha a tela, **Then** vê as principais
   manchetes da rodada e um link para o feed completo.

---

### User Story 2 - Manchetes com contexto (Priority: P1)

As manchetes citam o contexto do fato: sequências ("terceira derrota seguida", "quinta vitória
seguida"), fim de jejum ("volta a vencer depois de 7 jogos"), recordes ("maior goleada da história
do clube, superando o 5 a 0 de 2029") e marcas pessoais.

**Why this priority**: é o que faz o feed "contar uma história" e inclui o segundo critério de
aceite (recorde batido citando o anterior).

**Independent Test**: provocar sequências e recordes e conferir as manchetes com o contexto certo.

**Acceptance Scenarios**:

1. **Given** um clube que perde pela terceira vez seguida, **When** a rodada termina, **Then** a
   manchete do resultado cita a sequência.
2. **Given** um clube sem vencer há vários jogos que vence, **When** a rodada termina, **Then** a
   manchete cita o fim do jejum e quantos jogos durou.
3. **Given** uma vitória por placar maior que a maior vitória já registrada do clube, **When** a
   rodada termina, **Then** a manchete diz que é a maior goleada da história do clube e cita o
   recorde anterior (placar, adversário e ano).
4. **Given** um recorde da liga (ex.: mais gols de um jogador numa temporada), **When** ele é batido,
   **Then** há uma manchete que cita o recorde anterior e quem o tinha.

---

### User Story 3 - Histórico do mundo (Priority: P2)

O jogador consulta o histórico: campeões por temporada e divisão, títulos por clube, artilheiros de
cada temporada e artilheiros históricos, recordes da liga e de cada clube, lendas de cada clube e a
sua trajetória como técnico.

**Why this priority**: dá memória à carreira longa e alimenta o contexto das manchetes; o feed já
entrega valor sem as telas.

**Independent Test**: jogar algumas temporadas e conferir cada seção do histórico.

**Acceptance Scenarios**:

1. **Given** temporadas encerradas, **When** o jogador abre o histórico, **Then** vê os campeões de
   cada divisão por temporada e o artilheiro de cada temporada.
2. **Given** temporadas encerradas, **When** abre "Títulos", **Then** vê os clubes ordenados por
   número de títulos de cada divisão.
3. **Given** temporadas encerradas, **When** abre "Artilheiros históricos", **Then** vê os jogadores
   com mais gols na liga somando todas as temporadas, inclusive aposentados.
4. **Given** recordes registrados, **When** abre "Recordes", **Then** vê os recordes da liga (maior
   goleada, mais gols numa temporada, mais pontos numa temporada etc.) com quem, quando e o valor.
5. **Given** um clube, **When** o jogador abre o histórico dele, **Then** vê títulos, recordes do
   clube e as lendas (jogadores que mais marcaram ou mais jogaram pelo clube).
6. **Given** a carreira do técnico, **When** abre o histórico, **Then** encontra o acesso à
   trajetória do técnico (passagens e temporadas, da 012).

---

### User Story 4 - Feed das rodadas anteriores (Priority: P3)

O jogador consulta as manchetes das rodadas anteriores da temporada atual e da anterior.

**Why this priority**: conveniência; a rodada atual já está na Início.

**Independent Test**: depois de várias rodadas, navegar pelas manchetes de rodadas passadas.

**Acceptance Scenarios**:

1. **Given** várias rodadas jogadas, **When** o jogador abre o feed, **Then** pode escolher a rodada e
   ver as manchetes dela.
2. **Given** a virada de temporada, **When** a nova temporada começa, **Then** o feed mantém as
   manchetes da temporada anterior e um resumo da temporada encerrada (campeões, acessos,
   rebaixamentos, artilheiro).

---

### Edge Cases

- Rodada sem nenhum evento notável do clube do jogador: a manchete mínima é sobre o resultado do
  jogo (com sequência, se houver).
- Técnico desempregado: não há clube do jogador; o feed traz as manchetes da liga e do mercado.
- Clube do jogador sem jogo na rodada (calendário com folga): manchete sobre a próxima partida ou
  sobre a situação na tabela.
- Vários eventos sobre o mesmo jogo (hat-trick + goleada + clássico): o feed agrupa em uma manchete
  principal e no máximo uma complementar por jogo.
- Recorde empatado não é recorde batido: não gera manchete de recorde.
- Primeira temporada (sem histórico): não há "recorde anterior"; a manchete de recorde só aparece a
  partir de quando houver uma marca registrada para superar.
- Jogadores aposentados ou que trocaram de clube continuam nos artilheiros históricos e nas lendas
  do clube onde marcaram.
- Clubes e jogadores com nomes no feminino ou plural: os textos respeitam gênero e número.
- Saves antigos abrem com feed vazio e histórico reconstruído a partir do que já existe
  (campeões e classificações das temporadas encerradas); artilheiros e recordes passam a ser
  registrados a partir da migração.
- Mesma seed e mesmas decisões produzem exatamente as mesmas manchetes (mesmos tipos, variações e
  ordem), inclusive após salvar e carregar.

## Requirements *(mandatory)*

### Functional Requirements

**Manchetes**

- **FR-001**: O jogo DEVE gerar, a cada rodada, manchetes a partir dos eventos da rodada: resultados,
  gols e marcas individuais (hat-trick), goleadas, viradas, zebras, clássicos, sequências e fins de
  jejum, recordes, demissões e contratações de técnicos, transferências relevantes, título,
  acesso e rebaixamento (inclusive matemáticos).
- **FR-002**: Toda rodada jogada com o técnico empregado DEVE gerar ao menos uma manchete sobre o
  clube do jogador.
- **FR-003**: Cada manchete DEVE ter tipo, relevância, clubes e jogadores envolvidos e os valores
  do contexto (placar, sequência, recorde anterior etc.); o texto final é montado pela camada de
  apresentação a partir de templates.
- **FR-004**: Cada tipo de manchete DEVE ter várias variações de texto; a variação usada DEVE ser
  escolhida de forma determinística (mesmo estado ⇒ mesma variação).
- **FR-005**: Os templates DEVEM ser frases completas com variáveis, com suporte a plural e gênero, e
  ficar no sistema de traduções.
- **FR-006**: O feed da rodada DEVE ser ordenado por relevância (eventos do clube do jogador e fatos
  raros primeiro), DEVE limitar o número de manchetes exibidas por rodada e NÃO PODE repetir o mesmo
  fato; vários fatos do mesmo jogo DEVEM ser agrupados.
- **FR-007**: A Início DEVE mostrar as principais manchetes da última rodada com acesso ao feed
  completo.

**Contexto e recordes**

- **FR-008**: As manchetes de resultado DEVEM citar sequências de vitórias, derrotas ou jogos sem
  vencer a partir de um tamanho mínimo, e o fim de jejuns longos.
- **FR-009**: O jogo DEVE manter recordes da liga e de cada clube (ao menos: maior vitória, maior
  derrota, mais gols de um jogador numa temporada, mais pontos de um clube numa temporada, maior
  sequência de vitórias) com valor, quem, contra quem e quando.
- **FR-010**: Quando um recorde é batido (superado, não empatado), DEVE ser gerada uma manchete que
  cita o recorde anterior (valor, quem e quando), e o recorde DEVE ser atualizado.

**Histórico**

- **FR-011**: O histórico DEVE registrar, por temporada: campeões, acessos e rebaixamentos de cada
  divisão (já existentes) e o artilheiro de cada divisão.
- **FR-012**: O jogo DEVE manter títulos por clube por divisão, artilheiros históricos da liga
  (gols somados de todas as temporadas) e lendas de cada clube (quem mais marcou e quem mais jogou
  pelo clube), incluindo jogadores aposentados.
- **FR-013**: O jogador DEVE poder consultar o histórico em seções: campeões e artilheiros por
  temporada, títulos por clube, artilheiros históricos, recordes da liga, histórico de um clube
  (títulos, recordes, lendas) e acesso à trajetória do técnico (012).
- **FR-014**: O jogador DEVE poder consultar as manchetes de rodadas anteriores da temporada atual e
  da anterior, e um resumo da temporada encerrada.

**Tamanho e desempenho**

- **FR-015**: O histórico e as manchetes guardadas DEVEM crescer de forma controlada: manchetes só
  das duas últimas temporadas; artilheiros históricos, lendas e recordes com listas de tamanho
  limitado; o tamanho do save após 30 temporadas DEVE ficar abaixo de um limite definido no plano.

**Determinismo, dados, saves e textos**

- **FR-016**: Manchetes, contexto e histórico DEVEM ser determinísticos: mesmo estado, mesma seed e
  mesmas decisões ⇒ mesmo resultado, inclusive após salvar e carregar.
- **FR-017**: Os parâmetros (limiares de goleada, zebra, sequência, jejum, transferência relevante,
  relevância por tipo, limite do feed e tamanhos das listas) DEVEM ser dados versionados.
- **FR-018**: O formato de save DEVE ganhar nova versão com migração: saves antigos abrem com feed
  vazio, histórico reconstruído do que já existe e registros novos a partir da migração.
- **FR-019**: O motor DEVE produzir só dados estruturados (tipo + variáveis); nenhum texto final no
  motor.

### Key Entities *(include if feature involves data)*

- **Manchete**: tipo, temporada e rodada, relevância, clubes e jogadores envolvidos, variáveis de
  contexto e índice da variação de texto.
- **Feed**: manchetes por rodada das duas últimas temporadas, mais o resumo da temporada encerrada.
- **Recorde**: categoria (liga ou clube), valor, quem, contra quem, temporada e rodada.
- **Registro de temporada**: campeões, acessos, rebaixamentos e artilheiro por divisão.
- **Artilheiro histórico / lenda**: jogador (mesmo aposentado), clube, gols e jogos acumulados.
- **Regras de manchetes**: parâmetros versionados de limiares, relevância e tamanhos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das rodadas simuladas com o técnico empregado, o feed tem ao menos uma
  manchete sobre o clube do jogador.
- **SC-002**: Ao bater um recorde (de clube ou da liga), a manchete correspondente cita o recorde
  anterior em 100% dos casos testados; recordes empatados não geram manchete de recorde.
- **SC-003**: Após 30 temporadas simuladas, o tamanho do save fica abaixo do limite definido no
  plano, e o crescimento por temporada a partir da décima temporada é aproximadamente constante.
- **SC-004**: O feed de uma rodada exibe no máximo o limite definido de manchetes e nunca duas
  manchetes sobre o mesmo fato.
- **SC-005**: Em uma temporada simulada, ao menos 10 tipos diferentes de manchete aparecem, e nenhuma
  variação de texto é usada em mais de metade das manchetes do seu tipo.
- **SC-006**: O jogador encontra o campeão e o artilheiro de qualquer temporada anterior em até 3
  cliques a partir da Início.
- **SC-007**: Repetir uma carreira com a mesma seed e as mesmas decisões produz exatamente as mesmas
  manchetes e o mesmo histórico, inclusive com salvar e carregar no meio.
- **SC-008**: Saves da versão anterior abrem sem erro, com o histórico de campeões preservado.

## Assumptions

- As manchetes são sobre a liga (única competição); copas futuras usarão o mesmo mecanismo.
- "Zebra" é uma vitória de clube com expectativa (012) muito pior que a do adversário, por uma
  diferença mínima de posições definida no plano.
- "Transferência relevante" é a de maior valor da rodada acima de um limite, ou envolvendo um ídolo
  (013) ou o clube do jogador.
- "Lendas" são os jogadores com mais gols e mais jogos pelo clube na liga, até um número limitado por
  clube; a contagem começa no início da carreira (ou na migração, para saves antigos).
- Artilheiros e recordes de temporadas anteriores à migração não são reconstruídos, porque o jogo
  não guardava os gols por jogador dessas temporadas.
- A trajetória do técnico é a da 012 (Carreira › Histórico); o histórico do mundo só leva até ela.
- Manchetes da rodada ao vivo aparecem ao fim da rodada (não durante os jogos).
- O limite de tamanho do save e os demais valores numéricos são definidos no plano e verificados
  por simulação longa.
- Coletivas interativas, vestiário e imagens nas notícias ficam fora.
