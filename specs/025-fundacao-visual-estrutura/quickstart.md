# Quickstart: validar a fundação visual

Pré-requisitos: `pnpm install`; Playwright com navegadores instalados.

1. Linha de base (antes de mexer): `pnpm build:web` e registrar o tamanho de `apps/web/out` e o tempo de abertura.
2. Qualidade: `pnpm typecheck`, `pnpm lint`, `pnpm test`.
3. Build + release: `pnpm build:web` e a verificação de release (`check-release`) com versão 1.0.0.
4. E2E: `pnpm test:e2e` (a11y nos dois temas, teclado, offline, sem terceiros, layout).
5. Manual: abrir uma carreira; alternar tema escuro/claro/sistema; redimensionar para 1440, 1024 e 768 px (sem rolagem horizontal); conferir barra lateral, contadores, telas de foco, atalhos e guarda de saída; ir offline e recarregar (fontes carregam).
6. Notas: abrir `/notas-de-versao/` — nota 1.0.0 visível, "Fase beta" recolhida com as 23 notas rotuladas "beta X.Y.Z".
7. Desempenho: comparar tamanho/tempo com a linha de base (limite 10%).
