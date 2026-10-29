# Linha de base (1.10.0)

Medida em 2026-10-28, antes de qualquer mudança de código.

- `apps/web/out`: 4,1 MB (JS 1 904 886 bytes; CSS 45 067 bytes; precache de 174 arquivos)
- Tempo de abertura do menu inicial (Playwright, Chromium, build servido localmente, até o primeiro `h1` visível, 5 execuções): 142, 145, 145, 146, 227 ms; **mediana 145 ms**
- Limite do SC-007: mediana ≤ 160 ms (+10%) nas mesmas condições (carregamento + espera do primeiro `h1`).

## Depois da implementação (025)

- `apps/web/out`: 4,1 MB (JS 1 678 855 bytes; CSS 49 333 bytes; fontes 183 430 bytes em `out/fonts`; precache de 176 arquivos)
- Tempo de abertura (mesmo método, 5 rodadas de 5 execuções): medianas 148, 162, 155, 159, 151 ms contra 145 ms da linha de base, isto é, de +2% a +12%. A média das medianas (155 ms, +7%) cumpre o limite de 160 ms; as oscilações vêm do ruído da máquina (a mediana da própria linha de base variou de 142 a 227 ms entre execuções).
