# Contrato: telas, rotas e atalhos

## Rotas (static export)

| Rota | Tela | Conteúdo |
|---|---|---|
| `/` | Abertura | "Continuar" (última carreira, se houver), "Nova carreira", "Carreiras salvas"; aviso se o armazenamento estiver indisponível |
| `/nova-carreira` | Nova carreira | nome do técnico, seed avançada (opcional), tabela dos 20 clubes da Série A (escudo, nome, cidade, reputação, força média, estádio) ordenável; confirmar |
| `/carreiras` | Carreiras salvas | lista de resumos (técnico, escudo + clube, temporada, rodada, salvo em); continuar; apagar com confirmação; danificados e de versão futura marcados |
| `/jogo?c=<id>` | Início do clube | próximo jogo, posição, últimos 5 resultados, botão "Simular próxima rodada", resultados da última rodada simulada; fim de temporada |
| `/jogo/elenco?c=<id>` | Elenco | jogadores (posição, nome, idade, força, características, situação), ordenável |
| `/jogo/competicao?c=<id>` | Competição | tabela da Série A, clube do jogador destacado |
| `/jogo/calendario?c=<id>` | Calendário | 38 rodadas com os jogos do clube; ver todos os jogos de uma rodada |

Cabeçalho do jogo (sempre visível): escudo e nome do clube, técnico, temporada e rodada, navegação
das 4 telas, indicador de salvamento, botão de ajuda.

> A partir da 005, a navegação tem 5 telas (Início, Elenco, Escalação, Competição, Calendário,
> atalhos `1`–`5`); ver `specs/005-escalacao-taticas/contracts/ui.md`.

## Atalhos de teclado

| Tecla | Ação |
|---|---|
| `1` / `2` / `3` / `4` | Início / Elenco / Competição / Calendário |
| `S` | Simular próxima rodada |
| `?` | Ajuda com todos os atalhos |
| `Esc` | Fechar diálogo |

Atalhos ficam inativos com o foco em campo de texto. Todos os controles têm foco visível e são
alcançáveis por `Tab`.

## i18n

Toda string visível vem de `packages/i18n/locales/pt-BR/ui.json` (chaves `ui.*`, `save.*`),
`catalog.json` (posições, características) ou dos dados do banco (nomes de clubes, competições e
jogadores). Datas e números em pt-BR via `Intl`.
