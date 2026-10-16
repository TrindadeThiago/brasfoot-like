# Quickstart: validar a feature 006

API em [contracts/live-round-api.md](contracts/live-round-api.md); telas em [contracts/ui.md](contracts/ui.md).

## 1. Gates

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Inclui `packages/engine/test/season/live-round*.test.ts` (equivalência ao vivo × direto,
decisões, limite de substituições), os testes de variações de eventos e os fluxos do app (rodada
ao vivo com timers falsos, temporada inteira até o campeão).

## 2. Roteiro manual

```bash
pnpm build:web && pnpm preview:web   # http://localhost:4173
```

1. Na Início, "Jogar rodada": os 10 jogos começam em 0'; o relógio leva ~45 s na velocidade
   normal; mudar para rápida e lenta.
2. Pausar (`Espaço`) por volta dos 60': fazer 2 substituições e mudar a postura; tentar colocar
   de volta quem saiu (recusado); retomar.
3. Ver o feed: gols com autor e minuto, cartões, lesões, substituições; textos variando entre
   gols.
4. No fim: resumo da partida com autores, cartões, substituições e estatísticas.
5. Em Competição → Resultados, abrir uma partida de outro clube; em Artilharia, conferir os
   goleadores.
6. Na rodada seguinte, iniciar ao vivo e apertar `F` (terminar agora); depois usar "Simular
   direto" (`D`) até a 38ª rodada: aparece a tela de fim de temporada com o campeão.
7. Recarregar no meio de uma rodada ao vivo: a carreira volta para antes dela.

## 3. E2E

```bash
pnpm build:web && pnpm test:e2e
```

Cobre: rodada ao vivo rápida com substituição pausada e resumo; temporada inteira simulada direto
até o campeão (SC-001).

## 4. Suítes

| Critério | Suíte |
|---|---|
| SC-001 38 rodadas até o campeão | `apps/web/test/flows/full-season.test.tsx`, `apps/web/e2e/full-season.spec.ts` |
| SC-002 ao vivo = direto | `packages/engine/test/season/live-round.test.ts` |
| SC-003 limite e quem saiu não volta | `packages/engine/test/season/live-round.test.ts`, `apps/web/test/ui/substitutions.test.tsx` |
| SC-004 ritmo e atualização | `apps/web/test/flows/live-round.test.tsx`, `packages/engine/test/season/live-round.test.ts` |
| SC-006 textos traduzíveis | `packages/i18n/test/events.test.ts`, `apps/web/test/i18n/no-literals.test.ts` |
| SC-007 só teclado | `apps/web/test/ui/live-keyboard.test.tsx` |
