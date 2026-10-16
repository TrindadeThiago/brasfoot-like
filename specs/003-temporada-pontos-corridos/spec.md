# Feature Specification: Temporada de pontos corridos

**Feature Branch**: `003-temporada-pontos-corridos`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Simulação de uma temporada completa de uma competição de pontos corridos (ver docs/design.md §3 e §13, marco M1) — prompt `docs/speckit-prompts/marco1/prompt003.md`."

## Contexto

Última feature do Marco 1. Usa o mundo da feature 001 (competição com formato "pontos corridos"
descrito como dado: turnos, pontuação e critérios de desempate; divisões com seus clubes) e o
motor de partida da feature 002 (simulação determinística e escalação automática que aceita
jogadores indisponíveis). O critério de pronto do marco é: **uma temporada simulada gera tabela
crível (placares realistas, favoritos geralmente no topo)**. Não há interface gráfica.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simular uma temporada e obter a tabela (Priority: P1)

Dado o banco do mundo, a competição, a divisão e uma seed, o jogo gera o calendário de turno e
returno, simula todas as rodadas com escalação automática e mantém a tabela de classificação
atualizada. A mesma seed sempre produz exatamente a mesma temporada.

**Why this priority**: é o núcleo da feature e do critério de pronto do Marco 1; sem temporada
não há carreira.

**Independent Test**: simular a Série A do banco padrão com uma seed fixa, conferir 38 rodadas de
10 jogos, cada par de clubes se enfrentando uma vez em casa e uma fora, tabela coerente com os
resultados, e repetir a simulação obtendo a mesma temporada.

**Acceptance Scenarios**:

1. **Given** a Série A do banco padrão (20 clubes) e a seed 42, **When** o calendário é gerado,
   **Then** há 38 rodadas de 10 jogos, todo par de clubes se enfrenta exatamente duas vezes (uma
   com cada mando) e nenhum clube joga duas vezes na mesma rodada.
2. **Given** o calendário, **When** a temporada é simulada até o fim, **Then** a tabela final tem
   20 linhas, cada clube com 38 jogos, e pontos, vitórias, empates, derrotas e gols fecham com os
   resultados das partidas.
3. **Given** a mesma entrada e a mesma seed, **When** a temporada é simulada duas vezes, **Then**
   calendário, resultados e tabela são idênticos.
4. **Given** dois clubes empatados em pontos, **When** a tabela é ordenada, **Then** os critérios
   de desempate da competição são aplicados na ordem definida no banco.
5. **Given** uma temporada em andamento, **When** ela é avançada uma rodada por vez, **Then** o
   resultado final é idêntico ao de simular tudo de uma vez.

---

### User Story 2 - Disciplina, lesões e estatísticas ao longo da temporada (Priority: P2)

Cartões geram suspensões automáticas e lesões tiram jogadores das partidas seguintes; a
escalação automática respeita essas ausências. A temporada acumula estatísticas: artilharia,
assistências, cartões, suspensões e lesões.

**Why this priority**: sem consequências entre rodadas, cada jogo seria independente e a
temporada perderia credibilidade; as estatísticas são a base das manchetes e do histórico
(Marco 5).

**Independent Test**: simular uma temporada e verificar que todo jogador suspenso ou lesionado
fica fora das partidas correspondentes, que suspensões seguem as regras e que a artilharia fecha
com os gols das partidas.

**Acceptance Scenarios**:

1. **Given** um jogador que recebe o 3º cartão amarelo, **When** chega a próxima partida do seu
   clube, **Then** ele não é escalado (nem no banco) e cumpre a suspensão; depois volta a ficar
   disponível com a contagem de amarelos zerada.
2. **Given** um jogador expulso, **When** chega a próxima partida do seu clube, **Then** ele
   cumpre 1 jogo de suspensão.
3. **Given** um jogador que se lesiona, **When** as próximas partidas do seu clube acontecem,
   **Then** ele fica fora pelo número de partidas definido pela gravidade da lesão e depois volta.
4. **Given** uma temporada completa, **When** se consulta a artilharia, **Then** os gols de cada
   jogador batem com os gols das partidas, ordenados do maior para o menor.

---

### User Story 3 - Campeonato crível em volume (Priority: P3)

Quem joga espera campeonatos parecidos com os reais: os clubes mais fortes geralmente brigam pelo
título, mas nem sempre o mais forte é campeão; pontuações típicas para campeão e lanterna;
invencibilidade rara; artilheiros com números plausíveis.

**Why this priority**: é a prova de que o Marco 1 está pronto. Depende de US1 e US2.

**Independent Test**: simular 100 temporadas com seeds diferentes, sem interação, e verificar as
faixas de FR-030 a FR-037.

**Acceptance Scenarios**:

1. **Given** 100 temporadas da Série A do banco padrão, **When** as tabelas finais são analisadas,
   **Then** todas as faixas de credibilidade são atendidas.

---

### User Story 4 - Simular temporadas pela linha de comando (Priority: P4)

Quem desenvolve (e quem calibra o jogo) roda um comando com uma seed e vê a tabela final, os
artilheiros, o resumo disciplinar e um relatório de credibilidade; com uma opção, roda várias
temporadas e vê o relatório agregado.

**Why this priority**: torna o critério do Marco 1 verificável por qualquer pessoa sem ler
testes; ajuda a calibrar. Depende de US1–US3.

**Independent Test**: rodar o comando com uma seed duas vezes e obter a mesma saída; rodar com
100 temporadas e ver cada critério marcado como atendido ou não.

**Acceptance Scenarios**:

1. **Given** a seed 42, **When** o comando é executado, **Then** imprime a tabela final (posição,
   clube, pontos, jogos, V, E, D, gols pró, gols contra, saldo), os 10 maiores artilheiros, o
   resumo de cartões, suspensões e lesões, e o relatório de credibilidade da temporada.
2. **Given** a opção de 100 temporadas, **When** o comando é executado, **Then** imprime o
   relatório agregado com cada critério de FR-030 a FR-037, o valor medido e a faixa, e termina
   com código de erro se algum critério falhar.

---

### Edge Cases

- Divisão com número ímpar de clubes → em cada rodada um clube folga; todos folgam o mesmo número
  de vezes por turno.
- Competição com 1 turno (ou mais de 2) definida no banco → o calendário respeita o número de
  turnos, alternando a inversão de mandos entre turnos.
- Clube sem 11 jogadores disponíveis por causa de suspensões e lesões → a escalação usa os
  disponíveis e completa com os indisponíveis de menor impedimento (lesão mais leve ou suspensão
  mais curta), registrando um aviso na temporada; a partida acontece.
- Jogador com suspensão pendente na última rodada → a suspensão fica registrada no estado da
  temporada (para a próxima temporada, em feature futura), sem erro.
- Lesão grave que dura além do fim da temporada → o jogador permanece lesionado no estado final.
- Segundo amarelo na mesma partida → conta como expulsão (1 jogo); esses dois amarelos não somam
  ao acúmulo para a suspensão por 3 amarelos.
- Expulsão e 3º amarelo acumulado na mesma partida → as suspensões se somam (2 jogos).
- Partida encerrada por falta de jogadores (3 a 0) → conta normalmente na tabela.
- Empate em todos os critérios até o sorteio → o sorteio é determinístico pela seed da temporada.
- Empate envolvendo três ou mais clubes no confronto direto → usa os jogos apenas entre os clubes
  empatados (minitabela).
- Formato da competição diferente de pontos corridos → rejeitado com erro codificado (outros
  formatos chegam em features futuras).

## Requirements *(mandatory)*

### Functional Requirements

**Calendário**

- **FR-001**: O calendário DEVE ser gerado a partir dos clubes de uma divisão e do número de
  turnos do formato da competição: com N clubes (N par), cada turno tem N − 1 rodadas e cada par
  de clubes se enfrenta exatamente uma vez por turno; com N ímpar, cada rodada tem um clube de
  folga.
- **FR-002**: Em turnos pares (returno), a sequência de jogos repete a do turno anterior com os
  mandos invertidos.
- **FR-003**: Os mandos DEVEM ser equilibrados: em cada turno, cada clube joga em casa
  ⌊(N−1)/2⌋ ou ⌈(N−1)/2⌉ vezes; nenhum clube joga mais de 2 partidas seguidas com o mesmo mando
  dentro de um turno.
- **FR-004**: O calendário DEVE ser determinístico pela seed da temporada: mesma seed ⇒ mesmo
  calendário; seeds diferentes ⇒ ordens de jogos diferentes.

**Execução da temporada**

- **FR-005**: A temporada DEVE ser criada a partir do mundo (com atributos ocultos completos), da
  competição, da divisão e de uma seed, e avançada rodada a rodada ou até o fim. O estado da
  temporada DEVE ser serializável e retomável, com a mesma continuação.
- **FR-006**: Cada partida DEVE ser simulada pelo motor de partida com uma seed derivada da seed
  da temporada, da rodada e do jogo; avançar rodada a rodada e simular tudo de uma vez DEVEM dar
  o mesmo resultado.
- **FR-007**: Em cada partida, cada clube DEVE ser escalado pela escalação automática, com seu
  esquema preferido e postura equilibrada, excluindo jogadores suspensos e lesionados. O esquema
  preferido de cada clube é o de maior força efetiva para o seu elenco completo, definido no
  início da temporada.
- **FR-008**: A execução DEVE aceitar, opcionalmente, uma escalação fornecida de fora para um
  clube numa rodada (base para o clube do jogador no Marco 2); ela é validada pelo motor de
  partida e não pode conter jogadores indisponíveis.
- **FR-009**: O mandante de cada jogo tem a vantagem de mando do motor de partida; não há campo
  neutro nesta feature.

**Tabela de classificação**

- **FR-010**: A tabela DEVE ter, para cada clube: posição, pontos, jogos, vitórias, empates,
  derrotas, gols pró, gols contra, saldo de gols e os resultados das últimas 5 partidas.
- **FR-011**: A pontuação por vitória, empate e derrota DEVE vir do formato da competição no
  banco.
- **FR-012**: Clubes empatados em pontos DEVEM ser ordenados pelos critérios de desempate do
  formato da competição, na ordem do banco: vitórias, saldo de gols, gols pró, confronto direto
  (pontos obtidos nos jogos apenas entre os clubes empatados), menos cartões vermelhos e sorteio.
- **FR-013**: O sorteio DEVE ser determinístico pela seed da temporada e estável durante toda a
  temporada (a ordem sorteada entre dois clubes nunca muda de uma rodada para outra).
- **FR-014**: A tabela DEVE ser atualizada ao fim de cada rodada e ser sempre consistente com os
  resultados das partidas já disputadas; resultados de partidas encerradas (3 a 0) contam
  normalmente.

**Disciplina e lesões**

- **FR-015**: As regras disciplinares DEVEM ser configuráveis na temporada, com padrão: 3
  cartões amarelos acumulados = 1 jogo de suspensão (a contagem zera ao cumprir); cartão
  vermelho (direto ou por segundo amarelo) = 1 jogo de suspensão.
- **FR-016**: Os dois amarelos que geram uma expulsão na mesma partida NÃO DEVEM contar para o
  acúmulo de amarelos.
- **FR-017**: Suspensões DEVEM ser cumpridas nas próximas partidas do clube na competição;
  suspensões da mesma partida se somam.
- **FR-018**: Cada lesão DEVE afastar o jogador por um número de partidas conforme a gravidade:
  leve 1–2, média 3–6, grave 7–15, sorteado de forma determinística pela seed.
- **FR-019**: Jogadores suspensos ou lesionados NÃO DEVEM ser escalados (nem no banco) enquanto
  durar o afastamento; ao fim dele voltam a ficar disponíveis.
- **FR-020**: Se um clube não tiver 11 jogadores disponíveis, a escalação DEVE completar com os
  indisponíveis de menor impedimento e registrar um aviso na temporada.

**Estatísticas**

- **FR-021**: A temporada DEVE acumular, por jogador: partidas jogadas, minutos, gols,
  assistências, cartões amarelos e vermelhos, partidas suspenso e partidas lesionado.
- **FR-022**: A temporada DEVE oferecer rankings de artilharia (gols; desempate por menos
  partidas jogadas e depois pelo id) e de assistências, e totais de cartões, suspensões e lesões.

**Erros**

- **FR-023**: Entradas inválidas (competição ou divisão inexistente, formato que não é pontos
  corridos, divisão com menos de 2 clubes, escalação externa inválida) DEVEM ser rejeitadas com
  erro codificado e parâmetros, com mensagem pt-BR no sistema de idiomas.

**Credibilidade (verificada em 100 temporadas da Série A do banco padrão, Princípio V)**

"Força inicial" de um clube = média da força dos seus 16 melhores jogadores no início da
temporada (mesmo critério da feature 001).

- **FR-030**: O campeão está entre os 4 clubes de maior força inicial em 60% a 99% das temporadas.
  *(Ajustado na implementação, com decisão do usuário: era 95%; o banco padrão tem 4 clubes grandes
  bem acima dos médios, e o "nem sempre" do prompt é garantido pelo FR-031.)*
- **FR-031**: O clube de maior força inicial é campeão em 25% a 70% das temporadas (o favorito
  costuma ganhar, mas não sempre).
- **FR-032**: O campeão soma entre 70 e 90 pontos em ao menos 90% das temporadas.
- **FR-033**: O último colocado soma entre 15 e 40 pontos em ao menos 90% das temporadas.
- **FR-034**: Há algum clube invicto em no máximo 10% das temporadas.
- **FR-035**: A correlação de postos (Spearman) entre força inicial e posição final é, em média,
  de pelo menos 0,5, e positiva em todas as temporadas.
- **FR-036**: Média de gols por partida da temporada entre 2,2 e 3,0 e proporção de empates entre
  22% e 32% em ao menos 90% das temporadas.
- **FR-037**: O artilheiro da temporada marca entre 14 e 32 gols em ao menos 90% das temporadas.

**Linha de comando**

- **FR-040**: Um comando DEVE simular a temporada da divisão principal do banco padrão a partir de
  uma seed e imprimir: tabela final, 10 maiores artilheiros, resumo de cartões, suspensões e
  lesões, e relatório de credibilidade da temporada.
- **FR-041**: Com uma opção de N temporadas, o comando DEVE imprimir o relatório agregado de
  FR-030 a FR-037 com valor medido, faixa e ✓/✗, e terminar com código de erro se algum falhar.
- **FR-042**: A mesma seed DEVE produzir a mesma saída.

### Key Entities *(include if feature involves data)*

- **Calendário**: lista ordenada de rodadas; cada rodada tem jogos (mandante, visitante) e,
  quando N é ímpar, o clube de folga.
- **Jogo da temporada**: rodada, mandante, visitante, seed derivada e, depois de disputado, o
  resultado da partida.
- **Temporada**: mundo usado, competição e divisão, seed, regras disciplinares, esquema preferido
  de cada clube, calendário, rodada atual, resultados, situação dos jogadores, estatísticas,
  avisos; serializável.
- **Linha da tabela**: clube, posição, pontos, jogos, V, E, D, gols pró, gols contra, saldo,
  últimos 5 resultados, cartões vermelhos (para desempate).
- **Situação do jogador**: amarelos acumulados, partidas de suspensão restantes, partidas de lesão
  restantes.
- **Estatística do jogador na temporada**: partidas, minutos, gols, assistências, cartões,
  partidas suspenso, partidas lesionado.
- **Regras disciplinares**: amarelos para suspensão, jogos por vermelho.
- **Relatório de credibilidade**: métricas de FR-030 a FR-037 de uma ou várias temporadas, com
  faixas e situação.
- **Erro de temporada**: código e parâmetros, traduzido pelo sistema de idiomas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, a mesma entrada e a mesma seed produzem a mesma temporada
  (calendário, resultados, tabela e estatísticas); rodada a rodada = tudo de uma vez.
- **SC-002**: Em 100% das temporadas simuladas, o calendário atende FR-001 a FR-003 e a tabela é
  consistente com os resultados.
- **SC-003**: Em 100% das temporadas simuladas, nenhum jogador suspenso ou lesionado aparece numa
  escalação (titular ou banco) durante o afastamento, salvo o caso de FR-020 registrado em aviso.
- **SC-004**: Todas as faixas de FR-030 a FR-037 são atendidas em 100 temporadas.
- **SC-005**: Uma temporada completa (380 partidas) é simulada em menos de 2 segundos, e 100
  temporadas em menos de 2 minutos, num computador comum.
- **SC-006**: Toda regra de erro tem ao menos um caso de teste que a rejeita com o código
  esperado, e 100% dos códigos têm mensagem pt-BR.

## Assumptions

- O escopo é uma divisão de uma competição de pontos corridos por temporada; Série B,
  acesso/rebaixamento e virada de temporada ficam para o Marco 3 (feature 007).
- As rodadas são numeradas, sem datas de calendário; datas entram com a carreira.
- Todos os clubes são controlados pela IA nesta feature; a escalação externa (FR-008) é só o
  ponto de extensão para o clube do jogador no Marco 2.
- A IA usa postura equilibrada e um esquema fixo por temporada; IA tática mais elaborada (mudar
  postura conforme o adversário ou o placar) fica para features futuras.
- Os atributos ocultos dos jogadores são completados a partir da seed da temporada, que faz o
  papel da seed da carreira até existir uma carreira (Marco 2).
- Não há evolução, cansaço acumulado, moral, finanças nem mercado durante a temporada; os elencos
  são fixos.
- A duração das lesões é contada em partidas do clube, não em dias.
- A seed de cada partida é derivada de forma estável (temporada + rodada + jogo), de modo que
  alterar a escalação de uma partida não muda a sorte das demais.
- O relatório da linha de comando é texto para desenvolvimento e calibragem; a tabela e as
  estatísticas para o jogador serão exibidas pela interface no Marco 2.
