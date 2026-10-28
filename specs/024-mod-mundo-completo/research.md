# Research: Mod mundo completo do futebol

> **Revisão (1.10.0)**: os mundos médio e completo foram descartados — a rodada da liga ficava pesada demais
> (travamentos) com dezenas de milhares de jogadores. O **mundo padrão** passou a ser o reduzido (24 países
> nas seis confederações, Brasil em quatro divisões com estaduais), gerado dentro do jogo e também
> disponível para baixar (`mundo-padrao.zip`); o antigo país fictício único saiu da lista de nova carreira.
> Onde este documento fala em três tamanhos, vale só o reduzido.

Decisões técnicas da 024. Os números são pontos de partida, ajustados pela tarefa de linha de base (R9)
e declarados nos testes. Nenhum item ficou como `NEEDS CLARIFICATION`.

## R1 — O mundo é um perfil de dados

- **Decision**: `WorldProfile` descreve confederações → países. Cada país tem `tier` (1 a 4), `language`,
  `strength` (peso relativo na confederação e no mundo) e, opcionalmente, ajustes de pirâmide. O `tier`
  define a pirâmide e o tamanho: T1 duas divisões de 20 clubes e copa; T2 duas de 16 e copa; T3 uma de 14
  e copa; T4 uma de 10 e copa. O Brasil é o único país com perfil próprio (`brazil`): divisões A, B, C de
  20 clubes em pontos corridos, D em grupos regionais e mata-mata, 27 estaduais, copa e supercopa. Os
  demais países sul-americanos são T1 (Argentina, Colômbia, Chile, Uruguai, Equador, Paraguai) e T2
  (Peru, Venezuela, Bolívia), com duas divisões e copa. Perfil padrão: UEFA 12, CONMEBOL 10, CONCACAF 6,
  CAF 6, AFC 6, OFC 3 países. Perfil `compacto`: 14 países (2 a 3 por confederação) e 4 estados.
- **Rationale**: tudo ajustável sem tocar em código (FR-013, FR-022). O prompt só detalha a América do
  Sul; para o resto "os principais países" é uma lista, que o perfil guarda.
- **Alternatives considered**: lista fixa no código (viola o Princípio III); todos os ~211 países (o
  mundo ficaria enorme sem ganho de jogo; o perfil permite acrescentar países depois).

## R2 — Geografia real em dados versionados

- **Decision**: `geo/countries.json` com, por país: id, nome em português, código de 3 letras, idioma e
  lista de cidades reais (mínimo = clubes do país, com no máximo 2 clubes por cidade; ao menos 40 cidades
  nos países T1 e 20 nos demais); `geo/brazil-states.json` com os 27 estados (nome e sigla) e ≥ 18 cidades
  reais por estado. A geração escolhe cidades pela seed; um teste confere contagens, ausência de
  duplicatas e que nenhuma cidade ou estado contém termos de clubes.
- **Rationale**: o jogo é offline (Princípio VIII); nome de lugar não é conteúdo protegido (decisão do
  projeto, R13). Dado fixo em JSON é revisável e não depende de rede.
- **Alternatives considered**: buscar listas em fonte externa na geração (rede, não determinístico);
  cidades sintéticas (contraria a decisão).

## R3 — Bancos de nomes por idioma

- **Decision**: `names/<idioma>.json` com `firstNames` (≥ 200), `surnames` (≥ 200), `clubPrefixes`,
  `clubSuffixes` e `competitionAdjectives`. Idiomas do perfil padrão: pt, es, en, fr, de, it, nl, tr, ar,
  ru, ja, ko, zh (países sem idioma próprio usam o mais próximo). Nomes comuns de pessoas são aceitos;
  combinações são geradas, e o teste de bloqueio impede nomes de jogadores e clubes famosos.
- **Rationale**: os nomes dos jogadores ficam plausíveis por região sem copiar elencos reais. O
  esquema é o `nameBankSchema` da 015 (já aceita listas de nomes), com `cities` vindas do `geo/`.
- **Alternatives considered**: sílabas aleatórias por país (era o gerador da 020: nomes sem identidade
  regional); gerar os nomes em tempo de execução por modelo (sem rede e sem determinismo).

## R4 — Gerador novo, compondo o que existe

- **Decision**: `generateFootballWorld(profile, seed)` monta cada país com um fork `${seed}:${país}`:
  clubes (nome = prefixo + cidade ou cidade + sufixo, escudo gerado), elencos (`generateSquad`),
  rivalidades por região, economia em escala, pirâmide, copa e supercopa. Estaduais e divisão D do Brasil
  usam `brazil.ts` (generaliza `generateRegionalBank`, 023). Não clona o banco padrão (a 020 clona e
  renomeia ids; aqui os ids são `clube-<código>-<n>`).
- **Rationale**: a 020 só gera países homogêneos de 2 divisões; o perfil precisa de pirâmides diferentes.
- **Alternatives considered**: estender `generateWorldBank` com muitas opções (cresce o que já é
  complicado e mantém os nomes sintéticos).

## R5 — Brasil: divisão D e estaduais

- **Decision**: a D tem 20 clubes em 4 grupos de 5 (jogos todos contra todos em turno único), com os 2
  melhores de cada grupo indo ao mata-mata de 8 clubes (jogo único, final em ida e volta); acesso de 4 à
  C (finalistas e semifinalistas) e rebaixamento da C (4) para a D. Estaduais: 27 estados, 1ª divisão de
  12 e 2ª de 8 (como na 023), com os 80 clubes nacionais espalhados por região em rodízio ponderado pela
  força (clubes maiores nos estados de mais peso, dado `stateWeight`). A copa nacional reúne os 80
  clubes; a supercopa, campeão da liga × campeão da copa. Vagas: estadual → copa e divisão D (021).
Os clubes da D vêm de regiões diferentes e o sorteio usa `draw.rules = [{ kind: "concentrate", attribute: "region" }]` (019) para manter clubes da mesma região no mesmo grupo sempre que possível.
- **Rationale**: respeita o prompt (A, B, C de 20; D em grupos regionais) com números que fecham grupos
  e mata-mata pelas validações existentes (`stages.*`).
- **Alternatives considered**: D com 40 clubes em 8 grupos (mais jogos e mais clubes regionais, sem
  ganho de variedade).

## R6 — Força, reputação e economia proporcionais ao país

- **Decision**: `strength` (0,5 a 1,5) por país; a reputação dos clubes é sorteada numa faixa deslocada
  por `strength` (teto 95); `scaleEconomy` (020) multiplica salários, público, patrocínio e prêmios pela
  escala econômica `0,6 + 0,8 × strength` do país. As vagas continentais seguem
  `apportion(total, strength², caps)`, o que dá mais vagas aos fortes e pelo menos 1 a todos.
- **Rationale**: reaproveita `scaleEconomy` e `apportion`, já testados; quadrado do peso dá a diferença de
  vagas dos coeficientes reais sem criar tabela.
- **Alternatives considered**: tabela fixa de vagas por país (vira dado a manter à mão).

## R7 — Competições continentais por confederação

- **Decision**: `continentalCompetitions` (022) passa a receber `{ id, prefix, names, size, countries }`,
  com ids `continental-<conf>-maior`/`-menor`; o layout vem do total de clubes disponíveis
  (`direct`/`groups` calculados; grupos de 4; nenhum país com mais clubes que grupos). Oceania e países
  pequenos têm só a principal (ou menor opcional, `minor: false`). Os nomes são fictícios
  (`Taça <adjetivo> da <confederação>`). Confederações são independentes: cada competição só tem clubes
  do próprio conjunto de países, e a validação `continental.*` (≥ 2 países) vale para cada uma.
- **Rationale**: o motor já trata qualquer competição sem país; só o gerador era de uma competição.
- **Alternatives considered**: uma competição única para todos (não é o futebol mundial; é o mundial de
  clubes, fora de escopo).

## R8 — Calendário

- **Decision**: estaduais no `startWeek` 0 a 6; ligas nacionais de todos os países com `startWeek` 8 e
  jogos aos domingos; copas às quartas, a cada 2 semanas; continentais às terças e quintas conforme a
  confederação, depois da fase de pontos nacional começar. A validação existente
  (`calendar.club_double_booked`, `calendar.regional_after_national`) garante que fecha. Países com
  menos rodadas (divisões de 14 ou 10 clubes) terminam mais cedo.
- **Rationale**: a grade de 52 semanas comporta estadual (7) + liga de 38 rodadas + copa e continental.

## R9 — Escala: metas próprias

- **Decision**: `SCALE_LIMITS.fullWorld` com dia, virada, heap, save (início da temporada 31, última
  rodada, arquivo exportado) e crescimento por temporada do perfil padrão, medidos na linha de base
  (T002) e justificados no mesmo PR. Proposta inicial a validar: dia ≤ 2 500 ms, virada ≤ 40 s, heap
  ≤ 3 GB, save no início da 31ª ≤ 80 MB, exportado ≤ 25 MB. Se o custo passar muito disso, a
  mitigação (por ordem): compactar o que os países que o técnico não vê guardam (registros e linhas de
  jogadores já encerrados), reduzir elencos regionais e, por último, reduzir o perfil padrão.
- **Rationale**: Princípio V exige faixas declaradas; a 020 já mostrou que o custo vem de histórico e
  finanças por clube (a 023 reduziu o crescimento tirando duplicata).
- **Risk**: memória do navegador (o save inteiro é um objeto): o perfil padrão pode ficar perto do
  limite de uma aba; o perfil `compacto` é a alternativa para máquinas fracas.

## R10 — Limites de pacote

- **Decision**: medir o `players.json` do perfil padrão (~35 000 jogadores). Se passar de 10 MB
  descompactado (`MOD_LIMITS.json`) ou o zip passar de 20 MB, subir só o que a medição exigir (proposta:
  `json` 32 MB, `package` 40 MB) com justificativa em `limits.ts` e em `docs/mod-format.md`, sem mudar as
  regras de imagem. O formato de mod continua `formatVersion: 1`.
- **Rationale**: o formato é um arquivo por seção; dividir `players.json` mudaria o formato. A spec
  (FR-018) já prevê rever limites com justificativa.
- **Alternatives considered**: cortar jogadores por clube (prejudica as regras de elenco); dividir o
  arquivo (formato novo).

## R11 — Determinismo do pacote

- **Decision**: ordem fixa de confederações (perfil), países (perfil), competições (liga, copa,
  supercopa, estaduais, continentais) e ids; JSON serializado por `splitBankFiles` (ordem de chaves da
  construção); `writeModPackage` já usa `mtime` fixo. Teste: dois geradores iguais com a seed padrão dão
  `Buffer.equals`; seed diferente muda; perfil `compacto` no CI do PR, padrão no job de simulação.
- **Rationale**: critério de aceite da spec (byte a byte).

## R12 — Ferramenta e entrega

- **Decision**: `pnpm gen:football-world [--profile padrao|compacto|<arquivo.json>] [--seed s] [--out
  dir] [--clubs-csv f --players-csv f]`: gera, valida (`readModPackage`) e grava `mundo-completo.zip`
  (e a pasta do mod com `--folder`). O .zip de download é gerado no `prebuild` do web em
  `apps/web/public/mods/mundo-completo.zip` (ignorado pelo git); a página de Mods mostra o link. O
  `check-release` confere que o zip existe, valida e passa nos limites.
- **Rationale**: um zip de vários MB versionado incharia o histórico a cada ajuste; gerar no build é
  reproduzível (R11).
- **Alternatives considered**: commitar o zip (inchaço); download do zip gerado no navegador (gerar
  35 000 jogadores no cliente é lento e exige o gerador no bundle).

## R13 — Princípio IV e o teste de bloqueio

- **Decision**: emenda 1.2.0 (MINOR): "nomes de lugares (países, estados, cidades) NÃO são conteúdo
  protegido; clubes, jogadores, competições e entidades seguem fictícios". `blocklist.json` passa a ter
  `clubsExact` (nomes inteiros de clubes reais, comparados com o nome inteiro, curto e sigla do clube
  fictício), `clubsContains` (apelidos distintivos, comparados por palavra) e `competitions`; `places`
  deixa de valer para países, estados e cidades, mas continua valendo para nomes de clubes e
  competições. Termos que são cidade e clube (Santos, Bahia, Vitória, Sport…) ficam só em `clubsExact`.
- **Rationale**: "Santos" é cidade e clube; a regra precisa permitir a cidade e proibir o clube.
- **Alternatives considered**: remover a lista (perde a proteção); manter e escapar cidade a cidade.

## R14 — Testes e simulações

- **Decision**: testes de CI com o perfil `compacto` (carreira de uma temporada, 3 temporadas de
  simulação, validação, determinismo). O perfil padrão roda em job de simulação (30 temporadas) e na
  ferramenta `pnpm sim:world --football-world`. Faixas: divisões estáveis, vagas continentais por
  país proporcionais à força (correlação positiva), todos os países com clube continental em > 90% das
  temporadas, caixa e reputação dentro das faixas, elencos válidos.

## R15 — CSV local

- **Decision**: a ferramenta aceita `--clubs-csv` e `--players-csv` e aplica `applyCsv` (modkit) ao
  banco gerado antes de empacotar; a página de Mods já exporta/importa CSV do mod carregado. A documentação
  `docs/mundo-completo.md` mostra os dois caminhos.

## R16 — Três tamanhos, gerados no jogo (decisão de 2026-10-27)

- **Decision**: o jogador escolhe na nova carreira entre **reduzido**, **médio** e **completo**, e o
  jogo chama `generateFootballWorld(profileOfSize(tamanho), seed)` no navegador. Reduzido = perfil
  `compacto` (24 países, ~260 clubes, 4 estaduais); médio = 44 países com pirâmides de 16, 12, 10 e 8
  clubes e 8 estaduais (~1 000 clubes); completo = 44 países e 27 estaduais (~1 650 clubes). A seed do
  mundo é a digitada em "avançado" ou `mundo-completo-1`. Os mesmos três mundos são gerados no build e
  oferecidos como .zip na página de Mods, para a troca de nomes por planilha.
- **Rationale**: a medição do completo mostrou que ele é pesado (dias de 0,5 a 1 s no começo, 16,5 MB de
  save no primeiro dia, memória perto do limite de uma aba, viradas longas); o jogador escolhe o que o
  computador aguenta. Gerar no jogo leva menos de 1 s e dispensa download, armazenamento do mod e o
  limite de pacote. O motor já roda no navegador, então continua offline.
- **Metas**: reduzido nas metas da 020; médio e completo com metas próprias (`SCALE_LIMITS.mediumWorld` e
  `fullWorld`), provisórias até a medição de uma virada de temporada de cada um.
- **Custo extra**: um estadual de região que não é a do clube do técnico usa a simulação resumida
  (bilheteria e prêmios apenas), como as ligas de outros países (`world/leagues.ts`, `career/day.ts`).
- **Alternatives considered**: só .zip para baixar (mais passos e o jogador precisa guardar o mod);
  gerar um mundo por seed no servidor (contra o Princípio VIII).
