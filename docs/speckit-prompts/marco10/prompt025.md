# 025 — Fundação visual e estrutura do jogo

Marco 10 — Nova interface

`/speckit-specify`

```text
Base da nova interface: linguagem visual, tema claro e escuro, componentes compartilhados e a estrutura de navegação do jogo (ver docs/interface-nova.md §2 e §3, e docs/design.md §1 e §2).

Objetivo: o jogo ganha uma identidade visual moderna e consistente, com uma barra lateral de navegação, e todas as telas passam a usar os mesmos componentes. Esta feature entrega a fundação e a estrutura; as telas são refeitas nas próximas features, e até lá continuam funcionando.

Histórias de usuário:
- Como jogador, quero um visual limpo e consistente, com títulos e números fáceis de ler, em todas as telas.
- Como jogador, quero chegar a qualquer tela do clube de uma barra lateral que mostre onde estou e avise o que pede atenção (propostas de emprego, negociações do mercado).
- Como jogador, quero escolher entre tema escuro e claro e ter os dois com a mesma qualidade.
- Como jogador que usa só o teclado, quero que tudo continue acessível com foco visível, e que os atalhos de navegação continuem os mesmos.

Escopo:
- Tokens de design (cores, tipografia, espaçamento, raio, estados) para os dois temas, a partir de docs/interface-nova.md §2. O destaque de cor é um parâmetro do tema.
- Tema claro desenhado e validado, com o mesmo contraste mínimo do escuro (a revisão de acessibilidade da 016 vale para os dois).
- Fontes (Space Grotesk e Inter) distribuídas com o jogo, sem pedir nada à rede.
- Componentes base: botões (primário, secundário, perigo, só texto), cartão, abas, tabela com rolagem própria, selo, barra de indicador (condição, força, confiança), campos e seletores, diálogo, aviso (informação, atenção, perigo), estado vazio e rótulo de seção.
- Estrutura do jogo: barra lateral com as dez telas do clube, ícones, contadores e rodapé com Menu inicial, Configurações e Atalhos; título da tela com clube, técnico, série, temporada e rodada; telas de foco sem a barra.
- Os atalhos de teclado (016), a trava de saída com alterações pendentes e o comportamento de clube desempregado (012) continuam como estão.
- A nova estrutura envolve as telas atuais sem exigir que elas já estejam refeitas: elas herdam tokens e fontes e ficam coerentes com o novo cabeçalho.
- Reinício da numeração de versões (docs/interface-nova.md §6): as versões 1.0.0 a 1.10.0 passam a ser a fase beta. A versão do jogo no `package.json` vai para **1.0.0** já nesta feature e fica assim até o lançamento; as 23 notas da fase beta saem de `release-notes.json` para um arquivo próprio (`release-notes-beta.json`), sem perder nenhuma, e `release-notes.json` recomeça com uma única nota do 1.0.0, que as próximas features enriquecem. A página de notas de versão mostra a nota do 1.0.0 e, no fim, uma seção recolhida "Fase beta" com as notas antigas rotuladas "beta 1.10.0" e assim por diante; o redesenho dessa página fica para a 031. As tags e os Releases `beta-vX.Y.Z` já existem; o `check-release` e o workflow de release seguem funcionando e não confundem uma nota beta com a da versão atual.

Requisitos:
- Nenhuma mudança no motor, nas regras, no formato de save ou nos dados (constituição, princípios I e VI).
- Todo texto novo passa pelo sistema de i18n, em frases completas (constituição, princípio VII).
- O jogo continua funcionando sem conexão: nada de fontes ou ícones carregados de CDN (princípio VIII).
- Preferência de tema continua salva como hoje; o tema "sistema" é respeitado.
- A estrutura funciona de 768 px de largura em diante sem rolagem horizontal da página; abaixo disso a barra lateral empilha acima do conteúdo.

Fora de escopo: refazer o conteúdo das telas (026 a 031), versão para telefone, novas funções de jogo, ilustrações e escudos.

Critérios de aceite:
- Todas as telas atuais abrem na nova estrutura, nos dois temas, sem texto cortado nem contraste abaixo do mínimo da 016.
- A navegação por teclado alcança a barra lateral, os atalhos de teclado continuam funcionando e o foco é sempre visível.
- O teste de ponta a ponta atual (criar carreira e jogar uma rodada) continua passando.
- O tamanho do pacote publicado não cresce além do que o plano justificar, e o jogo continua abrindo offline.
- Esta feature é a primeira do marco e abre a branch de trabalho: o PR tem como base `release/v1.0.0` (cortada da `main` depois do PR de documentação), e o merge não publica nada, porque o release só dispara na `main`. O jogo na branch mostra "versão 1.0.0" no menu inicial e na página Sobre, a página de notas mostra a nota do 1.0.0 e a seção recolhida da fase beta com as 23 notas, e os testes que dependem das notas continuam passando.
```
