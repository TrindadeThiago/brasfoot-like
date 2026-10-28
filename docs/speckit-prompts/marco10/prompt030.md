# 030 — Rodada ao vivo e fim de temporada

Marco 10 — Nova interface

`/speckit-specify`

```text
Refazer a rodada ao vivo e o resumo de fim de temporada na nova interface (ver docs/interface-nova.md §4 e §5; docs/design.md §6 e §7).

Objetivo: a rodada ao vivo é o momento mais importante do jogo e passa a ter cara de transmissão: o placar do meu jogo em destaque, o andamento visível e as decisões a um clique.

Histórias de usuário:
- Como jogador, quero acompanhar o meu jogo com placar, minuto, linha do tempo dos lances e estatísticas, sem perder de vista os outros jogos da rodada.
- Como jogador, quero fazer substituições e trocar a posição de dois jogadores com poucos cliques, e ser avisado na hora quando um jogador se lesiona ou o goleiro é expulso.
- Como jogador, quero controlar a velocidade, pausar, retomar e terminar a rodada.
- Como jogador, quero fechar a temporada com um resumo da campanha e das premiações.

Escopo:
- Rodada ao vivo: barra de controle (sair, velocidade lenta, normal e rápida, pausar e retomar, terminar agora, pausa automática em lesão ou expulsão) e barra de andamento com o intervalo marcado.
- Meu jogo: escudos, nomes, mando, fase ou grupo, placar grande, estado (ao vivo, intervalo, fim, prorrogação, pênaltis), etiqueta de clássico, expulsos de cada time e linha do tempo com gols, cartões e lesões.
- Estatísticas comparativas (finalizações, no alvo, posse, amarelos, vermelhos, pênaltis), lances do meu jogo e lances da rodada, e os outros jogos agrupados por competição ou divisão, com o gol recente em destaque.
- Painel Meu time: esquema, postura, substituições usadas e o limite, jogadores em campo com condição, cartões, lesão e expulsão, reservas disponíveis, "Já saíram", aviso de substituto obrigatório (lesão ou goleiro expulso) e confirmação de cada mudança; troca de posição entre dois jogadores em campo sem gastar substituição.
- Pênaltis: as cobranças de cada time, convertidas e perdidas, e o resultado final.
- Confirmação ao sair ("a rodada em andamento será perdida") em diálogo.
- Fim da rodada: ações Ver classificação, Voltar ao início e Ver o resumo da temporada quando for a última.
- Fim de temporada: "Temporada X encerrada", o campeão de cada divisão com seus pontos, a mensagem sobre o clube do jogador (campeão, acesso, rebaixamento ou permanência), os clubes que sobem e os que descem, a classificação final, a premiação recebida, Ver o histórico e Próxima temporada, com o estado "preparando" e o aviso de falha ao começar a temporada.

Requisitos:
- Paridade funcional (docs/interface-nova.md §5): tudo o que a tela atual permite continua permitido, inclusive os erros de mudança inválida (limite, jogador indisponível, esquema inválido) com a mensagem da causa.
- Desempenho: uma rodada com 10 jogos ao vivo em velocidade rápida não perde quadros nem trava a interface; a lista de lances não cresce sem limite na tela.
- Acessibilidade: anúncios para leitores de tela dos lances do meu jogo (gols, expulsões, lesões, intervalo), sem repetir os de outros jogos; foco movido com critério ao abrir diálogos e avisos.
- A interface não muda o resultado da partida: a mesma seed dá a mesma partida (constituição, princípio II).
- Textos, plural e formatos pelo i18n.
- A feature entra na branch `release/v1.0.0` (o PR tem essa branch como base, e nada é publicado) e acrescenta o que mudou à nota única do 1.0.0 (docs/interface-nova.md §6); a versão do jogo não muda.

Fora de escopo: novos eventos de partida, narração por voz, replay, mapa de calor, novas regras de substituição.

Critérios de aceite:
- Substituir um jogador lesionado, trocar a posição de dois jogadores e responder a um goleiro expulso são possíveis só com o teclado.
- Uma rodada completa de 10 jogos, em velocidade rápida, termina sem erro e sem queda perceptível de desempenho.
- O teste de ponta a ponta de rodada ao vivo continua passando, atualizado, e cobre pênaltis e a confirmação de saída.
```
