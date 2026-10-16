# Research: Motor de partida

**Feature**: `002-motor-partida` | **Date**: 2026-10-16

A stack (TypeScript 6, Zod, Vitest, Biome, pnpm) e as regras de determinismo vêm da feature 001
(`specs/001-modelo-dados-banco-ficticio/research.md`, R2–R5 e R15). Aqui ficam as decisões de
modelagem do motor. Formato: Decisão / Razão / Alternativas.

## R1. Onde vive o motor de partida

- **Decisão**: módulo `packages/engine/src/match/`, exportado pela API pública do motor. Mensagens
  de erro de partida em `packages/i18n/locales/pt-BR/match-errors.json`. Um CLI de calibragem
  `pnpm sim:matches` em `tools/`.
- **Razão**: o motor de partida é regra de jogo (Princípio I) e reutiliza PRNG, calendário e tipos
  do mundo da 001. Arquivo de mensagens separado mantém o teste de cobertura de cada catálogo
  simples (um conjunto de códigos ↔ um arquivo).
- **Alternativas**: pacote próprio `packages/match` (fronteira extra sem ganho: o motor de partida
  e o modelo de dados mudam juntos); misturar códigos de partida no `errors.json` da validação de
  bancos (acopla dois catálogos com ciclos de vida diferentes).

## R2. Modelo de simulação: probabilidades por minuto a partir de setores

- **Decisão**: a cada minuto, para cada time, o motor calcula probabilidades a partir das forças
  de setor (goleiro, defesa, meio, ataque) e sorteia eventos:
  1. **Domínio do meio** → fração de posse do minuto: `0,5 + k·(meio_A − meio_B)/(meio_A + meio_B)`,
     limitada a [0,25; 0,75]; a posse estimada final é a média dos minutos.
  2. **Chance** por time = `taxa_base × posse × razão(ataque, defesa_adversária) × mando ×
     postura × estado_do_placar × proporção_em_campo`, onde `razão(a, d) = 2a²/(a² + d²)`
     (vale 1 com forças iguais, cresce suave e não satura).
  3. **Tipo da chance** sorteado por pesos: jogada normal, bola aérea (Cabeceio), contra-ataque
     (Velocidade), falta direta (Cobrador de falta), pênalti.
  4. **Desfecho**: no alvo / bloqueio / para fora, depois gol / defesa, usando finalizador vs.
     goleiro (Artilheiro, Muralha) e o tipo da chance.
  5. **Disciplina e lesões**: sorteio por time e minuto, com o jogador escolhido por peso
     (temperamento, propensão, posição).
- **Razão**: modelos por setor são o padrão do gênero (Brasfoot, Elifoot): baratos, explicáveis e
  calibráveis por poucas constantes. A forma `a²/(a²+d²)` evita `Math.pow` (R4 da 001) e dá
  diferenças perceptíveis sem tornar o favorito invencível.
- **Alternativas**: simulação lance a lance com posições no campo (cara, difícil de calibrar e
  desnecessária para texto ao vivo); Poisson por partida com placar sorteado no início (não
  permite mudanças no meio do jogo nem eventos coerentes minuto a minuto).

## R3. Força efetiva por setor

- **Decisão**: cada vaga do esquema tem uma posição esperada; a contribuição de um jogador é
  `força × adequação(posição do jogador, posição da vaga)`. Cada posição de vaga distribui pesos
  entre setores (ex.: lateral 0,6 defesa / 0,3 meio / 0,1 ataque; volante 0,5 / 0,5 / 0; meia
  0 / 0,7 / 0,3; atacante 0 / 0,1 / 0,9). A força de um setor é a soma ponderada dividida pela soma
  de pesos **do esquema completo**; assim, um jogador a menos reduz o setor proporcionalmente
  (FR-010) sem regra especial.
- **Adequação** (tabela simétrica, 1,0 na diagonal): FB↔CB 0,90; DM↔MF 0,92; CB↔DM 0,88;
  MF↔FW 0,88; FB↔DM 0,85; FB↔MF 0,85; FB↔FW 0,75; DM↔FW 0,75; CB↔MF 0,75; CB↔FW 0,65; goleiro na
  linha ou jogador de linha no gol 0,30 (simétrico, por isso um único valor).
- **Razão**: atende FR-006/FR-007 com uma tabela pequena e auditável; o mesmo cálculo serve à
  escalação automática (R7).
- **Alternativas**: atributos por setor no jogador (o modelo da 001 tem só força + posição);
  adequação binária (sem gradação "lateral como zagueiro < lateral como atacante").

## R4. Aleatoriedade por minuto derivada da seed

- **Decisão**: o estado da partida guarda a **seed**, não um gerador em andamento. Cada minuto
  (inclusive de acréscimo) usa um gerador próprio
  `createRng(seed).fork("min:<tempo>:<minuto>:<acréscimo>:minute")`, consumido sempre na mesma
  ordem (chances, cartões, lesões; mandante antes do visitante). O gerador raiz da seed é criado
  uma vez por chamada e só usado via `fork`, que não o avança.
- **Nota de implementação**: a versão inicial usava um sub-gerador por time e por tipo de sorteio;
  foi simplificada para um por minuto por desempenho (≈ 3× mais rápido no conjunto com o cache de
  escalação), sem perder determinismo nem a igualdade passos = direto.
- **Razão**: avançar 1 minuto 90 vezes ou 90 minutos de uma vez consome exatamente os mesmos
  números (FR-022); uma mudança tática muda probabilidades, mas não desloca a sequência dos
  minutos seguintes, o que deixa os testes de efeito (postura, expulsão) mais limpos (menos
  ruído entre cenários). O estado fica trivialmente serializável (FR-026).
- **Alternativas**: um único gerador consumido em sequência e salvo no estado (funciona, mas
  qualquer sorteio extra embaralha todo o resto da partida e aumenta a variância entre cenários
  comparados).

## R5. API funcional e estado imutável

- **Decisão**: `startMatch(input) → { ok, state } | { ok: false, errors }`;
  `advanceMatch(state, { minutes } | { toEnd: true }) → state`;
  `applyChange(state, side, change) → { ok, state } | { ok: false, error }`;
  `matchResult(state) → MatchResult`; `simulateMatch(input) = start + advance até o fim`.
  Funções puras: recebem e devolvem objetos simples, nunca mutam a entrada.
- **Razão**: simples de testar, de serializar e de usar na UI (React) e no Electron; mudança
  inválida simplesmente não produz novo estado (FR-024).
- **Alternativas**: classe `Match` com métodos mutáveis (estado escondido, difícil de comparar
  e serializar).

## R6. Mudanças pendentes e decisão automática

- **Decisão**: lesão ou expulsão de goleiro geram `pending` no estado do time. No início do
  próximo `advanceMatch`, pendências não resolvidas são resolvidas pela política padrão: reserva
  mais adequado para a vaga (goleiro por goleiro), escolhido pela mesma função de força efetiva
  da escalação automática; sem substituição disponível, reorganiza (o jogador de linha de maior
  adequação ao gol assume, sua vaga fica vazia). Substituições automáticas aparecem como eventos
  com `automatic: true`.
- **Razão**: a rodada ao vivo pode pausar e deixar o jogador decidir; o "simular direto" e a IA
  usam a política padrão sem código extra.
- **Alternativas**: exigir decisão sempre (trava o simular direto); trocar automaticamente no
  mesmo minuto (impede o jogador de escolher na rodada ao vivo).

## R7. Escalação automática: atribuição ótima

- **Decisão**: resolver a atribuição jogadores × vagas que maximiza a soma das contribuições
  (`força × adequação × peso_total_da_vaga`) com o **algoritmo húngaro** (matriz até 40 × 11),
  desempate estável por (maior força, menor id). Banco: melhor goleiro restante, depois o melhor
  restante de cada setor (defesa, meio, ataque), depois os melhores restantes até o limite.
- **Razão**: a otimalidade da atribuição garante FR-028 (nenhuma troca titular↔reserva melhora),
  e é rápida (dezenas de microssegundos).
- **Alternativas**: guloso por vaga (não garante otimalidade; falha no teste de troca); busca
  exaustiva (inviável).

## R8. Acréscimos e linha do tempo

- **Decisão**: o minuto do evento é `{ half: 1|2, minute, stoppage }` — ex.: `{2, 90, 3}` = 90+3.
  Os acréscimos do tempo são definidos ao chegar ao minuto 45/90: `1 + 0,5·gols + 1·lesões +
  0,5·substituições + 0,3·cartões` mais 0–2 sorteados, arredondado e limitado às faixas do FR-012.
- **Razão**: notação idêntica à do futebol real, ordenável e fácil de narrar.
- **Alternativas**: minuto absoluto contínuo (93) sem distinguir acréscimo do 1º tempo.

## R9. Calibragem verificável

- **Decisão**: constantes em `MATCH_TUNING` (`src/match/tuning.ts`) e faixas do FR-040 a FR-049 em
  `MATCH_REALISM_LIMITS` (`src/match/limits.ts`). Testes de simulação longa em
  `test/match/realism/*.test.ts` usam times do banco padrão (com atributos ocultos completados) e
  variações controladas de força. O CLI `pnpm sim:matches --n 10000` imprime cada métrica ao lado
  do limite, para recalibrar sem rodar a suíte inteira.
- **Volume**: 10.000 partidas por suíte de realismo; testes de efeito (postura, expulsão,
  características) usam pares de cenários com as mesmas seeds (variáveis comuns), o que reduz o
  ruído e permite ~4.000 partidas por cenário.
- **Razão**: Princípio V — limites numéricos explícitos, verificados automaticamente.
- **Alternativas**: calibrar "no olho" com o CLI (não protege contra regressões).

## R10. Erros de partida

- **Decisão**: `MatchError { code, side?: "home" | "away", params }`, catálogo `MATCH_ERROR_CODES`
  com parâmetros declarados (`MATCH_ERROR_PARAMS`), mensagens ICU em pt-BR e
  `formatMatchError()` no pacote de i18n; teste de cobertura igual ao da 001.
- **Razão**: Princípio VII e consistência com `ValidationIssue`.
- **Alternativas**: reaproveitar `ValidationIssue` (tem `section`/`path` de banco, que não fazem
  sentido em uma escalação).

## R11. Calibragem final (registro)

Valores calibrados em `MATCH_TUNING` após as suítes de realismo (10.000 partidas de campeonato,
seed `calibragem`): 2,66 gols/jogo, 24,9% de empates, 4,7 amarelos e 0,20 vermelho por jogo,
0,31 lesão, 0,29 pênalti (80% convertidos), 24,4 finalizações (39,7% no alvo), 0,2% de partidas
com um time marcando 7+. Cenários: mandante vence 43,7% e visitante 27,0% entre forças iguais;
favorito (+10) vence 63,6% e perde 13,0%; postura ofensiva +20%/+16% (gols marcados/sofridos),
defensiva −20%/−16%; expulso no minuto 20 reduz a taxa de vitória em ~12 p.p.

Ajustes de modelo feitos na calibragem: jogador já amarelado comete menos faltas
(`cautionAfterYellow`), time que vence por 3+ gols tira o pé (`comfortableLead`), posse por
minuto limitada a 30–70%.
