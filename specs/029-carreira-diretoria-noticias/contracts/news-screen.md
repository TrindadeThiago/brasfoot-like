# Contrato de interface: tela Notícias

Rota `/jogo/noticias/` (com `?c=`).

- **Seleção**: seletor de temporada e rodada (rodada 0 = resumo) com as setas "Rodada anterior" e "Próxima rodada", desativadas nas pontas.
- **Cartão de manchete**: um `article` por manchete, separado dos demais, com competição, rodada, título (a frase da manchete) e texto (os fatos complementares, quando existem); a manchete do clube do jogador é marcada em texto ("Do seu clube"), não só em cor.
- **Grupos**: seção "Do seu clube" e uma seção por competição (e "Geral", se houver), cada uma com título e contagem de manchetes. Uma manchete do clube aparece em "Do seu clube" e na seção da competição.
- **Painel**: resumo da rodada (quantas manchetes, quantas do clube); botões Todas e Do meu clube (`aria-pressed`); lista de competições com contagem, cada uma um botão que filtra; um clique volta a Todas.
- **Estados vazios**: sem nenhuma rodada guardada; rodada sem manchetes; filtro sem resultado, com o botão que volta a Todas.
- **Layout**: o painel fica à vista enquanto a lista rola; sem rolagem horizontal da página em 1 440, 1 280 e 1 024 px.
- **Acessibilidade**: cada grupo é uma `section` com nome; contagens em texto; foco visível; contraste 016.
- **Início**: o cartão de notícias da Início continua mostrando as manchetes mais relevantes da última rodada, agora com o mesmo cartão de manchete.
