# Quickstart: validar a 016

## Pré-requisitos

`pnpm install`; Chromium do Playwright (`pnpm exec playwright install chromium`).

## Verificações automáticas

```bash
pnpm typecheck && pnpm lint && pnpm test   # inclui contraste, atalhos, textos sem uso, notas, nome
pnpm build:web && pnpm test:e2e            # inclui a11y (2 temas), teclado, offline, sem terceiros
pnpm check-release                         # depois do build
```

Esperado: tudo verde. Testes de desempenho (`packages/save/test/performance-30.test.ts`,
`apps/web/test/flows/performance.test.tsx`) dentro dos limites de `research.md` R1.

## Cenários manuais (`pnpm dev:web` ou `pnpm preview:web`)

1. **Primeiro acesso** (US1): janela anônima → boas-vindas → Nova carreira → dicas na tela do
   jogo, escalação, rodada, competição, mercado, carreira; cada uma some e não volta ao
   recarregar. Configurações → "Mostrar as dicas de novo" → voltam.
2. **Configurações** (US2): tema claro → todas as telas claras; recarregar mantém; "seguir o
   sistema" acompanha o SO; velocidade rápida → próxima rodada ao vivo começa rápida.
3. **Atalhos** (US3): `?` na inicial, carreiras, mods, configurações e no jogo → grupos Gerais e
   Desta tela; `,` abre Configurações; Esc fecha.
4. **Teclado** (US4): Tab do início ao fim do fluxo nova carreira → rodada → tabela, sempre
   vendo o foco, nos dois temas.
5. **Versão** (US5): rodapé mostra "Versão 1.0.0"; Notas de versão abre offline.
6. **Atualização** (US5): `pnpm preview:web`, abrir o jogo; mudar algo, rebuild; recarregar uma
   vez → aviso "Nova versão disponível" → Recarregar → nova versão, carreira intacta.
7. **Sobre** (US6): `/sobre/` com descrição, capturas, aviso de conteúdo.

## Teste de usabilidade (SC-001)

- Participante: alguém que nunca viu o jogo. Navegador limpo no endereço publicado (ou preview).
- Tarefa dita uma vez: "Crie uma carreira como técnico de um time e jogue a primeira rodada."
- Observador: não responde perguntas nem aponta nada; anota tempo até criar a carreira e até
  terminar a rodada, onde hesitou, o que perguntou, dicas dispensadas sem ler.
- Sucesso: termina sem ajuda em até 10 minutos.
- Registrar em `specs/016-polimento-publicacao/usability.md`; ajustes de dica/texto antes da
  tag `v1.0.0`.

## Publicação

Ver `contracts/release.md` (roteiro de lançamento). Após `git push --tags`: o workflow `release`
fica verde e o endereço da Vercel serve a versão 1.0.0; offline após o primeiro carregamento.
