# Auditoria pós-1.0.0 — Treinador FC

Auditoria somente leitura, feita em `main` (a2d9a0b). Nenhum arquivo do código foi alterado.

## Status de execução

| Item | Situação |
|---|---|
| A1, A7 (limites de descompressão), A3 (regras de mercado por país), A8 (cache de fadiga), T1 (teste de escala) | **Feito** no PR #61, publicado na **1.0.1**. |
| A2 (comprar e revender) | **Feito** no PR #62, publicado na **1.0.2**, com severidade revista (ver nota abaixo). |
| A2b, A4, A5, A6, A9, A10, T2 | Pendentes. |

**Nota sobre o A2.** A estimativa original (+25% de lucro geral) era exagerada. Medido no mundo de teste, o lucro existia só para quem tinha 1 ano de contrato (cerca de 12% dos jogadores): 58% desses ciclos davam lucro, no máximo +35% e mediana +4%. Com 2 anos, 0,4%; com 3 ou mais, 0%. A severidade desceu de Alta para **Média**. A correção foi um piso na pedida de compra do usuário (`buyAskingPrice`, `market/club-response.ts`), igual ao que a venda imediata pagaria depois de renovado. Valores como `lastYearValuePct` e `QUICK_SALE_PCT` ficaram como estavam: mexer neles muda a IA e quebra os baselines de seed. **Limite conhecido:** comprar no último ano, renovar e esperar uma proposta recebida (85% a 110% do valor) ainda rende; é aleatório e limitado.

## Resumo executivo

O estado geral é sólido: o motor é determinístico e não usa `Math.random` nem `Date`; typecheck e lint passam; o balanceamento de partidas está dentro das faixas de realismo; 30 temporadas rodam sem crises nem desvio de nível. Os pontos fracos são **exploits de mercado**, **robustez na importação** e **instabilidade nas métricas de longo prazo**.

Top 5 prioridades:
1. **Zip bomb na importação de mod** (A1). Um `.zip` de 400 KB infla 400 MB antes de qualquer limite ser checado.
2. **Arbitragem no mercado** (A2). O valor muda com o contrato e com a reputação do clube, e a venda imediata é um percentual fixo.
3. **Regras de mercado só da primeira competição** (A3). Em mundos com vários países, as regras de `competitions[0]` valem para todos.
4. **Onda geracional dos craques** (A4). A contagem de craques oscila de 8 a 58 ao longo das temporadas, porque o regulador é um termostato.
5. **Economia sem pressão** (A5). Zero clubes em crise em 30 temporadas: a IA nunca sente risco financeiro.

## Verificações executadas

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | OK (8 projetos) |
| `pnpm lint` | OK (1227 arquivos) |
| `pnpm test` | 4634 de 4635 passam (ver T1) |
| `sim:world` (30 temp.) | todos os critérios ✓ |
| `sim:economy` (30 temp.) | todos os critérios ✓ |
| `sim:world --scale` (3 países, 120 clubes, 30 temp.) | todos ✓; save 11,9 MB (limite 42), heap 281 MB, virada 354 ms |
| `sim:matches` (10 mil partidas) | todas as faixas ✓ |
| Playwright / e2e | **não executei** (`test:e2e` precisa de browser e build) |

## Achados

| ID | Área | Sev. | Esforço | Problema | Evidência | Sugestão |
|---|---|---|---|---|---|---|
| A1 | Mods | **Alta** (feito, 1.0.1) | P | `unzipSync` descompacta todo o pacote antes de checar os limites. O `limits.package` de 20 MB vale só para o arquivo compactado. | `packages/modkit/src/package.ts:72`. Medi: zip de 409 KB com 400 MB de zeros foi processado em 666 ms, com +425 MB de RSS. | Usar o filtro do fflate (`unzipSync(bytes, {filter})`) com `originalSize` e soma total máxima. Conferir o cabeçalho do gzip no save também. |
| A2 | Mercado | Média (feito, 1.0.2; era Alta) | M | Arbitragem por contrato: o último ano vale 60%, 2 anos 85% e 3 ou mais 100%. Ao comprar, o usuário escolhe um contrato novo de até 5 anos, e a venda imediata paga 75% do valor já a 100%. | `engine/src/market/value.ts:8-12` (`contractValuePct`), `negotiation.ts:279-290` e `:380-385`, `disposal.ts:14` (`QUICK_SALE_PCT`). Conta teórica: compra a 0,6×V e vende a 0,75×V ≈ +25%. **Medido** (mundo de teste, ciclo completo): só quem tinha 1 ano de contrato lucrava, 58% dos ciclos, máximo +35% e mediana +4%. | Valor sem o bônus de contrato novo (ou período de carência após assinar). Fazer a venda imediata depender do contrato restante. Teste de propriedade: comprar e vender nunca dá lucro sem melhora do jogador. |
| A2b | Mercado | Baixa (sem evidência) | M | Arbitragem por reputação: o fator de reputação vai de 0,8 a 1,2 conforme o clube dono. Comprar de clube de reputação 0 e vender com o jogador no clube de reputação 100 dá até 1,5× de diferença. | `engine/src/derived/economy.ts:26-28` e `:54`. Hipótese: pela conta sai ≈ +18% em jogador não titular, mas o ciclo medido no A2 não mostrou efeito de reputação no mundo de teste; só vale revisitar em mundos com reputações muito espalhadas. | Valor de mercado que não dependa do clube dono, ou preço de venda que use a média das reputações. |
| A3 | Mercado | Média (feito, 1.0.1) | P | `marketValue` usa as regras de `world.competitions[0]` para qualquer jogador. No mundo multi-país, os percentuais de contrato de outros países são ignorados. | `engine/src/market/value.ts:40`. | Resolver a competição pelo clube do jogador (a função em lote `marketValueFor` já recebe `rules`). |
| A4 | Longo prazo | Média | M | Os craques (força ≥ 78) oscilam em onda: 9 → 58 → 8 → 34 ao longo de 30 temporadas. O p90 vai de 69 a 75 e volta a 70. O regulador (offset ±8, `targetMean` 59) estabiliza a média mas não a cauda. | `sim:world`, coluna "craques", temporadas 1, 16, 25 e 30. `engine/src/renewal/rules.ts:13` (o próprio comentário admite "ondas"). | Controlar também a distribuição por coorte de idade (geração uniforme) em vez de só a média e a promessa de craques. Meta: craques entre 20 e 40. |
| A5 | Economia | Média | M | Em 30 temporadas, **0 clubes em crise**. A IA toma empréstimo sempre que o caixa fica negativo, e o crédito é folgado (2 mi + 30 mil × reputação). Não há risco de falência real. | `sim:economy`: coluna "crise" é 0 em todas as temporadas. `engine/src/finance/ai.ts:89`. | Reduzir o limite de crédito da IA e dar consequência à crise (venda forçada, teto de salários). Meta: 1 a 5% de clubes em crise por temporada. |
| A6 | Finanças | Média | P | O preço ótimo do ingresso é único: o preço em que o público iguala a capacidade. Antes dele, a receita cai com o preço (elasticidade 1,5); depois, o estádio já está lotado. | `engine/src/finance/gate.ts:81-85` (`priceFactor`) e `finance/rules.ts` (`priceElasticityPct: 150`). | Hipótese que **não simulei**. Tornar a capacidade sensível (atmosfera/humor) ou adicionar sócio-torcedor. |
| A7 | Robustez | Média (feito, 1.0.1) | P | `importSave` descompacta o gzip inteiro sem teto. | `packages/save/src/file.ts:31` (`gunzipSync`). | Mesmo tratamento do A1. |
| A8 | Determinismo | Baixa (feito, 1.0.1) | P | `individualRate` é um `Map` global no módulo, sem limite e nunca esvaziado. O valor é determinístico (hash do id), mas cresce com cada jogador visto, e em testes ou worker longo vaza memória. | `engine/src/match/minute.ts:53`. | Calcular o hash sob demanda (é barato) ou usar cache com teto. |
| A9 | Board | Baixa | M | Hipótese: a expectativa da diretoria usa a força atual do elenco. Vender os melhores jogadores antes de a meta ser fixada pode baixar a exigência. | `engine/src/board/goals.ts:73` e `:77`. Não confirmei o momento em que a meta é fixada. | Fixar a expectativa na virada de temporada, com o elenco daquele momento. |
| A10 | Performance | Baixa | M | Há 53 buscas lineares `world.players.find`/`world.clubs.find` no motor, algumas dentro de laços. `marketValue` faz um `find` de clube por jogador. | grep em `packages/engine/src`; `market/value.ts:36-41`. | Índices por id (`Map`) no contexto, calculados uma vez por dia ou virada. |
| T1 | Testes | Média (feito, 1.0.1, paliativo) | P | O teste de escala do save falha quando a suíte roda em paralelo: mediana da virada 23,8 s contra o limite 18 s. **Sozinho passa (84 s).** É flaky por carga, não regressão. | `packages/save/test/football-world-scale.test.ts:71`. | Rodar sem paralelismo (projeto separado), ou medir CPU em vez de tempo de relógio. |
| T2 | Testes | Baixa | M | Não há `fast-check` nem teste de propriedade: as invariantes (soma do caixa, escalação válida, conservação de dinheiro nas transferências) ficam só em exemplos. | `grep fast-check` em todos os `package.json`: vazio. | Adicionar como devDependency (exige aprovação) e cobrir as invariantes de A2, finanças e migração. |

**Pontos que verifiquei e estão bem:**
- **Determinismo:** nenhum `Math.random`, `Date.now` ou `new Date` no motor. O `new Date(...)` do `modkit` serve só para fixar o mtime do zip.
- **Migrações:** o save está na versão 18, com testes de v2 a v18. Erro numa migração vira `corrupt` com motivo, sem lançar exceção nem corromper em silêncio. Versão futura não é alterada.
- **Aritmética:** `powQuarters` usa raiz quadrada e multiplicação para ser idêntico em qualquer engine.
- **Elencos:** a regra de mínimo de elenco existe nos dois lados: partida abandonada com menos de 7 jogadores (`tuning.ts: minimumPlayers`) e `squad_minimum` nas transações.

## Balanceamento

| Métrica | Medido | Esperado | Avaliação |
|---|---|---|---|
| Gols/jogo | 2,60 | 2,5–2,8 | ✓ |
| Mandante / empate / visitante | 44,5 / 27,0 / 28,6% | ~45 / 27 / 28 | ✓ |
| Amarelos/jogo | 3,51 | 3–5 | ✓ |
| Vermelhos/jogo | 0,138 | ~0,08–0,12 | Levemente alto |
| Lesões/jogo | 0,313 | ~0,1–0,3 | Limite superior |
| Pênaltis/jogo | 0,284, conversão 80% | ~0,3 e ~78% | ✓ |
| Chutes/jogo | 24,1, 39,8% no alvo | 22–28, ~35% | ✓ |
| Melhor × pior (87%) | 73,2 vs 58,5 (casa do melhor) | 70–80% | Alto |
| Diferença de ~4 pontos de força (neutro) | 54% / 24% / 22% | 45–50% | Sensível |

A sensibilidade à força é alta: 4 pontos de diferença já dão ~+20 pontos percentuais de vitória, e o pior time só tira ponto do melhor em ~27% dos jogos. Isso favorece o jogador que monta um elenco forte. Hipótese: o efeito vem da composição de `ratio` (quadrático) no volume de chances com `ratio` de novo na conversão do chute.

**Constantes sugeridas (a validar com `sim:matches` e `sim:world`):**

| Constante | Atual | Sugerido | Motivo |
|---|---|---|---|
| `MATCH_TUNING.directRedRate` | 0,0003 | 0,0002 | reduz vermelhos para ~0,10 por jogo |
| `MATCH_TUNING.injuryRate` | 0,0016 | 0,0012 | reduz lesões para ~0,23 por jogo |
| `QUICK_SALE_PCT` | 75 | **manter** | testado em 65 e 70: não fecha o ciclo e pune vendas legítimas |
| `lastYearValuePct` | 60 | **manter** | em 70 muda a IA e quebra 10 testes de baseline de seed (A2 foi resolvido por piso na pedida do usuário) |
| `credit.perReputation` | 30 000 | 15 000 | dá pressão financeira à IA (A5) |
| `REGULATOR_RULES.prospectsRange` | [15, 35] | [20, 30] | estreita a onda de craques (A4) |

## Quick wins (< 1 dia)

- **A1 e A7:** limite de tamanho descompactado em zip e gzip.
- **A3:** resolver as regras de mercado pela competição do jogador.
- **A8:** eliminar o cache global de `individualRate`.
- **T1:** isolar o teste de escala do paralelismo.
- **Constantes** da tabela acima, medindo cada uma com os scripts de simulação.

## Melhorias estruturais

- **Propostas recebidas e modelo de valor** (resto do A2 e A2b): hoje a revenda por proposta de outro clube ainda rende após renovar; separar valor intrínseco, que não depende do clube dono nem do contrato, de preço de oferta e de venda. É a única forma de fechar a arbitragem de vez.
- **Regulador de gerações** (A4): trocar o termostato por geração controlada por coorte.
- **Consequência financeira** (A5): dar a clubes em crise venda forçada e teto de salários.
- **Índices por id** no contexto do motor (A10).
- **Testes de propriedade** (T2) para as invariantes de dinheiro e escalação.

## Ideias de features (máx. 5)

1. **Agente/empresário:** o jogador aceita contrato conforme o agente, o que dá uma segunda alavanca na negociação.
2. **Cláusula de revenda e percentual:** vender uma promessa mantém uma fatia de uma venda futura.
3. **Categorias de base com academia:** nível da academia determina qualidade e quantidade dos jovens (hoje é só reputação).
4. **Sócio-torcedor:** receita recorrente que depende do humor da torcida, contrapeso ao ingresso (A6).
5. **Relatório de scout:** a incerteza sobre o potencial de um jogador reduz com o tempo de observação.

## Plano sugerido para v1.1.0

| Ordem | Item | Testes a adicionar |
|---|---|---|
| 1 ✓ | A1 + A7: limites de descompressão | Zip com 400 MB de zeros é rejeitado sem alocar. Gzip equivalente no `importSave`. |
| 2 ✓ | A3: regras pela competição do jogador | Mundo com dois países e regras de contrato diferentes: o valor segue o país do jogador. |
| 3 ✓ | T1: teste de escala (folga de 6×, paliativo) | A suíte inteira passa em paralelo, três execuções seguidas. |
| 4 ✓ (A2) | A2: piso na pedida de compra do usuário; A2b pendente | Propriedade: comprar e vender com qualquer par de clubes e contrato nunca lucra mais que a margem aceita. Regressão do ciclo comprar e vender em `sim:economy`. |
| 5 ✓ | A8: cache de fadiga | Memória estável após N mil partidas (teste de memória do `sim:world`). |
| 6 | A5: pressão financeira da IA | `sim:economy` entre 1% e 5% de clubes em crise, sem falência em cascata. |
| 7 | A4: regulador de gerações | Critério novo em `sim:world`: craques sempre entre 20 e 40. |
| 8 | A9 + A6: board e ingresso (após confirmar as hipóteses) | Teste de que vender antes da virada não muda a meta. Curva de receita por preço com máximo interior. |

## Limitações

Não rodei Playwright localmente (o CI rodou o e2e nos PRs #61 e #62). A6 e A9 são hipóteses por leitura de código, sem simulação. As constantes sugeridas para A4 e A5 e as de partidas (`directRedRate`, `injuryRate`) não foram testadas. O T1 não foi resolvido pela raiz: medir tempo de CPU não funcionou (o contador é do processo inteiro nas threads do vitest), então só ampliei a folga.
