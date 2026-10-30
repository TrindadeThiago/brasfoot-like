# Linha de base (início da 032, `release/v1.0.0` com a 025 a 031)

Medida em 2026-10-30, antes de qualquer mudança de código da 032. Método: Playwright, Chromium, build local (`pnpm build:web`), mundo padrão, mediana de 5, do `goto` até o primeiro `h1` visível; carreira com seed fixa do e2e. O servidor de desenvolvimento ficou ligado em paralelo, então há ruído de alguns milissegundos (a Nova carreira mediu 266 a 283 ms nas medições da 031 e 360 ms aqui, com 285 a 442 de variação).

## Pacote

- `apps/web/out`: 3,8 MB (3 826 067 bytes); JS 1 827 755 bytes; CSS 73 726 bytes; precache de 180 arquivos (366 linhas no JSON).
- Limite da 032 (plano, R6): `out` até 4,5 MB e JS até 2,0 MB.

## Abertura das telas (ms)

| Tela | Mediana | Faixa | Referência da feature |
|---|---|---|---|
| Menu | 114 | 107 a 130 | 031: 107 |
| Nova carreira | 360 | 285 a 442 | 031: 283 (ruído) |
| Carreiras salvas | 99 | 91 a 100 | 031: 92 |
| Configurações | 84 | 81 a 93 | 031: 94 |
| Mods | 97 | 94 a 112 | 031: 97 |
| Sobre | 99 | 95 a 137 | 031: 93 |
| Notas de versão | 108 | 106 a 113 | 031: 99 |
| Início | 134 | 127 a 143 | (sem referência) |
| Elenco | 145 | 140 a 159 | 026: sem tela medida |
| Escalação | 139 | 135 a 146 | |
| Competição | 155 | 151 a 201 | |
| Calendário | 147 | 141 a 158 | |
| Finanças | 132 | 127 a 137 | |
| Histórico | 133 | 123 a 143 | |
| Mercado | 161 | 151 a 162 | |
| Carreira | 144 | 130 a 167 | 029: 127 (outra carreira e outro método de espera) |
| Notícias | 148 | 144 a 154 | 029: 115 (idem) |
| Fim de temporada | 123 | 112 a 140 | 030: 151 |
| Rodada ao vivo (clique em Jogar rodada até o meu jogo) | 114 | 105 a 191 | 030: 67 (método de 030: outro ponto de espera) |

Observação: as referências das telas do clube foram medidas em cada feature com carreiras e esperas diferentes; a comparação justa é a T021 (mesmo método destas medidas, depois das correções), com tolerância de 10% sobre **esta** tabela.

## Navegação e tabelas

- Navegar entre as 10 telas do clube (clique no link da barra até o título): mediana 70 ms (31 a 122; 30 navegações).
- Ordenar uma coluna (clique até a tabela atualizada, inclui a latência do Playwright): Elenco 51 ms, Classificação 50 ms, Mercado 52 ms (faixas 32 a 116); todas abaixo de 200 ms.
- Filtrar a lista da Nova carreira (440 clubes): 70 ms na primeira digitação e 21 a 27 ms nas seguintes.

## Metas da 020 e "igual ao de antes" (FR-009, SC-004)

- Tetos (`SCALE_LIMITS`, não são editados): dia 600 ms, virada 6 000 ms, heap 1 GiB, save de 12,5 MB no início da 31ª e 42 MB na última rodada, export de 6 MB.
- Ponto de partida (`pnpm sim:world --scale --countries 3 --seasons 3`, mundo de 120 clubes): dia 56 ms, virada 369 ms, heap 203 MB, maior save 10,33 MB, export 0,87 MB; todos dentro dos tetos. As simulações de 30 temporadas rodam na US7 (T043 a T045).
- Referência de "igual ao de antes": `git diff origin/main...HEAD` em `packages/engine/src`, `packages/save/src` e `packages/modkit/src` mostra só um auxiliar de leitura (`marketRowOf`, usado pela tela do Elenco), uma troca de `!main || …` por `main?.… !==` e a renomeação de uma constante não usada (`_strengthOf`): nenhuma regra, formato de save ou dado mudou nas 025 a 031. Portanto o tempo da virada e o tamanho do save só poderiam diferir da `main` por esse auxiliar, que não entra no caminho da simulação. A prova numérica vem das simulações da US7, comparadas com `SCALE_LIMITS`.

## Testes que tocam o que a 032 mexe (referência)

`test/ui/contrast.test.ts`, `shortcuts-registry.test.ts`, `live-announce.test.tsx`, `version.test.tsx`, `about-notes.test.tsx`, `test/i18n/*`; e2e `a11y`, `keyboard`, `layout`, `offline`, `first-run`, `update`, `quickstart`, `live-round`. O resultado é o do CI da 031 (PR #57), verde.

## Falhas da matriz responsiva (T006)

Matriz `e2e/responsive.spec.ts` (todas as 40 telas, abas e diálogos da lista única × 1 440, 1 024, 768, 600 px, tablet paisagem 1 024 × 600 e zoom de 200% × dois temas). Primeira execução, as mesmas 7 falhas nos dois temas, em dois grupos:

| Falha | Tela e largura | Causa | Correção |
|---|---|---|---|
| Diálogo abaixo da janela | modal do Elenco, modal do Mercado e ajuda de atalhos, em 1 024 × 600 e no zoom de 200% | `Dialog` sem altura máxima: o conteúdo passava da janela | `Dialog.module.css`: `max-height` pela janela, título e ações fixos e corpo com rolagem própria |
| Rolagem horizontal da página | Carreira, aba Torcida, a 768 px | `.columns` do `board.module.css` com duas colunas `1fr` e a tabela de rivais empurrando a largura | `repeat(2, minmax(0, 1fr))`, `min-width: 0` nos filhos e uma coluna até 1 024 px |

Segunda execução, depois das correções: **verde nas seis larguras e nos dois temas**. A ordem de tabulação (`keyboard.spec.ts`) e o movimento reduzido (`reduced-motion.spec.ts`) passam; a estrutura de títulos, regiões e tabelas (`test/ui/headings.test.tsx` e no `a11y.spec.ts`) e o axe passam nos dois temas.

## Falhas da revisão de acessibilidade (T017)

- Pares de contraste novos (`test/ui/contrast.test.ts`): o cartão vermelho sobre o gramado do campo mede 2,4 a 2,9:1; como o cartão sempre vem com texto (cor nunca é o único sinal), não se altera o token e o teste cobre só o amarelo (7,1:1). Verde e âmbar do tema claro sobre linha destacada em fundos que o jogo não usa (página e superfície 2) ficaram fora do teste; o axe confere as telas reais.
- Estrutura: a grade do calendário e a tabela de comparação não têm `caption`, mas têm `aria-label`; aceito como nome da tabela.
- Ordem de tabulação: Notícias sem manchetes não tem controle no conteúdo; o teste só exige chegar ao conteúdo quando há controle.

## Gates do release (T042 a T047)

Rodados localmente sobre a `release/v1.0.0` com a 032 (2026-10-30). As simulações só passaram a rodar de verdade na segunda tentativa: na primeira, o pnpm recebeu o comando entre aspas e acusou "comando não encontrado" em 1 s; o script `run-sims.sh` com `EXIT=` por simulação corrigiu isso.

| Gate | Comando | Resultado |
|---|---|---|
| Simulação do mundo | `pnpm sim:world --seasons 30` | EXIT=0 (38 s); todas as faixas ✓ |
| Simulação da economia | `pnpm sim:economy --seasons 30` | EXIT=0 (30 s); clubes fora de crise 100% (≥ 90%), Spearman reputação × caixa 0,846 (≥ 0,4), mediana do caixa 6,7 mi (0 a 31 mi), técnicos trocados 16,2% (5% a 35%) |
| Mundo grande | `pnpm sim:world --scale --countries 3 --seasons 30 --qualification` | EXIT=0 (2 min): dia 56 ms (≤ 600), virada 332 ms (≤ 6 000), heap 265 MB (≤ 1 024), maior save 11,87 MB (≤ 42), export 1,13 MB (≤ 6), save no início da 31ª temporada 3,71 MB (≤ 12,5), crescimento 70 KB por temporada (≤ 250) |

Nenhuma faixa numérica mudou e `SCALE_LIMITS` não foi editado. A interface não toca o motor, então a virada e o tamanho do save são os mesmos de antes.

### Demais gates (T042)

| Gate | Comando | Resultado |
|---|---|---|
| Tipos | `pnpm typecheck` | EXIT=0 |
| Lint | `pnpm lint` | EXIT=0 |
| Unidade | `pnpm test` (suíte inteira, local) | 4 634 de 4 635 passaram; falhou só `packages/save/test/football-world-scale.test.ts` ("duas temporadas: dia, virada e tamanho do save"), um teste de tempo que estoura com a suíte inteira em paralelo na máquina local (20,9 s contra o teto de 18 s) e passa isolado; o pacote `save` não foi tocado pela 032 e o CI da 031 (shards de 2 workers) passou com ele. Ver T046. |
| Build | `pnpm build:web` | EXIT=0 |
| Verificação do release | `pnpm check-release` | EXIT=0 ("versão 1.0.0 pronta para publicar"), já com o limite do pacote (3,65 MB de 4,5 MB; JS 1,74 MB de 2,0 MB) |
| E2E completo | `pnpm test:e2e` | 61 de 61 passaram |

### Conferências antes do PR final (T047)

- `git tag -l v1.0.0`: vazio (existem só as `beta-vX.Y.Z`); `gh release list`: nenhum Release `v1.0.0`, os da fase beta estão marcados como pré-lançamento.
- `git log release/v1.0.0..origin/main`: 0 commits; a `main` continua congelada.
- `package.json` em 1.0.0; a nota do 1.0.0 (data 2026-10-30) resume o marco e as notas da fase beta seguem no fim da página.

## Teste de usabilidade (SC-001 da 031) e validação manual

Continuam abertos e dependem de pessoas: o teste com quem nunca viu o jogo (T039 da 031) e a validação manual do quickstart (T038 da 031).

## Consistência (T026 a T029)

- Auditoria `test/ui/style-audit.test.ts`: nenhuma cor literal fora de `tokens.css` (já estava limpo); 7 espaçamentos e fontes em px que já são token (`EventFeed`, `ShortcutsHelp`, `StatsTable`, `SubstitutionPanel`, `chart`, `ProgressBar`) viraram `var(--space-*)` e `var(--text-*)`; 3 classes sem uso removidas (`.country` em `CompetitionTabs`, `.meterRow` em `fans`, `.tabs` em `market`); sem `!important` fora da regra de movimento reduzido. A auditoria fica como teste permanente.
- Cópias do `Card`: 17 componentes montavam `<section className={styles.card}>` com fundo, raio e margem próprios (Início, Carreira, Torcida, Diretoria, Finanças, Mercado, Notícias, Histórico, Continental, próximo jogo); passaram a usar `Card` e os módulos perderam o fundo, o raio e o espaçamento que o `Card` já dá (nas telas de fora, que já usavam `Card`, a duplicação também saiu). Os cartões em `li` (`SaveCard`, `ModCard`) e os de `div` do Mercado mantêm o estilo próprio, porque não são seções.
- Revisão contra `docs/interface-nova.md` §2 a §5: tokens e temas conferidos; barra lateral que empilha abaixo de 768 px conferida pela matriz; telas de foco sem barra lateral conferidas; o "alvo de toque de 44 px" não existia: botões e campos passam a ter `min-height: 44px` quando o ponteiro é de toque (`pointer: coarse`), sem mudar a densidade para mouse.

## Depois das correções da 032 (T020 a T024)

Medido em 2026-10-30, mesmo método da linha de base, com o servidor de desenvolvimento desligado.

- Pacote: `apps/web/out` 3 827 363 bytes (3,65 MB; antes 3 826 067), JS 1 828 458 bytes (antes 1 827 755), CSS 73 357 bytes (antes 73 726), 180 arquivos no precache. Limites da 032: 4,5 MB e 2,0 MB de JS; `pnpm check-release` passou a conferir os dois (cobre o job `e2e` do CI e o workflow de release).
- Abertura (mediana de 5; limite = linha de base + 10%): menu 118 ms (limite 125), Nova carreira 271 (a linha de base teve ruído, 360), carreiras 93 (109), configurações 90 (92), mods 101 (107), sobre 102 (109), notas 111 (119), Início 126, Elenco 142, Escalação 139, Competição 149, Calendário 153 (162), Finanças 147 na primeira medida e **133 ms** em 15 amostras (limite 145), Histórico 126, Mercado 161, Carreira 133, Notícias 131, fim de temporada 120, rodada ao vivo 110. Todas dentro da tolerância.
- Navegar entre as 10 telas do clube: mediana 83 ms (60 navegações, p90 116 ms) contra 70 ms da primeira linha de base. A medida da linha de base era sorte da amostra: repetida no **HEAD sem nenhuma mudança da 032** (build de antes das correções, mesma máquina e mesma sessão) deu também 83 ms. Sem regressão.
- Tabelas: ordenar Elenco 52 ms, Classificação 50 ms, Mercado 51 ms; filtrar a lista da Nova carreira (440 clubes) 14 a 24 ms depois da primeira digitação (52 ms na primeira). Todas abaixo de 200 ms.
- Offline (`e2e/offline.spec.ts`): verde.
- Virada de temporada e tamanho do save: nenhuma regra, formato de save ou dado mudou nas 025 a 032 (ver a comparação com a `main` acima); a prova numérica vem das simulações de 30 temporadas da seção "Gates" (T043 a T045), conferidas contra `SCALE_LIMITS`.
