# Feature Specification: Estaduais com duas divisões

**Feature Branch**: `023-estaduais-duas-divisoes`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Competições regionais (estaduais) com duas divisões, disputadas no começo da temporada, antes das competições nacionais — prompt `docs/speckit-prompts/marco9/prompt023.md`."

## Contexto

Segunda feature do Marco 9 (Futebol sul-americano). Cada país já tem liga, copa nacional e (022) competições continentais. Falta o começo da temporada brasileira: os **estaduais**. Esta feature cria, para cada região (estado) de um país, uma competição regional com **duas divisões**, com acesso e rebaixamento entre elas, reunindo clubes das divisões nacionais e **clubes regionais** (que existem no mundo e jogam só o estadual).

Tudo é descrito no banco (regiões, divisões, clubes, tamanhos de grupo, classificados, mando, desempates, pesos), sem código específico por estado. Reaproveita a fase de grupos (019), o mata-mata de jogo único (018), as vagas entre competições (021), o calendário multi-competição (017) e o mundo de vários países (020). Nomes são fictícios e vêm do banco.

Fica fora: terceira divisão ou inferiores dos estaduais e competições interestaduais.

## Clarifications

### Session 2026-10-27

- Q: Como fica a vaga nacional quando o clube bem colocado no estadual já está na divisão nacional ou na copa? → A: Esses clubes são ignorados e a vaga passa ao próximo colocado elegível do estadual (repasse da 021).
- Q: O jogador pode treinar um clube regional (que só joga o estadual)? → A: Não. O jogador só treina clubes de divisão nacional; clubes regionais são controlados só pela IA. Um clube do jogador que cair da divisão nacional continua jogável.
- Q: O peso do estadual é igual para todos os clubes? → A: Não. Há um peso por competição, com um multiplicador por faixa de reputação do clube (clubes grandes valorizam menos), tudo nos dados.
- Q: O estadual é obrigatório para todo país? → A: Não. É opcional por país: um país sem competição regional funciona como hoje e seus clubes não têm região; se o país declara estaduais, todos os clubes dele precisam de região.
- Q: Clubes grandes têm proteção contra o rebaixamento no estadual? → A: Não. Qualquer clube, grande ou pequeno, sobe e cai pela mesma regra.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Disputar o estadual do meu clube no começo da temporada (Priority: P1)

Como jogador, quero disputar o estadual da região do meu clube, na divisão em que ele estiver, antes das competições nacionais, com clássicos regionais e um título que a torcida valoriza.

**Why this priority**: é o coração da feature; sem o estadual jogável a temporada não reproduz o calendário brasileiro.

**Independent Test**: num banco de teste com um país e um estadual de duas divisões, iniciar a temporada com um clube na primeira divisão e jogar o estadual até a final (ida e volta), conferindo que ele termina antes do início da liga nacional.

**Acceptance Scenarios**:

1. **Given** um clube com região definida, **When** a temporada começa, **Then** ele está na divisão do estadual da sua região em que estava ao fim da temporada anterior, e o calendário começa pelos jogos do estadual.
2. **Given** a fase de grupos de uma divisão, **When** ela termina, **Then** os classificados definidos nos dados avançam ao mata-mata de jogo único, com mando para o melhor campanha e desempate nos pênaltis.
3. **Given** o mata-mata, **When** chega à final, **Then** ela é disputada em ida e volta e há um campeão da divisão.
4. **Given** que os jogos do estadual terminaram, **When** a primeira rodada das divisões nacionais chega, **Then** nenhuma partida do estadual fica pendente nem conflita em data.
5. **Given** um clássico regional, **When** ele ocorre no estadual, **Then** a rivalidade regional (013) é reconhecida como nas demais competições.

---

### User Story 2 - Subir de divisão e ganhar vaga nacional (Priority: P1)

Como jogador de um clube pequeno, quero subir para a primeira divisão do estadual e, com boa campanha nela, ganhar vaga na copa nacional ou na divisão nacional mais baixa.

**Why this priority**: dá progressão de carreira a clubes pequenos e liga o estadual ao resto da pirâmide.

**Independent Test**: simular uma temporada em que o clube do jogador é finalista da segunda divisão e outra em que termina bem na primeira; conferir a mudança de divisão e as vagas nacionais na temporada seguinte.

**Acceptance Scenarios**:

1. **Given** o fim da temporada, **When** o estadual é encerrado, **Then** os finalistas da segunda divisão sobem e os piores da classificação geral da fase de grupos da primeira caem, em números iguais, mantendo o tamanho de cada divisão. Não há proteção contra rebaixamento: a regra vale igual para clubes grandes e pequenos.
2. **Given** regras de vaga a partir da primeira divisão do estadual (021), **When** a temporada termina, **Then** os clubes bem colocados ganham vaga na copa nacional ou na divisão nacional mais baixa, conforme os dados. Clubes que já estão na competição de destino são ignorados e a vaga passa ao próximo colocado elegível (repasse da 021).
3. **Given** um clube regional promovido ou rebaixado, **When** a nova temporada começa, **Then** ele está na divisão correta e o jogador vê a mudança no histórico.

---

### User Story 3 - Estadual com peso na carreira e telas próprias (Priority: P2)

Como jogador, quero ver grupos, chaveamento e campanha do meu clube no estadual, junto das competições nacionais, e que o estadual alimente metas da diretoria, manchetes e histórico de campeões das duas divisões.

**Why this priority**: torna o estadual um objetivo, mas depende de ele existir.

**Independent Test**: jogar um estadual com um clube grande e outro pequeno e comparar metas, avaliação da diretoria, humor da torcida, manchetes e histórico.

**Acceptance Scenarios**:

1. **Given** o estadual em andamento, **When** o jogador abre as telas, **Then** vê grupos, chaveamento até a final e a campanha do clube, com a divisão listada junto das competições nacionais.
2. **Given** um peso do estadual configurado por competição, **When** o clube é eliminado ou vence, **Then** o impacto na diretoria e na torcida respeita esse peso (pode valer pouco para clubes grandes).
3. **Given** uma meta de diretoria no estadual, **When** a temporada termina, **Then** ela é avaliada.
4. **Given** fatos relevantes (título, eliminação, acesso, rebaixamento), **When** acontecem, **Then** geram manchetes e os campeões das duas divisões entram no histórico.

---

### User Story 4 - Modder define estados, divisões e clubes (Priority: P2)

Como modder, quero definir os estados, as duas divisões de cada estadual e os clubes de cada uma apenas nos dados, e ser avisado se o banco for inconsistente.

**Why this priority**: sustenta o Princípio "dados, não código" e o mod sul-americano seguinte.

**Independent Test**: carregar um banco com 27 estaduais de duas divisões e outro com um estadual mal formado; o primeiro passa, o segundo é rejeitado com mensagem clara.

**Acceptance Scenarios**:

1. **Given** um banco válido, **When** é carregado, **Then** cada estadual tem duas divisões, clubes, formato e vagas definidos.
2. **Given** grupos ou fases eliminatórias que não fecham com o número de clubes da divisão, **When** o banco é validado, **Then** o erro aponta o estadual e a divisão.
3. **Given** vagas de acesso diferentes das de rebaixamento, **When** o banco é validado, **Then** ele é rejeitado.

---

### User Story 5 - Clubes regionais vivos por 30 temporadas (Priority: P3)

Como jogador, quero que clubes regionais (elenco e economia menores) evoluam com o mundo e o mercado, para que o estadual continue crível ao longo dos anos.

**Why this priority**: sustenta a longevidade, mas o estadual funciona antes disso.

**Independent Test**: simular 30 temporadas e conferir elencos válidos, tamanhos de divisão estáveis e acesso/rebaixamento toda temporada.

**Acceptance Scenarios**:

1. **Given** clubes regionais, **When** o mundo evolui (009) e o mercado funciona (010/011), **Then** seus elencos se renovam e permanecem válidos.
2. **Given** 30 temporadas, **When** terminam, **Then** as duas divisões de cada estadual mantêm o número de clubes.

---

### Edge Cases

- Clube nacional rebaixado/promovido na liga nacional: continua no estadual da sua região, na divisão em que estiver.
- Clube do jogador sempre disputa o estadual da sua região, mesmo se a divisão mudar.
- Clube grande rebaixado no estadual: cai pela mesma regra, sem proteção, e disputa a segunda divisão normalmente.
- Clube do jogador que cai da divisão nacional continua jogável e segue no estadual da sua região.
- Região com poucos clubes, ou clube sem região num país que declara estaduais: erro de validação do banco.
- País sem competição regional: funciona como antes, sem região nos clubes e sem erro de validação.
- Empate na classificação de grupos: critérios de desempate dos dados; persistindo, sorteio determinístico pela seed.
- Vaga nacional de clube que já está na competição de destino: ignorada, e a vaga passa ao próximo colocado elegível do estadual (repasse da 021).
- Peso zero do estadual: não gera impacto na diretoria e na torcida.
- Conflito de data entre estadual e divisão nacional: erro de validação, não resolvido em jogo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O banco MUST permitir atribuir uma região (estado) a cada clube. O estadual é opcional por país; se o país declara estaduais, todos os clubes dele MUST ter região.
- **FR-002**: O banco MUST permitir declarar uma competição regional ligada a uma região, com duas divisões e os clubes de cada uma.
- **FR-003**: Cada divisão MUST seguir o formato: fase de grupos, mata-mata em jogo único a partir da primeira fase eliminatória com desempate nos pênaltis, e final em ida e volta.
- **FR-004**: Tamanho dos grupos, número de classificados, critério de mando no jogo único e critérios de desempate MUST ser dados de cada estadual.
- **FR-005**: Ao fim da temporada, o sistema MUST aplicar acesso e rebaixamento entre as divisões: por padrão sobem os finalistas da segunda e caem os piores da classificação geral da fase de grupos da primeira; a regra e os números vêm dos dados.
- **FR-006**: O número de clubes de cada divisão MUST se manter após o acesso e rebaixamento.
- **FR-007**: O sistema MUST suportar clubes regionais que existem no mundo e jogam só o estadual, com elenco e economia menores, renovados pela evolução do mundo (009) e pelo mercado (010/011).
- **FR-008**: O sistema MUST conceder vagas a partir da primeira divisão do estadual para a copa nacional e a divisão nacional mais baixa, via mecanismo da 021; clubes que já estão na competição de destino são ignorados e a vaga passa ao próximo colocado elegível.
- **FR-009**: As duas divisões MUST ocorrer no início da temporada e terminar, inclusive a final, antes do início das divisões nacionais.
- **FR-010**: Rivalidades regionais (013) MUST valer nos jogos do estadual.
- **FR-011**: O sistema MUST permitir metas da diretoria no estadual.
- **FR-012**: O sistema MUST gerar manchetes dos fatos do estadual e registrar o histórico de campeões das duas divisões.
- **FR-013**: O peso do estadual na diretoria e na torcida MUST ser configurável por competição, com um multiplicador por faixa de reputação do clube (clubes grandes podem valorizar menos), inclusive valendo pouco ou nada.
- **FR-014**: O clube do jogador MUST sempre disputar o estadual da sua região, na divisão em que estiver.
- **FR-014a**: O jogador MUST poder treinar apenas clubes de divisão nacional; clubes regionais são controlados só pela IA. Um clube do jogador que cair da divisão nacional continua jogável.
- **FR-015**: O jogador MUST ver grupos, chaveamento até a final e a campanha do clube, com a divisão do estadual listada junto das competições nacionais.
- **FR-016**: A validação do banco MUST rejeitar estadual cujos grupos e fases eliminatórias não fechem com o número de clubes da divisão, ou cujas vagas de acesso e rebaixamento sejam diferentes, com erro identificando estadual e divisão.
- **FR-017**: A validação MUST rejeitar conflitos de data entre as divisões do estadual e as divisões nacionais.
- **FR-018**: Sorteios, desempates e resultados MUST depender só da seed e do estado do jogo.
- **FR-019**: Saves anteriores MUST continuar abrindo, com migração para o novo formato.

### Key Entities

- **Região (estado)**: agrupamento geográfico de clubes dentro de um país; liga clubes ao seu estadual.
- **Competição regional (estadual)**: competição ligada a uma região, com duas divisões, formato, pesos e vagas.
- **Divisão do estadual**: primeira ou segunda; tem clubes, grupos, mata-mata, final e regras de acesso/rebaixamento.
- **Clube regional**: clube que joga só o estadual, com elenco e economia menores.
- **Peso do estadual**: importância para diretoria e torcida, por competição, com multiplicador por faixa de reputação do clube.
- **Histórico de campeões regionais**: campeões por temporada, por divisão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um banco de teste com 27 estaduais de duas divisões joga uma temporada inteira sem nenhum conflito de datas, com 100% das finais (ida e volta) terminando antes das divisões nacionais.
- **SC-002**: Em 30 temporadas, as duas divisões de cada estadual mantêm o seu número de clubes em 100% das temporadas, e o acesso e o rebaixamento acontecem toda temporada.
- **SC-003**: Em 30 temporadas, 100% dos clubes regionais têm elenco válido ao início de cada temporada.
- **SC-004**: O tempo da virada de temporada e o tamanho do save ficam dentro das metas definidas na 020.
- **SC-005**: Todo banco com grupos, fases eliminatórias ou vagas inconsistentes é rejeitado na validação, com mensagem que aponta o estadual e a divisão.
- **SC-006**: O jogador encontra grupos, chaveamento e campanha do estadual em até dois toques/cliques a partir da tela de competições.

## Assumptions

- **Dependências**: usa fase de grupos (019), mata-mata (018), vagas (021), calendário (017), mundo de vários países (020), rivalidades (013), evolução (009) e mercado (010/011); não os reimplementa.
- **Clubes regionais só da IA**: clubes regionais nunca são escolhidos como clube inicial do jogador.
- **Estadual opcional por país**: bancos e saves de países sem estaduais continuam válidos sem atribuir região.
- **Uma região por clube**: cada clube pertence a uma única região; clubes de divisões nacionais e regionais podem coexistir numa divisão do estadual.
- **Datas**: declaradas nos dados; conflito é erro de validação.
- **Peso padrão**: o peso do estadual na diretoria e torcida tem valor padrão moderado, ajustável por competição e por faixa de reputação do clube.
- **Metas**: reutilizam o mecanismo existente de metas da diretoria.
- **Nomes**: de estados, competições e clubes ficam no banco/mod, fictícios (Princípio IV).
- **Fora de escopo**: terceira divisão ou inferiores dos estaduais, competições interestaduais (copas regionais) e o gerador do mod sul-americano (024).
- **Saves**: pode exigir nova versão de save, com migração encadeada e fixture (Princípio VI).
- **Determinismo**: Princípio II.
- **Equilíbrio**: faixas das simulações longas declaradas nos testes (Princípio V); simulação de 30 temporadas com seed declarada no teste.
