# Feature Specification: Carreira, diretoria e notícias

**Feature Branch**: `029-carreira-diretoria-noticias`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Refazer as telas de carreira do técnico, diretoria, torcida e notícias na nova interface: Carreira com as abas Diretoria, Torcida, Propostas, Histórico e Técnicos; metas da temporada com situação, confiança com tendência e motivos; satisfação da torcida com a faixa; propostas de emprego com tudo para decidir, inclusive mudança de país; histórico do técnico; tabela de técnicos; Notícias com cada manchete em um cartão, seção Do seu clube e uma seção por competição, e painel de filtros. Paridade funcional total, sem novas regras, sem novos tipos de manchete, a nota única do 1.0.0 atualizada no mesmo PR e a versão do jogo inalterada." (prompt029, Marco 10)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver de relance se a diretoria está contente e se as metas estão sendo cumpridas (Priority: P1)

Como jogador, quero ver de relance se a diretoria está contente, o que explica a confiança e se estou cumprindo as metas da temporada, para saber se meu emprego está seguro e o que corrigir.

**Why this priority**: a diretoria é o centro do drama da carreira; é ela que demite. Sem entender a confiança e as metas, o jogador só descobre o problema quando já perdeu o emprego.

**Independent Test**: abrir a Carreira numa temporada em andamento e conferir, na aba Diretoria, as metas com situação, a confiança com tendência e os motivos recentes, sem rolar a tela em 1 440 px de largura.

**Acceptance Scenarios**:

1. **Given** a Carreira aberta, **When** o jogador olha a tela, **Then** vê as abas Diretoria, Torcida, Propostas, Histórico e Técnicos, com a contagem de propostas pendentes na aba Propostas.
2. **Given** a aba Diretoria, **When** ela é mostrada, **Then** o jogador vê as metas da temporada (esportiva, financeira, estadual e continental, as que o clube tem), cada uma com a situação em texto (cumprindo, em risco ou em andamento); a meta continental ou estadual já decidida mostra o resultado (cumprida ou não cumprida).
3. **Given** a aba Diretoria, **When** ela é mostrada, **Then** o jogador vê a confiança da diretoria com o nível em texto e a tendência (subindo, estável ou caindo) em texto e símbolo, não só em cor.
4. **Given** a aba Diretoria, **When** ela é mostrada, **Then** o jogador vê os motivos recentes da confiança, cada um com o efeito (quanto subiu ou desceu), e a lista das mudanças de confiança por rodada, da mais nova para a mais antiga.
5. **Given** a aba Diretoria, **When** ela é mostrada, **Then** o jogador vê a reputação do técnico e, se a carreira é sem demissão, o aviso dizendo isso.
6. **Given** a tela em 1 440 × 900 px, **When** a aba Diretoria é mostrada, **Then** as metas e a confiança com seus motivos aparecem sem rolagem vertical da página.
7. **Given** uma temporada que ainda não tem metas avaliadas, **When** a aba é mostrada, **Then** aparece um estado vazio que diz que as metas ainda não têm situação, em vez de uma lista em branco.

---

### User Story 2 - Saber como está a torcida e por quê (Priority: P1)

Como jogador, quero saber como está a torcida e por quê, para entender o humor das arquibancadas e o efeito nas bilheterias.

**Why this priority**: a torcida é a segunda metade do drama; o jogo já a calcula, mas hoje ela fica escondida num cartão.

**Independent Test**: abrir a aba Torcida e conferir a satisfação com a faixa, a tendência e os motivos recentes.

**Acceptance Scenarios**:

1. **Given** a aba Torcida, **When** ela é mostrada, **Then** o jogador vê a satisfação da torcida com a faixa em texto (por exemplo, neutra) e a tendência em texto e símbolo.
2. **Given** a aba Torcida, **When** ela é mostrada, **Then** o jogador vê os motivos recentes da satisfação, cada um com o efeito, e os rivais do clube, como hoje.
3. **Given** uma torcida sem histórico ainda, **When** a aba é mostrada, **Then** aparece um estado vazio dizendo que ainda não há motivos registrados.

---

### User Story 3 - Avaliar propostas de emprego e aceitar uma só com o teclado (Priority: P1)

Como jogador, quero avaliar propostas de emprego com tudo o que preciso para decidir, inclusive quando elas me levam a outro país, e conseguir aceitar uma só com o teclado, mesmo depois de ser demitido.

**Why this priority**: é a saída do jogador demitido; sem propostas legíveis ele não consegue continuar a carreira, e uma troca de país é uma decisão pesada.

**Independent Test**: demitir o técnico (ou criar uma carreira desempregada), abrir a Carreira, avaliar cada proposta e aceitar uma só com o teclado.

**Acceptance Scenarios**:

1. **Given** propostas pendentes, **When** o jogador abre a aba Propostas, **Then** cada proposta traz o clube, a divisão e a posição, a reputação do clube, o país, as metas esperadas e a validade.
2. **Given** uma proposta de clube de outro país, **When** ela é mostrada, **Then** traz o aviso de mudança de país, escrito, antes das ações.
3. **Given** uma proposta, **When** o jogador usa Aceitar ou Recusar, **Then** a ação funciona como hoje, com a mesma regra e a mesma consequência.
4. **Given** um jogador demitido, **When** ele abre a Carreira, **Then** vê o aviso de que está desempregado, as propostas e consegue aceitar uma só com o teclado, sem usar o mouse.
5. **Given** nenhuma proposta, **When** a aba é mostrada, **Then** aparece um estado vazio que diz que não há propostas agora e o que influencia receber uma (a reputação).
6. **Given** propostas pendentes, **When** o jogador está em qualquer tela, **Then** a barra lateral mostra o contador de propostas pendentes, como hoje.
7. **Given** a rodada ao vivo em andamento, **When** o jogador tenta aceitar ou recusar, **Then** as ações ficam desativadas com o motivo escrito.

---

### User Story 4 - Reler a trajetória do técnico e comparar com os outros técnicos (Priority: P2)

Como jogador, quero reler minha trajetória como técnico (passagens e temporadas) e ver os técnicos da divisão, para acompanhar a carreira e me comparar.

**Why this priority**: dá sentido de continuidade à carreira, mas não bloqueia nenhuma decisão do dia a dia.

**Independent Test**: abrir as abas Histórico e Técnicos numa carreira com mais de uma temporada.

**Acceptance Scenarios**:

1. **Given** a aba Histórico, **When** ela é mostrada, **Then** o jogador vê as passagens por clube (período e como saiu) e as temporadas (divisão, posição, meta, conquistas, decisão da diretoria, reputação e campanha continental).
2. **Given** a aba Técnicos, **When** ela é mostrada, **Then** vê a tabela dos técnicos da divisão com reputação e confiança, o jogador identificado e as vagas.
3. **Given** uma carreira sem passagens ou sem temporadas encerradas, **When** a aba Histórico é mostrada, **Then** aparece um estado vazio.
4. **Given** um jogador desempregado, **When** abre as abas, **Then** a Diretoria mostra o estado de desempregado com a reputação, e as demais abas seguem funcionando como hoje: Propostas, Histórico, Torcida (do último clube) e Técnicos (com as vagas), para que nenhum dado some.

---

### User Story 5 - Reler as manchetes de qualquer rodada e achar as do meu clube (Priority: P1)

Como jogador, quero reler as manchetes de qualquer rodada e achar rápido as que falam do meu clube, para acompanhar o mundo do jogo sem ler tudo.

**Why this priority**: as notícias hoje são uma lista corrida; com dezenas de manchetes por rodada, achar o que importa é difícil.

**Independent Test**: abrir Notícias, trocar de rodada com as setas, filtrar Do meu clube e por uma competição.

**Acceptance Scenarios**:

1. **Given** Notícias aberta, **When** o jogador escolhe a temporada e a rodada, **Then** a tela mostra as manchetes daquela rodada; **And** as setas de rodada anterior e próxima navegam entre as rodadas guardadas e ficam desativadas nas pontas.
2. **Given** as manchetes de uma rodada, **When** são mostradas, **Then** cada uma está em um cartão próprio, separado dos demais, com competição, rodada, título e texto.
3. **Given** as manchetes de uma rodada, **When** são mostradas, **Then** aparecem agrupadas numa seção "Do seu clube" e numa seção por competição, cada uma com a contagem de manchetes.
4. **Given** o painel de filtros, **When** o jogador escolhe Todas ou Do meu clube, **Then** a lista mostra só o que o filtro diz; **And** a lista de competições com contagem filtra com um clique.
5. **Given** o painel, **When** ele é mostrado, **Then** traz o resumo da rodada (quantas manchetes, quantas do clube do jogador).
6. **Given** uma rodada sem manchetes, ou um jogo sem nenhuma rodada guardada, **When** a tela é mostrada, **Then** aparece um estado vazio que diz isso; **And** um filtro sem resultado mostra o estado vazio com o caminho de volta a Todas.
7. **Given** o cartão de uma manchete, **When** ele é lido, **Then** o fato complementar que o jogo já mostra (por exemplo, o artilheiro) continua lá, no texto do cartão.

---

### User Story 6 - Avisos de demissão, nova contratação e propostas no mesmo componente (Priority: P2)

Como jogador, quero que os avisos de demissão, de nova contratação e de propostas apareçam sempre do mesmo jeito, para reconhecê-los e agir.

**Why this priority**: consistência com as telas já refeitas; não muda regra, só a forma.

**Independent Test**: provocar uma demissão e uma proposta e conferir que os avisos usam o componente de aviso da nova interface na Início, onde já apareciam, e que continuam sendo anunciados para leitor de tela.

**Acceptance Scenarios**:

1. **Given** uma demissão, uma nova contratação ou uma proposta pendente, **When** o aviso aparece (na Início, onde ele aparece hoje), **Then** usa o componente de aviso da nova interface, com o mesmo texto e a mesma ação de hoje.
2. **Given** qualquer aviso, **When** é mostrado, **Then** a gravidade aparece em texto ou ícone, não só em cor.

---

### Edge Cases

- **Clube desempregado (012):** a Diretoria mostra o estado de desempregado com a reputação; Propostas, Histórico, Torcida e Técnicos seguem funcionando como hoje (paridade, FR-022).
- **Carreira sem demissão:** a aba Diretoria mostra o aviso; a confiança continua sendo mostrada.
- **Sem metas avaliadas, sem motivos ou sem propostas:** cada aba mostra um estado vazio desenhado, com a explicação em texto.
- **Proposta de outro país:** o aviso de mudança de país vem antes das ações e não some.
- **Proposta vencida ou limite de propostas:** a regra de hoje vale; a tela só mostra a validade e remove a proposta quando o jogo a remove.
- **Manchete sem competição:** aparece só na seção "Do seu clube" (se for do clube) ou numa seção "Geral", sem quebrar a contagem.
- **Manchete do clube do jogador numa competição:** aparece em "Do seu clube" e também na seção da competição, e as contagens refletem isso.
- **Rodada de resumo (rodada 0):** continua selecionável, com o nome de hoje.
- **Primeira e última rodada guardadas:** a seta correspondente fica desativada.
- **Muitas manchetes numa rodada:** a lista rola dentro da tela sem estourar a página; os filtros continuam à vista.
- **Rodada ao vivo em andamento:** as ações de proposta mostram a trava e ficam desativadas.
- **Larguras:** sem rolagem horizontal da página em 1 440, 1 280 e 1 024 px; a 768 px vale a estrutura da 025.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A Carreira MUST ter as abas Diretoria, Torcida, Propostas, Histórico e Técnicos, navegáveis por teclado, com a contagem de propostas pendentes no nome da aba Propostas; o link da Início com `?aba=` MUST abrir a aba pedida.
- **FR-002**: A aba Diretoria MUST mostrar as metas da temporada (esportiva, financeira, estadual e continental, as que o clube tem), cada uma com a situação em texto (cumprindo, em risco ou em andamento); a meta continental ou estadual já decidida mostra o resultado (cumprida ou não cumprida).
- **FR-003**: A aba Diretoria MUST mostrar a confiança da diretoria com o nível em texto e a tendência em texto e símbolo, os motivos recentes com o efeito de cada um e as mudanças de confiança por rodada.
- **FR-004**: A aba Diretoria MUST mostrar a reputação do técnico e, na carreira sem demissão, o aviso correspondente.
- **FR-005**: Em 1 440 × 900 px, as metas e a confiança com seus motivos MUST caber sem rolagem vertical da página.
- **FR-006**: A aba Torcida MUST mostrar a satisfação com a faixa em texto, a tendência em texto e símbolo, os motivos recentes com o efeito e os rivais do clube.
- **FR-007**: A aba Propostas MUST mostrar, para cada proposta, o clube, a divisão e a posição, a reputação do clube, o país, as metas esperadas e a validade, com as ações Aceitar e Recusar nas mesmas regras de hoje.
- **FR-008**: Uma proposta de clube de outro país MUST trazer o aviso de mudança de país, escrito, antes das ações.
- **FR-009**: Um jogador demitido MUST conseguir ver as propostas, entender cada uma e aceitar uma só com o teclado.
- **FR-010**: A barra lateral MUST manter o contador de propostas pendentes.
- **FR-011**: A aba Histórico MUST mostrar as passagens por clube (período e saída) e as temporadas (divisão, posição, meta, conquistas, decisão da diretoria, reputação e campanha continental).
- **FR-012**: A aba Técnicos MUST mostrar a tabela dos técnicos da divisão com reputação e confiança, o jogador identificado e as vagas.
- **FR-013**: Notícias MUST permitir escolher a temporada e a rodada, com setas de rodada anterior e próxima desativadas nas pontas.
- **FR-014**: Cada manchete MUST aparecer em um cartão próprio, separado dos demais, com competição, rodada, título e texto; o fato complementar que o jogo já mostra continua no cartão.
- **FR-015**: As manchetes MUST ser agrupadas numa seção "Do seu clube" e numa seção por competição, cada uma com a contagem.
- **FR-016**: Notícias MUST ter um painel com o resumo da rodada, o filtro Todas e Do meu clube e a lista de competições com contagem, para filtrar com um clique.
- **FR-017**: As notícias NÃO agrupam por tipo de manchete: o jogo não classifica manchetes por tipo, e o agrupamento é só por competição e por "seu clube".
- **FR-018**: O título curto e o texto de cada manchete MUST ser dados separados na apresentação; se o jogo só guarda a frase inteira, o plano decide entre separar a mensagem na origem (sem mudar o que o jogo guarda no save) ou exibir a frase como título.
- **FR-019**: Os avisos de demissão, nova contratação e propostas MUST usar o componente de aviso da nova interface, com o mesmo texto e a mesma ação de hoje.
- **FR-020**: Cada aba e a tela de Notícias MUST ter estado vazio desenhado para: sem propostas, sem metas avaliadas, sem motivos, sem notícias, filtro sem resultado e clube desempregado.
- **FR-021**: A cor MUST NOT ser o único sinal de tendência nem da situação das metas: sempre há texto ou símbolo.
- **FR-022**: Nenhum dado, ação ou aviso que as telas de hoje mostram pode sumir (paridade, `docs/interface-nova.md` §5); nenhuma regra de diretoria, torcida, propostas ou notícias muda, e nenhum dado do save muda.
- **FR-023**: Todo texto, plural, data e formato MUST vir do i18n; dinheiro, se aparecer, pelo formato do jogo.
- **FR-024**: A feature MUST entrar pela branch `release/v1.0.0` (o PR tem essa base e nada é publicado), acrescentando o que mudou à nota única do 1.0.0 (`docs/interface-nova.md` §6); a versão do jogo não muda.

### Key Entities *(include if feature involves data)*

- **Meta da temporada**: objetivo que a diretoria espera do técnico (esportiva, financeira, estadual, continental), com a situação atual. Já existe; só muda a apresentação.
- **Confiança e motivos**: nível de confiança da diretoria, tendência e a lista de mudanças por rodada, cada uma com os fatores. Já existe.
- **Satisfação da torcida**: nível, faixa, tendência e motivos recentes. Já existe.
- **Proposta de emprego**: clube, divisão, posição, reputação, país, metas esperadas, validade e se muda de país. Já existe.
- **Passagem e temporada do técnico**: histórico da carreira. Já existe.
- **Manchete**: tipo, variação, variáveis, competição, rodada e se é do clube do jogador. Já existe; o título e o texto separados são decisão do plano.
- **Rodada de notícias**: temporada, rodada (0 = resumo) e as manchetes. Já existe.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 1 440 × 900 px, a aba Diretoria mostra as metas e a confiança com seus motivos sem rolagem vertical da página.
- **SC-002**: Um jogador demitido avalia as propostas e aceita uma só usando apenas o teclado, em todas as tentativas do teste.
- **SC-003**: Em Notícias, o jogador chega às manchetes do próprio clube em um clique (filtro Do meu clube) e a uma competição em um clique.
- **SC-004**: Em todas as telas da feature, não há rolagem horizontal da página em 1 440, 1 280 e 1 024 px, e nenhuma violação grave de acessibilidade nos dois temas.
- **SC-005**: Nenhuma tendência nem situação de meta depende só da cor: cada uma tem texto ou símbolo, verificado nos dois temas.
- **SC-006**: 100% dos dados, ações e avisos das telas de Carreira e Notícias de hoje continuam disponíveis (checagem contra a lista de paridade).
- **SC-007**: Abrir a Carreira e as Notícias não fica mais lento que hoje com o mundo padrão: a mediana do tempo de abertura fica até 10% acima da medida antes da feature.
- **SC-008**: Os testes de ponta a ponta de diretoria, propostas e notícias continuam passando, atualizados.

## Assumptions

- **Telas existentes:** Carreira e Notícias já existem (`/jogo/carreira`, `/jogo/noticias`); nenhuma tela nova nasce, e a lista do que precisa continuar é a de `docs/interface-nova.md` §5 e `docs/design.md` §10.
- **Fundação e telas anteriores:** as telas usam a barra lateral, os tokens, os componentes-base (`Tabs`, `Card`, `Notice`, `Meter`, `EmptyState`, `Badge`, `DataTable`) e os padrões das features 025 a 028.
- **Manchetes:** o jogo guarda o tipo, a variação e as variáveis de cada manchete e monta a frase na apresentação; título e texto separados são decididos no plano, sem mudar o save.
- **Competição e rodada de cada manchete:** a competição vem das variáveis da manchete quando existe e a rodada, da rodada guardada; manchetes sem competição vão para "Do seu clube" ou "Geral".
- **Dicas de primeiro acesso:** continuam funcionando; o texto e a âncora são revistos onde o elemento mudou de lugar.
- **Larguras:** 1 440, 1 280 e 1 024 px são os alvos de validação; a 768 px vale a estrutura da 025.
- **Branch e versão:** a feature sai de `release/v1.0.0` e volta para ela por um PR com essa base; o merge não publica nada; a versão do jogo não muda.
- **Fora de escopo:** novas regras de diretoria ou de torcida, novos tipos de manchete, imagens nas notícias, e as demais telas (030 em diante).
