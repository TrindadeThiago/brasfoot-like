# Research: Temporada de pontos corridos

**Feature**: `003-temporada-pontos-corridos` | **Date**: 2026-10-16

Stack e regras de determinismo herdadas das features 001 e 002. Aqui ficam as decisões de
modelagem da temporada. Formato: Decisão / Razão / Alternativas.

## R1. Onde vive

- **Decisão**: módulo `packages/engine/src/season/`, exportado pela API do motor; mensagens em
  `packages/i18n/locales/pt-BR/season-errors.json`; CLI `pnpm sim:season` em `tools/`.
- **Razão**: temporada é regra de jogo (Princípio I) e compõe o motor de partida.
- **Alternativas**: pacote próprio (fronteira sem ganho).

## R2. Calendário: método do círculo (Berger) com ordem sorteada

- **Decisão**: embaralhar a ordem dos clubes com a seed da temporada e aplicar o método do círculo
  (um clube fixo, os demais giram). Mandos pelo padrão de Berger: o clube fixo alterna casa/fora a
  cada rodada; nos demais pares, o mando alterna pela paridade da rodada. Com N ímpar, entra um
  "clube fantasma" e quem o enfrenta folga. Turnos pares repetem o anterior com mandos invertidos.
- **Razão**: o método de Berger garante, por construção, cada par uma vez por turno e no máximo
  uma "quebra" (2 jogos seguidos com o mesmo mando) por clube e turno, atendendo FR-003; é o
  algoritmo usado por federações. A ordem sorteada faz seeds diferentes darem calendários
  diferentes (FR-004).
- **Alternativas**: busca com restrições (complexa, desnecessária); sortear jogos e corrigir
  mandos (não garante as propriedades).
- **Verificação**: teste de propriedades para N de 4 a 40, pares e ímpares, com várias seeds.

## R3. Estado da temporada sem o mundo

- **Decisão**: o estado guarda só ids, calendário, registros das partidas e situação dos
  jogadores; o mundo (`CompletedBank`) é passado junto em cada chamada:
  `advanceSeason(season, world, step)`.
- **Razão**: o save (Marco 2) já guarda sua própria cópia do banco (Princípio VI); duplicar ~1.000
  jogadores dentro da temporada incharia o save e criaria duas fontes de verdade.
- **Alternativas**: embutir o mundo no estado (simples, mas pesado e duplicado).

## R4. Registro compacto de cada partida

- **Decisão**: cada jogo disputado vira um `MatchRecord`: placar, status (`finished`/`abandoned`),
  eventos-chave (gols, cartões, lesões, substituições, pênaltis marcados), estatísticas dos times e
  números por jogador (minutos, gols, assistências, cartões, lesão), além dos jogadores
  indisponíveis de cada lado e por quê. Finalizações sem gol não são guardadas.
- **Razão**: tabela, estatísticas, suspensões e relatório derivam dos registros; o tamanho fica
  em ~40 KB por rodada de 10 jogos, adequado ao save; o relatório da partida para o jogador
  (Marco 2) só precisa dos eventos-chave.
- **Alternativas**: guardar o `MatchResult` completo (≈ 5× maior); guardar só o placar (impede
  artilharia e histórico).

## R5. Tabela e estatísticas derivadas, não incrementais

- **Decisão**: `standings(season, world)` e `seasonStats(season)` recalculam tudo a partir dos
  registros a cada consulta.
- **Razão**: impossível ficarem inconsistentes com os resultados (FR-014, SC-002); custo
  desprezível (380 partidas).
- **Alternativas**: acumular a cada rodada (mais estado para manter e migrar).

## R6. Desempate em grupos

- **Decisão**: ordenar por pontos; para cada grupo empatado, aplicar os critérios do formato na
  ordem do banco, partindo o grupo a cada critério. "Confronto direto" é recalculado só entre os
  clubes do (sub)grupo (minitabela de pontos). "Sorteio" usa uma chave fixa por clube =
  hash(seed da temporada + id do clube), estável a temporada inteira (FR-013). Se ainda sobrar
  empate, desempata pelo id do clube (nunca acontece com sorteio na lista).
- **Razão**: reproduz o regulamento de pontos corridos e lida com empates de 3+ clubes.
- **Alternativas**: comparador par a par (o confronto direto não é transitivo com 3+ clubes).

## R7. Suspensões e lesões

- **Decisão**: `PlayerStatus { yellows, suspension, injury }` só para jogadores com algum valor.
  Antes de cada jogo, indisponíveis = `suspension > 0 || injury > 0`. Depois do jogo do clube:
  1. quem estava indisponível cumpre uma partida (`suspension − 1`, `injury − 1`);
  2. novos cartões: com expulsão, `suspension += redMatches` e os amarelos da partida não
     acumulam; sem expulsão, `yellows += amarelos`; ao atingir o limite, `suspension += 1` e
     `yellows = 0`;
  3. nova lesão: `injury = sorteio(gravidade)` com um gerador derivado da seed da temporada, da
     rodada e do jogador (leve 1–2, média 3–6, grave 7–15).
- **Razão**: segue o regulamento brasileiro e é determinístico; contar em partidas do clube dispensa
  datas.
- **Alternativas**: contar lesões em dias (exige calendário com datas, fora do escopo).

## R8. IA de escalação na temporada

- **Decisão**: no início, o esquema preferido de cada clube = o esquema do catálogo cuja escalação
  automática (elenco completo) tem maior soma de `força × adequação`; desempate pela ordem do
  catálogo. A cada jogo: `autoLineup(elenco, esquema preferido, indisponíveis)`, postura
  equilibrada. Se faltarem jogadores (FR-020), devolve ao elenco os indisponíveis de menor
  impedimento (menos partidas restantes; desempate pelo id) até haver 11, e registra um aviso.
- **Razão**: simples, determinístico e coerente com o elenco; IA tática fica para depois.
- **Alternativas**: esquema sorteado por jogo (incoerente); IA por adversário (escopo futuro).

## R9. Seeds derivadas

- **Decisão**: seed da partida = `"<seed da temporada>:r<rodada>:<mandante>-<visitante>"`.
  Atributos ocultos: quem cria a temporada passa o mundo já completado; a CLI completa com a seed
  da temporada.
- **Razão**: mudar uma escalação (ou a escalação externa do clube do jogador) não altera a sorte
  das outras partidas; rodada a rodada = tudo de uma vez (FR-006).

## R10. Credibilidade verificável

- **Decisão**: `seasonReport(season, world)` mede uma temporada (campeão, pontos do campeão e do
  lanterna, invictos, Spearman força × posição, gols por jogo, empates, gols do artilheiro).
  `aggregateCredibility(reports)` agrega e compara com `SEASON_CREDIBILITY_LIMITS` (FR-030 a
  FR-037). Spearman com postos médios em empates.
- **Volume**: 100 temporadas = 38.000 partidas (~25 s numa execução isolada; ~15 s a mais na suíte
  paralela). Ficou no `pnpm test` (ver R12).
- **Razão**: Princípio V com custo controlado.

## R11. Erros de temporada

- **Decisão**: `SeasonError { code, params }` com `SEASON_ERROR_CODES`/`SEASON_ERROR_PARAMS`,
  mensagens ICU em pt-BR e `formatSeasonError`; mesmo padrão das features 001 e 002.

## R12. Calibragem final (registro)

Primeira medição (mundo da 001 sem alteração): campeão com 89 pontos em média (até 99), Spearman
0,92, campeão sempre entre os 4 mais fortes e o mais forte campeão em 17% — campeonato previsível
demais, porque a diferença de força entre grandes e pequenos da Série A era de ~17 pontos.

Ajustes, com decisão do usuário (emenda da 001):

- **Mundo (001)**: nível técnico do clube = 49,9 + 0,22 × reputação (era 39 + 0,42 × reputação);
  craques com chance 0,10 nos grandes e 0,03 nos médios. FR-033 da 001 emendado: Série A ≥ 4 pontos
  acima da B e grandes ≥ 5,5 acima dos pequenos (eram 5 e 8). Banco padrão regenerado.
- **Motor (002)**: peso de finalização por posição mais distribuído (FW 1,8, MF 1,2; eram 2,2 e
  1,1) e bônus de Artilheiro na escolha de quem chuta 1,3 (era 1,5) — artilheiros com números
  plausíveis. Todas as suítes de realismo da 002 continuam verdes.

FR-030 ajustado (decisão do usuário): teto de 95% → 99%. Medido em três famílias de 100 seeds
(`cred-*`, `temporada-*`, `outra-*`): campeão entre os 4 mais fortes em 92%, 99% e 97% — reflexo de
um banco com 4 grandes bem acima dos médios; o mais forte é campeão em 41–52%. Uma atenuação da
sensibilidade à força no motor foi testada e descartada (não alterou o top-4).

Resultado em 100 temporadas (seeds `cred-1`…`cred-100`): campeão entre os 4 mais fortes em 92%,
mais forte campeão em 51%, campeão com 70–90 pontos em 98% (faixa observada 67–91), lanterna com
15–40 pontos em 100%, nenhum invicto, Spearman médio 0,80 (mínimo 0,60), gols e empates na faixa em
96%, artilheiro com 14–32 gols em 99%. Uma temporada leva ~0,25 s; as 100 temporadas somam ~15 s à
suíte, então ficam no `pnpm test` (sem `test:long`).
