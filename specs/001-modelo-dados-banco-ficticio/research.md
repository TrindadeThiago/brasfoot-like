# Research: Modelo de dados e banco fictício

**Feature**: `001-modelo-dados-banco-ficticio` | **Date**: 2026-10-14

Cada item segue o formato Decisão / Razão / Alternativas consideradas.

## R1. Organização do repositório

- **Decisão**: monorepo com workspaces do pnpm. Nesta feature existem dois pacotes:
  `packages/engine` (motor) e `packages/i18n` (catálogos de mensagens e formatação). A UI
  (`apps/web`, Next.js em static export) entra no Marco 2.
- **Razão**: a constituição exige que a fronteira do motor seja verificável. Um pacote próprio
  com `tsconfig` e regras do Biome específicas torna a fronteira explícita; o i18n fica fora do
  motor porque a tradução pertence à camada de apresentação (Princípio VII).
- **Alternativas**: diretório único `src/engine` (fronteira só por convenção, mais fácil de
  vazar); npm workspaces (funciona, mas pnpm já está instalado e é mais estrito com dependências
  não declaradas, o que reforça a fronteira).

## R2. Versões das ferramentas

- **Decisão**: Node 22 LTS (22.14 instalado), pnpm 11, **TypeScript 6.0.x** (`strict`), Vitest 5,
  Zod 4, **Biome 2.5** (lint + formatação), `intl-messageformat` 12, `tsx` para scripts. No
  Marco 2: Next.js 16 + React 19 em static export.
- **Razão**: TypeScript 7.0 é o mais recente, mas o pacote `typescript@7` não expõe mais a API
  JavaScript clássica (só `unstable/*`), da qual o Next.js depende para checar tipos no build.
  Fixamos 6.0.x e reavaliamos quando o Next.js suportar TS 7. Biome substitui ESLint + Prettier
  com uma ferramenta só, rápida e sem dependência da versão do TypeScript.
- **Alternativas**: TS 7 (quebra o build do Next.js no Marco 2; trocar de versão depois custa
  mais que começar na 6.0); ESLint + typescript-eslint (limitado a TS < 6.1, mais
  configuração; preterido em favor do Biome por decisão do projeto).

## R3. Gerador pseudoaleatório (PRNG)

- **Decisão**: implementação própria de **xoshiro128\*\*** (estado de 4 × uint32), semeado por
  **splitmix32**. A seed pública é uma string ou inteiro, convertida em 128 bits por um hash
  determinístico (cyrb128). O estado é um objeto serializável `{ s: [n, n, n, n] }`.
  Sub-geradores são derivados por rótulo (`rng.fork("club:serie-a:07")`), hash(seed-pai + rótulo).
- **Razão**: código pequeno, rápido, só operações inteiras de 32 bits (`Math.imul`, `>>>`),
  idênticas em qualquer engine JS. O fork por rótulo isola etapas do gerador: mudar como um clube
  é gerado não desloca a sequência dos outros, o que mantém testes e o banco padrão estáveis.
- **Alternativas**: `seedrandom`/`pure-rand` (dependência externa para ~40 linhas; menos controle
  sobre a serialização do estado); mulberry32 (estado de 32 bits, período curto para simulações
  longas de 30 temporadas).

## R4. Determinismo numérico entre engines

- **Decisão**: o motor usa somente operações IEEE-754 exatas (`+ - * /`, `Math.floor/round/
  min/max/abs/sqrt`, `Math.imul`). É proibido `Math.log/exp/pow/sin/cos` em código que afeta
  resultados. Distribuições aproximadamente normais usam **Irwin–Hall** (soma de 4 uniformes);
  distribuições assimétricas usam triangular. Potências inteiras são multiplicações explícitas.
- **Razão**: a especificação do ECMAScript não exige arredondamento correto das funções
  transcendentais; elas podem diferir entre V8, SpiderMonkey e JavaScriptCore, quebrando
  "mesma seed = mesmo resultado" entre navegadores. Operações básicas são exatas por norma.
- **Alternativas**: Box–Muller (usa `log` e `cos`); tabela de quantis pré-computada (funciona,
  mas Irwin–Hall é mais simples e suficiente para gerar forças).
- **Verificação**: teste de arquitetura (R15) bloqueia essas funções em `packages/engine/src`.

## R5. Datas sem `Date`

- **Decisão**: datas do jogo são strings ISO `YYYY-MM-DD` no formato de dados e, internamente,
  um número de dias desde uma época (algoritmo *days-from-civil* de Howard Hinnant). Idade =
  diferença de calendário entre nascimento e data de referência.
- **Razão**: o Princípio II proíbe `new Date()`/`Date.now` no motor; aritmética de datas inteira
  é trivial e determinística, sem fuso horário.
- **Alternativas**: `Date.UTC` (determinístico, mas abre exceção na proibição de `Date` e convida ao
  uso de `new Date`); bibliotecas de data (dependência desnecessária).

## R6. Formato do banco (mod) em disco

- **Decisão**: um banco é um diretório com `mod.json` (metadados) e um arquivo por seção:
  `countries.json`, `competitions.json`, `clubs.json`, `players.json`. Em memória, o motor recebe
  um único objeto `ModPackage` com essas seções; ler/escrever disco é tarefa de um adaptador
  (script Node agora, IndexedDB/Electron depois). Chaves do JSON em inglês.
- **Razão**: arquivos por seção ficam editáveis à mão e diffáveis; o erro de validação aponta a
  seção (= arquivo), o índice e o campo. Chaves em inglês mantêm o formato neutro para traduções
  futuras (espanhol, inglês) e consistente com os identificadores do código.
- **Alternativas**: arquivo único (fica enorme com ~1.000 jogadores); chaves em português (o
  formato é aberto a uma comunidade multilíngue no futuro).

## R7. Identificadores de catálogo (posições, características, escudos)

- **Decisão**: identificadores neutros em inglês no formato de dados; rótulos visíveis vêm do
  i18n. Posições: `GK, FB, CB, DM, MF, FW`, exibidas em pt-BR como GOL, LAT, ZAG, VOL, MEI, ATA
  (FR-013 atendido na apresentação). Características: `finisher` (Artilheiro), `wall` (Muralha),
  `free-kick` (Cobrador de falta), `heading` (Cabeceio), `pace` (Velocidade), `playmaker`
  (Armador). Escudos: `classic, round, triangle, rectangle`.
- **Razão**: o formato não depende do idioma; adicionar espanhol não muda os dados (Princípio VII).
- **Alternativas**: usar as siglas em português como identificadores (simples para o público
  inicial, mas mistura idioma no formato aberto).

## R8. Validação: estrutura com Zod + regras semânticas próprias

- **Decisão**: duas fases. (1) **Estrutural**: schemas Zod validam cada entidade
  **individualmente** (cada item de cada seção), coletando todos os problemas; os itens válidos
  seguem adiante, mas os ids de todos os itens (válidos ou não) são registrados. Campos
  desconhecidos são detectados comparando as chaves do objeto com as do schema (que roda em modo
  `strip`) e viram **avisos** `schema.unknown_field`. (2) **Semântica**: funções próprias
  verificam referências, unicidade, elencos e regras de acesso/rebaixamento sobre os itens
  válidos. Os problemas do Zod são traduzidos para os códigos do projeto. Resultado:
  `{ ok: true, bank, warnings }` ou `{ ok: false, errors, warnings }`.
- **Razão**: validar item a item permite reportar N defeitos independentes em uma passada
  (SC-004) sem cascata: um clube com cor inválida não gera "clube inexistente" nos seus jogadores,
  porque o id dele está registrado. Regras entre entidades ficam legíveis em código próprio em
  vez de `superRefine` gigantes. Códigos próprios desacoplam as mensagens do Zod (Princípio VII).
- **Alternativas**: um único `schema.parse` do banco inteiro (falha estrutural impede a fase
  semântica; mensagens do Zod em inglês fixo); só validação manual (perde inferência de tipos).

## R9. Mensagens de erro e i18n

- **Decisão**: o motor exporta a lista de códigos (`ISSUE_CODES`) e produz
  `ValidationIssue { severity, code, section, path, entityId?, params }`. O pacote
  `packages/i18n` contém `locales/pt-BR/errors.json` com mensagens em **ICU MessageFormat** e uma
  função `formatIssue(issue, locale)` baseada em `intl-messageformat`. Um teste garante que todo código
  tem mensagem pt-BR e que toda mensagem compila e usa só parâmetros declarados.
- **Razão**: ICU cobre plural e gênero com frases completas; `intl-messageformat` é puro, roda em
  Node e no navegador, e é o mesmo núcleo que bibliotecas React (react-intl) usam no Marco 2.
- **Alternativas**: i18next (formato próprio de plural; ICU via plugin); mensagens no motor
  (viola o Princípio VII).

## R10. Serialização canônica

- **Decisão**: serialização própria `toCanonicalJson(value)` com chaves ordenadas e indentação
  fixa de 2 espaços, terminando com `\n`. Números do formato são inteiros.
- **Razão**: "idêntico byte a byte" (US1) não pode depender da ordem de inserção das chaves; e o
  banco padrão versionado no repositório precisa de diffs estáveis.
- **Alternativas**: `JSON.stringify` puro (depende da ordem de construção dos objetos).

## R11. Banco padrão versionado no repositório

- **Decisão**: o banco padrão é gerado por `pnpm gen:default-bank` com a seed fixa
  `"brasfoot-like-default-1"` e gravado em `mods/default/`. Um teste "golden" regenera em memória
  e compara com os arquivos versionados.
- **Razão**: o banco padrão é literalmente "o primeiro mod": arquivos no mesmo formato que um
  modder escreveria, servindo de exemplo e de fixture. O teste golden garante que mudanças no
  gerador são intencionais (o diff aparece no PR).
- **Alternativas**: gerar em runtime a cada novo jogo (não serve de exemplo para modders e
  esconde mudanças acidentais).

## R12. Calibragem do gerador

- **Decisão**: o gerador funciona em camadas:
  1. **Clubes**: sorteia o número de grandes (4–6) e médios (8–10) da Série A; na Série B, 0–1
     "gigante caído", 4–6 médios e o resto pequenos. A reputação vem da camada (grande 75–95,
     médio 55–74, pequeno 30–54) e o **nível técnico** do clube = f(reputação) + ruído.
  2. **Elenco**: sorteia as quantidades por posição dentro das faixas do FR-030 até o total ficar
     em 23–28.
  3. **Jogadores**: força = nível do clube + deslocamento pelo papel no elenco (titular/reserva/
     jovem) + ruído Irwin–Hall, limitada a 20–99; idade triangular 17–36 com moda 25; 0, 1 ou 2
     características ponderadas pela posição (55% com ≥ 1, ~10% com 2). O gerador **não** grava
     atributos ocultos (FR-017a).
  3b. **Atributos ocultos**: gerados à parte por `completeHiddenAttributes(bank, careerSeed)`,
     com um sub-gerador por jogador (`fork("hidden:" + id)`): potencial = força + margem
     decrescente com a idade (≥ força, ≤ 100); temperamento e propensão a lesões ~ Irwin–Hall
     centrado em 50. Os testes do FR-035 rodam sobre o banco completado com várias seeds de
     carreira.
  4. **Craques**: força ≥ 85 só aparece por sorteio raro em clubes grandes (alvo ~1% do total).
  - As constantes ficam em um objeto `GENERATOR_TUNING` versionado; os limites do FR-030 a FR-036
    ficam em `DISTRIBUTION_LIMITS`, usado pelos testes de distribuição com 20 seeds.
- **Razão**: separar constantes de calibragem dos limites verificados atende ao Princípio V: o
  gerador pode ser recalibrado, mas o teste com limites explícitos é o juiz.
- **Alternativas**: sorteio independente de cada jogador a partir de uma distribuição global
  (não cria hierarquia entre clubes; falha no FR-033).

## R13. Salário e valor de mercado derivados

- **Decisão**: funções puras `deriveWage(player, club, refDate)` e `deriveMarketValue(...)` com
  aritmética inteira: base cúbica na força (s·s·s, multiplicação explícita), multiplicadores por
  idade (tabela por faixa), potencial (jovens) e reputação do clube. Resultado arredondado para
  múltiplos de 100 e sempre ≥ um piso positivo.
- **Razão**: crescimento superlinear separa craques de medianos; tabelas e multiplicações evitam
  `Math.pow` (R4). A calibração real vem na feature de finanças (Marco 3), como a spec prevê.
- **Alternativas**: valores armazenados no banco (o modder teria que balancear a economia à mão).

## R14. Bancos de nomes e conteúdo protegido

- **Decisão**: bancos de nomes em `packages/engine/src/worldgen/name-banks/default.json` (prenomes,
  sobrenomes, cidades fictícias, prefixos e sufixos de clube, nome do país), validados por um
  schema Zod próprio. Cidades e clubes são inventados (ex.: "Vila Serena", "Porto Alvo"). Um teste
  compara nomes de clubes, cidades e o país gerados contra uma **lista de bloqueio** de clubes
  reais conhecidos e capitais brasileiras (`blocklist.json`, só usado em testes).
- **Razão**: prenomes e sobrenomes comuns não são conteúdo protegido; o risco está em clubes e
  marcas. A lista de bloqueio transforma o Princípio IV em verificação automática.
- **Alternativas**: revisão só manual (não impede regressões quando os bancos de nomes crescem).

## R15. Fronteira do motor verificável

- **Decisão**: (a) `packages/engine/tsconfig.json` com `"lib": ["ES2023"]` e `"types": []`, sem
  `DOM` e sem `@types/node`: qualquer uso de `window`, `document`, `IndexedDB` ou `fs` falha no
  typecheck. (b) Biome, com `overrides` para `packages/engine/src/**`:
  `noRestrictedImports` (react, react-dom, next, `node:*`) e `noRestrictedGlobals` (`Date`,
  `performance`, `window`, `document`, `globalThis`). (c) **Teste de arquitetura** no Vitest
  (`packages/engine/test/architecture.test.ts`) que percorre `src/` e falha ao encontrar
  `Math.random`, `Math.log/exp/pow/sin/cos/tan/atan2/...` ou `new Date`. Sem as regras
  `no-restricted-properties`/`no-restricted-syntax` do ESLint, o Biome não bloqueia chamadas
  de membro como `Math.random` de forma nativa; o teste cobre essa lacuna e roda no mesmo gate
  dos demais testes. (d) Scripts Node ficam no pacote `tools/`, fora do motor, com
  tsconfig próprio.
- **Razão**: transforma os Princípios I e II em gates automáticos de merge, com as ferramentas
  já escolhidas (Biome, Vitest), sem dependência extra.
- **Alternativas**: plugin GritQL do Biome para `Math.random` (possível, mas o escopo por
  diretório de plugins é menos maduro; pode ser somado depois para feedback no editor);
  dependency-cruiser (mais uma ferramenta para o que Biome, tsconfig e teste já resolvem).

## Nota (feature 003)

A calibragem de R12 foi revista na feature 003: o nível técnico ficou mais achatado
(49,9 + 0,22 × reputação) e o FR-033 foi emendado (Série A ≥ 4 acima da B; grandes ≥ 5,5 acima dos
pequenos), para que a temporada não fosse previsível demais. Detalhes em
`specs/003-temporada-pontos-corridos/research.md` R12.
