# Quickstart: validar Rodada ao vivo e fim de temporada

## Preparação

```bash
pnpm install
pnpm build:web
pnpm --filter @brasfoot-like/web dev   # ou o build estático, como nas features anteriores
```

## Validação manual

1. **Rodada ao vivo** (Início, Jogar rodada): placar grande, estado em texto, minuto e a barra de andamento com o intervalo marcado, sem rolagem em 1 440 × 900; clássico, mando e fase ou grupo; a linha do tempo só com os lances do meu jogo; estatísticas; os outros jogos em uma linha cada, com o gol recente em destaque. Contrato: `contracts/live-round-screen.md`.
2. **Meu time**: pausar; substituir um jogador, trocar a posição de dois jogadores e provocar os erros (limite, indisponível, esquema inválido) para ver a mensagem da causa; provocar lesão ou goleiro expulso e responder ao aviso de substituto obrigatório.
3. **Teclado**: repetir o item 2 só com o teclado (Tab, Enter, Espaço, setas).
4. **Controle**: velocidade, pausar, retomar, terminar agora e pausa automática; tentar sair no meio (diálogo) e cancelar.
5. **Pênaltis**: numa copa empatada, acompanhar a prorrogação e as cobranças.
6. **Fim da rodada**: Ver classificação, Voltar ao início e, na última rodada, Ver o resumo da temporada.
7. **Fim de temporada**: o botão na linha do título e no rodapé; o resultado do clube; "Como foi a sua temporada" (campanha por competição, total e avaliação); campeões; acesso e rebaixamento; a classificação recolhida. Contrato: `contracts/season-end-screen.md`.
8. **Temas e larguras**: repetir 1 a 7 nos temas claro e escuro, em 1 440, 1 280 e 1 024 px.

## Validação automática

```bash
pnpm exec biome check && pnpm -r typecheck
pnpm exec vitest run apps/web/test/game/live-view.test.ts apps/web/test/game/season-view.test.ts apps/web/test/game/live-feed.test.ts apps/web/test/ui/live-screen.test.tsx apps/web/test/ui/live-team.test.tsx apps/web/test/ui/live-controls.test.tsx apps/web/test/ui/leave-guard.test.tsx apps/web/test/ui/live-shootout.test.tsx apps/web/test/ui/live-round-end.test.tsx apps/web/test/ui/live-perf.test.tsx apps/web/test/ui/live-announce.test.tsx apps/web/test/ui/season-end.test.tsx apps/web/test/flows/live-round.test.tsx apps/web/test/flows/substitutions.test.tsx apps/web/test/flows/full-season.test.tsx
pnpm --filter @brasfoot-like/web exec playwright test e2e/live-round.spec.ts e2e/full-season.spec.ts e2e/keyboard.spec.ts e2e/a11y.spec.ts e2e/layout.spec.ts
```

Esperado: tudo verde; o e2e de rodada cobre pênaltis, a confirmação de saída e o teclado (substituir um lesionado, trocar a posição, responder a um goleiro expulso); a rodada de 10 jogos em velocidade rápida termina e a página responde durante ela.

## Medição

Abrir a rodada e o fim de temporada antes (linha de base na `release/v1.0.0`) e depois, com o mundo padrão, e rodar a rodada de 10 jogos medindo o tempo de cada atualização; registrar em `baseline.md` (como na 029).
