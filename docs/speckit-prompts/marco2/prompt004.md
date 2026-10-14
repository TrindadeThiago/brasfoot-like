# 004 — Aplicação web, novo jogo e saves

Marco 2 — Temporada jogável

`/speckit-specify`

```text
Aplicação web base: criar uma nova carreira, gerenciar saves e navegar pelo jogo (ver docs/design.md §2, §7, §12 e §15).

Objetivo: o jogador abre o jogo no navegador, cria uma carreira escolhendo um clube, e pode sair e voltar sem perder progresso.

Histórias de usuário:
- Como jogador, quero criar uma nova carreira informando meu nome de técnico e escolhendo livremente qualquer clube da Série A, vendo informações básicas de cada clube (reputação, força média do elenco, estádio) para decidir.
- Como jogador, quero ter várias carreiras salvas e escolher qual continuar, ver data/temporada/rodada de cada uma e apagar as que não quero.
- Como jogador, quero que o jogo salve automaticamente ao fim de cada rodada.
- Como jogador, quero navegar entre as telas principais (início do clube, elenco, competição, calendário) com uma interface moderna, legível e com atalhos de teclado.

Requisitos:
- Ao criar a carreira, o banco padrão é copiado para dentro do save, junto com a seed.
- O formato do save tem versão e mecanismo de migração desde já.
- Todos os textos da interface passam pelo sistema de i18n (pt-BR).
- Escudos dos clubes renderizados a partir dos dados de escudo (forma + cores + iniciais).
- Funciona offline, sem servidor; layout utilizável de 1280px para cima (mobile fora do escopo, mas sem quebrar).

Fora de escopo: escalação, partidas ao vivo, exportar/importar save em arquivo, opção "sem demissão" (vem na 012), Série B.

Critérios de aceite:
- Criar carreira, recarregar a página e continuar do mesmo ponto.
- Duas carreiras coexistem sem interferência.
- Um save de versão anterior (simulado em teste) é migrado e abre corretamente.
```
