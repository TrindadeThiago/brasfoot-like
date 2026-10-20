# Implementation Plan: Contratos e mercado de transferências

**Branch**: `010-mercado-transferencias` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-mercado-transferencias/spec.md`

## Summary

Todo jogador do mundo vivo ganha um contrato (`contract`: salário mensal, último ano e, se houver,
empréstimo) gravado no próprio jogador do banco — o campo é opcional no schema do mod, então mods
podem trazer contratos e o motor gera os que faltam. A folha da 008 passa a somar salários
contratuais. Um módulo novo do motor, `market/`, concentra regras e funções puras: valor de mercado
com contrato, janelas por rodada (dados em `competition.market`), busca e comparação, a máquina de
estados das negociações (clube: oferta → resposta → contraproposta; atleta: proposta → resposta →
pedido), efeitos (mover jogador, lançamentos `transfer_purchase`/`transfer_sale`, escalação),
empréstimos, propostas da IA pelos jogadores do usuário e jogadores livres. A virada ganha etapas
para devolver emprestados, renovar/expirar contratos (IA por regra simples; usuário pelo que
negociou), transformar dispensas e expirados em livres e retirar livres antigos. Save v6 com
`market` (livres, negociações, propostas, transferências da temporada); tela Mercado na web. Os
testes de longo prazo da 008/009 rodam com contratos e passam a limitar o tamanho do grupo de
livres. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.x (`strict`), Node 22

**Primary Dependencies**: motor, save, i18n do workspace; Next.js 16.4 (static export), React
19.3; Zod. Nenhuma dependência nova.

**Storage**: save v6 no IndexedDB (`market`; contratos dentro de `bank.players[].contract`);
migração v5 → v6 gera contratos

**Testing**: Vitest (motor, save, app com happy-dom + fake-indexeddb); testes de longo prazo de
economia e mundo com contratos; Playwright no fluxo de compra

**Target Platform**: navegadores modernos, desktop ≥ 1280px

**Project Type**: biblioteca (motor) + pacote de save + aplicação web estática + ferramentas

**Performance Goals**: busca com filtros sobre ~1.000 jogadores + livres < 30 ms; resposta de uma
negociação < 5 ms; virada completa continua < 2 s na app

**Constraints**: determinismo (respostas por PRNG derivado de seed + temporada + rodada + jogador +
etapa); sem `**`/funções transcendentais no motor; banco sempre válido pelo schema; dinheiro
conservado nas transferências; nenhuma regra na UI; i18n

**Scale/Scope**: ~1.000 jogadores com contrato, ~40 clubes, livres limitados (meta ≤ 150 ao fim de
cada virada), 30 temporadas nos testes de longo prazo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação pré-pesquisa e pós-design (ambas ✅):

- [x] **I. Motor separado:** valor, janelas, busca, negociações, efeitos, empréstimos, livres e
  propostas da IA no motor (`market/`); o save orquestra e persiste; a UI só exibe e despacha.
- [x] **II. Determinismo:** cada resposta usa um PRNG derivado de seed + temporada + rodada +
  jogador + etapa; clubes e jogadores processados por id; nada depende de ordem de iteração ou
  relógio.
- [x] **III. Dados, não código:** janelas, limites de contrato e sensibilidades em
  `competition.market` (opcional, Zod, com padrões `DEFAULT_MARKET`); contratos opcionais nos
  jogadores do mod.
- [x] **IV. Sem conteúdo protegido:** nada novo de conteúdo; só regras.
- [x] **V. Balanceamento verificável:** `finance/long-run.test.ts` e `renewal/long-run.test.ts`
  rodam com contratos; limite novo de livres (R11); `sim:world` e `sim:economy` mostram livres e
  folha contratual.
- [x] **VI. Saves versionados:** v6 com migração v5 → v6 (contratos gerados, mercado vazio) e
  fixtures; cadeia v1 → v6.
- [x] **VII. i18n:** textos e motivos de recusa em `ui.json`/`errors.json`.
- [x] **VIII. Offline e gratuito:** tudo local.
- [x] **IX. Testes primeiro no motor:** cada arquivo de `market/` começa pelo teste.
- [x] **Stack (v1.1.0):** sem servidor; Biome; Vitest.

Nenhuma violação; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/010-mercado-transferencias/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── market-api.md      # API do motor
│   └── save-and-ui.md     # save v6, ações do provider, telas
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
packages/engine/src/
├── market/                   # novo
│   ├── types.ts  rules.ts    # MarketState, Negotiation, FreeAgent, IncomingOffer…; DEFAULT_MARKET, marketRules
│   ├── contracts.ts          # initialContract, contractFor, ensureContracts, isLastYear
│   ├── value.ts              # marketValue (valor derivado × fator de contrato)
│   ├── windows.ts            # windowsFor, isWindowOpen, nextWindow
│   ├── search.ts             # searchPlayers, comparePlayers (só atributos visíveis)
│   ├── squad.ts              # canAdd/canRemove (limites da 009)
│   ├── club-response.ts      # askingPrice, respondToOffer, respondToCounter
│   ├── player-response.ts    # interest, wageDemand, respondToContract
│   ├── negotiation.ts        # startNegotiation, offer, answerCounter, proposeContract, answerDemand
│   ├── effects.ts            # completeTransfer/loan/signing/renewal (mundo, finanças, mercado)
│   ├── incoming.ts           # generateIncomingOffers, answerIncomingOffer, expireOffers
│   ├── free-agents.ts        # toFreeAgent, signFreeAgent, ageOutFreeAgents
│   └── turnover.ts           # etapas return-loans, expire-contracts, release-to-free-agents, age-out-free-agents
├── derived/economy.ts        # deriveWage inalterado (base do contrato)
├── finance/{types,create}.ts # categorias transfer_purchase/transfer_sale; folha por contrato
├── renewal/{youth,squads}.ts # jovens com contrato; dispensados devolvidos para virar livres
├── career/{types,turnover}.ts# market no contexto/resultado; etapas novas na ordem padrão
├── model/schemas.ts          # players[].contract opcional; competitions[].market opcional
└── index.ts
packages/engine/test/market/*.test.ts

packages/save/src/{format,create,migrate,career,market}.ts  (+ testes, fixtures v5)
packages/i18n/locales/pt-BR/{ui,errors}.json
apps/web/src/
├── game/GameProvider.tsx     # ações do mercado; propostas na rodada
├── app/jogo/mercado/page.tsx # busca, comparação, negociações, propostas, contratos
├── ui/market/*.tsx           # filtros, tabela, comparação, painel de negociação
├── app/jogo/elenco/page.tsx  # coluna Contrato (fim) e destaque do último ano
├── ui/AppHeader.tsx  game/GameLayout.tsx  # tela Mercado, atalho m
└── ui/MarketNotice.tsx       # cartão da Início (propostas, contratos terminando)
apps/web/test/flows/market.test.tsx   apps/web/e2e/market.spec.ts
tools/src/{simulate-world,simulate-economy}.ts  # livres e folha contratual no relatório
```

**Structure Decision**: o contrato vive no jogador do banco (como força e posição), para viajar
com ele por evolução, aposentadoria, renovação, partidas e telas sem mapas paralelos; o que não
cabe no banco (livres, negociações, propostas, histórico de transferências) fica em `MarketState`
no save — o mesmo padrão de `finances` e `renewal`. `market/` liga-se à carreira pelas etapas da
virada e por uma função de rodada chamada pelo save depois de `completeCareerRound`.

## Complexity Tracking

Sem violações da constituição.
