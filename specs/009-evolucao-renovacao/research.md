# Research: Evolução, aposentadoria e renovação do mundo

Ponto de partida (código da 008): os jogadores vivem em `save.bank.players` (cópia do mod com os
atributos ocultos completos), a idade é derivada de `birthDate` e da data da temporada, os
salários derivam da força (`deriveWage`), a rodada fecha em `completeCareerRound` (liga +
finanças) e a virada é `seasonTurnover` com etapas padrão e pontos de extensão.

## R1. Distribuição do mundo inicial (medida)

Banco padrão + atributos ocultos (3 seeds de carreira, mesmo resultado em força):

| Medida | Valor |
|---|---|
| Jogadores | 1.011 (40 clubes, 23–28 por clube) |
| Força média / p10 / p50 / p90 / máx. | 59,1 / 49 / 59 / 68 / 82 |
| Força ≥ 85 | 0 |
| Idade média / faixa | 25,4 / 17–36 |
| Jovens (≤ 21) / margem média de potencial | 209 / ~13 |

**Consequência**: o limiar de "craque" do critério de aceite não pode ser o 85 do gerador (o mundo
inicial não tem nenhum); fica em **80** (ponta da distribuição inicial; revisado para 78 na calibração, ver R9), e o regulador mira em ter
alguns craques sem estourar a escala contida (`DISTRIBUTION_LIMITS`).

## R2. Onde vivem os jogadores: o banco do save vira o mundo vivo

**Decisão**: `save.bank` passa a ser o mundo da carreira: a evolução altera `strength`, a
aposentadoria e a dispensa removem jogadores, e os jovens entram como jogadores novos no mesmo
formato (`CompletedPlayer`). Clubes, países e competição não mudam. O motor ganha funções puras que
recebem e devolvem um `CompletedBank` novo.

**Razão**: todo o motor e a UI já leem jogadores de `world.players` (partidas, escalação, salários,
elenco); trocar o banco inteiro por um mundo atualizado mantém tudo funcionando sem uma camada de
sobreposição. O banco continua válido pelo mesmo schema (Princípios III e VI); a nota da 007 R4
("banco não é alterado pela virada") valia para a composição das divisões, que segue no estado da
liga.

**Alternativas**: sobreposição `playerOverrides` + `newPlayers` (todo leitor teria de mesclar —
risco alto de divergência); estado de jogadores separado do banco (duplicaria o schema).

## R3. Quando evoluir

**Decisão**: duas evoluções por temporada, para todos os jogadores da competição:

- **Meio**: ao fechar a rodada da liga igual a `⌈R/2⌉` (R = rodadas da divisão mais longa; 19 no
  padrão), dentro de `completeCareerRound` (mesmo caminho do ao vivo e do direto);
- **Fim**: etapa `evolve-players` da virada, logo depois de `close-finance-season` e antes de
  `retire-players`.

A minutagem do período vem dos `records` da temporada (soma de `PlayerLine.minutes` das partidas
com `round` no período), sem estado extra.

## R4. Modelo de evolução

**Decisão** (por evolução, ou seja, meia temporada; parâmetros em `EVOLUTION_RULES`):

```text
idade ≤ 26:  delta = (potencial − força) × taxa(idade) × fatorMinutos + ruído
             taxa: ≤19 0,20 · 20–21 0,16 · 22–23 0,12 · 24–26 0,08
             fatorMinutos = 0,5 + 1,0 × participação   (participação = minutos / minutos possíveis, 0..1)
27–30:       delta = ruído pequeno (±1)
≥ 31:        delta = −(0,6 + 0,45 × (idade − 31)) + ruído
ruído:       triangular em [−1,5; +1,5]
inteiro:     ⌊delta + u⌋, u ∈ [0, 1) (arredondamento estocástico, PRNG da carreira)
limites:     força ∈ [20, potencial] (e ≤ 99)
```

PRNG: `createRng(`${careerSeed}:evolve:${season}:${momento}:${playerId}`)` — independente da ordem.

**Razão**: a curva do design (§4) com um único parâmetro de minutagem; jovens que jogam crescem até
~2× mais que os que não jogam (fator 0,5 vs 1,5), atendendo SC-004 com margem.

## R5. Aposentadoria

**Decisão**: na etapa `retire-players`, idade ≥ 33: probabilidade `0,15 + 0,12 × (idade − 33)`;
idade ≥ 38: certa. Removidos de `bank.players`; se tinham situação (`status`) ela é descartada.

## R6. Geração de jovens

**Decisão**: etapa `generate-youth`. Por clube: quantidade `2 + (rep ≥ 55) + (rep ≥ 75)` (2 a 4).
Cada jovem: idade 16–18; posição escolhida pela maior carência em relação à composição-alvo do
gerador (`GENERATOR_TUNING.squad.min/max`); força `base + porReputação × rep + deslocamentoRegulador
± ruído` (faixa inicial: 36 + 0,22 × rep ± 6); potencial = força + margem `[10, 30]` (+ bônus do
regulador), limitado a 99; temperamento e propensão a lesões como em `completeHiddenAttributes`;
características com `pickTraits`; nome com `personName` e o banco de nomes do país do clube; id
`jogador-NNNNN` continuando a sequência (nunca reaproveitado).

## R7. Elencos válidos

**Decisão**: etapa `balance-squads` depois de `generate-youth`. Regras (`SQUAD_RULES`): tamanho
mínimo 22, máximo 30; mínimo por posição `GK 3, FB 3, CB 3, DM 2, MF 3, FW 3`. Abaixo do mínimo: gera
jovens extras na posição (mesmo gerador). Acima do máximo: dispensa pela menor utilidade
`força + 0,5 × max(0, potencial − força) × [idade ≤ 22] − 2 × max(0, idade − 30)`, nunca levando uma
posição abaixo do mínimo. O mínimo de 22 cobre 11 titulares + 11 relacionados com folga para
ausências.

## R8. Regulador global

**Decisão**: etapa `regulate-world` (antes de `generate-youth`, para que a geração da virada já use o
ajuste). Mede a força dos jogadores da competição e atualiza `RegulatorState`:

```text
offset += clamp(0,5 × (alvoMédia − média), −1, +1)          offset ∈ [−8, +8]
bônusPotencial += +1 se craques(≥80) < 2;  −1 se craques > 12   bônus ∈ [−5, +10]
```

Alvo: média 59 (a inicial). Determinístico (sem aleatoriedade).

**Razão**: controle proporcional simples nos dois pontos que importam (nível geral e cauda alta),
com passos limitados para não oscilar.

## R9. Limites do teste de 30 temporadas (SC-001 a SC-005)

Declarados em `renewal/long-run.test.ts` (2 seeds):

| Medida (todas as temporadas) | Faixa | Spec |
|---|---|---|
| Força média | 55–63 | SC-001 |
| p10 | 43–54 | SC-001 |
| p50 | 54–63 | SC-001 |
| p90 | 63–75 | SC-001 |
| Máximo | 78–94 | SC-001 |
| Jogadores com força ≥ 78 (limiar revisado, ver "Valores calibrados") | ≥ 1 | SC-003 |
| Elenco de todo clube: 22–30 e mínimos por posição | sempre | SC-002 |
| Idade média | 24–27,5 | SC-005 |
| Minutagem: evolução média de jovens (≤ 21) no quartil de mais minutos − no quartil de menos | ≥ +1,0 ponto por temporada | SC-004 |

E os limites de economia da 008 continuam no mesmo teste combinado (SC-006).

### Valores calibrados (implementação, `pnpm sim:world` + `pnpm sim:economy`, 30 temporadas)

O primeiro rodada com os valores iniciais (R4–R8) passou 21 temporadas e depois oscilou: o regulador
mede o mundo de hoje, mas os jovens que ele ajusta só pesam anos depois. Ajustes, nesta ordem:

| Mudança | Antes → depois | Motivo |
|---|---|---|
| Offset de força dos jovens | ganho 0,5 → 0,3, com **amortecimento de 15%/temporada** | sem amortecimento o offset acumulava e oscilava |
| Bônus de potencial | regulado pelos craques atuais → pela **promessa de craques** (jovens ≤ 24 com potencial ≥ 80; faixa 15–35, passo 1, sem amortecimento) | os craques atuais respondem com anos de atraso; a promessa responde na geração seguinte |
| Jovens por clube | 2–4 (degraus 55/75) → **1–3** (degraus 45/70) | a idade média caía abaixo de 24 |
| Força dos jovens | 36 + 0,22 × rep → **41 + 0,12 × rep** | os grandes acumulavam talento (top-16 de 71 para 76,6) e a folha deles disparava |
| Elenco máximo | 30 → **28** | elencos cheios encareciam a folha |
| Limiar de craque (SC-003) | 80 → **78** | as gerações vêm em ondas; entre duas, o melhor do mundo pode ficar em 79 por 1–2 temporadas (máximo inicial: 82) |

**Economia (008) com renovação**: a evolução muda as folhas, e a calibração da 008 (feita com elencos
congelados) deixava os grandes empobrecer (Spearman reputação × caixa negativo). Valores revisados
(`DEFAULT_ECONOMY`, banco padrão regenerado): patrocínio da Série A `{ base: 900.000, wageSharePct: 30 }`
(era 1.500.000 / 18) e da Série B `{ base: 400.000, wageSharePct: 60 }` (era 600.000 / 55); a IA investe
no estádio a partir de **18** meses de folha em caixa (era 24). O teste de 30 temporadas da 008 passou a
rodar com renovação, porque não existe mais carreira com elenco congelado.

Resultado (mundo de teste, seeds `renovacao-1/2` e `economia-1/2`; banco padrão, seeds `mundo`/`outra`/
`terceira`): todas as faixas de R9 em todas as temporadas; craques entre ~2 e ~30; idade média ~24,4–
26; minutagem +1,5 a +1,7 ponto/temporada; economia com 92–93% fora de crise na média e Spearman
0,5–0,7.

## R10. Bancos de nomes como dados

**Decisão**: `countries[].names` opcional (`{ firstNames: string[], surnames: string[] }`, Zod) no
formato do mod; o banco padrão grava o banco de nomes atual do gerador no país fictício; sem
`names`, vale o banco padrão do motor (`DEFAULT_NAME_BANK`).

## R11. Integração com a virada e com as finanças

Nova ordem padrão: `record-history`, `pay-prizes`, `close-finance-season`, **`evolve-players`**,
**`retire-players`**, **`regulate-world`**, **`generate-youth`**, **`balance-squads`**,
`promotion-relegation`, `advance-year`, `reset-season-stats`, `generate-calendars`,
`pay-sponsorship`, `ai-finance-review`. As etapas de renovação alteram o mundo antes de
`generate-calendars` (formações preferidas e situação dos jogadores já consideram o elenco novo) e
antes do patrocínio, cuja parte ligada à folha usa os salários atualizados. `TurnoverContext`
ganha `world` mutável (novo `CompletedBank`) e `renewal`; o resultado devolve `world` e `renewal`.

**Finanças**: os salários seguem a força; se `sim:economy` (agora com renovação) sair dos limites
da 008, a calibração é revisada na mesma alteração (Princípio V).

## R12. Save v5 e migração

**Decisão**: `SaveFile.renewal: RenewalState` (`{ nextPlayerSeq, regulator, lastEvolution,
squadNotice? }`); `bank` passa a ser o mundo vivo (já existente). Migração v4 → v5:
`nextPlayerSeq` = maior número dos ids existentes + 1; regulador neutro; sem evolução registrada;
sem aviso. A carreira segue com os jogadores atuais.

## R13. UI

**Decisão**: coluna "Evolução" (±N desde a última evolução) na tela do Elenco; aviso
`SquadChangeNotice` na Início da nova temporada (aposentados, chegadas, dispensas, promoções por
reposição, 5 maiores altas e quedas), com botão "Dispensar"; textos `renewal.*` no i18n.
