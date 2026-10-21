# Feature Specification: Polimento e publicação

**Feature Branch**: `016-polimento-publicacao`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Polimento da experiência e publicação da primeira versão pública (ver docs/design.md §1, §2 e §13, marco M6) — prompt `docs/speckit-prompts/marco6/prompt016.md`."

## Contexto

Última feature do Marco 6 (Lançamento). O jogo já é completo de ponta a ponta — carreira de muitas
temporadas, mercado, diretoria, torcida, manchetes, saves portáteis e mods — e já funciona offline
depois de carregado. Mas foi feito por quem conhece cada tela: não há primeiro acesso guiado, a
ajuda de atalhos só existe dentro do jogo, o tema é só escuro, não há uma tela de configurações,
nem versão visível, nem notas de versão, e o jogo não está publicado em lugar nenhum. O critério
do marco é "um estranho consegue jogar sem explicação". Esta feature fecha esse ciclo: guia o
novo jogador nos conceitos centrais (escalação, rodada, mercado, diretoria), consolida atalhos,
configurações, acessibilidade e consistência visual, revisa desempenho e textos, e publica o
jogo gratuitamente na web, com uma página de apresentação que deixa claro que nenhum nome real é
usado. Versão desktop, mobile, outras traduções, itch.io e Steam ficam fora.

## Clarifications

### Session 2026-10-20

- Q: Onde hospedar a versão web? → A: Vercel (plano gratuito Hobby, uso não comercial), na raiz do domínio, publicada a partir do processo de publicação após as verificações.
- Q: Como a versão chega ao itch.io? → A: Não chega — o itch.io sai do escopo desta feature; a publicação é só na web (Vercel).
- Q: Com que nome o jogo é lançado? → A: "Treinador FC" — nome definitivo do lançamento, usado na página de apresentação, no título, no app instalável e no endereço público; "brasfoot-like" fica só como nome interno do repositório.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Primeiro acesso guiado (Priority: P1)

Quem abre o jogo pela primeira vez é conduzido até jogar a primeira rodada, entendendo o que
importa em cada tela, sem precisar de nenhuma explicação externa.

**Why this priority**: é o critério de pronto do marco. Sem isso, um estranho trava na criação
de carreira ou não entende escalação, rodada, mercado e diretoria.

**Independent Test**: com o armazenamento do navegador limpo, abrir o jogo, seguir as dicas,
criar uma carreira, escalar e jogar uma rodada; depois fechar e reabrir: as dicas já vistas não
voltam. Na tela de configurações, "Mostrar as dicas de novo" faz as dicas reaparecerem.

**Acceptance Scenarios**:

1. **Given** um navegador sem nenhum dado do jogo, **When** o jogador abre a tela inicial,
   **Then** vê uma boas-vindas curta explicando o objetivo do jogo e o caminho "Nova carreira",
   com a opção de pular as dicas.
2. **Given** a primeira carreira recém-criada, **When** o jogador chega à tela principal do jogo,
   **Then** vê dicas contextuais, uma por vez, apontando para o próximo passo: escalação, jogar a
   rodada (ao vivo ou direto) e onde ver a tabela.
3. **Given** o jogador abre pela primeira vez a escalação, a rodada ao vivo, o mercado ou a
   carreira/diretoria, **When** a tela carrega, **Then** aparece uma dica curta própria daquela
   tela (o que fazer ali e o atalho principal), que some ao ser dispensada e não volta.
4. **Given** qualquer dica aberta, **When** o jogador escolhe "Pular todas as dicas", **Then**
   nenhuma dica volta a aparecer até ele reativá-las nas configurações.
5. **Given** dicas dispensadas, **When** o jogador reativa as dicas nas configurações, **Then**
   elas voltam a aparecer nas telas, a partir da próxima visita a cada uma.
6. **Given** uma dica aberta, **When** o jogador usa só o teclado, **Then** consegue lê-la,
   avançar e dispensá-la (incluindo com Esc) e o foco volta para onde estava.

---

### User Story 2 - Configurações (Priority: P1)

O jogador ajusta o jogo ao seu gosto numa tela própria: velocidade da rodada ao vivo, tema
claro ou escuro, idioma e dicas.

**Why this priority**: tema e velocidade afetam conforto e legibilidade de todas as sessões; a
tela também é o lugar para reativar as dicas (US1) e para ver a versão (US5).

**Independent Test**: abrir Configurações pela tela inicial e de dentro do jogo; trocar o tema
para claro, a velocidade padrão para "rápida"; recarregar a página: as escolhas continuam;
jogar uma rodada ao vivo: ela começa na velocidade escolhida.

**Acceptance Scenarios**:

1. **Given** a tela inicial ou qualquer tela do jogo, **When** o jogador abre Configurações,
   **Then** vê: velocidade padrão da rodada ao vivo, pausa automática em lances importantes,
   tema (claro, escuro, seguir o sistema), idioma e reativar dicas.
2. **Given** o jogador muda o tema, **When** a escolha é feita, **Then** todas as telas passam a
   usar o tema imediatamente, sem recarregar, e a escolha persiste entre sessões.
3. **Given** o tema "seguir o sistema" (padrão), **When** o sistema operacional está em modo
   claro, **Then** o jogo abre claro; em modo escuro, escuro.
4. **Given** a velocidade padrão escolhida nas configurações, **When** uma rodada ao vivo começa,
   **Then** ela usa essa velocidade; mudar a velocidade durante a rodada continua possível e
   passa a ser a nova padrão (como hoje).
5. **Given** o seletor de idioma, **When** o jogador o abre, **Then** vê "Português (Brasil)"
   como única opção, selecionada; a escolha é guardada e é a mesma usada pelos textos do jogo.
6. **Given** a tela de configurações, **When** o jogador volta, **Then** retorna à tela de onde
   veio.

---

### User Story 3 - Atalhos de teclado consistentes e tela de ajuda (Priority: P2)

O jogador que prefere o teclado usa os mesmos atalhos em todo o jogo e consulta todos eles numa
ajuda acessível de qualquer tela.

**Why this priority**: os atalhos já existem nas telas principais; falta torná-los consistentes
(mesma tecla, mesma ação em todo lugar, sem conflitos) e descobríveis fora do jogo.

**Independent Test**: em cada tela, apertar `?` abre a ajuda com os atalhos válidos ali
(globais e da tela, agrupados); cada atalho listado funciona; nenhuma tecla tem duas ações na
mesma tela.

**Acceptance Scenarios**:

1. **Given** qualquer tela (inicial, carreiras, nova carreira, mods, configurações ou jogo),
   **When** o jogador aperta `?`, **Then** abre a ajuda de atalhos com os grupos "Gerais" e
   "Desta tela", e Esc a fecha devolvendo o foco.
2. **Given** a ajuda aberta, **When** o jogador lê a lista, **Then** cada atalho mostra a tecla
   e a ação numa frase, e nenhum atalho listado deixa de funcionar naquela tela.
3. **Given** a mesma ação em telas diferentes (ex.: voltar, abrir ajuda, abrir configurações,
   confirmar, fechar diálogo), **When** o jogador usa o atalho, **Then** é sempre a mesma tecla.
4. **Given** o foco num campo de texto ou num seletor, **When** o jogador digita, **Then**
   nenhum atalho dispara (comportamento atual mantido).
5. **Given** a tela inicial, **When** o jogador procura a ajuda sem usar o teclado, **Then**
   encontra um botão visível "Atalhos" que abre a mesma ajuda.

---

### User Story 4 - Interface consistente, legível e acessível (Priority: P2)

O jogador usa o jogo com conforto em qualquer tema, só com teclado se quiser, e com leitor de
tela nas telas principais.

**Why this priority**: o marco exige que um estranho jogue sem ajuda; contraste baixo, foco
invisível ou controles sem nome impedem isso para parte das pessoas.

**Independent Test**: varredura automática de acessibilidade sem violações graves nas telas
principais, nos dois temas; percorrer o fluxo "nova carreira → escalação → rodada → tabela"
só com teclado, vendo sempre onde está o foco.

**Acceptance Scenarios**:

1. **Given** os temas claro e escuro, **When** se mede o contraste de texto e de controles nas
   telas principais, **Then** todo texto atinge pelo menos 4,5:1 (3:1 para texto grande e para
   bordas/ícones de controles).
2. **Given** navegação só por teclado, **When** o foco passa por qualquer controle, **Then** o
   indicador de foco é sempre visível nos dois temas.
3. **Given** o fluxo completo de criar carreira, escalar, jogar uma rodada e ver a tabela,
   **When** feito só com teclado, **Then** é concluído sem armadilhas de foco e sem precisar do
   mouse.
4. **Given** um leitor de tela, **When** percorre as telas principais, **Then** todo controle
   tem nome, as tabelas têm legenda e cabeçalhos, e mudanças importantes (gol, fim da rodada,
   save concluído) são anunciadas.
5. **Given** as telas do jogo, **When** comparadas entre si, **Then** usam os mesmos padrões de
   título, botões primário/secundário, espaçamentos, tabelas e mensagens de vazio/erro.
6. **Given** o jogador prefere menos movimento no sistema, **When** usa o jogo, **Then**
   animações e transições não essenciais são reduzidas.

---

### User Story 5 - Versão do jogo e notas de versão (Priority: P3)

O jogador vê qual versão está usando e o que mudou em cada versão.

**Why this priority**: necessário para publicar e para relatar problemas, mas não muda a
experiência de jogo.

**Independent Test**: a versão aparece na tela inicial e em Configurações; "Notas de versão"
abre a lista das versões com as mudanças; após uma atualização, a tela inicial avisa uma vez
que há novidades.

**Acceptance Scenarios**:

1. **Given** a tela inicial e as configurações, **When** o jogador olha o rodapé/seção "Sobre",
   **Then** vê a versão do jogo (ex.: "Versão 1.0.0").
2. **Given** o link "Notas de versão", **When** aberto, **Then** mostra as versões da mais
   recente para a mais antiga, cada uma com data e lista de mudanças em pt-BR, também offline.
3. **Given** o jogador já usou uma versão anterior, **When** abre o jogo numa versão nova pela
   primeira vez, **Then** vê um aviso discreto "Novidades da versão X" com link para as notas,
   que some ao ser dispensado.
4. **Given** um jogo já aberto quando uma versão nova é publicada, **When** a versão nova fica
   disponível, **Then** o jogador é avisado para recarregar e nada da carreira em andamento é
   perdido.

---

### User Story 6 - Jogo publicado na web (Priority: P1)

Qualquer pessoa encontra o jogo publicado de graça, entende o que é pela página, joga no
navegador e continua jogando sem internet.

**Why this priority**: é o objetivo do marco e do projeto (publicação gratuita).

**Independent Test**: abrir o endereço público num navegador limpo; jogar
uma rodada; desligar a rede, recarregar e continuar jogando; a página mostra descrição, capturas
e o aviso sobre nomes.

**Acceptance Scenarios**:

1. **Given** o endereço público na web, **When** aberto num navegador limpo, **Then** o jogo
   carrega e é jogável, sem cadastro, anúncio ou cobrança.
2. **Given** o jogo carregado uma vez, **When** a conexão cai e a página é
   recarregada, **Then** o jogo abre e continua a carreira normalmente.
3. **Given** a página de apresentação do jogo, **When** o visitante a lê,
   **Then** encontra: descrição curta do jogo, pelo menos 4 capturas de tela, o aviso de que o
   jogo não usa nomes, escudos ou marcas reais (com menção a mods da comunidade), e que é
   gratuito.
4. **Given** uma nova versão aprovada, **When** o mantenedor a publica, **Then** o processo
   publica o build com a versão e as notas atualizadas, e aborta se alguma verificação de
   qualidade falhar.

---

### User Story 7 - Revisão de desempenho e de textos (Priority: P2)

Mesmo em carreiras longas, avançar rodadas e virar a temporada é rápido, e todos os textos estão
corretos, em pt-BR e dentro do sistema de traduções.

**Why this priority**: carreiras de 30+ temporadas são o caso de quem mais gosta do jogo; textos
fora do i18n quebram a regra do projeto e futuras traduções.

**Independent Test**: medir rodada e virada de temporada num save de 30+ temporadas contra os
limites do plano; verificação automática que falha se houver texto visível fixo no código ou
chave de tradução sem uso/sem texto.

**Acceptance Scenarios**:

1. **Given** uma carreira com 30 ou mais temporadas, **When** o jogador simula uma rodada
   direto, **Then** o resultado aparece dentro do limite definido no plano.
2. **Given** a mesma carreira, **When** o jogador vira a temporada, **Then** a virada termina
   dentro do limite definido no plano, com indicação de progresso se passar de 1 segundo.
3. **Given** o código da interface, **When** a verificação de textos roda, **Then** falha se
   houver texto visível ao usuário fora do sistema de traduções, chave usada sem texto ou chave
   sem uso.
4. **Given** todos os textos pt-BR, **When** revisados, **Then** estão com ortografia e
   concordância corretas, tom consistente (você/tratamento) e terminologia de futebol uniforme
   (ex.: sempre o mesmo termo para a mesma coisa).

---

### Edge Cases

- Armazenamento do navegador indisponível (modo privado restrito): dicas e configurações
  funcionam na sessão, sem quebrar, e o aviso de armazenamento existente continua.
- Jogador que já tem carreiras salvas (atualizou de uma versão anterior): não recebe a
  boas-vindas de primeiro acesso, só o aviso de novidades; dicas das telas aparecem uma vez,
  com "Pular todas" em destaque.
- Dica apontando para um elemento que não está visível (tela pequena, lista vazia): a dica
  aparece centralizada, sem apontar, e não bloqueia a tela.
- Diálogo aberto com dica pendente: a dica espera o diálogo fechar.
- Tema "seguir o sistema" e o sistema troca de tema com o jogo aberto: o jogo acompanha.
- Atalho de uma tela igual a um atalho global: a verificação de atalhos trata como erro.
- Rodada ao vivo em andamento quando sai uma versão nova: o aviso de recarregar não interrompe a
  rodada; só aparece fora da rodada ao vivo.
- Publicação com verificação falhando (testes, build, varredura de acessibilidade): nada é
  publicado e a versão anterior continua no ar.
- Nota de versão com texto ausente para a versão atual: o build falha (não publica sem notas).
- Configurações vindas de uma versão futura (valores desconhecidos): são ignorados e voltam ao
  padrão, sem erro.

## Requirements *(mandatory)*

### Functional Requirements

**Primeiro acesso guiado**

- **FR-001**: O jogo DEVE mostrar uma boas-vindas no primeiro acesso (sem nenhum dado do jogo no
  navegador) explicando o objetivo e o caminho para criar uma carreira, com opção de pular.
- **FR-002**: O jogo DEVE oferecer dicas contextuais curtas, uma por vez, para: tela principal
  do jogo (próximo passo), escalação, rodada (ao vivo e direto), tabela/competição, mercado e
  carreira/diretoria.
- **FR-003**: Cada dica DEVE aparecer no máximo uma vez por perfil do navegador, ser dispensável
  individualmente e ter "Pular todas as dicas".
- **FR-004**: As dicas DEVEM poder ser reativadas nas configurações.
- **FR-005**: As dicas DEVEM ser operáveis por teclado, anunciadas a leitores de tela, não
  bloquear o restante da tela e devolver o foco ao dispensar.
- **FR-006**: Os textos das dicas DEVEM vir do sistema de traduções e citar o atalho principal
  da tela quando houver.

**Configurações**

- **FR-007**: DEVE existir uma tela de Configurações acessível da tela inicial e de dentro do
  jogo, com: velocidade padrão da rodada ao vivo, pausa automática, tema (claro, escuro, seguir
  o sistema — padrão), idioma (somente pt-BR disponível) e reativar dicas.
- **FR-008**: As configurações DEVEM valer imediatamente, persistir entre sessões no navegador e
  ser independentes das carreiras (não ficam no save).
- **FR-009**: A velocidade e a pausa automática escolhidas nas configurações DEVEM ser as mesmas
  preferências já usadas pela rodada ao vivo (mudar numa muda na outra).
- **FR-010**: O tema claro DEVE cobrir todas as telas, componentes, gráficos e escudos
  desenhados, sem trechos ilegíveis.
- **FR-011**: O seletor de idioma DEVE listar os idiomas disponíveis a partir das traduções
  existentes, de forma que adicionar um idioma não exija mudar a tela.
- **FR-012**: Configurações com valores inválidos ou desconhecidos DEVEM voltar ao padrão sem
  erro.

**Atalhos e ajuda**

- **FR-013**: DEVE haver um conjunto de atalhos globais documentado: `?` abre a ajuda, Esc fecha
  diálogos/dicas, e uma tecla para abrir Configurações; as demais teclas existentes mantêm o
  significado atual.
- **FR-014**: A ajuda de atalhos DEVE abrir com `?` em todas as telas (não só dentro do jogo),
  listar "Gerais" e "Desta tela", e ter um botão visível na tela inicial e no cabeçalho do jogo.
- **FR-015**: A lista da ajuda DEVE ser gerada da mesma definição usada pelos atalhos, de forma
  que um atalho listado sempre funcione e todo atalho que funciona esteja listado.
- **FR-016**: Uma verificação automática DEVE falhar se uma mesma tecla tiver duas ações numa
  mesma tela.

**Interface e acessibilidade**

- **FR-017**: Texto e controles DEVEM atender contraste mínimo de 4,5:1 (texto normal) e 3:1
  (texto grande, bordas e ícones de controle) nos dois temas.
- **FR-018**: Todo elemento focável DEVE ter indicador de foco visível nos dois temas.
- **FR-019**: O fluxo nova carreira → escalação → rodada → tabela → mercado → salvar DEVE ser
  completável só com teclado.
- **FR-020**: Controles DEVEM ter nome acessível; tabelas, legenda e cabeçalhos; eventos
  importantes da rodada e confirmações (save, importação) DEVEM ser anunciados.
- **FR-021**: As telas DEVEM seguir padrões visuais únicos (título, botões, espaçamento,
  tabelas, mensagens de vazio e erro), revisados tela a tela.
- **FR-022**: O jogo DEVE respeitar a preferência do sistema por movimento reduzido.
- **FR-023**: Uma varredura automática de acessibilidade DEVE rodar nas telas principais, nos
  dois temas, sem violações de gravidade alta.

**Versão e notas**

- **FR-024**: A versão do jogo DEVE aparecer na tela inicial e em Configurações, vinda de uma
  única fonte usada também na publicação.
- **FR-025**: As notas de versão DEVEM estar disponíveis offline dentro do jogo, em pt-BR, da
  mais recente para a mais antiga, com data e mudanças.
- **FR-026**: Na primeira abertura de uma versão nova, o jogador que já usava o jogo DEVE ver um
  aviso único de novidades com link para as notas.
- **FR-027**: Quando uma versão nova estiver disponível com o jogo aberto, o jogador DEVE ser
  avisado para recarregar, fora da rodada ao vivo, sem perda de dados.

**Desempenho e textos**

- **FR-028**: O plano DEVE definir limites de tempo para simular uma rodada e virar a temporada
  em saves de 30+ temporadas; testes automatizados DEVEM medi-los e falhar acima dos limites.
- **FR-029**: Operações que passem de 1 segundo DEVEM mostrar indicação de progresso e não
  travar a interface sem aviso.
- **FR-030**: Uma verificação automática DEVE falhar se houver texto visível fixo no código da
  interface, chave de tradução usada sem texto ou chave definida sem uso.
- **FR-031**: Todos os textos pt-BR DEVEM ser revisados (ortografia, concordância, tom e
  terminologia), com um glossário curto dos termos de futebol adotados.

**Publicação**

- **FR-032**: O jogo DEVE ser publicado como site estático na Vercel (plano gratuito), na raiz de
  um endereço público, sem cadastro, anúncio ou cobrança; a publicação acontece só pelo processo
  de FR-034 (depois das verificações), não a cada envio de código.
- **FR-033**: O jogo publicado DEVE funcionar offline após o primeiro
  carregamento, incluindo recarregar a página.
- **FR-034**: A publicação DEVE ser um processo reproduzível que roda todas as verificações de
  qualidade (testes, build, e2e, acessibilidade, textos, desempenho) e só publica se todas
  passarem.
- **FR-035**: DEVE existir uma página de apresentação do jogo no próprio site, com descrição,
  pelo menos 4 capturas de tela, aviso de que o jogo não usa nomes, escudos ou marcas reais
  (nomes reais só via mods da comunidade) e de que é gratuito e sem anúncios.
- **FR-036**: As capturas de tela DEVEM ser geradas a partir do jogo com o banco fictício, de
  forma reproduzível, para não conter nenhum conteúdo real.
- **FR-037**: O jogo publicado NÃO DEVE incluir telemetria, rastreamento, anúncios ou chamadas de
  rede além do carregamento dos próprios arquivos.
- **FR-038**: O nome do jogo visível ao jogador DEVE ser "Treinador FC", vindo de uma única fonte
  traduzível; nenhum texto visível ao jogador, página ou metadado publicado DEVE conter
  "brasfoot".

### Key Entities *(include if feature involves data)*

- **Configurações**: preferências do jogador no navegador — velocidade padrão e pausa automática
  da rodada ao vivo (já existentes), tema, idioma, dicas ativadas. Independentes das carreiras.
- **Estado das dicas**: quais dicas já foram vistas/dispensadas e se todas foram puladas; última
  versão do jogo vista (para o aviso de novidades).
- **Atalho**: tecla, ação (texto traduzível), escopo (global ou tela). Fonte única para o
  comportamento e para a ajuda.
- **Versão e notas de versão**: número da versão, data e lista de mudanças por versão, em pt-BR.
- **Página de apresentação**: descrição, capturas, aviso de conteúdo e link para jogar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em teste com pelo menos uma pessoa que nunca viu o jogo, ela cria uma carreira e
  completa uma rodada sem ajuda externa (sem perguntas ao observador), em até 10 minutos.
- **SC-002**: O jogo publicado abre e continua uma carreira com a conexão
  desligada após o primeiro carregamento, em 100% das verificações automatizadas e na
  verificação manual de lançamento.
- **SC-003**: Zero violações de acessibilidade de gravidade alta nas telas principais, nos dois
  temas; 100% dos pares de cor de texto atendem o contraste mínimo.
- **SC-004**: O fluxo nova carreira → rodada → tabela → mercado → salvar é concluído só com
  teclado num teste automatizado.
- **SC-005**: Em carreira de 30+ temporadas, simular uma rodada e virar a temporada ficam dentro
  dos limites definidos no plano em 100% das medições do teste de desempenho.
- **SC-006**: Zero textos visíveis fora do sistema de traduções e zero chaves sem texto ou sem
  uso, verificado automaticamente a cada build.
- **SC-007**: 100% dos atalhos listados na ajuda funcionam na tela indicada e nenhuma tecla tem
  ação duplicada numa tela (verificação automatizada).
- **SC-008**: Configurações (tema, velocidade, pausa, dicas) persistem após recarregar em 100%
  dos casos testados.
- **SC-009**: Cada publicação sai de um build com a versão e as notas corretas, e nenhuma
  publicação acontece com verificação falhando.
- **SC-010**: O pacote publicado não faz nenhuma requisição de rede a domínios de terceiros
  durante o jogo (verificado automaticamente).

## Assumptions

- **Hospedagem web**: Vercel, plano gratuito (Hobby), compatível com o jogo por ser gratuito e
  não comercial; endereço na raiz (`*.vercel.app`, sem subcaminho). Funciona com o repositório
  privado ou público, então a decisão de abrir o código (§15) não bloqueia esta feature. Se o
  jogo vier a ter qualquer forma de monetização, a hospedagem precisa ser revista (fora do plano
  gratuito).
- **Contas**: criar a conta/projeto na Vercel e cadastrar os segredos do processo de publicação
  são ações do mantenedor; esta feature entrega o processo, a página, as capturas e um roteiro
  de lançamento.
- **Nome do jogo**: "Treinador FC" (decidido em 2026-10-20, resolve o item do §15 do design),
  definido num único lugar traduzível e usado em todas as telas, na página de apresentação, no
  app instalável e no endereço público (ex.: `treinador-fc.vercel.app`, sujeito a
  disponibilidade). "brasfoot-like" continua só como nome interno do repositório e dos pacotes;
  nenhum texto visível ao jogador usa "brasfoot".
- **Primeira versão pública**: 1.0.0; as notas de versão começam por ela, resumindo os marcos
  M1–M6.
- **Dicas, não tutorial jogável**: o primeiro acesso usa boas-vindas + dicas contextuais nas
  telas reais, sem uma carreira de tutorial separada.
- **Teste com estranho**: conduzido manualmente pelo mantenedor com o roteiro do plano; o
  resultado (sucesso, tempo, pontos de dúvida) é registrado nos artefatos da feature.
- **Idioma**: só pt-BR existe; o seletor mostra apenas essa opção, mas é alimentado pelas
  traduções disponíveis (Princípio VII).
- **Atalhos existentes**: as teclas atuais do jogo (1–6, H, M, C, J, [ ], N, S, D, Espaço, + -,
  F, A, I, Enter, ?, Esc) são mantidas; só se adicionam globais e se resolvem conflitos.
- **Desempenho**: os limites concretos (ex.: rodada e virada em saves de 30 temporadas, medidos
  no ambiente de teste) são definidos no plano com base em medições atuais.
- **Fora de escopo**: versão desktop (Electron), mobile/UI adaptada, traduções adicionais, itch.io, Steam,
  contas de usuário, sincronização entre dispositivos e qualquer serviço online.
