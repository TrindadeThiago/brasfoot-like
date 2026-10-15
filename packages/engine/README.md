# @brasfoot-like/engine

Motor do jogo em TypeScript puro: sem React, sem DOM, sem Node e sem I/O
(Constituição, Princípio I). A UI e as ferramentas apenas consomem a API exportada por
`src/index.ts`.

## O que existe hoje (feature 001)

- **PRNG determinístico** — `createRng(seed)`, `restoreRng(state)`, `rng.fork(label)`.
- **Modelo de dados e validação** — `validateBank(input)` devolve todos os erros e avisos, como
  código + parâmetros; o texto vem de `@brasfoot-like/i18n`.
- **Gerador do mundo padrão** — `generateDefaultBank({ seed })`; o resultado versionado fica em
  `mods/default/` (`pnpm gen:default-bank`).
- **Atributos ocultos** — `completeHiddenAttributes(bank, careerSeed)`.
- **Valores derivados** — `deriveWage`, `deriveMarketValue`, `ageOn`.
- **Serialização** — `toCanonicalJson`, `splitBankFiles`, `joinBankFiles`.

Contratos completos em `specs/001-modelo-dados-banco-ficticio/contracts/`.

## Regras de determinismo (Princípio II)

Mesmo estado + mesma seed = mesmo resultado, em qualquer navegador. Por isso, em `src/`:

- toda aleatoriedade vem de um `Rng` com seed — nunca `Math.random`;
- datas são do calendário do jogo (`calendar/date.ts`) — nunca `Date` ou `performance`;
- só aritmética exata: nada de `Math.log/exp/pow/sin/cos/...` nem `**` (o resultado dessas
  funções pode variar entre engines); `Math.sqrt`, `Math.floor`, `Math.imul` são permitidos;
- use `rng.fork("rótulo")` para isolar etapas: mudar uma etapa não desloca as outras.

Essas regras são verificadas por `pnpm lint` (Biome), `pnpm typecheck` (sem tipos de DOM/Node)
e `test/architecture.test.ts`.

## Testes

`pnpm test` na raiz. O gerador é verificado com 20 seeds contra `DISTRIBUTION_LIMITS`
(`src/worldgen/limits.ts`); para recalibrar, ajuste `GENERATOR_TUNING` (`src/worldgen/tuning.ts`)
e regenere `mods/default/`.
