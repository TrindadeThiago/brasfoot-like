# Quickstart: validar Telas de entrada e configuração

## Preparação

```bash
pnpm install
pnpm build:web
pnpm --filter @brasfoot-like/web dev   # ou o build estático, como nas features anteriores
```

## Validação manual

1. **Menu** (`/`): chamada principal, ações com a quantidade de carreiras, rodapé, aviso de novidades, aviso de armazenamento (bloqueando o armazenamento do navegador) e dica de primeiro acesso. Contrato: `contracts/opening-and-saves.md`.
2. **Nova carreira**: tentar começar vazio (foco no primeiro erro, erro ligado ao campo), com nome longo, sem clube; escolher um clube por teclado; Sem demissão; seed; mudar de mundo (padrão e mod); filtrar por país, divisão e busca; criar e ver "criando carreira". Contrato: `contracts/new-career-screen.md`.
3. **Mundo grande**: com o mod de 440 clubes, filtrar e criar a carreira (menos de 0,5 s).
4. **Carreiras salvas**: continuar, exportar, apagar (cancelar e confirmar), importar o arquivo exportado (em outro navegador), um arquivo inválido e um de versão futura, e um conflito de id.
5. **Configurações**: velocidade, pausa automática, tema, idioma e mostrar as dicas de novo.
6. **Mods**: carregar um .zip válido e um inválido, remover, substituir, baixar o mundo padrão e usar as planilhas. Contrato: `contracts/settings-mods-about.md`.
7. **Sobre e notas de versão**: capturas novas, versões recolhíveis, "Fase beta" recolhida.
8. **Atalhos e atualização**: `?` abre a ajuda; o aviso de atualização aparece fora da rodada.
9. **Temas e larguras**: repetir 1 a 8 nos temas claro e escuro, em 1 440, 1 280 e 1 024 px.
10. **Teste de usabilidade (SC-001)**: com uma pessoa que nunca viu o jogo, sem ajuda: abrir o jogo, criar uma carreira e completar uma rodada. Anotar o tempo, os tropeços e se concluiu, em `baseline.md` e no PR.

## Validação automática

```bash
pnpm exec biome check && pnpm -r typecheck
pnpm exec vitest run apps/web/test/game/new-career-form.test.ts apps/web/test/game/saves-view.test.ts apps/web/test/ui/opening.test.tsx apps/web/test/ui/new-career-form.test.tsx apps/web/test/ui/saves-screen.test.tsx apps/web/test/ui/settings-screen.test.tsx apps/web/test/ui/mods-screen.test.tsx apps/web/test/ui/about-notes.test.tsx apps/web/test/ui/shortcuts-update.test.tsx apps/web/test/flows/new-career.test.tsx apps/web/test/flows/saves.test.tsx apps/web/test/flows/mods.test.tsx apps/web/test/flows/save-file.test.tsx apps/web/test/flows/performance.test.tsx
pnpm --filter @brasfoot-like/web exec playwright test e2e/first-run.spec.ts e2e/career.spec.ts e2e/save-file.spec.ts e2e/mods.spec.ts e2e/settings.spec.ts e2e/update.spec.ts e2e/a11y.spec.ts e2e/layout.spec.ts
```

Esperado: tudo verde; o e2e de primeiro acesso cria a carreira escolhendo o clube pelo teclado; exportar e importar devolve a carreira na mesma rodada.

## Roteiro automatizado

Os itens 1 a 8 rodam de ponta a ponta em `apps/web/e2e/quickstart.spec.ts` (o 3 em `new-career.spec.ts` e o 9 em `a11y.spec.ts` e `layout.spec.ts`):

```bash
pnpm build:web
pnpm --filter @brasfoot-like/web exec playwright test e2e/quickstart.spec.ts e2e/new-career.spec.ts
# Capturas de cada tela (dois temas, 1 440, 1 280 e 1 024 px, mais erros, diálogo de apagar e ajuda) em apps/web/screens-031/:
SCREENS=1 pnpm --filter @brasfoot-like/web exec playwright test e2e/screens.spec.ts
# Exportar no Chromium e importar no Firefox (pula se o Firefox não estiver instalado: pnpm exec playwright install firefox):
pnpm --filter @brasfoot-like/web exec playwright test e2e/cross-browser.spec.ts
```

O que sobra para uma pessoa: folhear as capturas (o visual está claro e bonito?) e o item 10 (usabilidade).
