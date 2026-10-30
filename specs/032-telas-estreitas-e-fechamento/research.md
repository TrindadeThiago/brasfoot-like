# Pesquisa: Telas estreitas, acessibilidade e fechamento do marco

Verificação do código, dos scripts e dos documentos que a 032 consome. Nenhum item ficou como "NEEDS CLARIFICATION".

## R1 — Adaptação a telas estreitas: o que já existe

- **Verificação**: a barra lateral muda de lugar em `@media (min-width: 768px)` (`ui/shell/Sidebar.module.css`); há seis outras consultas de largura espalhadas (`max-width: 768px`, `1024px`, `1199px`, `767px`). `e2e/layout.spec.ts` confere rolagem horizontal das telas de fora e do clube em 1 440, 1 280, 1 024 e 768 px e, a 600 px, só o Elenco. A rodada ao vivo é conferida a 768 px. Não há conferência de todas as telas e diálogos abaixo de 768 px nem com zoom.
- **Decisão**: um e2e novo (`responsive.spec.ts`) percorre a lista completa de telas, abas e diálogos nas larguras 1 440, 1 024, 768 e 600 px e com zoom de 200% (janela de 1 280 px a 200% = 640 px de largura útil), nos dois temas, conferindo (a) sem rolagem horizontal da página, (b) sem texto cortado (a verificação de `layout.spec.ts`), (c) as ações principais de cada tela visíveis e acionáveis. As correções vêm de CSS: quebra de colunas, tabelas com rolagem própria, nomes com `overflow-wrap`.
- **Racional**: a estrutura já cobre o caminho principal; falta provar para todas as telas e achar o que quebra. Abaixo de 768 px o requisito é "usável" (barra empilha, uma coluna), não "bonito".
- **Alternativas**: reescrever o layout com `container queries` (mudança grande sem ganho para o requisito); testar só por captura visual (não detecta rolagem).

## R2 — Tabelas largas e nomes longos

- **Verificação**: `DataTable` envolve a tabela num contêiner `scroll` e tem `stickyFirst` para tabelas largas (027); `ClubPicker`, Elenco, Mercado e Classificação o usam.
- **Decisão**: manter `DataTable` como único caminho de tabela; no e2e, conferir que a rolagem horizontal fica no contêiner da tabela (a página não rola) e que a primeira coluna fixa continua legível. Nomes longos: `overflow-wrap: anywhere` nas células e nos cartões, com o texto completo no `title` ou no nome acessível quando houver reticências.
- **Racional**: reaproveita o que as features 027 a 031 fizeram e o que o e2e já mede.

## R3 — Acessibilidade: ferramentas da 016 e lacunas

- **Verificação**: `e2e/a11y.spec.ts` roda o axe (wcag2a, wcag2aa, wcag21a, wcag21aa; falha com `serious` ou `critical`) nas telas de fora e nas dez do clube, nos dois temas, e em modais, comparação, abas de Finanças e Carreira, ajuda, rodada pausada, diálogos de saída, apagar e erros da Nova carreira (031). `test/ui/contrast.test.ts` calcula os pares de cor dos tokens nos dois temas. `e2e/keyboard.spec.ts` percorre os fluxos principais e confere o foco visível a cada parada. `global.css` já tem `@media (prefers-reduced-motion: reduce)`.
- **Decisão**: ampliar, não refazer. (a) `a11y.spec.ts`: acrescentar o fim de temporada, os diálogos de Mods (substituir, remover), a ajuda aberta a partir de cada tela e a Nova carreira com mundo grande. (b) `contrast.test.ts`: acrescentar os pares dos componentes novos (selos, avisos nos três tons, estados desabilitados, bordas de campos, medidores, texto sobre o destaque). (c) um teste de títulos: um `h1` por tela e níveis sem salto. (d) `keyboard.spec.ts`: acrescentar a verificação da ordem de tabulação (a ordem do DOM segue a ordem visual nas telas de duas colunas) e os fluxos de nova carreira e diretoria só com o teclado. (e) `reduced-motion.spec.ts`: com `reducedMotion: "reduce"`, nenhuma animação ou transição passa de ~0 ms nas telas que animam (barra de andamento, diálogos, abas, medidores).
- **Racional**: o critério é o da 016; a interface nova trocou os componentes, então cada componente novo precisa estar numa varredura.

## R4 — Anúncios de eventos ao vivo e nomes acessíveis

- **Verificação**: a 030 já testa os anúncios (`live-announce.test.tsx`: todos os lances do meu jogo, em ordem, sem repetir e sem os de outros jogos). O axe cobre nomes de botões, links, campos e regiões.
- **Decisão**: manter esses testes como estão e conferir que continuam verdes no gate; sem mudança de comportamento. Acrescentar ao teste de títulos a verificação de que toda região (`section` com nome) tem nome único na tela.
- **Racional**: não há regressão conhecida; a revisão confirma.

## R5 — Desempenho: metas, linhas de base e o que medir

- **Verificação**: `SCALE_LIMITS` (020) define dia 600 ms, virada 6 000 ms, heap 1 GiB, save de 12,5 MB no início da 31ª e 42 MB na última rodada, export de 6 MB; `pnpm sim:world --scale` e os testes `football-world-scale.test.ts` o leem. Cada feature registrou em `baseline.md` o tamanho de `out`, a abertura das suas telas e (028 a 031) tempos específicos. A interface não toca o motor, então a virada e o save só poderiam mudar por erro; o custo novo da interface está na abertura, na navegação e nas tabelas.
- **Decisão**: (a) rodar `pnpm sim:world --seasons 30`, `pnpm sim:economy --seasons 30` e `pnpm sim:world --scale --countries 3 --seasons 30 --qualification` na branch e comparar com `SCALE_LIMITS` e com a linha de base da 025 (antes de qualquer tela nova); (b) medir a abertura de todas as telas (as do clube, as de fora, a rodada ao vivo e o fim de temporada) e a navegação entre as dez telas do clube, com mediana de 5, contra a linha de base de cada feature (tolerância de 10%); (c) medir uma tabela longa (440 clubes na Nova carreira, elenco de 30, classificação de 20 e mercado com mundo grande) para ordenar e filtrar abaixo de 200 ms; (d) registrar tudo em `baseline.md` da 032 com a comparação.
- **Racional**: o limite é o da 020 e as tolerâncias são as que as features anteriores já usaram.

## R6 — Tamanho do pacote e offline

- **Verificação**: `apps/web/out` mediu 4,2 MB na 030 e 3,8 MB na 031 (JS de 1,79 a 1,83 MB, CSS de 67 a 74 KB, precache de 179 a 182 arquivos); `e2e/offline.spec.ts` confere o uso sem rede depois do primeiro carregamento.
- **Decisão**: limite do pacote = **4,5 MB** no total de `out` e **2,0 MB** de JS (hoje 3,8 MB e 1,83 MB, com folga de cerca de 15% e 9%); o e2e offline continua verde. Se passar, a causa (fonte, imagem, JS) é tratada na própria 032.
- **Racional**: o prompt delega o número ao plano; este é um teto que a interface atual cumpre e que pega crescimento descuidado.
- **Alternativas**: sem limite (não detecta regressão); limite igual ao atual (frágil a variação do build).

## R7 — Consistência com `docs/interface-nova.md` e estilo antigo

- **Verificação**: `styles/tokens.css` define os tokens (cores, espaços, raios, tipografia); os `*.module.css` os usam por `var(--…)`. Uma busca rápida não achou cor hexadecimal fora de `styles/` nos módulos, mas nada impede que apareça. Não há conferência automática de CSS sem uso (classes que nenhum componente referencia).
- **Decisão**: um teste de auditoria (`style-audit.test.ts`) lê todos os `*.module.css` e falha com: cor literal (`#…`, `rgb(`, `hsl(`) fora de `styles/tokens.css`, `px` de espaçamento ou de fonte que deveria ser token (lista curta de exceções justificadas), `!important` fora da regra de movimento reduzido, e classe declarada que nenhum `.tsx` do mesmo módulo usa. O resultado vira uma lista corrigida na própria feature (valores soltos viram token; classes mortas saem). A revisão cruzada de componentes (cópias de Card, aviso, selo, campo, diálogo) é por busca: tela que monta `section` com a aparência de cartão à mão passa a usar `Card`.
- **Racional**: transforma a "revisão cruzada" num teste que continua valendo depois do marco.

## R8 — Dicas, ajuda de atalhos e aviso de atualização

- **Verificação**: `ui/tips/catalog.ts` lista as dicas por tela, com `anchor` (valor de `data-tip-anchor`); há 11 âncoras no código. `TipHost` procura o elemento por seletor e posiciona a dica junto dele. A ajuda de atalhos é gerada de `SHORTCUTS`; o aviso de atualização usa `Notice` (031).
- **Decisão**: `tips-anchors.test.tsx` renderiza cada tela e confere que a âncora de cada dica existe; o e2e `responsive.spec.ts` confere que, a 768 px e abaixo, a dica não cobre o controle que ela explica nem sai da janela. A ajuda é conferida contra o registro (cada atalho listado existe na tela). O aviso de atualização, fixo no canto, passa a ficar acima do conteúdo (empilhado) em telas estreitas para não cobrir controles.
- **Racional**: as dicas foram escritas antes das telas novas; este teste pega âncora quebrada.

## R9 — Vitrine: capturas, ícones e documentação

- **Verificação**: `tools/src/screenshots.ts` (pnpm screenshots) já gera as capturas (`home`, `table`, `market`, `career`, `round`) no tema escuro e os ícones de 192 e 512 px a partir de `icon.svg`; a 031 as regenerou, mas as telas ainda mudaram nas features seguintes à captura de cada uma (a 031 foi a última). O README mostra `home.png`. `check-release` exige no mínimo 4 capturas e proíbe "brasfoot" no HTML visível.
- **Decisão**: regenerar as capturas no fim, depois de todas as correções, no tema escuro e a 1 280 × 800 (como hoje); conferir cada imagem a olho e o texto alternativo; revisar os ícones (legibilidade em fundo claro e escuro e no tamanho de 192 px, sem redesenhar); atualizar o README (capturas, a seção de lançamento e a frase da fase beta) e `docs/design.md` (§13 estado do M10 como concluído, as menções "desde a 1.10" e a numeração). A "página do jogo" é a vitrine pública (README e site).
- **Racional**: é o último passo antes dos gates, para a vitrine refletir o estado final.

## R10 — Nota do 1.0.0

- **Verificação**: `release-notes.json` tem uma nota (1.0.0, 2026-10-28) com sete itens, um por "parte" da interface (da primeira à sétima), longos e técnicos.
- **Decisão**: reescrever a nota como um resumo do marco: (1) o que mudou na interface em poucas frases (visual novo e tema claro, barra lateral, telas refeitas, rodada ao vivo, entrada e configuração, telas estreitas e acessibilidade); (2) o que não mudou (o jogo, as regras e os saves); (3) a numeração (a fase beta de 1.0.0 a 1.10.0 e o 1.0.0 oficial). Mantém a data de publicação no momento do lançamento. O detalhe por parte fica nos PRs e nas specs. A página de notas e os testes que contam itens são ajustados.
- **Racional**: o prompt pede um resumo, não uma lista de oito partes.

## R11 — Gates do release e o PR final

- **Verificação**: `release.yml` roda, em paralelo, `checks` (typecheck e lint), `unit` (4 partes), `simulations` (`sim:world --seasons 30`, `sim:economy --seasons 30`, `sim:world --scale --countries 3 --seasons 30 --qualification`) e `e2e` (`build:web`, `check-release`, `test:e2e`), e só então publica na Vercel e cria a tag e o Release (`gh release create "v$VERSION"`). Só dispara no push na `main` e só publica se a tag `vX.Y.Z` não existe. As tags da fase beta são `beta-vX.Y.Z`.
- **Decisão**: rodar os mesmos gates localmente sobre a `release/v1.0.0` (atualizada com a 032): `pnpm typecheck`, `pnpm lint`, `pnpm test`, as três simulações, `pnpm build:web`, `pnpm check-release` e `pnpm test:e2e`; as simulações são longas (~15 minutos cada, em segundo plano). Corrigir na branch o que falhar. O PR de `release/v1.0.0` para a `main` (merge commit) só é aberto sob pedido explícito, depois dos gates verdes, e o CI do PR roda `checks`, `unit` e `e2e`; o merge dispara o workflow de release.
- **Racional**: é o contrato do prompt; o que é externo (PR para a `main`, publicação) fica atrás de confirmação.
- **Alternativas**: abrir o PR antes e deixar o CI achar os problemas (publicaria com `main` pronta para disparar o release com gates ainda não vistos).

## R12 — Verificação antes do lançamento e limpeza

- **Verificação**: a tag `v1.0.0` não existe (as de beta foram renomeadas para `beta-v…`); `package.json` está em 1.0.0 desde a 025. As branches 025 a 031 já foram mescladas na `release/v1.0.0`.
- **Decisão**: antes do PR, conferir `git tag -l 'v1.0.0'` (vazio), `gh release list` (sem `v1.0.0`) e que a `main` não recebeu commits novos (ou, se recebeu, mesclá-la na branch). Depois do lançamento, apagar as branches de feature já mescladas (locais e remotas) e a `release/v1.0.0` só se a pessoa pedir.
- **Racional**: o workflow só publica se a tag está livre e a `main` congelada; conferir é barato.
