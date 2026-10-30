# Quickstart: validar Mercado e Finanças

Pré-requisitos: `pnpm install`; Playwright instalado.

1. Qualidade: `pnpm typecheck`, `pnpm lint`, `pnpm test`.
2. Build e e2e: `pnpm build:web`, `pnpm test:e2e` (inclui `market`, `finances`, `layout`, `a11y`, `keyboard`).
3. Manual com o mundo padrão: Mercado — as quatro abas com contagens, os onze filtros com resposta imediata, Mostrar mais, modal pela linha e pelo teclado, comparação de 2 a 4 (aviso no quinto), oferta recusada com motivo, contraproposta, contratar um livre, renovar, propostas recebidas; Finanças — resumo fixo, seis abas, gráficos com legenda e texto, aplicar preço, tomar e amortizar crédito, contratar obra.
4. Só teclado: contratar um livre, fazer uma oferta recusada, ajustar a contraproposta e renovar; foco devolvido ao fechar.
5. Larguras 1 440, 1 280 e 1 024 px nos dois temas: sem rolagem horizontal da página e sem texto cortado.
6. Desempenho: abrir a aba Buscar e filtrar no mundo padrão (10 565 jogadores) e no completo (≈ 39 000) em até 200 ms.
7. Notas: `/notas-de-versao/` mostra os itens da 028 na nota 1.0.0; versão segue 1.0.0.
