# Quickstart: validar a feature 005

API em [contracts/lineup-api.md](contracts/lineup-api.md); telas em [contracts/ui.md](contracts/ui.md).

## 1. Gates

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Inclui `packages/engine/test/lineup/*` (validação, ajuste, troca de esquema, igualdade com o
computador, temporada inteira com a escalação do jogador), a migração v1 → v2 do save e os fluxos
do app.

## 2. Roteiro manual

```bash
pnpm build:web && pnpm preview:web   # http://localhost:4173
```

1. Abrir uma carreira criada na 004 (save v1): abre normalmente e a escalação já está preenchida.
2. `3` abre a Escalação. Trocar o esquema para 3-5-2: os mesmos 11 continuam no time, com selos de
   "fora de posição" onde couber.
3. Só com teclado: selecionar um titular, selecionar um jogador de "Fora da relação" → trocam.
   Mudar a postura para ofensiva. Apertar `A` → time idêntico ao automático no 3-5-2.
4. Pôr um jogador de linha no gol e apertar `S`: aparece "Time sem goleiro"; cancelar.
5. Em `2` (Elenco), filtrar "Atacantes" + "Disponíveis"; abrir os detalhes de um jogador: sem
   potencial/temperamento/propensão.
6. Simular rodadas até alguém se lesionar ou ser suspenso: na Início aparece o aviso de ajuste
   automático com as trocas; a escalação está válida.
7. Recarregar a página: escalação e aviso continuam como estavam.

## 3. E2E

```bash
pnpm build:web && pnpm test:e2e
```

Cobre: montar escalação → simular → conferir no resultado os titulares usados → recarregar.

## 4. Suítes

| Critério | Suíte |
|---|---|
| SC-001 nenhuma partida com escalação inválida | `packages/engine/test/lineup/validate.test.ts`, `apps/web/test/flows/lineup-simulate.test.tsx` |
| SC-002 automática = computador | `packages/engine/test/lineup/auto.test.ts` |
| SC-003 partida usa a escalação; sobrevive ao reload | `apps/web/test/flows/lineup-simulate.test.tsx`, `apps/web/e2e/lineup.spec.ts` |
| SC-004 só teclado | `apps/web/test/ui/lineup-keyboard.test.tsx` |
| SC-005 temporada inteira com ajuste | `packages/engine/test/lineup/season.test.ts` |
| SC-006 sem atributos ocultos, sem literais | `apps/web/test/ui/no-hidden.test.tsx`, `apps/web/test/i18n/no-literals.test.ts` |
| SC-007 save v1 abre | `packages/save/test/migrate-v2.test.ts` |
