# Contrato de revisão: acessibilidade (critério da 016)

- **Contraste**: texto normal 4,5:1; texto grande, bordas de campos, ícones e estados 3:1; nos dois temas; os pares dos tokens e dos componentes novos estão em `test/ui/contrast.test.ts`.
- **Foco**: todo elemento focável mostra indicador de foco visível nos dois temas (contorno de pelo menos 2 px); a ordem de tabulação segue a ordem visual.
- **Nomes e estrutura**: todo controle, imagem informativa, tabela, região e diálogo tem nome acessível; cada tela tem um `h1`; os níveis de título não saltam; regiões nomeadas têm nome único na tela; o axe não acusa violação `serious` nem `critical`.
- **Teclado**: nova carreira, rodada ao vivo (substituir, trocar a posição, responder a lesão e a goleiro expulso), mercado e diretoria concluem só com o teclado; diálogos prendem e devolvem o foco; Esc fecha.
- **Anúncios**: gols, expulsões, lesões, intervalo e fim do meu jogo são anunciados em ordem e sem repetir; os de outros jogos não.
- **Movimento reduzido**: com a preferência ligada, animações e transições não essenciais ficam em ~0 ms em todas as telas.
- **Cor**: estado, erro, destaque e seleção sempre têm texto ou símbolo além da cor.
- **Cobertura**: toda tela, aba e diálogo da lista única (`e2e/screens-list.ts`), nos dois temas.
