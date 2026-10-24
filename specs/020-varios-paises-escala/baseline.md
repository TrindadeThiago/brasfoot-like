# Medições da 020 (linha de base e resultado final)

Máquina de desenvolvimento (WSL2), Node 22. Banco: `generateWorldBank` com 10 países × 2 divisões ×
20 clubes (400 clubes, 10 243 jogadores), copa nacional em cada país, seed `mundo-grande`; técnico
no primeiro país; 30 temporadas sem interação. Comando: `pnpm sim:world --scale --countries 10
--seasons 30` (tamanho por parte do save: `pnpm sim:size`).

## Antes das otimizações (primeira medição, 1 dia de jogos)

| Mundo | Dia de jogos |
|---|---|
| 3 países (120 clubes) | 1,2 a 1,4 s nas rodadas com mercado da IA |
| 10 países (400 clubes) | **21 a 27 s** |

O perfil (`node --cpu-prof`) mostrou o mercado da IA: `strengthRank` ordenava a lista de ~10 000
jogadores a cada candidato, e a busca de alvos calculava preço, salário e resposta para milhares de
jogadores por clube. Correções: índice de elenco por clube e de jogador por id e por posição
(`world/squads.ts`), poda por valor mínimo da pedida antes de calcular salário e resposta, parada
antecipada na lista ordenada por força, cache de datas lidas, cópia sob demanda da lista de
lançamentos das finanças.

## Resultado final (30 temporadas, 400 clubes)

| Meta | Medido | Limite |
|---|---|---|
| Dia de jogos do mundo todo (mediana) | 250 ms | 600 ms |
| Virada de temporada (mediana) | 3,3 s | 6 s |
| Pico de heap | 536 MB | 1 GB |
| Save no início da temporada 31 (JSON) | 10,83 MB | 12 MB |
| Crescimento médio por temporada (10ª–30ª) | 202 KB | 250 KB |
| Maior save (última rodada da temporada 30) | 37,0 MB | 42 MB |
| Arquivo exportado (.blsave, gzip) | 3,54 MB | 6 MB |
| 30 temporadas | 15,9 min | 20 min |

Início da temporada 1: 4,6 MB (banco 3,4 MB). No fim da primeira temporada: 31 MB, dos quais 21 MB
são os registros de jogos das ligas de outros países (~1,6 KB por jogo no registro compacto, contra
~2,6 KB sem a compactação), 3,6 MB de finanças (lançamentos e bilheterias), 2,8 MB a liga do técnico
(registros completos) e 3,4 MB o banco. Os registros somem na virada.

Todas as temporadas ficaram dentro das faixas de força e idade da 009 (com o teto de força do jogo,
ver `plan.md`) e da saúde financeira da 008 (≥ 80% dos clubes fora de crise) em cada um dos 10
países.

## Simulação resumida × completa (8 000 jogos pareados)

| Métrica | Completa | Resumida |
|---|---|---|
| Gols por jogo | 2,476 | 2,488 |
| Vitória da casa / empate / vitória de fora | 43,9 / 27,4 / 28,7 % | 44,6 / 25,4 / 29,9 % |
| Amarelos / vermelhos por jogo | 3,51 / 0,131 | 3,52 / 0,130 |
| Lesões por jogo | 0,314 | 0,314 |
| Minutos de quem joga o jogo todo | 96,6 | 96,5 |
| Tempo (8 000 jogos) | ~5,3 s | ~0,8 s |
