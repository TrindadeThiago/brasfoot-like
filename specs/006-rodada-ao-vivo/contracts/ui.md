# Contrato: telas da rodada e da competição (006)

Complementa [specs/005-escalacao-taticas/contracts/ui.md](../../005-escalacao-taticas/contracts/ui.md).

## Rotas

| Rota | Tela |
|---|---|
| `/jogo?c=<id>` | Início: "Jogar rodada" (ao vivo) e "Simular direto"; leva ao fim de temporada quando acaba |
| `/jogo/rodada?c=<id>` | **nova** — rodada ao vivo e, no fim, resumo da partida do jogador |
| `/jogo/competicao?c=<id>` | Classificação (aba) |
| `/jogo/competicao/resultados?c=<id>&r=<n>` | **nova** — jogos de qualquer rodada; resumo de cada partida |
| `/jogo/competicao/artilharia?c=<id>` | **nova** — goleadores e assistentes |
| `/jogo/fim-de-temporada?c=<id>` | **nova** — campeão, classificação final, posição do clube |

## Tela da rodada

- Topo: relógio (minuto do jogo do jogador, "Intervalo", "Fim"), velocidade (lenta/normal/rápida),
  Pausar/Retomar, Terminar agora, pausa automática (liga/desliga).
- Destaque: jogo do jogador (escudos, placar, expulsões) com feed próprio.
- Grade: os outros 9 jogos (escudos, placar, minuto, expulsões); placar pisca ao mudar.
- Feed geral (`role="log"`): eventos de todos os jogos, mais recentes no topo.
- Pausado: painel do time — em campo (por vaga), reservas disponíveis, já substituídos,
  substituições restantes `n/5`, esquema e postura. Substituir: escolher quem sai e depois quem
  entra (dois passos, como na escalação).
- Fim: resultados da rodada e o resumo da partida do jogador; botões "Ver classificação" e
  "Voltar ao início" (ou "Fim de temporada" na 38ª rodada).
- Sair durante a rodada (navegação, atalhos `1`–`5`, `S`/`D`, recarregar) pede confirmação
  (`window.confirm` com `round.confirmLeave`; `beforeunload` ao recarregar/fechar).
- Na Início: "Jogar rodada" (ao vivo) e "Simular direto"; depois da 38ª rodada em modo direto,
  vai direto para o fim de temporada.

## Atalhos

| Tecla | Ação |
|---|---|
| `S` | Jogar rodada no modo preferido (na Início e demais telas) |
| `D` | Simular direto |
| `Espaço` | Pausar / retomar (na rodada) |
| `+` / `-` | Mais rápido / mais lento |
| `F` | Terminar agora |
| `?` | Ajuda |

## Textos de eventos

`packages/i18n/locales/pt-BR/events.json`: `event.<tipo>.<n>`; gols ≥ 3 variações; pênaltis,
cartões, expulsões, lesões, substituições e mudanças táticas ≥ 2; início/intervalo/fim ≥ 1.
Variação escolhida por `eventVariant(fixtureSeed, seq, count)`.

## Resumo da partida

Placar e escudos; gols (minuto, autor, assistência); cartões e expulsões; lesões; substituições
(minuto, sai, entra, automática); estatísticas lado a lado: finalizações, no alvo, posse,
amarelos, vermelhos, pênaltis (convertidos/total).
