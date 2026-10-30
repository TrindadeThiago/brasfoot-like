# Quickstart: validar Telas estreitas, acessibilidade e fechamento do marco

## Preparação

```bash
pnpm install
pnpm build:web
```

## Validação automática

```bash
pnpm typecheck && pnpm lint
pnpm exec vitest run apps/web/test/ui/style-audit.test.ts apps/web/test/ui/tips-anchors.test.tsx apps/web/test/ui/contrast.test.ts apps/web/test/ui/headings.test.tsx
pnpm --filter @brasfoot-like/web exec playwright test e2e/responsive.spec.ts e2e/a11y.spec.ts e2e/keyboard.spec.ts e2e/reduced-motion.spec.ts e2e/layout.spec.ts e2e/offline.spec.ts
```

Esperado: tudo verde; a matriz responsiva cobre todas as telas, abas e diálogos em 1 440, 1 024, 768 e 600 px e com zoom de 200%, nos dois temas.

## Validação manual (contratos `responsive-layout.md` e `accessibility-review.md`)

1. Percorrer o jogo em 1 440, 1 024 e 768 px, nos dois temas, sem rolagem horizontal da página e sem texto cortado.
2. Estreitar a janela abaixo de 768 px: a barra lateral empilha e as colunas viram uma.
3. Com o leitor de tela (ou o inspetor de acessibilidade do navegador), conferir títulos, regiões e nomes; jogar uma rodada ao vivo ouvindo os anúncios.
4. Só com o teclado: nova carreira, rodada ao vivo, mercado e diretoria.
5. Ligar "reduzir movimento" no sistema e conferir que nada anima.
6. Abrir cada tela com as dicas ligadas e conferir as âncoras; abrir a ajuda de atalhos em duas telas.
7. Ver as capturas da página Sobre, do README e os ícones.

## Gates do release (contrato `release-process.md`)

```bash
pnpm check-release
pnpm test:e2e
pnpm sim:world --seasons 30
pnpm sim:economy --seasons 30
pnpm sim:world --scale --countries 3 --seasons 30 --qualification
```

As simulações são longas (~15 minutos cada); rodar em segundo plano e registrar em `baseline.md`.

## Lançamento (só sob pedido)

PR de `release/v1.0.0` para a `main` com merge commit; conferir a tag `v1.0.0`, o Release do GitHub e o site depois do workflow.
