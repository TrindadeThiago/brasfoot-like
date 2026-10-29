# 031 — Telas de entrada e configuração

Marco 10 — Nova interface

`/speckit-specify`

```text
Refazer as telas de fora da carreira na nova interface: menu inicial, nova carreira, carreiras salvas, configurações, mods, sobre e notas de versão (ver docs/interface-nova.md §3, §4 e §5; docs/design.md §11 e §12).

Objetivo: a primeira impressão do jogo e as telas de preparação ficam claras e acolhedoras, e um jogador novo cria uma carreira sem precisar de explicação.

Histórias de usuário:
- Como jogador novo, quero abrir o jogo e entender logo o que é e por onde começar.
- Como jogador, quero montar uma carreira escolhendo mundo, país, divisão e clube com ajuda para comparar os clubes.
- Como jogador, quero achar, continuar, exportar, importar e apagar minhas carreiras com segurança.
- Como jogador, quero ajustar o jogo em Configurações e ver as dicas de novo quando quiser.
- Como modder, quero carregar mods, baixar o mundo padrão e gerar pacotes por planilha com instruções claras.

Escopo:
- Menu inicial: abertura com a chamada principal e as ações Nova carreira, Carreiras salvas (com a quantidade) e Mods; links para Configurações, Sobre, Atalhos e a versão.
- Nova carreira: nome do técnico; Sem demissão com a explicação e o aviso de que não muda depois; opções avançadas (seed); banco de dados (mundo padrão e mods) com a descrição e o link para Mods; país, divisão, busca por nome ou cidade e a contagem; tabela de clubes com reputação, força média, estádio e divisão para comparar; clube escolhido e botão Começar carreira sempre visíveis, com o estado "criando carreira".
- Carreiras salvas: lista com clube, técnico, divisão, temporada, rodada e data; Continuar, Exportar, Apagar com confirmação; Importar carreira; erros de arquivo inválido ou de versão futura (015).
- Configurações: rodada ao vivo (velocidade padrão e pausa automática), aparência e idioma (tema claro, escuro e do sistema), Dicas (mostrar de novo) e Sobre com versão e links.
- Mods: documentação do formato, mod de exemplo, mundo padrão para baixar, carregar mod (.zip) com os erros de validação, mods carregados com Remover e as planilhas (exportar e importar clubes e jogadores, gerar pacote).
- Sobre: apresentação, "O que dá para fazer", capturas de tela, aviso de que não há nomes reais, privacidade e como levar as carreiras a outro navegador.
- Notas de versão: versões recolhíveis, com a atual aberta, e marcação de que as novidades foram vistas (016); as versões novas no topo e, no fim, a seção recolhida "Fase beta" (1.0.0 a 1.10.0, de 20 a 28 de outubro de 2026) com uma frase explicando o que foi, e as versões antigas rotuladas "beta" (docs/interface-nova.md §6).
- Ajuda de atalhos (diálogo) e aviso de atualização com o novo visual.

Requisitos:
- Paridade funcional (docs/interface-nova.md §5): nenhuma opção, validação ou mensagem some.
- Itens dos mockups que o jogo não tem não viram função: ativar e desativar mods, "Continuar carreira" no menu, apagar todos os dados em Configurações.
- Criar uma carreira com um mundo de 440 clubes continua levando menos de meio segundo, e a lista de clubes filtra sem travar.
- Formulários acessíveis: rótulo em todo campo, erro ligado ao campo, foco no primeiro erro, confirmação de ações destrutivas por diálogo.
- Textos, plural e formatos pelo i18n.
- A feature entra na branch `release/v1.0.0` (o PR tem essa branch como base, e nada é publicado) e acrescenta o que mudou à nota única do 1.0.0 (docs/interface-nova.md §6); a versão do jogo não muda.

Fora de escopo: editor de mods embutido, novas opções de jogo, conta de usuário, sincronização em nuvem.

Critérios de aceite:
- Uma pessoa que nunca viu o jogo cria uma carreira e completa uma rodada sem ajuda (o teste de usabilidade pendente da 016 é feito com a nova interface).
- Exportar uma carreira e importá-la em outro navegador funciona como hoje.
- Os testes de ponta a ponta de nova carreira, carreiras salvas, mods e configurações continuam passando, atualizados.
```
