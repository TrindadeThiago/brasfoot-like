# Feature Specification: Saves portáteis e formato de mod

**Feature Branch**: `015-saves-portateis-mods`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Exportar/importar saves e abrir o formato de banco de dados para a comunidade (ver docs/design.md §11 e §12) — prompt `docs/speckit-prompts/marco6/prompt015.md`."

## Contexto

Primeira feature do Marco 6 (Lançamento). Hoje as carreiras vivem só no armazenamento do navegador:
limpar os dados do site ou trocar de computador perde tudo. O banco de dados do jogo já usa um
formato aberto (o banco fictício padrão é "o primeiro mod"), com validação e mensagens de erro, mas
não há como o jogador usar outro banco, nem documentação pública, nem caminho prático para editar
jogadores e clubes numa planilha, nem escudos em imagem. Esta feature torna os saves portáteis
(exportar e importar um arquivo) e abre o formato do banco para a comunidade: carregar pacotes de
terceiros ao criar uma carreira, com erros claros; exportar e importar jogadores e clubes em CSV;
escudos como imagens; e uma documentação do formato com exemplos — incluindo um mod de exemplo com
outro país fictício. O jogo continua sem distribuir nenhum conteúdo real; nomes reais, se houver,
vêm de mods da comunidade. Editor embutido e repositório online ficam fora.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exportar e importar o save (Priority: P1)

O jogador baixa um arquivo com uma carreira e depois o carrega, no mesmo ou em outro navegador ou
computador, continuando exatamente de onde parou.

**Why this priority**: evita perder carreiras longas (o centro do jogo) e é o primeiro critério de
aceite.

**Independent Test**: exportar uma carreira no meio da temporada, apagá-la, importar o arquivo e
conferir que o estado é idêntico e que a carreira continua jogável.

**Acceptance Scenarios**:

1. **Given** uma carreira salva, **When** o jogador escolhe "Exportar", **Then** baixa um arquivo
   compactado com o nome da carreira e a data.
2. **Given** um arquivo exportado, **When** o jogador o importa na lista de carreiras, **Then** a
   carreira aparece na lista e, ao abrir, o estado é idêntico ao exportado (mesma rodada, elenco,
   finanças, histórico, manchetes).
3. **Given** um arquivo de uma versão antiga do jogo, **When** é importado, **Then** passa pelas
   migrações e abre na versão atual.
4. **Given** um arquivo corrompido, que não é um save ou de uma versão futura do jogo, **When** é
   importado, **Then** é rejeitado com uma mensagem clara e nada é alterado na lista de carreiras.
5. **Given** que já existe uma carreira com a mesma identificação, **When** o jogador importa o
   arquivo, **Then** escolhe entre substituir a existente ou importar como cópia.

---

### User Story 2 - Carregar um mod de terceiros ao criar uma carreira (Priority: P1)

O jogador (ou modder) carrega um pacote de banco de dados — dados e imagens — e cria uma carreira
com ele; se o pacote tiver problemas, vê a lista de erros com arquivo, item e campo.

**Why this priority**: abre o jogo para a comunidade e é o segundo critério de aceite.

**Independent Test**: carregar o mod de exemplo (outro país fictício), criar uma carreira com ele e
jogar rodadas; carregar um pacote com defeitos e conferir os erros.

**Acceptance Scenarios**:

1. **Given** um pacote de mod válido, **When** o jogador o carrega, **Then** o jogo mostra nome,
   autor, versão, país, divisões e número de clubes e jogadores, e o mod fica disponível para novas
   carreiras.
2. **Given** um mod carregado, **When** o jogador cria uma carreira escolhendo esse mod, **Then** a
   lista de clubes é a do mod e a carreira é jogável como a do banco padrão.
3. **Given** um pacote com problemas (arquivo faltando, JSON inválido, campo fora da faixa, clube
   inexistente), **When** é carregado, **Then** é recusado com a lista de erros, cada um com o
   arquivo, o item e o campo, em português.
4. **Given** um pacote acima do tamanho máximo, ou com imagem acima do limite ou em formato não
   aceito, **When** é carregado, **Then** é recusado com mensagem clara.
5. **Given** carreiras criadas com um mod, **When** o mod é removido ou substituído por outra
   versão, **Then** essas carreiras continuam abrindo e jogando normalmente.
6. **Given** os mods carregados, **When** o jogador abre a tela de mods, **Then** vê a lista e pode
   remover um mod.

---

### User Story 3 - Documentação do formato e mod de exemplo (Priority: P1)

O modder encontra uma documentação do formato do banco — arquivos, campos, tipos, faixas válidas,
regras entre arquivos, mensagens de erro e exemplos — e um mod de exemplo completo com outro país
fictício para usar como ponto de partida.

**Why this priority**: sem documentação o formato não é de fato aberto; é o terceiro critério de
aceite.

**Independent Test**: uma pessoa que não leu o código cria um banco pequeno válido seguindo só a
documentação, e o jogo o aceita.

**Acceptance Scenarios**:

1. **Given** a documentação, **When** o modder a consulta, **Then** encontra cada arquivo do pacote,
   cada campo com tipo, obrigatoriedade, faixa válida e exemplo, as regras entre arquivos (ex.:
   tamanho de elenco, vagas de acesso e rebaixamento) e as seções opcionais (economia, mercado,
   diretoria, torcida, manchetes, rivalidades).
2. **Given** o mod de exemplo, **When** é carregado sem alterações, **Then** é válido e cria uma
   carreira jogável, com país, competição, clubes e jogadores diferentes do banco padrão.
3. **Given** a documentação e o jogo, **When** são comparados, **Then** toda regra que o jogo valida
   está descrita na documentação (a lista de mensagens de erro da documentação cobre todos os
   códigos de erro do jogo).

---

### User Story 4 - Jogadores e clubes em CSV (Priority: P2)

O modder exporta os jogadores e os clubes de um banco para CSV, edita numa planilha e importa de
volta, gerando um pacote de mod atualizado.

**Why this priority**: torna a edição em massa acessível, mas o formato JSON já permite editar.

**Independent Test**: exportar o banco padrão em CSV, alterar nomes e forças numa planilha,
importar e conferir as mudanças no pacote resultante; importar CSV com erros e conferir as
mensagens com linha e coluna.

**Acceptance Scenarios**:

1. **Given** um mod (ou o banco padrão), **When** o modder exporta os CSVs, **Then** recebe um
   arquivo de jogadores e um de clubes com cabeçalhos documentados, abríveis numa planilha comum.
2. **Given** CSVs editados, **When** são importados sobre um mod, **Then** o jogo gera um pacote de
   mod com os dados atualizados e o valida antes de oferecer o download.
3. **Given** um CSV com erro (coluna faltando, valor inválido, linha com número errado de campos),
   **When** é importado, **Then** é recusado com mensagens que indicam a linha e a coluna.
4. **Given** exportar e importar sem editar, **When** o pacote é gerado, **Then** é equivalente ao
   original.

---

### User Story 5 - Escudos como imagens (Priority: P2)

O modder fornece imagens de escudo para os clubes; o jogo as mostra no lugar do escudo gerado e
usa o escudo gerado quando não há imagem.

**Why this priority**: identidade visual dos mods, mas os escudos gerados já funcionam.

**Independent Test**: carregar um mod com imagens para alguns clubes e conferir que elas aparecem
em todas as telas, e o escudo gerado nos demais.

**Acceptance Scenarios**:

1. **Given** um clube com imagem de escudo no pacote, **When** aparece em qualquer tela, **Then** a
   imagem é mostrada no lugar do escudo gerado, com o nome do clube como texto alternativo.
2. **Given** um clube sem imagem, **When** aparece, **Then** usa o escudo gerado dos dados.
3. **Given** uma referência a imagem que não existe no pacote, **When** o pacote é carregado,
   **Then** é recusado com erro que indica o clube e o arquivo.
4. **Given** uma carreira criada com escudos em imagem, **When** o mod é removido ou o save é
   exportado e importado, **Then** as imagens continuam aparecendo (vão junto com a carreira).

---

### Edge Cases

- Importar o mesmo save duas vezes: a segunda pede para substituir ou importar como cópia.
- Arquivo de save renomeado ou com extensão trocada: o jogo reconhece pelo conteúdo, não pelo nome.
- Save com o banco de um mod que não está carregado: abre normalmente (o banco vai dentro do save).
- Armazenamento do navegador cheio ao importar: mensagem clara, nenhuma carreira parcial criada.
- Pacote de mod com o mesmo identificador de um mod já carregado: pergunta se substitui.
- Pacote com campos desconhecidos: aceito com avisos (como hoje), listados ao carregar.
- Imagem de escudo com dimensões muito grandes: recusada pelo limite; formatos vetoriais com
  conteúdo executável não são aceitos.
- CSV com separador de vírgula ou ponto e vírgula, com ou sem aspas, com acentos (UTF-8, com ou sem
  marca de ordem de bytes): importados corretamente.
- CSV com jogador apontando para clube inexistente: erro com a linha.
- Mod sem a seção de rivalidades ou de regras opcionais: válido, usa os padrões.
- Mod de outro país com uma única divisão: válido se as regras de divisão forem respeitadas.
- O jogo continua sem distribuir nomes reais: o mod de exemplo é fictício.

## Requirements *(mandatory)*

### Functional Requirements

**Saves portáteis**

- **FR-001**: O jogador DEVE poder exportar qualquer carreira salva como um arquivo único,
  compactado, que contém o número da versão do formato do save.
- **FR-002**: O jogador DEVE poder importar um arquivo de save na lista de carreiras; o jogo DEVE
  reconhecer o arquivo pelo conteúdo e aplicar as migrações de versões antigas.
- **FR-003**: Exportar e reimportar uma carreira DEVE produzir um estado idêntico ao exportado.
- **FR-004**: Arquivos corrompidos, que não sejam saves, ou de versão futura DEVEM ser recusados com
  mensagem clara, sem alterar as carreiras existentes e sem travar o jogo.
- **FR-005**: Ao importar um save cuja identificação já existe, o jogador DEVE escolher entre
  substituir a carreira existente ou importar como cópia.

**Mods**

- **FR-006**: O jogador DEVE poder carregar um pacote de mod (dados e imagens num único arquivo
  compactado), que é validado inteiro antes de ser aceito.
- **FR-007**: A validação DEVE listar todos os erros e avisos do pacote em português, cada um com o
  arquivo, o item (índice e identificador) e o campo, sem parar no primeiro.
- **FR-008**: O jogo DEVE impor limites de tamanho: do pacote inteiro, de cada arquivo de dados e de
  cada imagem (tamanho e dimensões), e aceitar só formatos de imagem rasterizados comuns.
- **FR-009**: Mods aceitos DEVEM ficar guardados localmente e disponíveis na criação de carreira, ao
  lado do banco padrão; o jogador DEVE poder ver os detalhes de cada mod e removê-lo.
- **FR-010**: Uma carreira DEVE guardar sua própria cópia do banco, incluindo as imagens; remover ou
  substituir um mod NÃO PODE afetar carreiras já criadas.

**Escudos em imagem**

- **FR-011**: Um clube PODE indicar uma imagem de escudo do pacote; quando indicada, DEVE ser
  mostrada em todas as telas no lugar do escudo gerado, com o nome do clube como texto alternativo.
- **FR-012**: Referência a imagem inexistente no pacote DEVE ser um erro de validação que indica o
  clube e o arquivo.

**CSV**

- **FR-013**: O jogador DEVE poder exportar jogadores e clubes de qualquer banco disponível (padrão
  ou mod) em dois arquivos CSV com cabeçalhos documentados.
- **FR-014**: O jogador DEVE poder importar CSVs de jogadores e/ou clubes sobre um banco existente e
  receber um pacote de mod gerado e validado para baixar ou carregar.
- **FR-015**: Erros de CSV DEVEM indicar a linha e a coluna; o jogo DEVE aceitar vírgula ou ponto e
  vírgula como separador e texto UTF-8 com ou sem marca de ordem de bytes.
- **FR-016**: Exportar e importar CSV sem edição DEVE gerar um pacote equivalente ao original.

**Documentação e exemplo**

- **FR-017**: O projeto DEVE ter uma documentação pública do formato do banco: estrutura do pacote,
  cada arquivo e campo (tipo, obrigatoriedade, faixa, exemplo), regras entre arquivos, seções
  opcionais, formato dos CSVs, limites de tamanho, escudos em imagem e a lista de mensagens de erro.
- **FR-018**: A lista de erros da documentação DEVE cobrir todos os códigos de erro que o jogo valida
  (verificável automaticamente).
- **FR-019**: O projeto DEVE incluir um mod de exemplo completo, com outro país fictício, que seja
  válido e crie uma carreira jogável.

**Restrições**

- **FR-020**: O jogo NÃO PODE distribuir nomes, escudos ou marcas reais; o mod de exemplo é
  fictício.
- **FR-021**: Tudo funciona sem servidor e sem conexão (arquivos lidos e gerados no próprio
  navegador).
- **FR-022**: Todos os textos novos (botões, mensagens, erros de CSV e de pacote) DEVEM passar pelo
  sistema de traduções.

### Key Entities *(include if feature involves data)*

- **Arquivo de save**: carreira inteira compactada, com versão do formato e identificação.
- **Pacote de mod**: arquivo compactado com o manifesto, os arquivos de dados e as imagens.
- **Mod carregado**: pacote aceito, guardado localmente, com nome, autor, versão e resumo.
- **Imagem de escudo**: imagem do pacote referenciada por um clube.
- **CSV de jogadores / de clubes**: tabela editável com cabeçalhos documentados.
- **Relatório de validação**: erros e avisos com arquivo, item, campo (e linha/coluna no CSV).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Exportar e reimportar uma carreira produz um estado idêntico em 100% dos testes (no
  início, no meio e no fim de temporada, e depois de várias temporadas).
- **SC-002**: Saves de todas as versões anteriores publicadas abrem quando importados; 100% dos
  arquivos inválidos de teste são recusados sem alterar as carreiras existentes.
- **SC-003**: O mod de exemplo (outro país fictício) é aceito sem erros e uma carreira com ele joga
  uma temporada inteira e faz a virada.
- **SC-004**: 100% dos códigos de erro de validação aparecem na documentação do formato.
- **SC-005**: Uma pessoa que não conhece o código cria, só com a documentação, um banco mínimo válido
  (1 país, 1 competição, clubes e jogadores) que o jogo aceita na primeira ou segunda tentativa.
- **SC-006**: Exportar o banco padrão em CSV e reimportar sem editar gera um pacote equivalente ao
  original.
- **SC-007**: Exportar ou importar um save de uma carreira de 30 temporadas leva no máximo 5 segundos
  num computador comum.
- **SC-008**: Remover um mod não impede de abrir nem de jogar nenhuma carreira criada com ele.

## Assumptions

- O pacote de mod é um único arquivo compactado com a mesma estrutura de pastas dos mods atuais
  (`mod.json`, `countries.json`, `competitions.json`, `clubs.json`, `players.json`,
  `rivalries.json` opcional) mais uma pasta de imagens.
- Limites padrão (valores finais no plano): pacote até 20 MB, imagem até 200 KB e 512×512 pixels,
  formatos PNG, JPEG e WebP; SVG não é aceito por segurança.
- O arquivo de save tem extensão própria do jogo, mas é reconhecido pelo conteúdo.
- "Estado idêntico" compara a carreira inteira, exceto a data de salvamento (que muda ao importar).
- Os CSVs cobrem os campos de jogadores e clubes; países, competições e regras continuam em JSON.
- Mods carregados ficam no armazenamento local do navegador, como as carreiras; não há sincronização
  entre computadores além de exportar e importar arquivos.
- A documentação fica no repositório e é publicada junto com o jogo (link na tela de mods).
- O mod de exemplo é mantido no repositório e testado automaticamente; é menor que o padrão (ex.:
  uma ou duas divisões com menos clubes), dentro das regras de validação.
- Editor de mods embutido e repositório online de mods ficam fora.
