# Quickstart: validar as telas do clube

Pré-requisitos: `pnpm install`; Playwright instalado.

1. Qualidade: `pnpm typecheck`, `pnpm lint`, `pnpm test`.
2. Build e e2e: `pnpm build:web`, `pnpm test:e2e` (inclui `lineup`, `a11y`, `keyboard`, `layout`).
3. Manual (carreira com 40 jogadores): Início — cartão do próximo jogo no alto, avisos com suas ações, Jogar rodada e Simular direto funcionam; Elenco — clicar numa linha abre o modal, vender, rescindir e renovar a partir dele; Escalação — trocar jogador por mouse e por teclado, Escalar automaticamente, "Fora da relação".
4. Larguras 1 440, 1 280 e 1 024 px nos dois temas: sem rolagem horizontal da página e sem texto cortado.
5. Teclado: Tab pelas três telas; Enter no nome abre o modal; Esc fecha; foco volta à linha.
6. Dicas de primeiro acesso: limpar preferências e abrir cada tela.
7. Notas: `/notas-de-versao/` mostra os itens novos da 026 na nota 1.0.0; versão segue 1.0.0.
