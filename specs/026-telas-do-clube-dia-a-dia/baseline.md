# Linha de base (início da 026, `release/v1.0.0` com a 025)

Medida em 2026-10-29, antes de qualquer mudança de código da 026.

- `apps/web/out`: 4,1 MB (JS 1 678 846 bytes; CSS 49 333 bytes; precache de 176 arquivos)
- Tempo de abertura do menu inicial (mesmo método da 025: Playwright, Chromium, build local, até o primeiro `h1`, 5 execuções): medianas 151, 148 e 149 ms
- Paridade: o PR #51 (025) passou em todo o CI (unit, e2e e checks) e o `release/v1.0.0` é o resultado desse merge; a suíte completa não foi repetida aqui antes de mexer no código.

## Depois da implementação (026)

- `apps/web/out`: 4,1 MB (JS 1 693 339 bytes; CSS 52 561 bytes; precache de 177 arquivos)
- Tempo de abertura (mesmo método): medianas 156, 160 e 152 ms contra 149 ms da linha de base (+2% a +7%).
- Testes: unidade 4 100 passando (a única falha intermitente, `regional-news`, estourou 5 s sob carga e passa isolada) e e2e completo passando depois dos ajustes (`market.spec.ts` agora clica o botão do nome).
