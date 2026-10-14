# 016 — Polimento e publicação

Marco 6 — Lançamento

`/speckit-specify`

```text
Polimento da experiência e publicação da primeira versão pública (ver docs/design.md §1, §2 e §13, marco M6).

Objetivo: um estranho consegue abrir o jogo e jogar sem nenhuma explicação, e o jogo está publicado gratuitamente na web e no itch.io.

Histórias de usuário:
- Como novo jogador, quero um primeiro acesso guiado (tutorial curto ou dicas contextuais) que explique escalação, rodada, mercado e diretoria.
- Como jogador, quero atalhos de teclado consistentes e uma tela de ajuda listando-os.
- Como jogador, quero configurações: velocidade da rodada ao vivo, tema claro/escuro, idioma (pt-BR apenas, mas a opção existe).
- Como jogador, quero uma interface consistente, legível e acessível (contraste, foco visível, navegação por teclado).
- Como jogador, quero ver a versão do jogo e as notas de versão.

Requisitos:
- Build estático publicado em hospedagem gratuita e como jogo HTML no itch.io.
- Revisão de desempenho: virada de temporada e simulação de rodada rápidas mesmo em saves de 30+ temporadas (limites definidos no plano).
- Revisão de textos pt-BR e de que nenhum texto está fora do sistema de i18n.
- Página do jogo com descrição, capturas de tela e aviso de que o jogo não usa nomes reais.

Fora de escopo: versão desktop (Electron), mobile, traduções adicionais, Steam.

Critérios de aceite:
- Teste com pelo menos uma pessoa que nunca viu o jogo: ela cria uma carreira e completa uma rodada sem ajuda.
- O jogo publicado funciona offline após o primeiro carregamento.
```
