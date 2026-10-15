# Feature Specification: Modelo de dados e banco fictício

**Feature Branch**: `001-modelo-dados-banco-ficticio`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Modelo de dados do mundo do jogo e banco de dados fictício padrão (ver docs/design.md §3, §4 e §11) — prompt `docs/speckit-prompts/marco1/prompt001.md`."

## Clarifications

### Session 2026-10-14

- Q: Como as posições são identificadas no formato do mod? → A: ids neutros em inglês no arquivo (`GK, FB, CB, DM, MF, FW`); siglas pt-BR (GOL, LAT, ZAG, VOL, MEI, ATA) apenas na exibição, via i18n.
- Q: Qual a escala de força do mundo gerado? → A: escala contida — média geral entre 55 e 65 e no máximo 2% dos jogadores com força ≥ 85 (a faixa alta fica rara, com espaço para a evolução de jovens no Marco 3).
- Q: Atributos ocultos ficam gravados no mod? → A: opcionais no mod; o banco padrão não os inclui; os ausentes são gerados de forma determinística a partir da seed da carreira ao criar o jogo.
- Q: Como tratar campos desconhecidos no mod? → A: geram aviso (não erro), são descartados e o banco carrega; a validação passa a ter dois níveis, erros e avisos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar o mundo padrão a partir de uma seed (Priority: P1)

Quem desenvolve o jogo (e, no futuro, quem inicia uma carreira) precisa de um mundo completo para
jogar: um país fictício com Série A e Série B, 20 clubes em cada, e elencos com cerca de 25
jogadores. Esse mundo é gerado a partir de uma seed, e a mesma seed sempre produz exatamente o
mesmo mundo.

**Why this priority**: sem um mundo não há nada para simular; todas as features seguintes do
Marco 1 (motor de partida, temporada) dependem dele.

**Independent Test**: gerar o banco com uma seed fixa, verificar que tem 1 país, 2 divisões,
40 clubes, elencos completos, e que uma segunda geração com a mesma seed é idêntica.

**Acceptance Scenarios**:

1. **Given** a seed 42, **When** o banco padrão é gerado, **Then** ele contém 1 país fictício,
   1 competição de pontos corridos com Série A e Série B, 20 clubes em cada divisão e de 22 a 30
   jogadores em cada clube.
2. **Given** a seed 42, **When** o banco é gerado duas vezes, **Then** os dois resultados
   serializados são idênticos byte a byte.
3. **Given** as seeds 42 e 43, **When** os bancos são gerados, **Then** eles diferem (nomes,
   forças ou elencos).
4. **Given** um banco gerado, **When** ele passa pela validação, **Then** não há nenhum erro.

---

### User Story 2 - Validar um banco com mensagens claras (Priority: P2)

Um modder (ou o próprio desenvolvedor) monta ou altera um banco no formato aberto. Ao validar,
todo problema é apontado de forma específica: qual arquivo/entidade, qual campo e o que está
errado, para que possa ser corrigido sem adivinhação.

**Why this priority**: o banco padrão é "o primeiro mod"; o formato só é aberto de verdade se
erros forem compreensíveis. Também protege o motor de dados corrompidos.

**Independent Test**: alimentar a validação com bancos propositalmente quebrados (um defeito por
caso) e verificar que cada um é rejeitado com o código de erro e o contexto esperados.

**Acceptance Scenarios**:

1. **Given** um jogador que referencia um clube inexistente, **When** o banco é validado,
   **Then** ele é rejeitado com um erro que identifica o jogador e o clube referenciado.
2. **Given** um jogador com força 0 ou 101, **When** o banco é validado, **Then** o erro aponta o
   jogador, o campo força e a faixa permitida (1–100).
3. **Given** um clube sem nenhum goleiro, **When** o banco é validado, **Then** o erro identifica
   o clube e a regra violada.
4. **Given** um banco com vários defeitos, **When** é validado, **Then** todos os defeitos são
   reportados de uma vez (não apenas o primeiro).
5. **Given** um banco cuja versão do formato não é suportada, **When** é validado, **Then** ele é
   rejeitado com erro que informa a versão encontrada e as suportadas.
6. **Given** qualquer erro de validação, **When** ele é exibido, **Then** a mensagem vem de um
   código de erro com parâmetros traduzível pelo sistema de idiomas, sem texto fixo.

---

### User Story 3 - Mundo com distribuição crível (Priority: P3)

Quem joga espera um mundo parecido com o futebol real: poucos clubes grandes, muitos médios e
pequenos; poucos craques, muitos jogadores medianos; elencos com posições coerentes; Série A
mais forte que a Série B.

**Why this priority**: um mundo sem hierarquia torna as temporadas sem graça e invalida o
critério do Marco 1 ("favoritos geralmente no topo"). Depende da US1.

**Independent Test**: gerar bancos com várias seeds e verificar automaticamente que as
distribuições de força, idade e posições ficam dentro das faixas definidas em FR-030 a FR-036.

**Acceptance Scenarios**:

1. **Given** bancos gerados com 20 seeds diferentes, **When** as distribuições são medidas,
   **Then** todas ficam dentro das faixas definidas para cada seed.
2. **Given** um banco gerado, **When** se compara a força média dos 16 melhores jogadores de cada
   clube, **Then** a média da Série A é maior que a da Série B e os clubes de maior reputação têm
   elencos mais fortes que os de menor reputação.

---

### Edge Cases

- Dois clubes com a mesma sigla ou o mesmo identificador no banco → rejeitado, apontando ambos.
- Jogador com 3 ou mais características, característica repetida ou característica fora do
  catálogo → rejeitado.
- Potencial menor que a força atual → rejeitado (o potencial é o teto).
- Jogador com só parte dos atributos ocultos (ex.: só potencial) → válido; os ausentes são
  completados pela seed da carreira e os presentes são mantidos.
- Banco onde o modder definiu potencial e a completação roda com seeds diferentes → o potencial
  definido nunca muda; só temperamento e propensão a lesões variam.
- Divisão com número de clubes diferente do exigido pelo formato, ou clube em duas divisões ao
  mesmo tempo → rejeitado.
- Regras de acesso/rebaixamento incoerentes (ex.: mais vagas de rebaixamento do que clubes, ou
  número de rebaixados da divisão superior diferente do número de promovidos da inferior) →
  rejeitado.
- Cores em formato inválido ou iniciais do escudo vazias/longas demais → rejeitado.
- Data de nascimento que resulta em idade fora de 15–45 anos na data de referência do banco →
  rejeitado.
- Arquivo que não é JSON válido → rejeitado com erro de estrutura, sem travar.
- Campo desconhecido (ex.: `"strenght"` digitado errado, ou campo extra de um modder) → aviso que
  identifica entidade e campo; o campo é descartado e o banco carrega se não houver erros. Se o
  erro de digitação deixou faltando um campo obrigatório, isso é um erro à parte.
- Seed ausente na geração → é obrigatória; não há seed implícita baseada em relógio.

## Requirements *(mandatory)*

### Functional Requirements

**Pacote de banco (mod)**

- **FR-001**: Um banco DEVE ser um pacote de dados com metadados (identificador, nome, autor,
  versão do conteúdo, versão do formato, data de referência do mundo) e o conteúdo do mundo.
- **FR-002**: O banco padrão DEVE usar exatamente o mesmo formato de qualquer outro banco; não há
  campo, atalho ou tratamento exclusivo do banco padrão.
- **FR-003**: Cada entidade DEVE ter um identificador estável e único dentro do banco; as
  relações entre entidades DEVEM ser feitas por identificador.

**País e competições**

- **FR-004**: Um país DEVE ter identificador, nome e código curto. Nacionalidade de jogador
  referencia um país do banco.
- **FR-005**: Uma competição DEVE pertencer a um país, ter nome (definido no banco, não nas
  traduções) e um formato de disputa descrito como dado.
- **FR-006**: O formato "pontos corridos" DEVE ser suportado, com parâmetros: número de turnos
  (ida e volta = 2), pontos por vitória/empate/derrota e lista ordenada de critérios de desempate.
- **FR-007**: O formato de disputa DEVE ser um tipo discriminado, de modo que "mata-mata" e
  "grupos" possam ser adicionados depois sem alterar bancos de pontos corridos existentes. Nesta
  feature, somente "pontos corridos" é aceito; outros tipos são rejeitados como "formato ainda não
  suportado".
- **FR-008**: Uma competição de liga DEVE ter divisões ordenadas por nível (1 = mais alta), cada
  uma com a lista de clubes participantes e regras de acesso (vagas que sobem) e rebaixamento
  (vagas que descem).

**Clube**

- **FR-009**: Um clube DEVE ter: nome, nome curto, sigla (3 letras), cidade, país, cor primária,
  cor secundária, escudo, reputação (1–100), capacidade do estádio e caixa inicial.
- **FR-010**: O escudo DEVE ser descrito como dados: forma (de um catálogo fixo, ex.: clássico,
  redondo, triangular, retangular), cores (primária, secundária e opcionalmente terciária) e
  iniciais (1 a 4 caracteres).
- **FR-011**: A capacidade do estádio DEVE estar entre 1.000 e 150.000 lugares; o caixa inicial
  DEVE ser um valor inteiro na moeda fictícia do jogo, podendo ser negativo (clube endividado).

**Jogador**

- **FR-012**: Um jogador DEVE ter: nome, nome de exibição, data de nascimento, nacionalidade,
  clube, posição, força (1–100) e até 2 características. Os atributos ocultos potencial (1–100,
  maior ou igual à força), temperamento (1–100) e propensão a lesões (1–100) são **opcionais no
  banco**, cada um de forma independente; quando presentes, são validados com as mesmas regras.
- **FR-013**: As posições DEVEM ser identificadas no formato do banco por ids neutros de idioma:
  `GK`, `FB`, `CB`, `DM`, `MF`, `FW`. Em pt-BR são exibidas como GOL, LAT, ZAG, VOL, MEI, ATA,
  respectivamente, via sistema de idiomas; o banco nunca contém as siglas traduzidas.
- **FR-014**: As características DEVEM vir de um catálogo fixo conhecido pelo jogo, identificadas
  no banco por ids neutros de idioma (mesma regra do FR-013), contendo ao menos: Artilheiro,
  Muralha, Cobrador de falta, Cabeceio, Velocidade, Armador. Um jogador não pode repetir
  característica.
- **FR-015**: A idade DEVE ser derivada da data de nascimento e da data de referência do banco
  (não armazenada separadamente).
- **FR-016**: Salário e valor de mercado DEVEM ser derivados (não fazem parte do banco) por uma
  regra determinística a partir de força, idade, potencial e reputação do clube, calculada sobre
  o mundo com atributos ocultos já completos (FR-017b). Valores derivados DEVEM crescer com a
  força e ser sempre positivos.
- **FR-017**: Atributos ocultos DEVEM ficar agrupados e sinalizados como ocultos no modelo, para
  que camadas de apresentação não os exibam diretamente.
- **FR-017a**: O banco padrão gerado NÃO DEVE incluir atributos ocultos, para que não possam ser
  descobertos lendo os arquivos distribuídos com o jogo.
- **FR-017b**: DEVE existir uma operação determinística que, dado um banco validado e uma seed
  (a seed da carreira), completa os atributos ocultos ausentes de cada jogador sem alterar os que
  o banco já define. Mesma seed + mesmo banco ⇒ mesmos valores; seeds diferentes ⇒ valores
  diferentes. O valor gerado para um jogador não depende da ordem dos jogadores no banco. Essa
  operação é usada na criação de um novo jogo (feature futura).

**Validação**

- **FR-018**: A validação DEVE verificar estrutura (campos obrigatórios, tipos), faixas de
  valores e regras entre entidades (referências, unicidade, coerência).
- **FR-018a**: A validação DEVE ter dois níveis de problema: **erro** (o banco é rejeitado) e
  **aviso** (o banco é aceito). Campos desconhecidos geram aviso e são descartados do banco
  aceito. Um banco é aceito se, e somente se, não houver erros; os avisos são sempre
  reportados junto com o resultado.
- **FR-019**: Regras de elenco: cada clube DEVE ter entre 16 e 40 jogadores, com no mínimo 2
  goleiros.
- **FR-020**: Siglas de clube e identificadores de todas as entidades DEVEM ser únicos no banco.
- **FR-021**: Cada clube DEVE estar em no máximo uma divisão; todo clube referenciado por divisão
  ou jogador DEVE existir.
- **FR-022**: Regras de acesso/rebaixamento DEVEM ser coerentes: o número de rebaixados de uma
  divisão é igual ao de promovidos da divisão imediatamente inferior; a divisão mais alta não tem
  acesso e a mais baixa não tem rebaixamento; vagas nunca excedem o número de clubes.
- **FR-023**: A validação DEVE reportar todos os erros e avisos encontrados, cada um com: nível,
  código, caminho da entidade/campo afetado e parâmetros (ex.: identificador do jogador, valor
  encontrado, faixa permitida).
- **FR-024**: Mensagens de erro DEVEM ser produzidas a partir do código e dos parâmetros pelo
  sistema de idiomas (pt-BR no lançamento), com frases completas.
- **FR-025**: A validação DEVE rejeitar versões de formato não suportadas, informando a versão
  encontrada e as suportadas.
- **FR-026**: Um banco aprovado na validação DEVE poder ser usado pelo restante do jogo sem
  verificações adicionais de consistência.

**Gerador do banco padrão**

- **FR-027**: O gerador DEVE receber uma seed obrigatória e produzir um banco completo; mesma seed
  ⇒ banco idêntico. O gerador NÃO PODE usar nenhuma fonte de aleatoriedade além da seed.
- **FR-028**: O banco padrão gerado DEVE conter 1 país fictício, 1 competição de liga com
  Série A (nível 1) e Série B (nível 2), 20 clubes em cada, 4 rebaixados da Série A e 4
  promovidos da Série B.
- **FR-029**: Nomes de clubes, cidades e jogadores DEVEM vir de bancos de nomes fictícios
  (prenomes, sobrenomes, cidades, sufixos de clube) armazenados como dados. Nenhum nome de clube
  pode se repetir no mesmo banco.

**Faixas de distribuição do banco gerado (verificadas por teste para qualquer seed)**

- **FR-030**: Cada clube gerado DEVE ter de 23 a 28 jogadores, com: 3 `GK`, 4–5 `FB`, 4–5 `CB`,
  3–5 `DM`, 4–6 `MF`, 4–5 `FW`.
- **FR-031**: Clubes DEVEM ser distribuídos em camadas por reputação: na Série A, 4 a 6 grandes,
  8 a 10 médios e o restante pequenos; a Série B tem no máximo 2 clubes com reputação de "grande".
- **FR-032**: Considerando todos os jogadores do banco (escala "contida"): força média entre 55 e
  65; no máximo 2% com força ≥ 85; ao menos 50% com força entre 45 e 70; nenhum abaixo de 20.
- **FR-033**: A força média dos 16 melhores jogadores de cada clube da Série A DEVE superar a da
  Série B em pelo menos 5 pontos, e a média dos grandes DEVE superar a dos pequenos da Série A em
  pelo menos 8 pontos.
- **FR-034**: Idades geradas entre 16 e 37 anos, com média entre 24 e 28 anos.
- **FR-035**: Após completar os atributos ocultos (FR-017b) do banco gerado: potencial ≥ força
  para todos; jogadores com até 21 anos têm potencial médio pelo menos 8 pontos acima da força
  média da mesma faixa etária.
- **FR-036**: Entre 40% e 70% dos jogadores têm pelo menos 1 característica; no máximo 15% têm 2.

**Restrições de conteúdo**

- **FR-037**: Nenhum nome, sigla, escudo ou marca real de clube, jogador ou competição pode estar
  nos bancos de nomes ou no banco padrão gerado. Os bancos de nomes DEVEM ser revisados para
  excluir nomes de clubes reais conhecidos.

### Key Entities *(include if feature involves data)*

- **Pacote de banco**: metadados (id, nome, autor, versão do conteúdo, versão do formato, data de
  referência) + países, competições, clubes e jogadores.
- **País**: id, nome, código curto. Contém competições e clubes; é a nacionalidade dos jogadores.
- **Competição**: id, país, nome, formato de disputa (tipo discriminado; hoje só pontos corridos
  com turnos, pontuação e critérios de desempate) e divisões.
- **Divisão**: nível, nome, clubes participantes, vagas de acesso e de rebaixamento.
- **Clube**: id, nomes, sigla, cidade, país, cores, escudo, reputação, estádio, caixa inicial.
- **Escudo**: forma (catálogo), cores e iniciais.
- **Jogador**: id, nomes, nascimento, nacionalidade, clube, posição, força, características,
  atributos ocultos opcionais no banco (potencial, temperamento, propensão a lesões), completados
  pela seed da carreira quando ausentes. Salário e valor são derivados.
- **Característica**: item de um catálogo fixo do jogo, referenciado por identificador.
- **Problema de validação**: nível (erro ou aviso), código, caminho, parâmetros; convertido em
  texto pelo sistema de idiomas.
- **Bancos de nomes**: listas de prenomes, sobrenomes, cidades e partes de nomes de clubes
  usadas pelo gerador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para 100% das seeds testadas (no mínimo 20), o banco gerado passa na validação sem
  erros e é idêntico ao gerado novamente com a mesma seed.
- **SC-002**: Para 100% das seeds testadas, todas as faixas de FR-030 a FR-036 são respeitadas.
- **SC-003**: Cada regra de validação tem ao menos um caso de banco inválido que é rejeitado com
  o código de erro esperado e o caminho da entidade correta (100% de cobertura das regras).
- **SC-004**: Um banco com N defeitos independentes produz N erros em uma única validação; um
  banco válido com M campos desconhecidos é aceito e produz M avisos.
- **SC-005**: Gerar e validar o banco padrão leva menos de 2 segundos em um computador comum.
- **SC-006**: Nenhum texto de erro ou aviso está fixo no código; 100% dos códigos têm mensagem em
  pt-BR.
- **SC-007**: O banco padrão gerado é aceito com zero erros e zero avisos.

## Assumptions

- Não há interface gráfica nesta feature; o uso é por scripts e testes automatizados.
- O mundo padrão tem apenas 1 país; todos os jogadores gerados são desse país. Estrangeiros
  ficam para features futuras.
- A data de referência do banco padrão é o início da primeira temporada do jogo (ex.:
  1º de janeiro de um ano fictício fixo), usada para calcular idades.
- Força, potencial, temperamento, propensão a lesões e reputação usam a mesma escala 1–100.
- Temperamento alto = mais propenso a cartões; propensão a lesões alta = mais lesões. O efeito
  desses atributos é definido nas features de partida.
- A moeda é fictícia e sem nome real; valores são inteiros.
- A regra de derivação de salário e valor de mercado é provisória e será recalibrada na feature
  de finanças (Marco 3); aqui só precisa ser determinística, positiva e crescente com a força.
- O catálogo de posições, características e formas de escudo é fixo no jogo (o motor precisa
  conhecer seus efeitos); bancos apenas os referenciam.
- Os bancos de nomes fazem parte dos dados do jogo (não do banco gerado) e podem ser trocados
  por bancos de nomes de outros países no futuro.
- Fora de escopo: renderização de escudos, import/export CSV, editor de mods, carregar mods de
  terceiros pela interface, formatos mata-mata e grupos.
