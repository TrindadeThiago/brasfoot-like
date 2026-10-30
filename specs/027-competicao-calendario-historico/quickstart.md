# Quickstart: validar Competição, Calendário e Histórico

Pré-requisitos: `pnpm install`; Playwright instalado.

1. Qualidade: `pnpm typecheck`, `pnpm lint`, `pnpm test`.
2. Build e e2e: `pnpm build:web`, `pnpm test:e2e` (inclui `calendar`, `cup`, `continental`, `regional`, `stages`, `qualification`, `layout`, `a11y`, `keyboard`).
3. Manual com o mundo padrão: Competição — abas Minhas e Demais, cartões com situação, a continental e o estadual a no máximo dois cliques da tela, classificação com zonas e forma, chaveamento com o clube destacado e o caminho, campanha só onde o clube joga; Calendário — abre no mês do próximo jogo, setas, faixa de meses, "Ir para o próximo jogo", filtro, painel, lista do mês e navegação por setas na grade; Histórico — vazio antes da primeira temporada, abas, ligação à trajetória.
4. Larguras 1 440, 1 280 e 1 024 px nos dois temas: sem rolagem horizontal da página.
5. Desempenho: temporada completa no calendário, classificação de 20 clubes e chaveamento de 32 clubes respondem em até 1 s.
6. Notas: `/notas-de-versao/` mostra os itens da 027 na nota 1.0.0; versão segue 1.0.0.
