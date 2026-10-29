# Contrato: Calendário mensal

- **Cabeçalho**: setas "Mês anterior"/"Próximo mês" (botões com nome), título do mês ("outubro de 2026"), atalho "Ir para o próximo jogo" (desativado, com motivo, sem próximo jogo).
- **Faixa de meses**: um botão por mês da temporada com a contagem de jogos; o mês aberto com `aria-current`.
- **Grade** (`role="grid"`, 7 colunas, domingo a sábado): cada dia é uma célula; dia de jogo mostra adversário, mando (Casa/Fora) e resultado (V/E/D em texto + placar) ou a fase; faixa de cor por resultado (disputado) ou por competição (futuro); o dia atual e o próximo jogo marcados em texto ("hoje", "próximo jogo"); mais de um jogo no dia → todos listados.
- **Teclado**: Tab entra na grade; setas movem entre dias; Enter escolhe o dia; Home/End início/fim da semana; PageUp/PageDown mês anterior/próximo.
- **Filtro por competição** (select) filtra grade, lista e painel.
- **Painel do jogo**: data, adversário, mando, competição, fase, resultado e as ações Resumo e Ver jogos da rodada (diálogos atuais).
- **Sem lista do mês**: retirada por decisão do jogador; o texto equivalente de cada dia (leitor de tela) e o painel do dia trazem a mesma informação. O painel inclui gols e cartões e o selo de clássico.
- **Vazios**: mês sem jogos → "Sem jogos neste mês"; temporada encerrada → mostra os jogos feitos.
- **URL**: `?c=...&mes=AAAA-MM`; sem `mes`, abre no mês do próximo jogo.
