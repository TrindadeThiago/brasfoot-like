# Feature Specification: Mod mundo completo do futebol

> **Revisão (1.10.0)**: os mundos médio e completo foram descartados — a rodada da liga ficava pesada demais
> (travamentos) com dezenas de milhares de jogadores. O **mundo padrão** passou a ser o reduzido (24 países
> nas seis confederações, Brasil em quatro divisões com estaduais), gerado dentro do jogo e também
> disponível para baixar (`mundo-padrao.zip`); o antigo país fictício único saiu da lista de nova carreira.
> Onde este documento fala em três tamanhos, vale só o reduzido.

**Feature Branch**: `024-mod-mundo-completo`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Gerador de um mod com a estrutura do futebol mundial (seis confederações continentais, começando pelo detalhe sul-americano), com clubes e competições fictícios — prompt `docs/speckit-prompts/marco9/prompt024.md`, ampliado pelo pedido de um mundo completo."

## Contexto

Última feature do Marco 9. As anteriores entregaram as peças: vários países e escala (020), vagas entre competições (021), competições continentais (022) e estaduais (023). Falta juntá-las num **mundo grande e completo**: um mod com a estrutura do futebol mundial, gerado por uma ferramenta do projeto, validado e balanceado.

O mod sul-americano do prompt original **passa a ser o mod mundo completo**: a América do Sul é um dos continentes dele, com o detalhe do prompt (Brasil com quatro divisões e 27 estaduais, demais países com duas divisões e copa). Os **continentes seguem a divisão do futebol mundial**: as seis confederações continentais da FIFA (pesquisa em Assumptions).

Os **nomes de clubes, competições e jogadores são fictícios** (princípio IV). **Países, estados e cidades usam os nomes reais**: são lugares, não conteúdo protegido. Quem quiser nomes reais de clubes e competições troca por planilha (CSV, 015) no próprio computador, ou usa mods da comunidade. O projeto não distribui nomes, escudos ou marcas reais de clubes, jogadores e competições.

Fica fora desta feature: editor de mods embutido, seleções nacionais e mundial de clubes (competição entre continentes) (ver Assumptions).

## Clarifications

### Session 2026-10-27

- Q: Nomes de países e estados são reais ou fictícios? → A: Países, estados e cidades com nomes reais; clubes e campeonatos com nomes fictícios.
- Pedido adicional: gerar um mundo completo com os principais países de cada continente; o mod sul-americano passa a ser o mod mundo completo.
- Q: O mundo completo cabe nas metas da 020? → A: Não. Ele tem metas próprias (save, tempo, memória), declaradas e justificadas; a 020 segue valendo para o mundo de 400 clubes.
- Decisão (2026-10-27): as 30 temporadas de simulação valem para o mundo reduzido; o médio e o completo são medidos em uma temporada (virada, tempo e memória), sem simular 30.
- Decisão (2026-10-27): o jogador escolhe o tamanho do mundo ao iniciar a carreira — reduzido, médio ou completo — e o jogo **gera o mundo na hora**, dentro da tela de nova carreira (sem baixar nada). Os mesmos mundos continuam disponíveis para download na página de Mods, para a troca de nomes por planilha.
- Decisão: os continentes seguem a divisão do futebol mundial, as seis confederações da FIFA (UEFA, CONMEBOL, CONCACAF, CAF, AFC e OFC), em vez de "cinco continentes".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Uma carreira com estadual, nacional, copa e continental (Priority: P1)

Como jogador, quero uma carreira no mod mundo completo em que a temporada do meu clube tenha estadual, campeonato nacional, copa nacional e competição continental, como no futebol sul-americano.

**Why this priority**: é o objetivo do marco; sem um mundo completo jogável, as features anteriores ficam sem um lugar onde apareçam juntas.

**Independent Test**: criar uma carreira num clube brasileiro de primeira divisão que se classifica para o continente e jogar uma temporada inteira, conferindo que ele passa por estadual, divisão nacional, copa nacional e competição continental sem conflito de datas.

**Acceptance Scenarios**:

1. **Given** o mod gerado, **When** o jogador cria uma carreira num clube brasileiro das divisões A a C, **Then** a temporada dele tem o estadual da região, a divisão nacional e a copa nacional, e o estadual termina antes de a divisão nacional começar.
2. **Given** um clube que se classificou para a competição continental, **When** a temporada acontece, **Then** ele também joga a competição continental no meio da semana, sem jogar duas vezes no mesmo dia.
3. **Given** a escolha de clube, **When** o jogador escolhe um país, **Then** vê os clubes das divisões nacionais daquele país (clubes só regionais não são escolhíveis).
4. **Given** um clube de outro país sul-americano, **When** a carreira começa, **Then** a temporada tem divisão A ou B e copa nacional, e, se classificado, a competição continental.
5. **Given** o fim da temporada, **When** a virada acontece, **Then** acessos, rebaixamentos e vagas (nacionais e continentais) valem para a temporada seguinte.

---

### User Story 2 - Gerar o mod, de novo e com outra seed (Priority: P1)

Como modder, quero gerar o mod por uma ferramenta do projeto, com a mesma seed dando o mesmo pacote, e poder usar outra seed ou ajustar a estrutura.

**Why this priority**: o mod só é útil se for reproduzível e ajustável; é o que torna o mundo uma base para a comunidade.

**Independent Test**: gerar o pacote duas vezes com a mesma seed e comparar byte a byte; gerar com outra seed e ver um mundo diferente que também passa na validação.

**Acceptance Scenarios**:

1. **Given** uma seed, **When** a ferramenta é executada duas vezes, **Then** os dois pacotes (.zip) são idênticos byte a byte.
2. **Given** a ferramenta, **When** termina, **Then** o pacote já foi validado e a ferramenta só conclui com sucesso se a validação passar.
3. **Given** outra seed, **When** a ferramenta é executada, **Then** o mundo muda (clubes, nomes, forças) mas mantém a mesma estrutura e continua válido.
4. **Given** um ajuste de estrutura (por exemplo, número de clubes por divisão), **When** a ferramenta é executada, **Then** o pacote reflete o ajuste ou o erro de validação diz o que não fecha.

---

### User Story 3 - Trocar os nomes por planilha (Priority: P2)

Como modder, quero substituir os nomes fictícios por nomes reais no meu computador, usando a planilha (CSV) já existente, e saber como fazer isso pela documentação.

**Why this priority**: é como a comunidade obtém nomes reais sem o projeto distribuí-los; depende do mod existir.

**Independent Test**: exportar os clubes e jogadores do mod em CSV, trocar alguns nomes, importar de volta e criar uma carreira com os nomes novos.

**Acceptance Scenarios**:

1. **Given** o mod, **When** o modder exporta clubes e jogadores em CSV e importa de volta com nomes trocados, **Then** o pacote continua válido e a carreira mostra os nomes novos.
2. **Given** a documentação, **When** o modder segue o passo a passo, **Then** consegue gerar, ajustar a estrutura e trocar os nomes sem editar código.

---

### User Story 4 - Mundo balanceado por 30 temporadas (Priority: P2)

Como jogador, quero que o mundo se mantenha crível ao longo de décadas: países mais fortes com clubes e receitas maiores, vagas continentais proporcionais e competições estáveis.

**Why this priority**: sem balanceamento o mundo degrada com os anos, mas depende do mod e da simulação existirem.

**Independent Test**: simular 30 temporadas sem interação e conferir faixas de força, economia, tamanho das divisões, vagas e metas de tamanho e tempo.

**Acceptance Scenarios**:

1. **Given** o mundo reduzido, **When** 30 temporadas são simuladas, **Then** não há erro, as divisões mantêm o número de clubes e as faixas de balanceamento (força, reputação, caixa) ficam dentro do declarado.
2. **Given** os países, **When** a simulação termina, **Then** os países mais fortes continuam com mais vagas continentais e títulos continentais, e nenhum país some do continente.
3. **Given** o mod, **When** a simulação mede tamanho do save e tempo de dia e de virada, **Then** tudo fica dentro das metas próprias do mundo completo.

---

### User Story 5 - Baixar o mod na página de Mods (Priority: P3)

Como jogador, quero baixar o mod na página de Mods do jogo, ao lado do mod de exemplo.

**Why this priority**: facilita o acesso, mas o mod funciona sem isso (a ferramenta gera o pacote).

**Independent Test**: abrir a página de Mods, baixar o mod, carregá-lo e criar uma carreira.

**Acceptance Scenarios**:

1. **Given** a página de Mods, **When** o jogador baixa o mod, **Then** recebe o pacote gerado pela ferramenta com a seed padrão.
2. **Given** o pacote baixado, **When** é carregado, **Then** passa na validação do jogo.
3. **Given** que o pacote não coubesse nos limites de pacote, **When** a feature é concluída, **Then** os limites são revistos com justificativa registrada, nunca com truncamento silencioso do mod.

---

### User Story 6 - Mundo com as seis confederações do futebol (Priority: P1)

Como modder e jogador, quero um mundo completo que siga a divisão do futebol mundial: os principais países de cada confederação (Europa, América do Sul, América do Norte, Central e Caribe, África, Ásia e Oceania), cada país com a sua pirâmide e cada confederação com as suas competições continentais.

**Why this priority**: é o pedido que amplia o mod; o mundo sul-americano é o continente de maior detalhe dentro dele.

**Independent Test**: gerar o mundo completo, validá-lo e simular algumas temporadas, conferindo que cada confederação tem países, pirâmides e competições continentais, sem erro.

**Acceptance Scenarios**:

1. **Given** a ferramenta, **When** o modder gera o mod, **Then** o pacote tem as seis confederações, com os principais países de cada uma, e passa na validação.
2. **Given** um país do mundo completo, **When** o jogador cria uma carreira nele, **Then** a temporada tem as competições nacionais do país e, se classificado, as da confederação dele.
3. **Given** duas confederações, **When** a temporada acontece, **Then** as competições continentais de cada uma são independentes: clubes de confederações diferentes nunca se enfrentam.
4. **Given** países de força diferente, **When** o mundo é gerado, **Then** os países mais fortes têm mais divisões, clubes e receitas maiores, e mais vagas continentais na confederação deles.
5. **Given** uma confederação com poucos países fortes (por exemplo, Oceania), **When** o mundo é gerado, **Then** ela tem ao menos a competição continental principal, com o número de clubes que os países dela permitem.
6. **Given** outra seed, **When** o modder gera de novo, **Then** o mundo muda e continua válido e reproduzível.

---

### User Story 7 - Escolher o tamanho do mundo ao iniciar a carreira (Priority: P1)

Como jogador, quero escolher ao iniciar a carreira entre um mundo reduzido, médio ou completo, para jogar o mundo que o meu computador aguenta, sem baixar nem carregar arquivos.

**Why this priority**: o mundo completo é pesado; escolher o tamanho é o que torna o mod jogável em qualquer máquina.

**Independent Test**: na tela de nova carreira, escolher cada tamanho, ver o aviso de peso, escolher um clube de qualquer país e começar a carreira.

**Acceptance Scenarios**:

1. **Given** a tela de nova carreira, **When** o jogador abre a lista de mundos, **Then** vê o mundo padrão do jogo e os três tamanhos (reduzido, médio e completo), cada um com a descrição do que traz e do quanto pesa.
2. **Given** um tamanho escolhido, **When** o jogo prepara o mundo, **Then** os países aparecem agrupados por confederação e o jogador chega a qualquer clube de uma divisão nacional.
3. **Given** a mesma seed, **When** o jogador gera o mesmo tamanho duas vezes, **Then** o mundo é idêntico; outra seed muda o mundo.
4. **Given** o mundo completo, **When** o jogador o escolhe, **Then** o jogo avisa que ele é pesado e recomendado para computadores potentes.
5. **Given** que o jogador baixa um dos mundos na página de Mods, **When** o carrega, **Then** ele vale como qualquer mod e aceita a troca de nomes por planilha.

---

### Edge Cases

- Países com poucas vagas continentais por proporção: a conta de vagas fecha o número de participantes da competição.
- Clube de divisão nacional que também joga estadual: cada competição tem as próprias datas e o calendário não conflita.
- Brasil com 27 estados: cada estadual tem duas divisões completas, mesmo em estados pequenos.
- Nome de clube, competição ou jogador coincidindo com um nome real: a geração evita termos da lista de bloqueio do projeto (a lista de lugares deixa de bloquear países, estados e cidades reais, mas continua bloqueando nomes de clubes e competições).
- Cidade real que aparece no nome de um clube fictício ("Atlético de Cidade X"): permitido, desde que o nome inteiro não seja de um clube real.
- Mesma seed em máquinas diferentes: o pacote é igual byte a byte.
- Planilha com nome que passa do limite do formato: a importação rejeita com mensagem clara.
- Pacote acima dos limites: a ferramenta avisa em vez de gerar um pacote inválido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A ferramenta MUST gerar o pacote do mod (.zip) de forma determinística pela seed e validá-lo antes de terminar, falhando se a validação não passar.
- **FR-002**: O mod MUST ter, na América do Sul, o Brasil com as divisões nacionais A, B e C em pontos corridos (20 clubes cada) e D em grupos regionais seguidos de mata-mata.
- **FR-003**: O mod MUST ter os estaduais dos 27 estados do Brasil, cada um com duas divisões em grupos, mata-mata em jogo único e final em ida e volta (023).
- **FR-004**: O mod MUST ter, no Brasil, a copa nacional em mata-mata e a supercopa nacional (campeão da liga contra o campeão da copa).
- **FR-005**: O mod MUST ter, na América do Sul, os demais países sul-americanos (Argentina, Uruguai, Paraguai, Chile, Bolívia, Peru, Equador, Colômbia e Venezuela), cada um com divisões A e B e copa nacional.
- **FR-006**: O mod MUST ter, em cada confederação, a competição continental principal e a secundária, com vagas por país (022), ligadas entre si.
- **FR-007**: Força, reputação e economia dos clubes MUST ser proporcionais ao país (os mais fortes têm clubes e receitas maiores), e o número de vagas continentais por país MUST seguir essa proporção.
- **FR-008**: Nomes de clubes, competições e jogadores MUST ser fictícios, com bancos de nomes por país em português e espanhol; escudos MUST ser os gerados (cores, forma e iniciais).
- **FR-009**: Nomes de países, estados e cidades MUST ser os reais; clubes, competições e jogadores MUST ser fictícios.
- **FR-010**: O projeto MUST NOT distribuir nomes, escudos ou marcas reais, inclusive nos nomes das competições; nomes reais só via CSV do próprio jogador ou mods da comunidade.
- **FR-011**: O pacote gerado MUST ser aceito pela validação de bancos do projeto, e a mesma seed MUST gerar o mesmo pacote byte a byte.
- **FR-012**: Uma carreira de teste no mod MUST passar, na mesma temporada, por estadual, divisão nacional, copa nacional e competição continental, sem conflito de datas.
- **FR-013**: O modder MUST poder gerar o mod com outra seed e ajustar a estrutura (por exemplo, clubes por divisão) sem editar código.
- **FR-014**: Os nomes MUST poder ser substituídos pela planilha (CSV) já existente, e o pacote resultante MUST continuar válido.
- **FR-015**: A documentação MUST explicar como gerar o mod, ajustar a estrutura e substituir os nomes localmente.
- **FR-016**: Uma simulação de 30 temporadas MUST rodar sem erro no mundo reduzido, com faixas de balanceamento declaradas para mundo, economia e competições; o médio e o completo MUST ser medidos em uma temporada completa (dia de jogos, virada, memória e tamanho do save).
- **FR-017**: O mod MUST NOT piorar as metas de tamanho e de desempenho da 020 para os mundos menores; as metas do mundo completo estão em FR-023.
- **FR-018**: Os mundos MUST ficar disponíveis para download na página de Mods se couberem nos limites de pacote; se não couberem, os limites MUST ser revistos com justificativa registrada (o limite por arquivo JSON passou de 10 para 16 MB).
- **FR-020**: O mod MUST ser um mundo completo com as seis confederações continentais do futebol (Europa, América do Sul, América do Norte, Central e Caribe, África, Ásia e Oceania) e os principais países de cada uma, cada país com a sua pirâmide e cada confederação com a sua competição continental principal e, quando houver clubes para isso, a secundária, ligadas entre si.
- **FR-021**: No mundo completo, as competições continentais de continentes diferentes MUST ser independentes, e a força, as receitas e as vagas continentais de cada país MUST ser proporcionais à força dele dentro do continente.
- **FR-022**: Os continentes, os países de cada um, a força relativa e o tamanho da pirâmide de cada país MUST ser dados da ferramenta, ajustáveis sem editar código (inclusive a lista de países de cada confederação).
- **FR-023**: O mundo completo MUST passar na validação, ser reproduzível pela seed e rodar 30 temporadas sem erro; as metas de tamanho (save, arquivo exportado), de tempo (dia de jogos e virada) e de memória dele MUST ser próprias, declaradas e justificadas, medidas na simulação de 30 temporadas e verificadas pelos testes e pela ferramenta de simulação.
- **FR-024**: A tela de nova carreira MUST oferecer três tamanhos de mundo, reduzido (24 países), médio (44 países, perto de 1 000 clubes) e completo (44 países, os 27 estaduais, perto de 1 650 clubes), ao lado do mundo padrão do jogo, e MUST gerar o escolhido dentro do jogo, sem download.
- **FR-025**: Cada tamanho MUST mostrar uma descrição do que traz e um aviso de peso; o completo MUST recomendar computadores potentes.
- **FR-026**: Os três mundos MUST estar também disponíveis para download na página de Mods, como mods, para a troca de nomes por planilha.
- **FR-019**: As divisões e competições do mod MUST manter o número de clubes e as vagas de acesso, rebaixamento e classificação consistentes durante as 30 temporadas.

### Key Entities

- **País**: nome, código, banco de nomes (português ou espanhol), força relativa e escala econômica.
- **Pirâmide nacional**: divisões do país com formato (pontos corridos ou grupos e mata-mata), acesso e rebaixamento.
- **Estadual**: competição regional de um estado brasileiro com duas divisões (023).
- **Copa nacional e supercopa**: competições eliminatórias do país, com vagas pela 021.
- **Competição continental (principal e secundária)**: competições entre países com vagas por país e ligação entre elas (022).
- **Banco de nomes**: sílabas de nomes de pessoas, prefixos e sufixos de clubes fictícios por país e idioma, e cidades reais do país.
- **Confederação continental** (continente): grupo de países do futebol mundial (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC) com as suas competições continentais (principal e secundária); chamada de continente no jogo.
- **Mundo completo**: pacote com as seis confederações e os principais países de cada uma.
- **Pacote do mod**: arquivo .zip com o mundo gerado, validado e reproduzível pela seed.
- **Faixas de balanceamento**: limites numéricos de força, reputação, caixa e vagas verificados na simulação longa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A validação de bancos aceita o pacote gerado em 100% das seeds testadas, e a mesma seed gera o mesmo pacote byte a byte em duas execuções.
- **SC-002**: Uma carreira de teste joga uma temporada inteira passando por estadual, divisão nacional, copa nacional e competição continental, sem nenhum clube com dois jogos no mesmo dia.
- **SC-003**: Em 30 temporadas sem interação do mundo reduzido, não há erro e as divisões de todos os países mantêm o número de clubes em 100% das temporadas.
- **SC-004**: Os países mais fortes têm, em média, mais clubes entre os participantes continentais e mais títulos continentais que os mais fracos, e todos os países têm ao menos um clube na competição continental em mais de 90% das temporadas.
- **SC-005**: O tamanho do save, o tempo do dia de jogos e da virada e a memória ficam dentro das metas próprias do mundo completo na simulação de 30 temporadas, e as metas da 020 continuam valendo, sem piora, para os mundos menores.
- **SC-006**: Um modder troca os nomes pela planilha e cria uma carreira com os nomes novos em menos de 15 minutos, seguindo só a documentação.
- **SC-007**: O mod pode ser baixado e carregado pela página de Mods em até dois cliques e passa na validação do jogo.
- **SC-008**: Nenhum nome de clube, competição ou jogador gerado contém termos da lista de bloqueio do projeto, em qualquer seed testada.
- **SC-009**: O mundo completo é gerado e validado, e uma temporada inteira dele roda sem erro, com cada uma das seis confederações tendo ao menos 4 países e uma competição continental disputada; as 30 temporadas valem para o mundo reduzido.
- **SC-010**: A mesma seed gera o mesmo mundo completo byte a byte.
- **SC-011**: Do clique em "nova carreira" ao primeiro dia jogado, o jogador leva menos de 1 minuto no mundo reduzido e menos de 2 minutos no completo, num computador comum, sem baixar arquivos.
- **SC-012**: Cada tamanho de mundo tem as metas de tempo e de tamanho declaradas e medidas: o reduzido dentro das metas da 020; o médio e o completo dentro das metas próprias.

## Assumptions

- **Dependências**: usa vários países e escala (020), vagas entre competições (021), competições continentais (022), estaduais (023) e CSV de nomes (015); não os reimplementa.
- **Divisão do futebol mundial (pesquisa)**: a FIFA tem 211 associações em seis confederações: UEFA (Europa, 55), CONMEBOL (América do Sul, 10), CONCACAF (América do Norte, Central e Caribe, 35), CAF (África, 54), AFC (Ásia, 47) e OFC (Oceania, cerca de 10); os números variam um pouco por fonte e a lista de países fica nos dados. Cada confederação tem competições de clubes de dois níveis (Champions League e Europa/Conference na Europa; Libertadores e Sul-Americana; Champions League e Copa da Confederação na África; Champions Elite e Two na Ásia; Champions Cup na CONCACAF; Champions League na Oceania). Aqui o mod usa, por confederação, uma competição principal e uma secundária, com nomes fictícios, e só a principal onde não houver clubes para duas. Sources: [Confederações e associações](https://en.wikipedia.org/wiki/List_of_football_federations), [Competições continentais de clubes](https://guidetofootball.com/competitions/continental-club-football/).
- **Estrutura**: Brasil com 4 divisões nacionais, estaduais dos 27 estados, copa e supercopa; demais 9 países com 2 divisões e copa nacional; um continente com competição principal e secundária. O número de clubes por divisão do estadual e da divisão D é definido nos dados da ferramenta e ajustável.
- **Proporção**: a força relativa de cada país (dentro da confederação e entre elas) é um dado da ferramenta (o Brasil e a Argentina no topo, a Venezuela e a Bolívia na base, por exemplo); as vagas continentais por país seguem a ordem de força.
- **Escala**: o mundo completo é bem maior que o de 400 clubes da 020 (o recorte sul-americano sozinho passa de 800); clubes só regionais têm elencos pequenos para caber nas metas. O mundo completo tem metas próprias, medidas e justificadas na mesma alteração (Princípio V); as da 020 não mudam.
- **Línguas dos nomes**: bancos de nomes de pessoas e de clubes fictícios por país e idioma (português no Brasil, espanhol nos demais países sul-americanos, e idiomas próprios por região nos outros continentes); cidades reais do país.
- **Escudos**: gerados (cores, forma e iniciais), sem imagens.
- **Tamanhos**: reduzido = perfil `compacto` (24 países, 4 estaduais); médio = 44 países com pirâmides menores (16, 12, 10 e 8 clubes por divisão) e 8 estaduais; completo = 44 países e os 27 estaduais. Os números exatos vêm dos perfis e das medições.
- **Geração no jogo**: o motor roda no navegador (offline); o mundo sai da seed digitada em "avançado" ou de uma seed padrão do mundo.
- **Download**: os três mundos entram na página de Mods ao lado do exemplo, gerados no build, se os pacotes couberem nos limites.
- **Princípio IV**: a constituição passa a registrar, junto com esta feature, que nomes de lugares (países, estados e cidades) não são conteúdo protegido; clubes, jogadores e competições seguem fictícios. O teste de bloqueio muda de acordo.
- **Fora de escopo**: editor de mods embutido, seleções nacionais, mundial de clubes (competição entre continentes), jogadores e clubes reais.
- **Determinismo**: o pacote depende só da seed e dos ajustes (Princípio II); a ordem dos arquivos e a compactação do .zip são fixas.
- **Equilíbrio**: as faixas numéricas da simulação de 30 temporadas são declaradas nos testes e podem ser ajustadas, com justificativa, na mesma alteração (Princípio V).
