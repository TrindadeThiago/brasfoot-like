# Contrato de interface: tela Fim de temporada

Rota `/jogo/fim-de-temporada/` (com `?c=`), tela de foco.

- **Cabeçalho**: "Temporada X encerrada" com o botão Próxima temporada na mesma linha; durante a virada o botão mostra "preparando" e fica desativado; se falhar, o aviso aparece logo abaixo e o botão volta. O atalho `next-season` continua valendo.
- **Resultado do clube** (em destaque): campeão, acesso, rebaixamento ou permanência em texto e símbolo; posição, pontos, vitórias, empates e derrotas, gols pró e contra e saldo.
- **Como foi a sua temporada**: uma linha por competição em que o clube tem dado (liga; copas, continentais e estaduais com fase alcançada ou prêmio), cada uma com o resultado em texto e a premiação (a da liga marcada como paga ao iniciar a próxima temporada), e o total; a avaliação da diretoria (metas cumpridas ou não, confiança final, decisão, reputação antes e depois, conquista).
- **Campeões das ligas nacionais**: campeão e pontos de cada divisão do campeonato nacional (sem pontos nas divisões em fases), com a divisão do clube destacada em texto.
- **Acesso e rebaixamento**: clubes que sobem e descem em cada fronteira entre divisões, com o clube do jogador destacado em texto.
- **Demais competições, classificações de fases e qualificações**: mantidas, em seções recolhidas.
- **Classificação final da divisão do clube**: tabela recolhida.
- **Rodapé**: Ver o histórico e Próxima temporada.
- **Sem seção vazia**: o que o jogo não guarda não aparece; clube desempregado mostra só o que existir.
- **Acessibilidade e layout**: situação e destaques nunca só em cor; contraste 016; sem rolagem horizontal da página em 1 440, 1 280 e 1 024 px.
