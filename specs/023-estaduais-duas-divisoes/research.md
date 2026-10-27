# Research: Estaduais com duas divisões

Decisões técnicas da 023. Os números são pontos de partida (`REGIONAL_TUNING`, faixas do teste
longo), ajustados pela tarefa de linha de base (R9) e declarados nos testes. Nenhum item ficou
como `NEEDS CLARIFICATION`.

## R1 — Competição regional: bloco `regional`, sem tocar em `countryId`

- **Decision**: `competition.regional` (opcional) marca a competição como regional e traz a região
  e o peso (R7). A competição mantém `countryId` (obrigatório para ela) e vive em
  `CareerSeasonState.competitions` (secundárias, 020 R2). `mainCompetitionOf`/`mainCompetitions`
  passam a ignorar competições com `regional`, então a ordem em `competitions.json` não decide mais
  qual é a principal do país. Regras econômicas, de mercado, diretoria, torcida e manchetes
  continuam vindo da principal do país (`rulesCompetitionOf`).
- **Rationale**: hoje a principal é "a primeira com `countryId`"; 27 estaduais listados antes da
  liga a roubariam o papel. Um marcador explícito é a menor mudança e não afeta bancos antigos.
- **Alternatives considered**: exigir que a liga venha primeiro no arquivo (regra frágil, silenciosa);
  `countryId` ausente como na 022 (tira as regras do país, que o estadual precisa); campo
  `scope: "regional"` solto (sem lugar natural para a região e o peso).

## R2 — Região do clube: reaproveitar `club.region`

- **Decision**: `club.region` (019, hoje usado só no sorteio de grupos) passa a ser a chave do
  estadual. O estadual declara `regional.region`; todo clube de uma divisão dele tem
  `region` igual. Países que declaram ao menos um estadual exigem `region` em todos os clubes
  (FR-001); países sem estadual não mudam (clubes sem região continuam válidos).
- **Rationale**: evita um segundo campo para o mesmo conceito; o limite de 40 caracteres e a
  validação de texto já existem.
- **Alternatives considered**: entidade `regions.json` (mais um arquivo para o modder sem ganho: o
  nome do estado é o texto do próprio campo); `regionId` separado (duplica `region`).

## R3 — Acesso e rebaixamento: reaproveitar `nextComposition` e `finalOrder`

- **Decision**: `nextComposition` já ordena cada divisão pelo `standings`, e para divisões em fases
  isso é `stagedStandings` → `finalOrder` (019 FR-024: mais longe no mata-mata primeiro; quem caiu
  na mesma fase é desempatado pela classificação geral da fase anterior). Com isso, "sobem os
  finalistas da 2ª" = `promotionSlots: 2` e "caem os piores da classificação geral da fase de grupos
  da 1ª" = `relegationSlots: N` com N menor ou igual aos eliminados nos grupos. Nenhum formato novo.
  Entram regras semânticas (R10 do contrato): `promotionSlots` da 2ª = `relegationSlots` da 1ª;
  `relegationSlots` ≤ clubes eliminados na fase de grupos; `promotionSlots` ≤ clubes que chegam à
  fase final; a 1ª não tem `promotionSlots` e a 2ª não tem `relegationSlots` (ficam fora de escopo).
- **Rationale**: o comportamento pedido já é o da ordem final; o risco está em casos de borda
  (rebaixados que, por sorteio, estariam entre os eliminados na mesma rodada) e fica coberto por teste
  com seed fixa e por validação.
- **Alternatives considered**: critério declarado por divisão (`promotion.basis`), mais flexível mas
  sem uso nesta feature; rebaixar pela fase final (contradiz a spec, que usa os grupos).

## R4 — Clubes regionais

- **Decision**: clube regional é derivado: está em alguma divisão regional e em nenhuma divisão de
  competição não regional. Não tem campo próprio. O gerador cria elencos menores (16 jogadores),
  reputação e caixa menores, e as janelas da IA (010/011) e a evolução (009) tratam-nos como
  qualquer clube. A tarefa T001 faz auditoria dos pontos que supõem "todo clube tem divisão na liga
  principal" (`clubDivision(league, …)` em finanças, mercado da IA, diretoria e notícias) e corrige
  os que quebram; o clube do jogador nunca é regional (spec), então diretoria e ofertas não mudam.
- **Rationale**: sem campo, o conceito não desatualiza quando o clube sobe de divisão nacional.
- **Alternatives considered**: flag `regionalOnly` no clube (fica errado após acesso à copa nacional
  ou a uma divisão nacional); mundo separado para regionais (duplica evolução e mercado).

## R5 — Vagas a partir do estadual

- **Decision**: berths da 021 com fonte `position` (competição regional, nível 1, `from`/`to`)
  na copa nacional e na divisão nacional mais baixa. A resolução da 021 já ignora clubes que estão
  no destino e repassa ao próximo (clarificação 1), o que vale para estadual sem código novo. A
  ordem lida vem da `finalOrder` (R3). Teste: um clube nacional bem colocado não consome vaga.
- **Alternatives considered**: vaga por título apenas (não cobre "boa campanha" da spec).

## R6 — Calendário: o estadual abre e fecha a temporada regional

- **Decision**: o estadual usa `schedule` próprio (`startWeek` baixo, `everyWeeks` 1) e as
  divisões nacionais declaram `startWeek` posterior. Validação nova `calendar.regional_after_national`:
  a última rodada de cada divisão regional (final em ida e volta) precisa ficar antes da primeira
  rodada nacional do país. A grade de datas é uma só por competição de várias divisões (019 R11),
  então as duas divisões compartilham datas e não declaram `gapWeeks`. Auditoria na T001 de código
  que assume "temporada começa na rodada 1 da liga" (fadiga, lesões, ritmo de jogos, prazo de
  janela).
- **Rationale**: o erro é de dados e sai na validação, não em tempo de jogo (spec, edge case).
- **Alternatives considered**: empurrar a liga automaticamente (esconde erro do modder).

## R7 — Peso do estadual na carreira

- **Decision**: `regional.weight = { pct, byReputation?: [{ from, pct }] }`. `pct` é o peso
  base (0 a 200, padrão 100) aplicado a metas, avaliação da diretoria e expectativa/humor da torcida
  do estadual; `byReputation` multiplica por faixa de reputação do clube (a última faixa com
  `from` ≤ reputação vale), ordenadas por `from`. Peso 0 não gera efeito (edge case). Os efeitos do
  estadual passam por `regionalWeightFor(club, competition)` e nunca por constantes no código.
- **Rationale**: atende "pode valer pouco para clubes grandes" sem peso por clube.
- **Alternatives considered**: peso por clube (cresce o banco); só `pct` (não cobre grandes x pequenos).

## R8 — Metas, manchetes e histórico

- **Decision**: meta `regional` (campanha mínima: fase, título, acesso) reaproveita o mecanismo de
  metas (022 R6), pesada por R7. `regionalHistory` guarda por temporada, por divisão: campeão,
  vice, promovidos, rebaixados. Manchetes novas: título, vice, acesso, queda, eliminação de grande,
  clássico (013) no estadual. Campanha do clube: `clubCampaign` (022) é generalizada de
  continental para qualquer competição em fases (nome `competitionCampaign`).
- **Alternatives considered**: guardar histórico dentro de `seasonHistory` (já pesado; ver R9).

## R9 — Equilíbrio e escala

- **Decision**: banco de teste `worldgen/regional.ts`: 1 país, 27 estaduais, 1ª divisão de 12 e 2ª
  de 8 clubes, 40 clubes também nacionais (2 divisões de 20), resto regional. Faixas do teste
  longo (30 temporadas, seeds declaradas): tamanho das divisões constante em 100% das temporadas;
  elencos válidos (11 a 25, posições mínimas); acesso e rebaixamento > 0 toda temporada; campeões
  distintos por estadual ≥ 3 em 30 anos; caixa dos regionais dentro de faixa da 008; clube
  nacional fica em média acima do regional na 1ª divisão. A linha de base mede virada e save do
  banco com 27 estaduais e propõe `SCALE_LIMITS.regional` se o limite atual não couber, com
  justificativa na mesma alteração.
- **Risco**: ~450 clubes novos por temporada podem dobrar o tamanho do save da 020; mitigação:
  elencos de 16, histórico compacto (`regionalHistory` só com ids e posições) e o resultado
  de jogos de regionais seguindo a regra de compactação já usada para competições secundárias.

## R10 — Telas

- **Decision**: `app/jogo/estadual` com as duas divisões (grupos, chaveamento, campanha) reusando
  `ui/competition` e `ui/campaign`; a divisão aparece na lista de competições junto das nacionais.
  Nenhuma regra na UI; classificação, zonas de acesso/rebaixamento e fases chegam prontos do motor.
- **Alternatives considered**: tela nova por estadual (duplica o que a copa e a continental já têm).

## R11 — Save v18

- **Decision**: v18 acrescenta `regionalHistory` (opcional) e a meta `regional` (opcional). Mods
  guardam `competition.regional` no pacote, não no save. Migração v17 → v18 só inicializa o que falta;
  fixtures v17 (início, meio e fim de temporada).
