# Research: Escalação e táticas

**Feature**: `005-escalacao-taticas` | **Date**: 2026-10-16

Nenhum item ficou como NEEDS CLARIFICATION no contexto técnico; as decisões abaixo fecham os pontos
abertos pela spec.

## R1. Onde ficam as regras da escalação

- **Decision**: validação, ajuste automático, reacomodação ao trocar de esquema e a escalação
  automática do jogador ficam no motor, num módulo novo `packages/engine/src/lineup/`, exportado
  pela API pública. A UI só chama essas funções e exibe o resultado.
- **Rationale**: Princípio I (nenhuma regra de jogo na UI) e IX (testes primeiro no motor). As
  mesmas regras servirão ao Electron e à rodada ao vivo (006).
- **Alternatives**: validar no app (duplicaria regras do motor); validar só dentro de
  `advanceSeason` (o jogador só descobriria o erro ao simular, sem avisos ao montar).

## R2. "Mesmo time que a IA escolheria" (FR-007, SC-002)

- **Decision**: `managerAutoLineup(squad, formation, posture, unavailable)` chama exatamente a
  rotina usada pela temporada para os clubes do computador (`lineupForMatch`, com
  `SEASON_BENCH_LIMIT = 12` e a mesma ordem de indisponíveis) e só troca a postura pela escolhida.
  O teste compara, para todos os esquemas e com indisponíveis forçados, o resultado com
  `lineupForMatch` campo a campo.
- **Rationale**: uma única implementação garante a igualdade por construção; o teste protege
  contra divergência futura.
- **Alternatives**: chamar `autoLineup` diretamente (divergiria no caso de elenco curto, em que a
  temporada devolve indisponíveis de menor impedimento).

## R3. Validação (FR-010 a FR-014)

- **Decision**: `validateLineup(lineup, squad, unavailable)` devolve `{ valid, issues }`, cada
  issue com `code`, `severity` (`error` bloqueia, `warning` pede confirmação, `info` só informa) e
  vaga/jogador envolvidos:
  - `error`: `empty_slot`, `unknown_slot`, `duplicate_player`, `not_in_squad`, `unavailable`
    (com motivo e partidas restantes), `bench_too_large`, `unknown_formation`;
  - `warning`: `no_goalkeeper` (vaga do gol sem goleiro de ofício, com o rendimento de 30%),
    `short_squad` (menos de 11 disponíveis);
  - `info`: `out_of_position` (com `adequacy` do motor, ex.: 0,85).
  `valid` = nenhuma issue `error`. Funções puras, sem estado, rápidas o bastante para rodar a cada
  mudança (< 1 ms para 30 jogadores).
- **Rationale**: uma lista única alimenta os avisos na tela, o bloqueio do botão de simular e os
  testes; a severidade separa bloqueio de aviso como a spec pede.
- **Alternatives**: exceções/códigos do motor de partida (`lineup.*`) — servem para recusar a
  entrada, mas não cobrem avisos nem indisponíveis com motivo.

## R4. Ajuste automático entre rodadas (FR-015, FR-016)

- **Decision**: `adjustLineup(lineup, squad, unavailable)` devolve `{ lineup, changes }`:
  1. reservas indisponíveis saem do banco (`bench_removed`);
  2. para cada vaga com titular indisponível, em ordem das vagas do esquema, entra o disponível
     fora do time titular com maior `slotValue` para a posição da vaga (mesmo critério da
     escalação automática; desempate pela ordem canônica força ↓, id ↑); se ele estava no banco,
     sai do banco (`starter_replaced`);
  3. se não houver 11 disponíveis, a escalação vira a de `managerAutoLineup` (que completa com os
     indisponíveis de menor impedimento) e a mudança é `short_squad`.
  É chamado depois de cada rodada simulada e ao abrir uma carreira; as mudanças ficam guardadas no
  save (`lineupNotice`) até o jogador dispensar o aviso.
- **Rationale**: troca só o necessário (Assumptions da spec) e é determinístico.
- **Alternatives**: refazer a escalação automática inteira (apagaria as escolhas do jogador);
  ajustar só na hora de simular (o jogador não veria o aviso antes).

## R5. Trocar de esquema (FR-004)

- **Decision**: `changeFormation(lineup, formation, squad)` mantém os mesmos 11 titulares e os
  redistribui nas vagas do novo esquema pela atribuição ótima já usada na escalação automática
  (maximizar a soma de `slotValue`), com desempate determinístico. Ninguém sai do time; reservas e
  postura não mudam. Vagas vazias só existem se a escalação anterior já tinha vagas vazias (os
  jogadores existentes são atribuídos e o restante das vagas fica vazio).
- **Rationale**: "priorizando a mesma posição" acontece naturalmente (adequação 1 é o maior valor)
  e evita vagas vazias e jogadores perdidos ao trocar de esquema — melhor que mandar excedentes
  para fora. A spec foi ajustada (FR-004 e o caso de borda) para refletir isso.
- **Alternatives**: casar só posições iguais e deixar vagas vazias (pior experiência, mais cliques).

## R6. Partida com a escalação do jogador

- **Decision**: "Simular próxima rodada" passa `{ [clubId]: lineup }` a `advanceSeason`. Antes,
  a UI roda `validateLineup`: com `error`, a rodada não é simulada e aparece a lista de problemas
  com o atalho "Ir para a escalação"; com `warning` (`no_goalkeeper`), um diálogo de confirmação.
  No caso `short_squad` (menos de 11 disponíveis), a rodada é simulada sem escalação externa
  para o clube — a temporada escala como faz com o computador, já com o esquema do jogador
  (`season.formations[clubId]` acompanha o esquema escolhido). `advanceSeason` continua recusando
  escalação externa com indisponível (`season.lineup_unavailable`) — segunda barreira (SC-001).
- **Rationale**: reaproveita o caminho que a temporada já tem para escalações externas; a exceção
  de elenco curto usa exatamente a regra do computador (FR-016).
- **Alternatives**: deixar o motor aceitar indisponíveis em escalação externa (enfraquece SC-001).

## R7. Save versão 2

- **Decision**: `SAVE_FORMAT_VERSION = 2`; o `SaveFile` ganha `lineup: Lineup` e
  `lineupNotice?: LineupChange[]`. Migração `1 → 2`: calcula `managerAutoLineup` no esquema de
  `season.formations[clubId]` (o preferido do clube) com postura equilibrada e os indisponíveis
  atuais. `migrateSave` valida a forma da escalação (Zod) e que ela passa em `validateLineup` sem
  erros, exceto `unavailable` (que o ajuste resolve ao abrir).
- **Rationale**: Princípio VI; carreiras da 004 continuam abrindo (FR-024, SC-007).
- **Alternatives**: guardar a escalação só no `localStorage` (perderia-se com o save exportado e
  entre navegadores).

## R8. Interface da escalação

- **Decision**: nova tela `/jogo/escalacao` (navegação: Início, Elenco, Escalação, Competição,
  Calendário; atalhos `1`–`5`). Layout: à esquerda, o campo com as vagas do esquema (cada vaga:
  posição, jogador, força efetiva, indicador "fora de posição — rende 85%"); à direita, banco e
  "fora da relação"; acima, esquema, postura, "Escalar automaticamente" e a lista de problemas.
  Interação em dois passos, igual por mouse e teclado: escolher um lugar (vaga, posição no banco
  ou jogador da lista) e depois o destino — os dois trocam. Teclado: `Tab`/setas movem o foco,
  `Enter`/`Espaço` seleciona, `Esc` cancela a seleção, `A` escala automaticamente. Arrastar e
  soltar fica fora (não é acessível por teclado e o fluxo em dois passos cobre o mesmo uso).
- **Rationale**: FR-021 (teclado e mouse com o mesmo modelo) e SC-004 (< 30 s só por teclado).
- **Alternatives**: arrastar e soltar como interação principal (exige uma alternativa de teclado
  à parte); editar a escalação dentro da tela de elenco (lotaria a tabela).

## R9. Elenco com filtros e detalhes do jogador

- **Decision**: a tela de elenco ganha filtros por posição (setores) e disponibilidade
  (todos/disponíveis/indisponíveis), uma coluna "na escalação" (titular com a vaga, reserva,
  fora) e abre o painel de detalhes ao escolher a linha. O histórico vem de `seasonStats` do
  motor (filtrado pelo jogador). Filtros e ordenação ficam nas preferências. Um teste percorre
  as telas da feature e falha se aparecer `potential`, `temperament` ou `injuryProneness` (ou os
  rótulos correspondentes) no DOM (FR-020, SC-006).
- **Rationale**: reaproveita `DataTable` e as preferências da 004.
- **Alternatives**: página separada por jogador (rota dinâmica não existe no static export; usaria
  query, mas o painel é mais rápido de ler e fechar).
