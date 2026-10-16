# Research: Rodada ao vivo e telas da competição

**Feature**: `006-rodada-ao-vivo` | **Date**: 2026-10-16

Nenhum NEEDS CLARIFICATION ficou aberto; as decisões abaixo fecham os pontos técnicos.

## R1. Rodada ao vivo no motor

- **Decision**: módulo novo `packages/engine/src/season/live-round.ts` com a rodada como valor
  imutável: `startRound` prepara as 10 partidas (mesmas entradas que a temporada usa hoje),
  `advanceRound(round, ticks)` avança cada partida ainda em andamento pelo mesmo número de passos
  do relógio do motor, `applyRoundChange` aplica uma decisão do jogador na partida do clube dele,
  `finishRound` leva todas ao fim e `completeRound` transforma a rodada terminada em registros,
  disciplina e lesões da temporada. `advanceSeason` passa a usar exatamente esse caminho
  (`startRound → finishRound → completeRound`) em cada rodada.
- **Rationale**: Princípio I (regras no motor) e FR-013/SC-002 — ao vivo e direto ficam iguais por
  construção, porque o direto é o ao vivo sem pausas. O motor de partida já é minuto a minuto
  (`startMatch`, `advanceMatch`, `applyChange`); falta só a camada da rodada.
- **Alternatives**: a UI montar as partidas com `startMatch` direto (duplicaria a preparação de
  escalações/ausências da temporada e arriscaria divergir); simular tudo e "reproduzir" os eventos
  na tela (não permitiria decisões no meio do jogo).

## R2. Relógio da rodada e equivalência com decisões

- **Decision**: a rodada conta `tick` (passos dados). Cada partida avança um passo por tick até
  terminar (partidas com acréscimos diferentes terminam em ticks diferentes). Cada decisão é
  registrada como `{ tick, clubId, change }` em `round.decisions`. Equivalência testada: jogar ao
  vivo com decisões em ticks variados e com velocidades/pausas diferentes, depois reaplicar o log
  em `startRound` + `advanceRound` + `applyRoundChange` de uma vez, e comparar registros
  (placares, eventos, estatísticas, status).
- **Rationale**: a velocidade e as pausas só mudam quando a UI pede ticks, nunca o que acontece em
  cada tick (FR-002/FR-013).
- **Alternatives**: relógio em tempo real (milissegundos) no motor — tornaria o resultado
  dependente do navegador.

## R3. Ritmo na interface

- **Decision**: a página da rodada roda um laço com `setTimeout` que pede ticks conforme o tempo
  decorrido (acumulador), com no máximo 5 ticks por atualização para não "pular" o feed quando a
  aba volta do segundo plano. Velocidades: lenta ≈ 60 s, normal ≈ 45 s, rápida ≈ 30 s por rodada
  (≈ 98 ticks por rodada, incluindo acréscimos), mais "terminar agora". Pausa automática
  (desligável) quando surge lesão ou expulsão do time do jogador. A preferência de modo (ao vivo
  ou direto), velocidade e pausa automática fica no `localStorage`.
- **Rationale**: FR-002, SC-004; nada de animação contínua — só re-render quando há tick.
- **Alternatives**: `requestAnimationFrame` (para quando a aba está oculta, mas sem ganho real
  aqui); Web Worker para o motor (cada tick das 10 partidas custa bem menos de 5 ms).

## R4. Textos dos eventos

- **Decision**: catálogo novo `packages/i18n/locales/pt-BR/events.json` com chaves por tipo e
  variação, em ICU com `{player}`, `{assist}`, `{club}`, `{minute}`:
  - gols: `event.goal.1..4` (com ou sem assistência via `select`), `event.penalty_goal.1..3`;
  - pênalti: `event.penalty_awarded.1..2`, `event.penalty_missed.1..2` (defendido ou para fora);
  - disciplina: `event.yellow.1..2`, `event.red_second_yellow.1..2`, `event.red_direct.1..2`;
  - `event.injury.1..2`, `event.substitution.1..2`, `event.substitution_auto.1..2`,
    `event.formation.1..2`, `event.posture.1..2`;
  - marcos do jogo (uma variação basta): `event.kickoff`, `event.half_time`,
    `event.second_half`, `event.full_time`, `event.abandoned`.
  Finalizações sem gol não entram no feed (só nas estatísticas), para não poluir. A variação é
  escolhida por um hash determinístico de `fixture.seed + event.seq` (`eventVariant` em
  `packages/i18n`), então o mesmo evento tem sempre o mesmo texto (FR-005). Um teste garante o
  número mínimo de variações por tipo.
- **Rationale**: Princípio VII e FR-005; o hash fica na camada de idioma, sem `Math.random`.
- **Alternatives**: escolher a variação pelo RNG do motor (misturaria apresentação com regra de
  jogo e mudaria o formato do registro).

## R5. Telas e navegação

- **Decision**:
  - `/jogo/rodada` — rodada ao vivo (grade dos 10 jogos, destaque e feed do jogo do jogador, feed
    geral, controles, painel de decisões ao pausar) e, no fim, o resumo da partida do jogador;
  - "Competição" vira um grupo com abas: `/jogo/competicao` (classificação),
    `/jogo/competicao/resultados` (qualquer rodada, todos os jogos, resumo de cada um) e
    `/jogo/competicao/artilharia` (gols e assistências via `topScorers`/`topAssists`);
  - `/jogo/fim-de-temporada` — campeão, classificação final e posição do clube; a Início leva a
    ela quando a temporada acaba;
  - a navegação principal continua com 5 telas (`1`–`5`); na Início, "Jogar rodada" (ao vivo) e
    "Simular direto"; `S` usa o modo preferido e `D` simula direto.
  Durante a rodada ao vivo, sair da página (links, atalhos, recarregar) pede confirmação; a rodada
  é descartada se o jogador confirmar.
- **Rationale**: não cresce a barra de navegação; as telas novas de competição ficam onde o
  jogador já procura a tabela.
- **Alternatives**: 7 itens na navegação (poluído); tudo dentro da Início (lotada).

## R6. Salvamento e escalação depois da rodada

- **Decision**: ao terminar (ao vivo ou direto), o app chama `completeRound`, aplica o ajuste da
  escalação da 005 (`adjustLineup` + `lineupNotice`) e salva — o mesmo fluxo que "Simular próxima
  rodada" já faz. Decisões tomadas durante a partida não alteram a escalação guardada (ela é a do
  início de cada partida). O formato do save não muda (continua v2).
- **Rationale**: FR-006; a rodada no meio não é salvável por definição.
- **Alternatives**: guardar a rodada em andamento (fora do escopo do prompt).

## R7. Acessibilidade da rodada ao vivo

- **Decision**: uma única região viva (`aria-live="polite"`) anuncia só gols, expulsões e lesões
  do jogo do jogador e o placar final; os demais eventos ficam no feed visual (lista com
  `role="log"`, sem `aria-live` agressivo). Atalhos: `Espaço` pausa/retoma, `+`/`-` velocidade,
  `F` terminar agora; no painel de decisões, a substituição usa a mesma seleção em dois passos da
  escalação (titular em campo → reserva).
- **Rationale**: FR-020/FR-021 sem inundar leitores de tela com 10 jogos.

## R7b. Resumo da partida

- **Decision**: componente `MatchSummary` construído a partir de `MatchRecord` (eventos e
  estatísticas já registrados pela temporada): placar, gols com minuto e assistência, cartões,
  lesões, substituições e as estatísticas `TeamStats` lado a lado. Reaproveitado no fim da rodada
  e na tela de resultados.

## R8. Teste da temporada inteira (SC-001)

- **Decision**: um teste de fluxo no app joga as 38 rodadas (direto, para caber no tempo do
  Vitest) até a tela de fim de temporada; um E2E joga uma rodada ao vivo em velocidade rápida,
  faz uma substituição pausada e confere o resumo; outro E2E simula direto até o fim e confere o
  campeão.
