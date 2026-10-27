# Linha de base de escala (T002)

Medida em 2026-10-27, antes de qualquer mudança desta feature no motor (o processo carregou o
código da `main` na partida), com `pnpm sim:world --scale` (10 países, 2 divisões de 20 clubes, 30
temporadas, seed `mundo-grande`). A máquina estava ocupada com outros testes ao mesmo tempo, o que
explica o tempo total acima do alvo.

| Medida | Resultado | Meta (`SCALE_LIMITS`) |
|--------|-----------|-----------------------|
| Dia de jogos (mediana) | 268 ms | ≤ 600 ms |
| Virada de temporada (mediana) | 3 630 ms | ≤ 6 000 ms |
| Pico de heap | 539 MB | ≤ 1 024 MB |
| Maior save (última rodada) | 37,18 MB | ≤ 42 MB |
| Arquivo exportado | 3,54 MB | ≤ 6 MB |
| Save no início da temporada 31 | 10,87 MB | ≤ 12,5 MB |
| Crescimento por temporada (10ª–30ª) | 204 KB | ≤ 250 KB |
| 30 temporadas, total | 22,4 min | ≤ 20 min (✗, com a máquina ocupada) |

Das 30 linhas por temporada, as de 17 a 30 saem com ✗ por "clubes em crise" em `liga-lis-nacional`
(9 a 10 clubes): é a faixa econômica por país, já assim na `main`, e não tem relação com esta feature.

Folga para os estaduais: o save no início da temporada 31 usa 87% da meta e o maior save (fim da
temporada) 89%. O banco de estaduais é medido à parte (T056, T060), porque tem outro tamanho (~540
clubes e ~9 000 jogadores de elencos pequenos, num país só).
