# Quickstart: validar Carreira, diretoria e notícias

## Preparação

```bash
pnpm install
pnpm build:web
pnpm --filter @brasfoot-like/web dev   # ou o build estático, como nas features anteriores
```

## Validação manual

1. **Diretoria** (Carreira, aba Diretoria) em 1 440 × 900: as metas com situação em texto e símbolo, a confiança com nível, tendência e três motivos, sem rolagem da página; a lista de mudanças por rodada rola dentro do cartão. Contrato: `contracts/career-screen.md`.
2. **Torcida**: faixa, tendência com símbolo, motivos e rivais; num clube novo, o estado vazio dos motivos.
3. **Propostas**: demitir o técnico (carreira com demissão e confiança baixa), abrir a Carreira e aceitar uma proposta só com Tab e Enter; conferir o aviso de mudança de país numa proposta de outro país.
4. **Histórico e Técnicos**: passagens e temporadas após uma temporada completa; tabela de técnicos com o jogador destacado e as vagas.
5. **Notícias**: trocar de rodada pelas setas, filtrar Do meu clube e por uma competição, conferir contagens e o cartão de cada manchete. Contrato: `contracts/news-screen.md`.
6. **Temas e larguras**: repetir 1 a 5 nos temas claro e escuro, em 1 440, 1 280 e 1 024 px.

## Validação automática

```bash
pnpm exec biome check && pnpm -r typecheck
pnpm --filter @brasfoot-like/web exec vitest run test/game/board-view.test.ts test/game/news-view.test.ts test/ui/career-board.test.tsx test/ui/career-fans.test.tsx test/ui/career-offers.test.tsx test/ui/career-history.test.tsx test/ui/career-notices.test.tsx test/ui/news-screen.test.tsx test/flows/board.test.tsx test/flows/fans.test.tsx test/flows/news.test.tsx
pnpm --filter @brasfoot-like/web exec playwright test e2e/career-board.spec.ts e2e/career.spec.ts e2e/fans.spec.ts e2e/news.spec.ts e2e/keyboard.spec.ts e2e/a11y.spec.ts e2e/layout.spec.ts
```

Esperado: tudo verde; o e2e de propostas aceita uma só com o teclado; o de layout confirma a Diretoria sem rolagem vertical em 1 440 × 900 e sem rolagem horizontal nas três larguras.

## Medição

Abrir a Carreira e as Notícias antes (linha de base na `release/v1.0.0`) e depois, com o mundo padrão, e registrar em `baseline.md` (como na 028).
