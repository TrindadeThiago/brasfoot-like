# 032 — Telas estreitas, acessibilidade e fechamento do marco

Marco 10 — Nova interface

`/speckit-specify`

```text
Fechamento da refatoração visual: adaptação a telas menores, revisão de acessibilidade e de desempenho de toda a interface nova, e atualização do que mostra o jogo por fora (ver docs/interface-nova.md §6 e §7; docs/design.md §1 e §13, marco M10).

Objetivo: a interface nova está pronta para publicar: funciona de tablet a monitor grande, nos dois temas, sem perder função, sem regressão de desempenho e com a vitrine do jogo atualizada.

Histórias de usuário:
- Como jogador em um tablet ou em uma janela estreita, quero jogar sem rolar a página para os lados.
- Como jogador com baixa visão, que usa leitor de tela ou só o teclado, quero que o jogo continue tão acessível quanto na 016, nos dois temas.
- Como visitante da página do jogo, quero ver capturas que mostrem a interface de verdade.

Escopo:
- Adaptação: todas as telas, do menu à rodada ao vivo, usáveis de 768 px de largura em diante sem rolagem horizontal da página; abaixo disso a barra lateral empilha e as colunas viram uma só, sem perder função (a versão dedicada ao telefone continua pós-lançamento, docs/design.md §14).
- Acessibilidade: nova revisão com o mesmo critério da 016, para o tema claro e o escuro: contraste mínimo de texto e de componentes, foco visível, ordem de tabulação, nomes acessíveis, regiões e títulos, anúncios de eventos ao vivo, respeito a "reduzir movimento".
- Desempenho: revisão de abertura, navegação e tabelas longas com a lista de metas da 020 como teto; nada na interface pode aumentar o tempo da virada de temporada nem o tamanho do save.
- Consistência: revisão cruzada das telas contra docs/interface-nova.md (tokens usados em vez de valores soltos, componentes compartilhados em vez de cópias) e remoção do estilo antigo que não é mais usado.
- Dicas de primeiro acesso, ajuda de atalhos e aviso de atualização revisados com os elementos novos.
- Vitrine: capturas da página Sobre e da página do jogo regeneradas (pnpm screenshots) com a interface nova e o tema escuro, e os ícones do aplicativo revistos; documentação do projeto atualizada (design.md, README).
- Lançamento oficial (docs/interface-nova.md §6): a nota do 1.0.0, que as features anteriores foram enriquecendo, é revisada e passa a resumir o marco inteiro: o que mudou na interface e que o jogo e os saves seguem os mesmos. O lançamento é um PR de `release/v1.0.0` para a `main`, com merge commit para preservar o histórico das features; o workflow de release cria a tag `v1.0.0` (as tags antigas são `beta-vX.Y.Z`, então não há colisão) e o Release do GitHub como lançamento, não pré-lançamento.
- Antes de abrir esse PR, os gates do release (simulações de 30 temporadas, `check-release` e e2e completo) rodam sobre a branch, e o que falhar é corrigido nela; a `main` continua congelada até o PR, sem releases no meio do marco.
- Documentação do projeto com a versão nova: o estado do marco 10 em docs/design.md e o que mais citar a numeração antiga. As branches de feature já mescladas podem ser apagadas.

Requisitos:
- Nenhuma mudança no motor, nas regras, no formato de save ou nos dados (constituição, princípios I e VI).
- O pacote continua funcionando offline após o primeiro carregamento (princípio VIII).
- Todo texto novo ou alterado passa pelo i18n (princípio VII).

Fora de escopo: versão para telefone, novas funções de jogo, novos idiomas, redesenho do ícone e da identidade do jogo além do que a nova interface pedir.

Critérios de aceite:
- Percorrer o jogo em 1 440, 1 024 e 768 px de largura, nos dois temas, sem rolagem horizontal da página, sem texto cortado e sem perda de função.
- A revisão de acessibilidade não encontra contraste abaixo do mínimo, foco invisível nem elemento sem nome acessível, e todos os fluxos principais (nova carreira, rodada ao vivo, mercado, diretoria) funcionam só com o teclado.
- Os testes de ponta a ponta, de simulação e de balanceamento passam sem alterar nenhuma faixa numérica; o tamanho do pacote e o tempo de abertura ficam dentro do que o plano definir.
- As capturas da página Sobre mostram a interface nova.
- Os gates do release passam na branch antes do PR final; o merge na `main` publica a versão 1.0.0 (tag `v1.0.0` e Release do GitHub criados pelo workflow), e o jogo, a página Sobre e a página de notas mostram "versão 1.0.0", com as notas da fase beta acessíveis na seção recolhida.
```
