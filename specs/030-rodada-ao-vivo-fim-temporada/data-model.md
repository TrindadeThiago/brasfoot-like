# Modelo de dados: Rodada ao vivo e fim de temporada

Nenhum dado persistido muda. Tudo abaixo são visões derivadas, calculadas na hora a partir do estado
da rodada ao vivo ou do save.

## Visões da rodada ao vivo (`apps/web/src/game/live-view.ts`)

| Visão | Campos | Origem |
|---|---|---|
| `MatchProgress` | `minute`, `total` (90 ou 120), `halftimeAt` (45 ou 105), `percent` | `state.clock`, `state.status`, prorrogação |
| `MatchPhase` | `live`, `halftime`, `extraTime`, `penalties`, `finished` (texto e símbolo cada); o intervalo da prorrogação (`extra_half_time`) conta como `halftime` e `abandoned` como `finished` | `state.status` (mesmos valores de `clockText`) |
| `SentOff` | `side`, `playerId`, `minute` | eventos `red_card` do meu jogo |
| `Announcement` | `key`, `text` | lances novos do meu jogo: gol, expulsão, lesão, intervalo, fim, prorrogação, cobrança de pênalti |
| `OtherMatchRow` | `competition`, `minute`, casa e fora (clube, escudo), `score`, `recentGoal` | partidas da divisão do jogador que não são a minha |
| `FeedWindow` | os últimos 200 lances do estado e os 60 do meu jogo na tela | `FeedItem` do `useLiveRound` |

Regras: o anúncio de um lote lista todos os lances elegíveis do meu jogo, em ordem, sem repetir
nenhum e sem incluir lances de outros jogos; o teto de lances nunca descarta eventos do motor
(`state.events` fica inteiro), só itens de exibição.

## Visões do fim de temporada (`apps/web/src/game/season-view.ts`)

| Visão | Campos | Origem |
|---|---|---|
| `ClubResult` | `situation` (campeão, acesso, rebaixamento, permanência), posição, pontos, jogos, vitórias, empates, derrotas, gols pró e contra, saldo | `seasonEndSummary` e a linha da classificação do clube |
| `CampaignRow` | `competitionId`, `kind` (`league`, `cup`, `continental`, `regional`), `result` (texto), `prize` (valor), `paid` (se já foi lançado no extrato) | liga: posição e `prizeFor` (a receber); copas: `cupEntry.reached`; continental e estadual: `evaluation`; premiação: `ledger` (`prize` com `competitionId`) |
| `Campaign` | `rows`, `total` | soma dos prêmios das linhas |
| `Champion` e `Move` | os de hoje (`seasonEndSummary`) | `seasonEndSummary` |

Regras: uma competição sem nenhum dado do clube não gera linha; o prêmio da liga é marcado como
"paga ao iniciar a próxima temporada" (`paid: false`); o total soma os valores de todas as linhas
(pagos e a pagar), e o texto diz isso.

## Estado das telas (local, não persistido)

- Rodada ao vivo: velocidade e pausa automática (preferências de hoje), pausa, diálogo de saída.
- Fim de temporada: estado do botão (`idle`, `busy`, `failed`) e as seções recolhidas.

## Validação

- Nenhuma entrada nova de usuário. Cada visão é função pura do estado; o teste de cada uma cobre os casos de borda do spec (sem fase, prorrogação, vários lances no mesmo passo, clube desempregado, competição sem dado).
