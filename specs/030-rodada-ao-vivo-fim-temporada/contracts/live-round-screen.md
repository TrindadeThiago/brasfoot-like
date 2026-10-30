# Contrato de interface: tela Rodada ao vivo

Rota `/jogo/rodada/` (com `?c=`), tela de foco (sem barra lateral).

- **Controle**: Sair (abre o diálogo de confirmação), velocidade (lenta, normal, rápida), Pausar e Retomar, Terminar agora, pausa automática em lesão ou expulsão; o estado (rodando ou pausada) e a velocidade escritos; atalhos de teclado de hoje preservados.
- **Andamento**: barra com o minuto (texto), o progresso da partida e o intervalo marcado e escrito.
- **Meu jogo**: escudos e nomes, "Em casa" ou "Fora" (e "Campo neutro"), competição e fase ou grupo, placar grande, estado em texto e símbolo (ao vivo, intervalo, fim, prorrogação, pênaltis), etiqueta de clássico, expulsos de cada time com nome e minuto. Placar, minuto e estado visíveis sem rolagem em 1 440 × 900.
- **Linha do tempo do meu jogo**: gols, cartões e lesões em ordem, cada lance com minuto e texto narrado; no máximo 60 itens na tela, num quadro que rola com nome e foco por teclado. Não há lista de "lances da rodada".
- **Estatísticas**: finalizações, no alvo, posse, amarelos, vermelhos e pênaltis, lado a lado.
- **Outros jogos**: lista, uma linha por jogo (competição, minuto, escudo e nome de cada clube, placar); o gol recente em destaque com texto "gol" e símbolo, não só em cor.
- **Meu time** (com a rodada pausada): esquema, postura, substituições usadas e o limite, titulares e reservas com condição, cartões e lesão em texto, "Já saíram", aviso de substituto obrigatório (`Notice`), troca de posição sem gastar substituição, confirmação de cada mudança em texto, erros por causa (limite, indisponível, esquema inválido).
- **Pênaltis**: cobranças de cada time, convertidas e perdidas (texto e símbolo), placar da série e resultado final.
- **Diálogo de saída**: "A rodada em andamento será perdida"; Continuar na rodada (foco inicial) e Sair; Esc cancela; ao cancelar o foco volta ao controle de origem. Vale para o link Voltar, a barra lateral das outras telas, os atalhos e a navegação.
- **Anúncios** (região `aria-live`): gol, expulsão, lesão, intervalo, fim, prorrogação e cobrança de pênalti do meu jogo, todos os do lote e nenhum de outro jogo.
- **Fim da rodada**: resultados, resumo do meu jogo, Ver classificação, Voltar ao início (ou Ver o resumo da temporada na última rodada) e os links das outras divisões.
- **Acessibilidade e layout**: estado e gol nunca só em cor; contraste 016; foco visível; sem rolagem horizontal da página em 1 440, 1 280 e 1 024 px.
