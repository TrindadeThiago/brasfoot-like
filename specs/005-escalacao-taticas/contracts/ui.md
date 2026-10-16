# Contrato: telas, interação e atalhos (005)

Complementa [specs/004-app-web-saves/contracts/ui.md](../../004-app-web-saves/contracts/ui.md).

## Rotas

| Rota | Tela | Mudança |
|---|---|---|
| `/jogo/escalacao?c=<id>` | Escalação | **nova** |
| `/jogo/elenco?c=<id>` | Elenco | filtros (setor, disponibilidade), coluna "na escalação", painel de detalhes |
| `/jogo?c=<id>` | Início | aviso de ajuste automático (`lineupNotice`) com "Ver escalação"/"Dispensar"; simular recusa escalação inválida |

Navegação: Início · Elenco · **Escalação** · Competição · Calendário.

## Tela de escalação

- Topo: seletor de esquema, seletor de postura, botão "Escalar automaticamente", lista de
  problemas (erros em vermelho, avisos em amarelo; cada item foca a vaga/jogador envolvido).
- Campo: as 11 vagas do esquema dispostas por linha (gol, defesa, meio, ataque). Cada vaga:
  sigla da posição, nome, força efetiva; selo "fora de posição · rende 85%"; selo de impedimento
  (lesionado/suspenso, partidas restantes).
- Lateral: "Reservas (n/12)" em ordem e "Fora da relação" (ordenado por posição e força), com
  condição de cada jogador.
- Seleção em dois passos: escolher origem (vaga, reserva ou jogador de fora) → escolher destino →
  troca. O lugar selecionado fica destacado e anunciado (`aria-pressed`/região viva).
- Abrir detalhes de um jogador: botão "Detalhes" em cada linha (ou `I` com o jogador em foco).

## Atalhos

| Tecla | Ação |
|---|---|
| `1`–`5` | Início / Elenco / Escalação / Competição / Calendário |
| `S` | Simular próxima rodada (com validação) |
| `A` | Escalar automaticamente (na tela de escalação) |
| `I` | Detalhes do jogador em foco |
| `Enter` / `Espaço` | Selecionar origem / destino |
| `Esc` | Cancelar seleção ou fechar diálogo/painel |
| `?` | Ajuda |

Atalhos continuam inativos em campos de texto e seletores com foco.

## Simular com escalação inválida

- Com erro: a rodada não é simulada; diálogo "Escalação inválida" lista os problemas e oferece
  "Ir para a escalação".
- Só com aviso "sem goleiro": diálogo "Time sem goleiro" (rendimento no gol: 30%) com "Jogar mesmo
  assim" e "Ir para a escalação".

## Detalhes do jogador

Posição, força, idade, nacionalidade, características, condição; na temporada: jogos, minutos,
gols, assistências, amarelos, vermelhos, partidas suspenso, partidas lesionado. Nunca: potencial,
temperamento, propensão a lesões.
