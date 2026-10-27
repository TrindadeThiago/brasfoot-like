<!--
Sync Impact Report
- Versão: 1.1.0 → 1.2.0 (MINOR: ampliação material do Princípio IV)
- Princípios modificados: IV. Nenhum Conteúdo Protegido (mesmo título)
  - Antes: nenhum nome, escudo, marca ou imagem real de clube, jogador, competição ou entidade.
  - Agora: o mesmo para clubes, jogadores, competições e entidades; nomes de lugares (países,
    estados e cidades) NÃO são conteúdo protegido e PODEM ser os reais.
- Seções adicionadas/removidas: nenhuma
- Templates:
  - ✅ .specify/templates/plan-template.md — gate IV com a ressalva dos lugares
  - ✅ .specify/templates/tasks-template.md — sem mudança necessária
  - ✅ .specify/templates/spec-template.md — sem mudança necessária
  - ✅ docs/design.md §2 — estratégia de modding com a ressalva dos lugares
  - ⚠ packages/engine/test/fixtures/blocklist.json e seus testes — serão reestruturados na 024 (T011, T012)
- Motivo: a 024 (mod mundo completo) usa países, estados e cidades reais; clubes, competições e
  jogadores seguem fictícios.
- TODOs adiados: nenhum
-->

<!--
Sync Impact Report
- Versão: 1.0.0 → 1.1.0 (MINOR: mudança material na seção "Stack e Restrições Técnicas")
- Princípios modificados: nenhum
- Seção alterada: "Stack e Restrições Técnicas"
  - UI web: React + Vite → Next.js (React) com static export obrigatório e sem recursos de
    servidor
  - Adicionado: Biome como linter/formatador único
  - Verificação da fronteira do motor: Biome + teste de arquitetura com Vitest
- Seções adicionadas/removidas: nenhuma
- Templates:
  - ✅ .specify/templates/plan-template.md — sem mudança necessária (gates I–IX inalterados)
  - ✅ .specify/templates/tasks-template.md — sem mudança necessária
  - ✅ .specify/templates/spec-template.md — sem mudança necessária
  - ✅ docs/design.md §2 — stack atualizada
- TODOs adiados: nenhum

Histórico:
- 1.0.0 (2026-10-14): ratificação inicial (template sem versão → 1.0.0)
- Princípios definidos (template → novo):
  - [PRINCIPLE_1] → I. Motor Separado da Interface
  - [PRINCIPLE_2] → II. Determinismo
  - [PRINCIPLE_3] → III. Dados, Não Código
  - [PRINCIPLE_4] → IV. Nenhum Conteúdo Protegido
  - [PRINCIPLE_5] → V. Balanceamento Verificável
  - (novo) → VI. Saves Versionados
  - (novo) → VII. Internacionalização Desde o Início
  - (novo) → VIII. Offline e Gratuito
  - (novo) → IX. Testes Primeiro no Motor (INEGOCIÁVEL)
- Seções adicionadas: "Stack e Restrições Técnicas", "Fluxo de Desenvolvimento"
- Seções removidas: nenhuma
- Templates:
  - ✅ .specify/templates/plan-template.md — Constitution Check com os gates I–IX
  - ✅ .specify/templates/tasks-template.md — testes obrigatórios para o motor (Princípio IX)
  - ✅ .specify/templates/spec-template.md — sem mudança necessária
  - ✅ .claude/skills/speckit-* — sem referências desatualizadas
- TODOs adiados: nenhum
-->

# Constituição do brasfoot-like

Jogo de gerenciamento de futebol no estilo do clássico Brasfoot. O documento de design de
referência é `docs/design.md`. Em caso de conflito, esta constituição prevalece.

## Core Principles

### I. Motor Separado da Interface

- Toda a lógica de jogo (simulação de partidas, regras de competição, IA, economia, mercado,
  evolução de jogadores, narrativa) DEVE viver em um pacote TypeScript puro (o "motor").
- O motor NÃO PODE importar React, acessar o DOM nem usar APIs do navegador (`window`,
  `document`, `localStorage`, `IndexedDB`, `fetch` etc.) ou do Node específicas de plataforma.
- A UI apenas consome a API pública do motor: lê estado e dispara comandos. Nenhuma regra de
  jogo pode ser implementada ou duplicada na UI.
- Persistência, relógio de exibição e I/O ficam em adaptadores fora do motor.

**Razão:** permite testar o motor isoladamente, rodar simulações longas em scripts e reaproveitar
o mesmo motor na web e no desktop (Electron).

### II. Determinismo

- Toda aleatoriedade do motor DEVE passar por um gerador pseudoaleatório (PRNG) com seed
  explícita, cujo estado é parte serializável do estado do jogo.
- É PROIBIDO usar `Math.random`, `Date.now`, `new Date()`, `performance.now` ou qualquer fonte
  não determinística dentro do motor. Datas do jogo são datas do calendário simulado.
- Mesmo estado + mesma seed DEVE produzir exatamente o mesmo resultado, inclusive após salvar
  e carregar.
- A ordem de iteração que afeta resultados NÃO PODE depender de ordem de inserção acidental
  ou de ordenação instável.
- O "simular direto" e a rodada ao vivo DEVEM usar o mesmo motor e produzir o mesmo resultado.

**Razão:** reprodutibilidade de bugs, testes confiáveis e desafios por seed no futuro.

### III. Dados, Não Código

- Países, competições, formatos de disputa (pontos corridos, mata-mata, grupos), critérios de
  desempate, acesso/rebaixamento e o banco de times e jogadores DEVEM ser dados.
- Todo dado externo (banco padrão, mods, saves importados) DEVE ser validado por schema Zod,
  com mensagens de erro claras que indiquem o arquivo e o campo inválido.
- Adicionar uma liga ou país NÃO PODE exigir mudança na lógica do motor. Se exigir, falta um
  conceito no formato de dados, e ele deve ser modelado.

**Razão:** modding de primeira classe e expansão do mundo como trabalho de dados.

### IV. Nenhum Conteúdo Protegido

- Nenhum nome, escudo, marca ou imagem real de clube, jogador, competição ou entidade PODE ser
  distribuído com o jogo ou incluído no repositório.
- Nomes de lugares (países, estados e cidades) NÃO são conteúdo protegido e PODEM ser os reais;
  nomes de clubes, competições e jogadores continuam fictícios, mesmo quando contêm o nome de um
  lugar, desde que o nome inteiro não seja o de um clube ou competição real.
- O banco padrão é fictício e DEVE usar exatamente o mesmo formato aberto e documentado dos
  mods ("o primeiro mod").
- Escudos padrão são dados (cores, forma, iniciais) renderizados em SVG.
- Nomes de competições ficam no mod, nunca nas traduções.

**Razão:** segurança jurídica para publicar; a comunidade fornece nomes reais via mods. Lugares são
fatos geográficos, não marcas, e deixá-los reais torna o mundo reconhecível sem risco jurídico.

### V. Balanceamento Verificável

- Todo sistema que afeta o equilíbrio do mundo (forças e evolução de jogadores, geração de
  jovens, regulador global, economia, mercado e IA de transferências) DEVE ter testes
  automatizados de simulação longa, sem interação, com limites numéricos explícitos
  (ex.: faixa da força média, número de craques, caixa dos clubes, placares médios).
- Os limites ficam declarados no próprio teste ou em configuração versionada, não em
  comentários ou intuição.
- Uma mudança que quebre um limite DEVE ajustar o sistema ou justificar e revisar o limite
  explicitamente na mesma alteração.

**Razão:** um mundo que se degrada após várias temporadas destrói o jogo, e isso só aparece em
simulação longa.

### VI. Saves Versionados

- O formato de save DEVE ter número de versão desde a primeira versão publicada.
- Toda mudança incompatível no formato DEVE vir com uma migração da versão anterior e um teste
  que abre um save da versão anterior (fixture) e valida o resultado.
- Saves antigos DEVEM continuar abrindo; migrações são encadeadas (v1 → v2 → … → atual).
- O save contém sua própria cópia do banco de dados do mod; trocar de mod não corrompe
  carreiras em andamento.

**Razão:** carreiras longas são o centro do jogo; perder um save é perder a confiança do
jogador.

### VII. Internacionalização Desde o Início

- Nenhum texto visível ao usuário PODE ficar fixo no código; todo texto passa pelo sistema de
  i18n por chave.
- Mensagens DEVEM ser frases completas com variáveis (sem concatenar fragmentos) e suportar
  plural e gênero (ex.: formato ICU MessageFormat).
- O motor produz eventos e dados estruturados (ex.: id do template de manchete + variáveis),
  não texto final; a tradução acontece na camada de apresentação.
- pt-BR é o único idioma do lançamento, mas adicionar um idioma NÃO PODE exigir mudança de
  código.

**Razão:** traduções futuras (espanhol, inglês) sem reescrita.

### VIII. Offline e Gratuito

- O jogo DEVE funcionar sem servidor e sem conexão após carregado; a hospedagem é um site
  estático.
- É PROIBIDO: LLM ou serviço de IA em runtime, anúncios, monetização, telemetria que exija
  servidor próprio e qualquer dependência de rede para jogar.
- Conteúdo gerado (manchetes, nomes) vem de templates e bancos de dados locais.

**Razão:** gratuito, sem custo de operação e determinístico.

### IX. Testes Primeiro no Motor (INEGOCIÁVEL)

- Regras do motor DEVEM ser cobertas por testes unitários com Vitest, escritos antes ou junto
  da implementação (vermelho → verde → refatorar).
- Todo bug do motor DEVE ser reproduzido primeiro por um teste (estado + seed) que falha, e só
  então corrigido; o teste permanece como regressão.
- Código do motor sem teste não é considerado pronto.

**Razão:** o motor é a parte mais complexa e mais difícil de depurar pela UI.

## Stack e Restrições Técnicas

- **Linguagem:** TypeScript com `strict: true`; `any` só com justificativa explícita.
- **UI web:** Next.js (React) **exclusivamente em modo static export** (`output: "export"`).
  São PROIBIDOS recursos que exigem servidor: rotas de API/route handlers dinâmicos, SSR por
  requisição, server actions, middleware e otimização de imagens em runtime. O build gera
  arquivos estáticos que rodam offline e servem de base para o Electron.
- **Testes:** Vitest (motor, schemas, migrações e simulações longas).
- **Lint e formatação:** Biome, como ferramenta única para todo o monorepo.
- **Schemas:** Zod para banco, mods, configuração e saves.
- **Persistência:** IndexedDB no navegador; arquivo em disco no desktop (Electron, futuro),
  ambos atrás de um adaptador comum. Exportar/importar save em JSON compactado.
- **Hospedagem:** site estático (GitHub Pages, Cloudflare Pages, itch.io). Sem backend.
- **Organização:** o motor é um pacote/diretório próprio cuja fronteira de dependências é
  verificável: tsconfig do motor sem tipos de DOM/Node, regras do Biome que bloqueiam imports
  e globais proibidos, e um teste de arquitetura (Vitest) que falha se o código do motor usar
  APIs não determinísticas.
- **Idioma:** documentação, specs, planos e tarefas em português. Identificadores de código
  podem ser em inglês, de forma consistente.

## Fluxo de Desenvolvimento

- Desenvolvimento orientado a especificação (Spec Kit): specify → clarify → plan → tasks →
  implement, por marco do roadmap (`docs/design.md`, seção 13).
- O motor vem antes da UI; cada marco termina jogável de ponta a ponta e atende ao critério
  "pronto quando…" do roadmap.
- Todo plano DEVE passar pelo Constitution Check (princípios I–IX) antes da pesquisa e de novo
  após o design; violações exigem justificativa na tabela de complexidade do plano.
- Gates de merge: tipagem sem erros, testes unitários verdes, testes de simulação longa
  relevantes verdes e nenhuma string visível fora do i18n.

## Governance

- Esta constituição prevalece sobre outras práticas e documentos do projeto, incluindo
  `docs/design.md` em caso de conflito.
- Emendas são feitas via `/speckit-constitution`, com registro no Sync Impact Report e
  propagação aos templates em `.specify/templates/`.
- Versionamento semântico: MAJOR para remoção ou redefinição incompatível de princípio;
  MINOR para novo princípio ou seção, ou ampliação material; PATCH para esclarecimentos e
  redação.
- Toda spec, plano e revisão de código DEVE verificar conformidade com os princípios;
  exceções são temporárias, justificadas por escrito e acompanhadas de plano de remoção.

**Version**: 1.2.0 | **Ratified**: 2026-10-14 | **Last Amended**: 2026-10-27
