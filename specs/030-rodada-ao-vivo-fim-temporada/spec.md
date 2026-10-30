# Feature Specification: Rodada ao vivo e fim de temporada

**Feature Branch**: `030-rodada-ao-vivo-fim-temporada`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Refazer a rodada ao vivo e o resumo de fim de temporada na nova interface: rodada ao vivo com cara de transmissão (placar do meu jogo em destaque, andamento visível, linha do tempo, estatísticas, outros jogos em lista de uma linha por jogo, painel Meu time com substituições e troca de posição, pênaltis, confirmação ao sair, ações no fim da rodada) e fim de temporada com 'Temporada X encerrada', o botão Próxima temporada na mesma linha do título, o resultado do clube, 'Como foi a sua temporada', campeões das ligas nacionais, acesso e rebaixamento e a classificação final recolhida. Paridade funcional total, sem novos eventos de partida, a mesma seed dá a mesma partida, a nota única do 1.0.0 atualizada no mesmo PR e a versão do jogo inalterada." (prompt030, Marco 10)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acompanhar o meu jogo como numa transmissão (Priority: P1)

Como jogador, quero acompanhar o meu jogo com placar, minuto, linha do tempo dos lances e estatísticas, sem perder de vista os outros jogos da rodada, para viver a rodada ao vivo como o momento mais importante do jogo.

**Why this priority**: a rodada ao vivo é o coração do jogo; se o placar e o andamento não saltam aos olhos, o resto da tela não importa.

**Independent Test**: iniciar uma rodada ao vivo e conferir, durante a partida, o placar em destaque, o estado, a linha do tempo, as estatísticas e a lista dos outros jogos.

**Acceptance Scenarios**:

1. **Given** a rodada ao vivo em andamento, **When** o jogador olha a tela, **Then** o seu jogo aparece em destaque com os escudos e nomes dos dois clubes, o mando, a fase ou o grupo (nas competições com fases), o placar grande e o estado do jogo em texto (ao vivo, intervalo, fim, prorrogação ou pênaltis; o intervalo da prorrogação conta como intervalo) com o minuto.
2. **Given** um clássico, **When** o jogo aparece, **Then** a etiqueta de clássico está junto ao jogo, em texto.
3. **Given** jogadores expulsos, **When** o jogo é mostrado, **Then** os expulsos de cada time aparecem junto ao time, com o nome e o minuto.
4. **Given** o meu jogo, **When** acontecem gols, cartões e lesões, **Then** a linha do tempo do meu jogo os lista em ordem, cada lance com o minuto, o tipo em texto e os envolvidos, e só os lances do meu jogo aparecem ali (não há "lances da rodada").
5. **Given** o meu jogo, **When** ele é mostrado, **Then** as estatísticas comparativas dos dois times aparecem lado a lado: finalizações, no alvo, posse, amarelos, vermelhos e pênaltis.
6. **Given** os demais jogos da rodada, **When** a lista é mostrada, **Then** cada jogo ocupa uma linha, com a competição, o minuto, o escudo e o nome de cada clube e o placar, e o gol recente aparece em destaque (em texto, não só em cor).
7. **Given** a barra de andamento, **When** a rodada avança, **Then** ela mostra o progresso da partida com o intervalo marcado.

---

### User Story 2 - Substituir, trocar a posição e responder a lesão ou expulsão (Priority: P1)

Como jogador, quero fazer substituições e trocar a posição de dois jogadores com poucos cliques, e ser avisado na hora quando um jogador se lesiona ou o goleiro é expulso, para tomar a decisão certa no momento certo, mesmo só com o teclado.

**Why this priority**: as decisões durante o jogo são o que torna a rodada ao vivo diferente de simular direto.

**Independent Test**: com a rodada pausada, substituir um jogador lesionado, trocar a posição de dois jogadores em campo e responder a um goleiro expulso, só com o teclado.

**Acceptance Scenarios**:

1. **Given** a rodada pausada, **When** o jogador abre o painel Meu time, **Then** vê o esquema, a postura, as substituições usadas e o limite, os jogadores em campo com condição, cartões, lesão e expulsão, os reservas disponíveis e a lista "Já saíram".
2. **Given** um jogador em campo e um reserva, **When** o jogador faz a substituição, **Then** a mudança é confirmada em texto e o contador de substituições usadas é atualizado.
3. **Given** dois jogadores em campo, **When** o jogador troca a posição entre eles, **Then** a troca não gasta substituição e é confirmada em texto.
4. **Given** uma mudança inválida (limite de substituições, jogador indisponível, esquema inválido), **When** o jogador tenta fazê-la, **Then** a mudança não é feita e a mensagem diz a causa, como hoje.
5. **Given** um jogador se lesiona ou o goleiro é expulso, **When** isso acontece, **Then** o jogo avisa na hora, a rodada pausa (com a pausa automática ligada) e o painel mostra o aviso de substituto obrigatório com o que fazer.
6. **Given** os avisos e diálogos que abrem durante a rodada, **When** um deles abre, **Then** o foco vai para o lugar certo (o aviso ou o diálogo) e volta ao controle de onde saiu ao fechar.
7. **Given** o teclado, **When** o jogador faz a substituição de um lesionado, a troca de posição de dois jogadores e a resposta a um goleiro expulso, **Then** consegue fazer as três coisas sem usar o mouse.

---

### User Story 3 - Controlar a velocidade, pausar, retomar, terminar e sair (Priority: P1)

Como jogador, quero controlar a velocidade, pausar, retomar e terminar a rodada, e ser avisado antes de perder a rodada ao sair.

**Why this priority**: o controle do ritmo é o que dá ao jogador o poder sobre a transmissão.

**Independent Test**: mudar a velocidade, pausar, retomar, terminar agora e tentar sair no meio da rodada.

**Acceptance Scenarios**:

1. **Given** a rodada ao vivo, **When** o jogador olha a barra de controle, **Then** vê sair, a velocidade (lenta, normal e rápida), pausar e retomar, terminar agora e a opção de pausa automática em lesão ou expulsão.
2. **Given** a barra de controle, **When** o jogador usa as ações, **Then** a velocidade muda, a rodada pausa e retoma, e terminar agora leva a rodada ao fim imediatamente, como hoje; os atalhos de teclado de hoje continuam valendo.
3. **Given** a rodada em andamento, **When** o jogador tenta sair, **Then** um diálogo avisa que "a rodada em andamento será perdida" e pede confirmação; confirmar sai, cancelar volta à rodada.
4. **Given** a rodada pausada ou em velocidade qualquer, **When** o jogador olha a tela, **Then** o estado (rodando, pausada) e a velocidade escolhida estão escritos.

---

### User Story 4 - Prorrogação e pênaltis (Priority: P2)

Como jogador, quero ver a prorrogação e as cobranças de pênaltis de cada time, convertidas e perdidas, e o resultado final.

**Why this priority**: cobre os jogos eliminatórios; menos frequente, mas é o momento de maior tensão.

**Independent Test**: jogar uma partida de copa que vá a pênaltis e acompanhar cada cobrança.

**Acceptance Scenarios**:

1. **Given** uma partida eliminatória empatada, **When** vai à prorrogação, **Then** o estado do jogo mostra "prorrogação" e a tela avisa.
2. **Given** os pênaltis, **When** cada cobrança acontece, **Then** o painel mostra as cobranças de cada time, as convertidas e as perdidas em texto e símbolo, e o placar dos pênaltis.
3. **Given** o fim dos pênaltis, **When** o jogo acaba, **Then** o resultado final mostra quem avançou.

---

### User Story 5 - Fim da rodada: ver classificação, voltar ao início ou ir ao resumo da temporada (Priority: P2)

Como jogador, quero, ao fim da rodada, ir direto ao que vem a seguir: ver a classificação, voltar ao início ou, se for a última rodada, ver o resumo da temporada.

**Why this priority**: fecha o ciclo da rodada sem obrigar o jogador a procurar o próximo passo.

**Independent Test**: terminar uma rodada comum e a última rodada da temporada.

**Acceptance Scenarios**:

1. **Given** o fim da rodada, **When** a tela de resultado aparece, **Then** mostra os resultados da rodada, o resumo do meu jogo e as ações Ver classificação e Voltar ao início, mais os links dos resultados das outras divisões, como hoje.
2. **Given** a última rodada da temporada, **When** a rodada termina, **Then** a ação Ver o resumo da temporada aparece no lugar de Voltar ao início.

---

### User Story 6 - Fechar a temporada com um resumo de como ela foi (Priority: P1)

Como jogador, quero fechar a temporada com um resumo de como ela foi, saber quem foi campeão nas ligas nacionais e quem subiu e desceu, e começar a próxima temporada sem procurar o botão.

**Why this priority**: é o momento de fechamento do ciclo da carreira; hoje as informações estão numa pilha sem hierarquia.

**Independent Test**: terminar a temporada e conferir cada seção do resumo e o botão no topo.

**Acceptance Scenarios**:

1. **Given** o fim da temporada, **When** a tela abre, **Then** o título "Temporada X encerrada" traz, na mesma linha, o botão Próxima temporada; durante a preparação o botão mostra o estado "preparando", e um aviso de falha aparece logo abaixo se a virada falhar.
2. **Given** o resumo, **When** a tela é mostrada, **Then** o resultado do clube aparece em destaque (campeão, acesso, rebaixamento ou permanência) com posição, pontos, vitórias, empates e derrotas, gols e saldo.
3. **Given** a seção "Como foi a sua temporada", **When** ela é mostrada, **Then** traz a campanha por competição (o resultado e a premiação de cada uma, e o total) e a avaliação da diretoria (metas cumpridas ou não, confiança final, decisão, reputação antes e depois e a conquista).
4. **Given** a seção "Campeões das ligas nacionais", **When** ela é mostrada, **Then** traz o campeão e os pontos de cada divisão do campeonato nacional, com a divisão do clube destacada.
5. **Given** a seção "Acesso e rebaixamento", **When** ela é mostrada, **Then** traz os clubes que sobem e descem em cada fronteira entre divisões, com o clube do jogador destacado.
6. **Given** a classificação final da divisão do clube, **When** o resumo é mostrado, **Then** ela vem recolhida, e o jogador a abre quando quiser.
7. **Given** o fim da página, **When** o jogador chega lá, **Then** Ver o histórico e Próxima temporada estão também ali.
8. **Given** uma competição ou premiação que o jogo não guarda, **When** o resumo é montado, **Then** o que não existir não entra, em vez de aparecer vazio.

---

### User Story 7 - Uma rodada com dez jogos ao vivo sem travar e anunciada para leitor de tela (Priority: P2)

Como jogador, quero que uma rodada com dez jogos ao vivo em velocidade rápida corra sem travar, e que os lances do meu jogo sejam anunciados para leitor de tela sem repetir os de outros jogos.

**Why this priority**: sem desempenho a transmissão não funciona, e sem anúncios a rodada ao vivo fica fora do alcance de quem usa leitor de tela.

**Independent Test**: rodar uma rodada de dez jogos em velocidade rápida e, com leitor de tela, acompanhar os lances do meu jogo.

**Acceptance Scenarios**:

1. **Given** uma rodada com dez jogos ao vivo em velocidade rápida, **When** ela roda até o fim, **Then** termina sem erro, a interface não trava e a lista de lances não cresce sem limite na tela.
2. **Given** um gol, uma expulsão, uma lesão, o intervalo, o fim do jogo, a prorrogação ou uma cobrança de pênalti do meu jogo, **When** acontece, **Then** é anunciado para leitor de tela, todos os do mesmo instante e em ordem; os lances de outros jogos não são anunciados.
3. **Given** a mesma seed e as mesmas decisões, **When** a rodada é jogada duas vezes, **Then** a partida é a mesma: a interface não muda o resultado.

---

### Edge Cases

- **Jogo sem fase ou grupo:** a fase simplesmente não aparece; o resto do cartão do jogo continua igual.
- **Meu jogo em copa ou competição entre países:** o cartão mostra a competição, a fase e o estado (prorrogação, pênaltis).
- **Partida com muitos lances:** a linha do tempo mostra os mais novos e rola dentro do quadro, sem crescer sem limite.
- **Rodada com mais de uma divisão:** a lista dos outros jogos mostra a divisão do jogador (como hoje) e os demais avançam junto.
- **Goleiro expulso sem reserva de goleiro:** o aviso de substituto obrigatório diz o que fazer, e a mudança inválida mostra a causa.
- **Dois lances no mesmo minuto:** aparecem na ordem em que aconteceram e são anunciados um a um.
- **Sair sem confirmar:** fechar a aba ou navegar durante a rodada continua avisando, como hoje.
- **Falha ao preparar a próxima temporada:** o aviso aparece logo abaixo do título e o botão volta a ficar disponível.
- **Temporada em que o clube foi demitido ou ficou sem clube:** o resumo mostra o que existir e o estado de desempregado, sem seções vazias.
- **Larguras:** sem rolagem horizontal da página em 1 440, 1 280 e 1 024 px; a 768 px vale a estrutura da 025.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A rodada ao vivo MUST mostrar o meu jogo em destaque: escudos e nomes, mando, fase ou grupo, placar grande e o estado em texto (ao vivo, intervalo, fim, prorrogação ou pênaltis) com o minuto.
- **FR-002**: O jogo MUST mostrar a etiqueta de clássico (em texto) e os expulsos de cada time.
- **FR-003**: O meu jogo MUST ter a linha do tempo com gols, cartões e lesões, cada lance com minuto, tipo em texto e envolvidos; só os lances do meu jogo, sem "lances da rodada".
- **FR-004**: O meu jogo MUST ter as estatísticas comparativas: finalizações, no alvo, posse, amarelos, vermelhos e pênaltis.
- **FR-005**: Os outros jogos MUST aparecer em lista, uma linha por jogo, com competição, minuto, escudo e nome de cada clube e placar, com o gol recente em destaque que não dependa só da cor.
- **FR-006**: A barra de controle MUST ter sair, velocidade (lenta, normal e rápida), pausar e retomar, terminar agora e a pausa automática em lesão ou expulsão; os atalhos de teclado de hoje continuam valendo; o estado e a velocidade ficam escritos.
- **FR-007**: A barra de andamento MUST mostrar o progresso da partida com o intervalo marcado.
- **FR-008**: O painel Meu time MUST mostrar o esquema, a postura, as substituições usadas e o limite, os jogadores em campo com condição, cartões, lesão e expulsão, os reservas disponíveis e "Já saíram".
- **FR-009**: O jogador MUST poder substituir e trocar a posição de dois jogadores em campo sem gastar substituição, com a confirmação de cada mudança em texto.
- **FR-010**: Uma mudança inválida (limite, jogador indisponível, esquema inválido) MUST ser recusada com a mensagem da causa, como hoje.
- **FR-011**: O jogo MUST avisar na hora quando um jogador se lesiona ou o goleiro é expulso, com o aviso de substituto obrigatório no painel.
- **FR-012**: Substituir um jogador lesionado, trocar a posição de dois jogadores e responder a um goleiro expulso MUST ser possível só com o teclado.
- **FR-013**: Os pênaltis MUST mostrar as cobranças de cada time, convertidas e perdidas (em texto e símbolo), o placar dos pênaltis e o resultado final.
- **FR-014**: Sair no meio da rodada MUST pedir confirmação num diálogo ("a rodada em andamento será perdida").
- **FR-015**: O fim da rodada MUST mostrar os resultados, o resumo do meu jogo e as ações Ver classificação, Voltar ao início (ou Ver o resumo da temporada na última rodada) e os links dos resultados das outras divisões.
- **FR-016**: O fim de temporada MUST ter o título "Temporada X encerrada" com o botão Próxima temporada na mesma linha, o estado "preparando" e o aviso de falha logo abaixo.
- **FR-017**: O fim de temporada MUST mostrar o resultado do clube em destaque (campeão, acesso, rebaixamento ou permanência) com posição, pontos, vitórias, empates e derrotas, gols e saldo.
- **FR-018**: A seção "Como foi a sua temporada" MUST mostrar a campanha por competição (resultado e premiação de cada uma e o total) e a avaliação da diretoria (metas, confiança final, decisão, reputação antes e depois e conquista).
- **FR-019**: A seção "Campeões das ligas nacionais" MUST mostrar o campeão e os pontos de cada divisão do campeonato nacional, com a divisão do clube destacada.
- **FR-020**: A seção "Acesso e rebaixamento" MUST mostrar os clubes que sobem e descem em cada fronteira entre divisões, com o clube do jogador destacado.
- **FR-021**: A classificação final da divisão do clube MUST vir recolhida; Ver o histórico e Próxima temporada MUST estar também no fim da página.
- **FR-022**: O resumo MUST usar só dados que o jogo já tem; a premiação por competição e o resultado em cada competição são confirmados no plano, e o que não existir não entra.
- **FR-023**: Uma rodada com dez jogos ao vivo em velocidade rápida MUST terminar sem erro e sem travar a interface (nenhuma tarefa de interface acima de 200 ms durante a rodada); a lista de lances MUST ter um limite na tela.
- **FR-024**: Os gols, expulsões, lesões, o intervalo, o fim do jogo, a prorrogação e as cobranças de pênalti do meu jogo MUST ser anunciados para leitor de tela, sem repetir os de outros jogos; o foco MUST ir para o aviso ou diálogo que abre e voltar ao controle de origem ao fechar.
- **FR-025**: A interface MUST NOT mudar o resultado da partida: a mesma seed e as mesmas decisões dão a mesma partida.
- **FR-026**: Nenhum dado, ação ou aviso que as telas de hoje mostram pode sumir (paridade, `docs/interface-nova.md` §5), com **uma exceção por decisão do pedido**: o feed "Lances da rodada" (os lances dos outros jogos) é retirado (FR-003), e os outros jogos aparecem só com placar, minuto e gol recente; nenhuma regra, evento de partida ou dado do save muda.
- **FR-027**: Todo texto, plural, data e formato MUST vir do i18n; dinheiro, pelo formato do jogo.
- **FR-028**: A cor MUST NOT ser o único sinal de estado (ao vivo, intervalo, fim), de gol recente, de cobrança convertida ou perdida, nem de situação da meta.
- **FR-029**: A feature MUST entrar pela branch `release/v1.0.0` (o PR tem essa base e nada é publicado), acrescentando o que mudou à nota única do 1.0.0 (`docs/interface-nova.md` §6); a versão do jogo não muda.

### Key Entities *(include if feature involves data)*

- **Rodada ao vivo**: os jogos da rodada com estado, minuto, placar, lances e decisões do jogador. Já existe; só muda a apresentação.
- **Meu jogo**: a partida do clube do jogador na rodada, com escalação, expulsos, estatísticas e (se houver) pênaltis. Já existe.
- **Lance**: gol, cartão, lesão, finalização e cobrança de pênalti, com minuto e envolvidos. Já existe.
- **Mudança do jogador**: substituição, troca de posição, esquema ou postura. Já existe, com as mesmas validações.
- **Resumo da temporada**: situação do clube, campeões, subidas e descidas, premiações, resultado por competição e avaliação da diretoria. Já existe em partes; o plano confirma o que há.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Substituir um jogador lesionado, trocar a posição de dois jogadores e responder a um goleiro expulso são possíveis só com o teclado, em todas as tentativas do teste.
- **SC-002**: Uma rodada completa de dez jogos, em velocidade rápida, termina sem erro e sem queda perceptível de desempenho: nenhuma tarefa de interface passa de 200 ms durante a rodada, e a interface responde a cliques e teclas.
- **SC-003**: Durante a rodada, o placar, o minuto e o estado do meu jogo ficam visíveis sem rolagem em 1 440 × 900 px.
- **SC-004**: Em todas as telas da feature, não há rolagem horizontal da página em 1 440, 1 280 e 1 024 px, e nenhuma violação grave de acessibilidade nos dois temas.
- **SC-005**: Nenhum estado de jogo, gol recente, cobrança ou meta depende só da cor, verificado nos dois temas.
- **SC-006**: 100% dos dados, ações, avisos e mensagens de erro das telas de hoje continuam disponíveis (checagem contra a lista de paridade).
- **SC-007**: A mesma seed e as mesmas decisões dão exatamente a mesma partida antes e depois da feature.
- **SC-008**: O teste de ponta a ponta da rodada ao vivo continua passando, atualizado, e cobre pênaltis e a confirmação de saída.

## Assumptions

- **Telas existentes:** a rodada ao vivo (`/jogo/rodada`) e o fim de temporada (`/jogo/fim-de-temporada`) já existem; nenhuma tela nova nasce, e a lista do que precisa continuar é a de `docs/interface-nova.md` §5 e `docs/design.md` §6 e §7.
- **Fundação e telas anteriores:** as telas usam os tokens, os componentes-base (`Tabs`, `Card`, `Notice`, `Meter`, `Badge`, `EmptyState`, `DataTable`, `Dialog`) e os padrões das features 025 a 029; as telas de foco continuam sem a barra lateral.
- **Dados do resumo:** a classificação final, o histórico de prêmios (com a competição de cada um) e a avaliação da diretoria já existem; o plano confirma se o resultado em cada competição e a premiação por competição saem desses dados, e o que não existir não entra.
- **Mudanças do jogador:** as regras de substituição, troca de posição e esquema são as de hoje; só muda a forma de apresentar e confirmar.
- **Dicas de primeiro acesso:** continuam funcionando; o texto e a âncora são revistos onde o elemento mudou de lugar.
- **Larguras:** 1 440, 1 280 e 1 024 px são os alvos de validação; a 768 px vale a estrutura da 025.
- **Branch e versão:** a feature sai de `release/v1.0.0` e volta para ela por um PR com essa base; o merge não publica nada; a versão do jogo não muda.
- **Fora de escopo:** novos eventos de partida, narração por voz, replay, mapa de calor e novas regras de substituição; as telas fora de carreira (031).
