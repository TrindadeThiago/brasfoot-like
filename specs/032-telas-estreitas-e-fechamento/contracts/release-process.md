# Contrato de processo: lançamento oficial 1.0.0

1. **Congelamento**: a `main` não recebe nada durante o marco; se recebeu uma correção urgente, mescla-se a `main` na `release/v1.0.0` antes (conflito de versão e notas a favor do 1.0.0).
2. **Gates sobre a branch** (todos verdes, nesta ordem de custo): `pnpm typecheck`, `pnpm lint`, `pnpm test`; `pnpm build:web` e `pnpm check-release`; `pnpm test:e2e`; `pnpm sim:world --seasons 30`, `pnpm sim:economy --seasons 30`, `pnpm sim:world --scale --countries 3 --seasons 30 --qualification`. O que falhar é corrigido na branch e o gate roda de novo. Resultados registrados em `baseline.md`.
3. **Conferências**: `package.json` em 1.0.0; nota do 1.0.0 revisada; `git tag -l v1.0.0` vazio; `gh release list` sem `v1.0.0`; textos do jogo, da página Sobre e das notas mostram "versão 1.0.0", com a "Fase beta" recolhida.
4. **PR final (sob pedido explícito)**: de `release/v1.0.0` para a `main`, com **merge commit**; o CI do PR roda `checks`, `unit` e `e2e`.
5. **Publicação**: o merge dispara o workflow de release (push na `main`): gates, deploy na Vercel, tag `v1.0.0` e Release do GitHub como lançamento (não pré-lançamento).
6. **Depois**: conferir o site (versão 1.0.0, capturas, notas), a tag e o Release; apagar as branches de feature já mescladas; atualizar `docs/design.md` com o fim do M10.
