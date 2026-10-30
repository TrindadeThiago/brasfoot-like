# Pesquisa: Telas de entrada e configuração

Verificação do código que a 031 consome. Nenhum item ficou como "NEEDS CLARIFICATION".

## R1 — Estrutura comum das telas de fora

- **Verificação**: cada tela tem `<main>` próprio e CSS Module próprio (`page.module.css`), com cartões feitos à mão; não há barra lateral.
- **Decisão**: um invólucro `EntryShell` (cabeçalho com o link Voltar, título `h1` e área de conteúdo com largura máxima), usado pelas seis telas internas; o menu inicial tem o seu próprio layout. Os cartões passam a ser `Card` e os avisos `Notice`.
- **Racional**: uma largura, um espaçamento e um foco inicial iguais em todas as telas; remove CSS repetido.
- **Alternativas**: reaproveitar o `FocusScreen` da 030 (feito para a rodada, com saída guardada; não serve aqui).

## R2 — Menu inicial

- **Verificação**: `app/page.tsx` já mostra "Continuar" (carreira recente, com técnico, clube e rodada), Nova carreira, Carreiras salvas, Mods, e o rodapé com Configurações, Sobre, Atalhos e a versão; tem o aviso de novidades (`lastSeenVersion`), o de armazenamento e a dica de primeiro acesso. Falta a quantidade de carreiras.
- **Decisão**: manter todo o comportamento; acrescentar a quantidade (`saves.count`, plural) ao lado de Carreiras salvas, a partir da lista que a página já lê; desenhar a chamada principal e as ações como cartões de ação; o aviso de novidades e o de armazenamento viram `Notice`.
- **Racional**: paridade (FR-002) e o pedido da quantidade (FR-001). "Continuar" já existe, então fica; não se cria ação nova.

## R3 — Validação da Nova carreira

- **Verificação**: um único `error` (string) no rodapé com `role="alert"`; o nome inválido vira `save.invalid_name`, sem clube vira `newCareer.noClub`, e os erros do `createCareer` vão por `t(result.error.code, params)`. A seed é um campo livre dentro de `details`, sem validação própria na tela.
- **Decisão**: `validateNewCareerForm({managerName, clubId})` devolve `{ field, code, params }[]` na ordem da tela (nome, clube). A tela mostra cada erro no seu `Field` (`aria-describedby`, `aria-invalid`, `role="alert"`), abre o `details` da seed só se um erro de criação for ligado a ela, e move o foco ao primeiro campo com erro. Os códigos e textos de hoje são os mesmos. O erro de clube (sem clube escolhido) fica ligado à tabela (`aria-describedby` na tabela e foco nela). Erros que vêm do `createCareer` (banco inválido, falha ao salvar) continuam num `Notice` de erro acima do botão.
- **Racional**: cumpre FR-007 e SC-005 sem mudar nenhuma regra; a função pura é testável sem React.
- **Alternativas**: validar a cada tecla (barulho; o pedido é erro ao tentar começar, com o foco no primeiro).

## R4 — Seed

- **Verificação**: a seed é texto livre em `details`; `createCareer` aceita qualquer texto e o mundo padrão deriva dela (`worldSeed`).
- **Verificação adicional**: `SaveErrorCode` só tem `save.invalid_name`, `save.invalid_bank` e `save.club_not_in_league`; não existe formato de seed inválido.
- **Decisão**: manter texto livre, sem validação própria na tela (nenhuma regra nova); a seed não entra na lista de erros por campo. Se um erro de criação vier a ser ligado a ela, as opções avançadas se abrem para mostrá-lo; hoje nenhum vem, e um teste registra que qualquer texto de seed é aceito.
- **Racional**: o pedido não cria regra de seed (fora de escopo: novas opções de jogo).

## R5 — Lista de clubes: busca, contagem e escolha

- **Verificação**: a busca e a contagem (`newCareer.results`, `role="status"`) só aparecem com vários países (`manyCountries`); a escolha é por clique na linha (`onRowClick`), sem alvo de teclado; o mundo padrão é gerado no cliente com `useDeferredValue`.
- **Decisão**: busca (nome ou cidade, sem acento) e contagem **sempre** visíveis, qualquer que seja o mundo; o filtro de país continua só em mundos de vários países (paridade). A escolha por teclado já existe no `DataTable` (a linha recebe o foco e Enter ou Espaço escolhem, com `aria-selected`); não se acrescenta botão no nome para não dobrar as paradas de Tab nas 440 linhas. A linha escolhida ganha o selo "Escolhido" em texto, além da borda. Estado vazio (`EmptyState`) com "Limpar filtros" quando nada passa.
- **Racional**: a busca num mundo pequeno é útil e não custa nada; sem alvo de teclado a escolha do clube é inacessível (FR-005).

## R6 — Rodapé fixo com o clube escolhido

- **Verificação**: o rodapé (clube escolhido e botão) é a última coisa do formulário e sai da tela com a rolagem.
- **Decisão**: `position: sticky; bottom: 0` num cartão de rodapé com o clube escolhido (escudo e nome, ou "Nenhum clube escolhido") e o botão Começar carreira / "criando carreira"; o botão fica `aria-busy` e desabilitado só durante a criação. A 768 px o rodapé empilha o texto e o botão.
- **Racional**: FR-006 pede o botão sempre visível; `sticky` não tira o rodapé do fluxo nem exige altura fixa.

## R7 — Desempenho da criação e do filtro

- **Verificação**: `test/flows/performance.test.tsx` e `world.test.tsx` já medem mundos grandes; a criação passa por `createCareer` e a geração do mundo padrão é feita antes (com `useDeferredValue`).
- **Decisão**: medir na linha de base (T001) a criação com 440 clubes (`createCareer` no Vitest, mediana de 5) e o filtro (`filterClubs` com a busca sobre 440 linhas), e repetir no fim. O `DataTable` já pagina (`pageSize`), então a renderização não cresce com o mundo. Nada é otimizado de antemão; se a medida passar de 0,5 s ou 200 ms, a otimização entra como tarefa.
- **Racional**: o custo vem do motor, que não muda; o que a feature pode piorar é a renderização, e a tabela paginada a limita.

## R8 — Carreiras salvas

- **Verificação**: a lista mostra escudo, técnico · clube, progresso (`saves.progress`/`saves.seasonOver`), data (`saves.savedAt`), versão futura e corrupta; Continuar (link), Exportar, Apagar (diálogo com técnico e clube); Importar por arquivo; conflito de id num diálogo (substituir/copiar/cancelar); `saves.empty` é um parágrafo.
- **Decisão**: cada carreira vira um `SaveCard` (clube, técnico, divisão, temporada, rodada e data; a carreira corrompida ou de versão futura leva `Badge` com texto e não oferece Continuar, como hoje). `saves-view.ts` monta os rótulos e a quantidade. O estado vazio é um `EmptyState` com Nova carreira e Importar carreira. O diálogo de apagar passa o foco inicial ao Cancelar (FR-017) e cita a carreira por técnico e clube. O diálogo de conflito de id ganha o mesmo foco inicial no Cancelar.
- **Racional**: paridade e FR-009, FR-010, FR-017, FR-018.

## R9 — Configurações

- **Verificação**: seções rodada (velocidade, pausa automática), aparência (tema e idioma), dicas (`settings.tipsReset`) e sobre; tudo grava na hora nas preferências. "Apagar todos os dados" não existe e não vira função.
- **Decisão**: cada seção é um `Card` com `h2`; os campos usam `Field`; "Mostrar as dicas de novo" age na hora e informa o resultado num `role="status"` (a ação não é destrutiva e o teste de hoje já a cobre); o botão Voltar continua voltando pelo histórico. A seção Sobre mostra a versão e os links (Sobre, Notas de versão, Atalhos).
- **Racional**: FR-012; a confirmação do reset de dicas é o texto de resultado que a spec (US4) pede, sem diálogo: não há nada a desfazer.

## R10 — Mods e planilhas

- **Verificação**: as planilhas ficam no `CsvPanel` dentro de Mods (exportar clubes e jogadores, importar e gerar pacote, baixar e carregar o gerado). Tudo já funciona; o texto de intro e os erros de validação (`ValidationReport`) existem.
- **Decisão**: Mods em cartões: Introdução (com os links da documentação e do exemplo), Mundo padrão, Carregar mod, Mods carregados (`ModCard` com resumo e Remover, estado vazio desenhado), Planilhas. Os diálogos de substituir e remover ganham foco inicial no Cancelar. Mensagens e relatório de validação aparecem em `Notice` (erro, aviso, sucesso) perto do campo de arquivo. "Ativar e desativar" não existe e não entra.
- **Racional**: FR-013, FR-017, FR-018, FR-019.

## R11 — Sobre e capturas de tela

- **Verificação**: a página usa `/screenshots/{home,round,table,market,career}.png`, geradas por `pnpm screenshots`; elas mostram a interface antiga.
- **Decisão**: regenerar as cinco capturas com a interface nova no fim da feature (tarefa própria, depois das outras telas prontas), sem mudar o nome dos arquivos nem o texto alternativo. A estrutura da página muda para seções em `Card`; o conteúdo (apresentação, "O que dá para fazer", aviso de nomes reais, gratuito, privacidade e como levar carreiras a outro navegador) continua.
- **Racional**: capturas velhas no Sobre confundem quem chega; os arquivos já são versionados no repositório.

## R12 — Notas de versão, ajuda de atalhos e aviso de atualização

- **Verificação**: `notas-de-versao/page.tsx` já lista `releaseNotes` e a seção `details` "Fase beta" (`betaReleaseNotes`), e marca a versão como vista ao abrir (`lastSeenVersion`). `ShortcutsHelp` é um `Dialog` com grupos; `UpdateNotice` é uma região `role="status"` própria, escondida na rodada ao vivo.
- **Decisão**: cada versão vira um `details` (a atual aberta, as outras recolhidas), com data e o rótulo "beta" nas versões da fase beta; as versões ainda não vistas ficam marcadas com o texto "Nova" (versão maior que a `lastSeenVersion` lida **antes** de a tela gravar a atual como vista; a leitura fica no estado inicial, então a marca dura toda a visita); a seção "Fase beta" continua recolhida no fim, com a frase explicativa. `ShortcutsHelp` mantém o `Dialog` e ganha os grupos em `Card`s. `UpdateNotice` passa a usar `Notice` (info) com o botão Recarregar, com o mesmo comportamento: nunca na rodada ao vivo.
- **Racional**: FR-015 e FR-016; nada de comportamento muda.

## R13 — Teste de usabilidade e nota do 1.0.0

- **Decisão**: o teste de usabilidade (SC-001) é manual, com roteiro em `quickstart.md`; o resultado é anotado em `baseline.md` e no PR. A nota do 1.0.0 (`release-notes.json`) ganha um item "telas de entrada e configuração"; a versão em `app-info` não muda.
- **Racional**: FR-021 e `docs/interface-nova.md` §6; o teste depende de uma pessoa que nunca viu o jogo, então não é automatizável.
