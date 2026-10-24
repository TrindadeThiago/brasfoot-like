# Formato de mod do brasfoot-like

Este documento descreve o formato do banco de dados do jogo — o mesmo usado pelo banco padrão
("o primeiro mod") e pelo mod de exemplo (`mods/exemplo`, país fictício Norvália). Com ele você pode
criar um banco completo sem ler o código do jogo.

O jogo **não distribui nenhum nome, escudo ou marca real**. Bancos com nomes reais são criados e
compartilhados pela comunidade, nunca pelo jogo.

## 1. Estrutura do pacote

Um mod é um arquivo `.zip` com estes arquivos na raiz (ou dentro de uma única pasta de topo):

| Arquivo | Obrigatório | Conteúdo |
|---|---|---|
| `mod.json` | sim | identificação do mod (objeto) |
| `countries.json` | sim | lista de países |
| `competitions.json` | sim | lista de competições (liga com divisões) |
| `clubs.json` | sim | lista de clubes |
| `players.json` | sim | lista de jogadores |
| `rivalries.json` | não | lista de rivalidades (clássicos) |
| `images/…` | não | imagens de escudo (PNG, JPEG ou WebP) |

Todos os arquivos são JSON em UTF-8. Para começar, baixe o mod de exemplo na tela **Mods** do jogo
(ou use `mods/exemplo` do repositório), altere os arquivos e compacte a pasta.

### Limites

| Limite | Valor |
|---|---|
| Pacote inteiro (`.zip`) | 20 MB |
| Cada arquivo JSON | 10 MB |
| Cada imagem | 200 KB |
| Dimensões de uma imagem | até 512 × 512 pixels |
| Soma das imagens | 5 MB |
| Formatos de imagem | PNG, JPEG, WebP (SVG não é aceito) |

## 2. Tipos usados nos campos

| Tipo | Regra | Exemplo |
|---|---|---|
| id | minúsculas, números e hífen; começa com letra ou número; até 64 caracteres | `clube-001` |
| texto(a, b) | entre `a` e `b` caracteres | `"Ribeira Funda"` |
| inteiro(a, b) | número inteiro entre `a` e `b` | `46` |
| escala | inteiro de 1 a 100 | `72` |
| cor | `#RRGGBB` | `"#5B2C83"` |
| data | `AAAA-MM-DD` | `"2001-03-15"` |
| semver | `maior.menor.correção` | `"1.0.0"` |

Campos desconhecidos geram **aviso** e são ignorados; campos obrigatórios ausentes geram erro.

## 3. `mod.json`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `formatVersion` | inteiro | sim | versão do formato; hoje só `1` |
| `id` | id | sim | identificação do mod (carregar outro com o mesmo id pergunta se substitui) |
| `name` | texto(1, 80) | sim | nome mostrado no jogo |
| `author` | texto(1, 80) | sim | autor |
| `version` | semver | sim | versão do mod |
| `referenceDate` | data | sim | data de início da carreira (idades são calculadas nela) |
| `description` | texto(0, 500) | não | descrição |

```json
{ "formatVersion": 1, "id": "meu-mod", "name": "Meu mundo", "author": "Ana",
  "version": "1.0.0", "referenceDate": "2027-01-01" }
```

## 4. `countries.json`

Lista com ao menos 1 país.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | id | sim | identificação |
| `name` | texto(1, 60) | sim | nome |
| `code` | 3 letras maiúsculas | sim | código do país (único) |
| `names` | objeto | não | banco de nomes para jogadores gerados: `firstNames` e `surnames`, listas de texto(1, 30) com ao menos 20 itens cada |
| `rules` | objeto | não | regras próprias do país (abaixo) |

### `rules` do país

| Campo | Tipo | Descrição |
|---|---|---|
| `foreignLimit` | inteiro(0, 25) | máximo de jogadores de nacionalidade diferente da do clube no elenco; ausente = sem limite. Vale para o jogador e para a IA nas contratações (transferência, empréstimo e livre); renovações e jovens revelados nunca são bloqueados, e um clube que ultrapassa o limite não perde ninguém, só deixa de contratar estrangeiros |

O banco de nomes (`names`) é **exigido** em bancos com mais de um país: cada país com competição
precisa do seu (erro `country.names_missing`). Num banco de um país só ele continua opcional.

## 5. `competitions.json`

Lista com ao menos 1 competição, em pontos corridos (`league`), mata-mata (`knockout`, uma copa), fase de grupos (`groups`) ou uma sequência de fases (`stages`). A **primeira** é a
competição **principal**: dela vêm a economia, o mercado, a diretoria, a torcida, as manchetes, o
acesso e o rebaixamento que o jogo acompanha e o histórico da carreira. As demais são
**secundárias**: têm partidas, tabela e estatísticas próprias, e todos os seus clubes precisam estar
também na principal. Os clubes podem repetir entre competições, e cada competição joga nas datas da
sua agenda (`schedule`).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | id | sim | identificação |
| `countryId` | id | sim | país da competição |
| `name` | texto(1, 80) | sim | nome (fica no mod, não nas traduções) |
| `format` | objeto | sim | formato de disputa (abaixo) |
| `divisions` | lista (1 a 99) | sim | divisões (abaixo) |
| `economy` | objeto | não | regras econômicas (seção 9) |
| `market` | objeto | não | regras do mercado (seção 9) |
| `board` | objeto | não | regras da diretoria (seção 9) |
| `fans` | objeto | não | regras da torcida (seção 9) |
| `news` | objeto | não | regras das manchetes (seção 9) |
| `schedule` | objeto | não | quando a competição joga (abaixo) |
| `discipline` | objeto | não | regras de cartões da competição (abaixo) |
| `fitness` | objeto | não | condição física dos jogadores; vale a da competição principal (abaixo) |

### `schedule`

Define as datas das rodadas. A temporada começa na data de referência do pacote e dura 52 semanas.
Campos ausentes assumem o padrão: **uma rodada por domingo**, a partir do início da temporada.

| Campo | Tipo | Descrição |
|---|---|---|
| `weekday` | inteiro(1, 7) | dia da semana das rodadas: 1 = segunda-feira … 7 = domingo (padrão 7) |
| `startWeek` | inteiro(0, 51) | semanas depois do primeiro `weekday` da temporada em que acontece a 1ª rodada (padrão 0) |
| `everyWeeks` | inteiro(1, 4) | semanas entre rodadas consecutivas (padrão 1) |

Exemplo: uma copa às quartas-feiras, de duas em duas semanas, começando na semana 1:
`"schedule": { "weekday": 3, "startWeek": 1, "everyWeeks": 2 }`.

Duas regras são conferidas ao carregar o pacote: nenhum clube pode ter dois jogos no mesmo dia
(`calendar.club_double_booked`) e a última rodada de cada competição precisa caber nas 52 semanas
(`calendar.competition_overflow`).

### `discipline`

Regras de cartões **da competição** (amarelos e suspensões contam por competição; lesões valem para
todas). Campos ausentes assumem as regras de sempre.

| Campo | Tipo | Descrição |
|---|---|---|
| `yellowsForSuspension` | inteiro(1, 10) | amarelos acumulados que geram suspensão (padrão 3) |
| `matchesPerRed` | inteiro(1, 10) | jogos de suspensão por expulsão (padrão 1) |

### `fitness`

Condição física dos jogadores (0 a 100): cai com os minutos jogados, volta a cada dia sem jogo e
reduz a força na partida. Vale a configuração da competição **principal**; campos ausentes assumem
o padrão.

| Campo | Tipo | Descrição |
|---|---|---|
| `drainPer90` | inteiro(0, 100) | pontos perdidos por 90 minutos jogados (padrão 30) |
| `recoveryPerDay` | inteiro(0, 100) | pontos recuperados por dia (padrão 5) |
| `penaltyBpPerPoint` | inteiro(0, 100) | perda de força, em 1/10000, por ponto de condição abaixo de 100 (padrão 40) |

### `format` (pontos corridos)

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"league"` | pontos corridos (`knockout` é a copa, `groups` e `stages` são as fases, descritas abaixo) |
| `rounds` | inteiro(1, 4) | turnos (2 = ida e volta) |
| `points` | objeto | `win`, `draw`, `loss`, inteiros(0, 10); vitória > empate ≥ derrota |
| `tiebreakers` | lista | critérios de desempate, sem repetição: `wins`, `goal-difference`, `goals-for`, `head-to-head`, `fewest-red-cards`, `draw-lots` |

### `format` (copa: `"type": "knockout"`)

Uma copa de mata-mata tem **uma única divisão** (`divisions` com um item, nível 1, sem vagas de acesso
nem rebaixamento) cujos `clubIds` são os participantes, todos também na competição principal. As
fases (`phases`) são jogadas em ordem; cada fase tem as próprias regras.

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"knockout"` | copa de mata-mata |
| `phases` | lista (2 a 8) | fases, da primeira à final |
| `entries` | lista | clubes que só entram numa fase posterior (opcional) |

Cada item de `phases`:

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | texto(1, 40) | nome da fase (por exemplo, "Quartas de final") |
| `legs` | 1 ou 2 | jogo único ou ida e volta |
| `tiebreakers` | lista | critérios para decidir um confronto empatado, em ordem: `away-goals` (gols fora, só em ida e volta), `extra-time` (prorrogação de 2 × 15 min) e `penalties`; o último precisa ser `penalties`, para sempre haver um classificado |
| `home` | texto | quem manda o jogo: `draw` (sorteio), `ranking` (o de maior reputação), `division` (o de divisão mais baixa; na mesma divisão, sorteio) ou `overall` (o melhor colocado na classificação geral da fase de pontos anterior; sem ela, vale `ranking`) |
| `prize` | inteiro(0, 1000000000) | prêmio pago ao **vencedor** de cada confronto da fase, em reais (o campeão recebe o da final) |
| `neutral` | verdadeiro/falso | campo neutro (só em jogo único); a renda do jogo fica sem mando (padrão falso) |
| `neutralCapacity` | inteiro(1000, 150000) | capacidade do estádio neutro (só com `neutral`; padrão 40000) |
| `seeded` | verdadeiro/falso | cabeças de chave: os de maior reputação não se cruzam enquanto houver vaga (padrão falso) |
| `gapWeeks` | inteiro(0, 8) | semanas de respiro antes da fase, somadas ao intervalo da agenda (padrão 0) |

Cada item de `entries`:

| Campo | Tipo | Descrição |
|---|---|---|
| `phase` | inteiro(1, 7) | índice da fase em que os clubes entram (0 é a primeira; só vale de 1 até a penúltima) |
| `clubIds` | lista de id | clubes que entram nessa fase, todos participantes da divisão e em uma só entrada |

**Quantos clubes por fase.** A primeira fase tem os participantes menos os clubes das `entries`.
Cada fase seguinte tem a metade dos classificados da anterior mais os clubes que entram nela. Todo
número precisa ser par e a última fase tem exatamente 2 clubes (`knockout.phase_count` diz a fase e
quantos clubes faltam ou sobram). Cada fase usa uma rodada por perna, nas datas da `schedule`.

Exemplo, uma copa de 8 clubes (quartas, semifinal em ida e volta e final em campo neutro):

```json
{
  "id": "copa-exemplo",
  "countryId": "pais-1",
  "name": "Copa Exemplo",
  "format": {
    "type": "knockout",
    "phases": [
      { "name": "Quartas de final", "legs": 1, "tiebreakers": ["extra-time", "penalties"], "home": "ranking", "prize": 100000 },
      { "name": "Semifinal", "legs": 2, "tiebreakers": ["away-goals", "extra-time", "penalties"], "home": "draw", "prize": 250000 },
      { "name": "Final", "legs": 1, "tiebreakers": ["extra-time", "penalties"], "home": "draw", "neutral": true, "neutralCapacity": 60000, "prize": 600000, "gapWeeks": 1 }
    ]
  },
  "divisions": [
    { "level": 1, "name": "Chave", "clubIds": ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"], "promotionSlots": 0, "relegationSlots": 0 }
  ],
  "schedule": { "weekday": 3, "startWeek": 1, "everyWeeks": 2 }
}
```

### Fases: grupos, pontos corridos e mata-mata em sequência

Uma divisão (ou a competição inteira) pode ser disputada em **fases**, jogadas em ordem: cada
fase classifica clubes para a seguinte. Há três tipos de fase (`league`, `groups` e `knockout`) e
três maneiras de declarar:

- `"format": { "type": "groups", … }`: a competição é uma única fase de grupos;
- `"format": { "type": "stages", "stages": [ … ] }`: a competição é uma sequência de 1 a 8 fases;
- `"stages": [ … ]` dentro de uma **divisão**: só aquela divisão é disputada em fases, e as demais
  seguem o `format` da competição (por exemplo, a quarta divisão em grupos regionais seguidos de
  mata-mata numa liga de pontos corridos). `division.stages` vale no lugar do `format`.

A última fase da sequência não declara classificados: ela define a classificação final da divisão
(campeão, acesso e rebaixamento). Cada fase seguinte joga com os classificados da anterior mais os
clubes de `enter`. Respiros entre fases (`gapWeeks`) só cabem em competições de uma divisão.

#### Fase de pontos corridos (`"type": "league"`)

Os campos de `format` (pontos corridos), mais:

| Campo | Tipo | Descrição |
|---|---|---|
| `qualified` | inteiro(1, 40) | quantos primeiros da tabela avançam; ausente só na última fase |
| `enter` | lista de id | clubes que só entram nesta fase (não valem na primeira) |
| `gapWeeks` | inteiro(0, 8) | semanas de respiro antes da primeira rodada da fase (padrão 0) |

#### Fase de grupos (`"type": "groups"`)

| Campo | Tipo | Descrição |
|---|---|---|
| `groupSize` | inteiro(3, 8) | clubes por grupo; todos os grupos da fase têm o mesmo tamanho, e o número de clubes precisa ser múltiplo dele (`stages.group_size_mismatch`) com ao menos 2 grupos |
| `rounds` | 1 ou 2 | turno único ou ida e volta dentro do grupo |
| `points` | objeto | `win`, `draw`, `loss`, como na liga |
| `tiebreakers` | lista | critérios de desempate, como na liga; o sorteio pela seed é sempre o último |
| `qualified` | inteiro(1, 7) | os primeiros de cada grupo que avançam (de 1 até `groupSize` − 1); ausente só na última fase |
| `extra` | inteiro(0, 16) | vagas extras para os melhores da posição seguinte (`qualified` + 1) de todos os grupos, pela classificação geral; no máximo uma por grupo (padrão 0) |
| `enter` | lista de id | clubes que só entram nesta fase |
| `gapWeeks` | inteiro(0, 8) | respiro antes da primeira rodada (padrão 0) |
| `draw` | objeto | sorteio dos grupos (abaixo); sem ele, o sorteio é simples pela seed |

A **classificação geral** da fase reúne todos os grupos e ordena por pontos e pelos critérios da
fase, sem o confronto direto (que só vale dentro de um grupo); o último critério é o sorteio pela
seed. Ela escolhe as vagas extras, define o mando de campo `overall` no mata-mata e ordena quem
caiu na fase (rebaixamento).

Cada item de `draw`:

| Campo | Tipo | Descrição |
|---|---|---|
| `pots` | inteiro(2, 8) | número de potes; precisa ser igual a `groupSize`. Cada grupo recebe no máximo um clube de cada pote. Os potes saem da reputação, do maior para o menor |
| `previousStagePot` | verdadeiro/falso | o último pote é formado pelos clubes que chegam classificados da fase anterior (precisa de `pots`; e esse pote tem um clube por grupo) |
| `rules` | lista (até 8) | regras de sorteio (abaixo) |

Cada regra de `rules` tem um `kind`:

| `kind` | Campos | Efeito |
|---|---|---|
| `separate` | `attribute`: `country` ou `region`; `exemptPots`: lista de potes (opcional) | **separação**: nenhum grupo tem dois clubes com o mesmo valor do atributo. Os clubes dos potes isentos não ficam sujeitos à regra (por exemplo, o pote dos classificados da fase preliminar, que pode ter clubes do mesmo país) |
| `concentrate` | `attribute`: `region` | **concentração** (preferência): os clubes de cada região ficam no menor número de grupos possível, e esses grupos são vizinhos na ordem das letras (A, B, C…). Nunca faz o sorteio falhar |

A separação vence a concentração. Se nenhuma distribuição respeita a separação, a **validação do
mod** recusa os casos que dá para provar impossíveis pelos dados (`stages.separation_impossible`).
Numa **carreira** o sorteio nunca trava o jogador: ele conclui violando o mínimo possível e a tela
da competição avisa quais clubes ficaram juntos. O atributo `region` é opcional e fica no clube
(seção 6); clubes sem região não entram nas regras por região.

#### Fase de mata-mata (`"type": "knockout"`)

Os campos de `format` (copa) — `phases` e `entries` —, mais:

| Campo | Tipo | Descrição |
|---|---|---|
| `pairing` | `position` ou `draw` | como a primeira fase é montada: `position` (padrão depois de uma fase de pontos) cruza a posição no grupo ou na tabela (o melhor contra o pior, evitando o mesmo grupo); `draw` sorteia |
| `pairs` | lista de pares | tabela própria da primeira fase; cada item é um par de origens: `A1` (1º do Grupo A), `B2` (2º do Grupo B), `T3` (3º da tabela de pontos corridos) ou `X1` (1ª vaga extra). Todos os classificados precisam aparecer uma vez (`stages.pairs_invalid`) |
| `enter` | lista de id | clubes que só entram nesta fase |

Numa sequência, o mata-mata pode vir em qualquer posição (por exemplo, uma fase preliminar antes
dos grupos). Se não for a última fase, a última fase dele pode ter mais de 2 clubes: os vencedores
dos confrontos dela avançam. Se for a última, termina na final com 2 clubes.

Exemplo 1, a quarta divisão regional de uma liga: 20 clubes em 4 grupos de 5, concentrados por
região, 2 classificados por grupo e um mata-mata de 8 clubes (no `competitions.json`, dentro da
divisão de baixo; os 2 finalistas sobem):

```json
{
  "level": 2,
  "name": "Série B",
  "clubIds": ["c21", "c22", "c23", "c24", "c25", "c26", "c27", "c28", "c29", "c30", "c31", "c32", "c33", "c34", "c35", "c36", "c37", "c38", "c39", "c40"],
  "promotionSlots": 2,
  "relegationSlots": 0,
  "stages": [
    {
      "type": "groups", "groupSize": 5, "rounds": 1,
      "points": { "win": 3, "draw": 1, "loss": 0 },
      "tiebreakers": ["wins", "goal-difference", "goals-for", "head-to-head", "draw-lots"],
      "qualified": 2,
      "draw": { "rules": [ { "kind": "concentrate", "attribute": "region" } ] }
    },
    {
      "type": "knockout",
      "phases": [
        { "name": "Quartas de final", "legs": 1, "tiebreakers": ["extra-time", "penalties"], "home": "overall", "prize": 0 },
        { "name": "Semifinal", "legs": 1, "tiebreakers": ["extra-time", "penalties"], "home": "overall", "prize": 0 },
        { "name": "Final", "legs": 1, "tiebreakers": ["extra-time", "penalties"], "home": "draw", "neutral": true, "prize": 0 }
      ]
    }
  ]
}
```

Exemplo 2, uma competição de uma divisão com 28 clubes de vários países: fase preliminar
eliminatória de 16 clubes (4 classificados), 4 grupos de 4 com 4 potes — o último, dos
classificados da preliminar — e separação por país com esse pote isento, e mata-mata de 8 clubes
(`"c13"` a `"c24"` são os 12 que entram direto nos grupos):

```json
{
  "id": "copa-continental",
  "countryId": "pais-1",
  "name": "Copa Continental Exemplo",
  "format": {
    "type": "stages",
    "stages": [
      {
        "type": "knockout",
        "phases": [
          { "name": "Preliminar 1", "legs": 1, "tiebreakers": ["extra-time", "penalties"], "home": "ranking", "prize": 0 },
          { "name": "Preliminar 2", "legs": 1, "tiebreakers": ["extra-time", "penalties"], "home": "ranking", "prize": 0 }
        ]
      },
      {
        "type": "groups", "groupSize": 4, "rounds": 1,
        "points": { "win": 3, "draw": 1, "loss": 0 },
        "tiebreakers": ["wins", "goal-difference", "goals-for", "draw-lots"],
        "qualified": 2,
        "enter": ["c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20", "c21", "c22", "c23", "c24"],
        "draw": {
          "pots": 4, "previousStagePot": true,
          "rules": [ { "kind": "separate", "attribute": "country", "exemptPots": [4] } ]
        }
      },
      {
        "type": "knockout",
        "phases": [
          { "name": "Quartas de final", "legs": 2, "tiebreakers": ["away-goals", "penalties"], "home": "overall", "prize": 0 },
          { "name": "Semifinal", "legs": 2, "tiebreakers": ["away-goals", "penalties"], "home": "overall", "prize": 0 },
          { "name": "Final", "legs": 1, "tiebreakers": ["extra-time", "penalties"], "home": "draw", "neutral": true, "prize": 0 }
        ]
      }
    ]
  },
  "divisions": [
    { "level": 1, "name": "Chave", "clubIds": ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20", "c21", "c22", "c23", "c24", "c25", "c26", "c27", "c28"], "promotionSlots": 0, "relegationSlots": 0 }
  ],
  "schedule": { "weekday": 3, "startWeek": 1, "everyWeeks": 1 }
}
```

Em divisões em fases, a **posição final** de cada clube é: o campeão e o vice saem da final; quem
caiu em cada fase fica atrás de quem foi mais longe, ordenado pela classificação geral entre os
que caíram na mesma fase; quem não passou dos grupos fica ordenado pela classificação geral. Essa
posição é a que valem os prêmios da divisão, as metas da diretoria, a torcida, o acesso e o
rebaixamento.

### `divisions`

| Campo | Tipo | Descrição |
|---|---|---|
| `level` | inteiro(1, 99) | nível (1 = principal); os níveis devem ser contínuos começando em 1 |
| `name` | texto(1, 60) | nome da divisão |
| `clubIds` | lista de id | clubes da divisão: de 4 a 40, sem repetição, cada clube em uma só divisão da competição |
| `promotionSlots` | inteiro(0, 40) | vagas de acesso (0 na divisão principal) |
| `relegationSlots` | inteiro(0, 40) | vagas de rebaixamento (0 na última divisão) |

Os rebaixados de um nível devem ser tantos quanto os promovidos do nível de baixo.

## 6. `clubs.json`

Lista com ao menos 2 clubes.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | id | sim | identificação |
| `name` | texto(1, 60) | sim | nome completo |
| `shortName` | texto(1, 20) | sim | nome curto |
| `abbreviation` | 3 letras maiúsculas | sim | sigla (única) |
| `city` | texto(1, 60) | sim | cidade |
| `countryId` | id | sim | país do clube |
| `colors` | objeto | sim | `primary` e `secondary` (cores) |
| `crest` | objeto | sim | escudo (abaixo) |
| `reputation` | escala | sim | reputação (atrai jogadores, define torcida, patrocínio e expectativa) |
| `stadiumCapacity` | inteiro(1000, 150000) | sim | capacidade do estádio |
| `initialCash` | inteiro(−1000000000, 10000000000) | sim | caixa inicial |
| `region` | texto(1, 40) | não | região do clube, usada pelas regras de sorteio dos grupos (`separate` e `concentrate` por `region`) |

### `crest` (escudo)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `shape` | `classic`, `round`, `triangle` ou `rectangle` | sim | forma do escudo gerado |
| `colors` | lista de 2 ou 3 cores | sim | cores do escudo gerado |
| `initials` | texto(1, 4), letras e números | sim | iniciais desenhadas |
| `image` | caminho `images/…` (.png, .jpg, .jpeg, .webp), até 120 caracteres | não | imagem que substitui o escudo gerado |

### Escudos em imagem

Coloque as imagens na pasta `images/` do pacote e aponte cada clube com `crest.image`, por exemplo
`"image": "images/clube-001.png"`. Clubes sem imagem usam o escudo gerado a partir de forma, cores e
iniciais. A imagem referenciada precisa existir no pacote; imagens que nenhum clube usa geram aviso.
Ao criar uma carreira, as imagens são copiadas para dentro dela: remover o mod depois não apaga os
escudos.

## 7. `players.json`

Cada clube deve ter de 16 a 40 jogadores, com ao menos 2 goleiros.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | id | sim | identificação |
| `name` | texto(1, 80) | sim | nome completo |
| `displayName` | texto(1, 30) | sim | nome mostrado nas telas |
| `birthDate` | data | sim | nascimento; idade entre 15 e 45 anos na `referenceDate` |
| `nationalityId` | id | sim | país |
| `clubId` | id | sim | clube atual |
| `position` | `GK`, `FB`, `CB`, `DM`, `MF` ou `FW` | sim | goleiro, lateral, zagueiro, volante, meia, atacante |
| `strength` | escala | sim | força |
| `traits` | lista de 0 a 2, sem repetição | sim | `finisher`, `wall`, `free-kick`, `heading`, `pace`, `playmaker` |
| `hidden` | objeto | não | `potential`, `temperament`, `injuryProneness` (escala); ausentes são sorteados; o potencial não pode ser menor que a força |
| `contract` | objeto | não | `wage` (salário mensal, inteiro ≥ 0), `untilYear` (último ano), `loan` opcional (`fromClubId`, `untilYear`) |

## 8. `rivalries.json` (opcional)

| Campo | Tipo | Descrição |
|---|---|---|
| `clubIds` | lista de 2 ids | os dois clubes (diferentes, existentes) |
| `intensity` | inteiro(1, 3) | 1 regional, 2 tradicional, 3 maior clássico |

Cada par aparece uma vez só (em qualquer ordem). Jogos entre rivais são clássicos e pesam mais na
torcida e na diretoria.

## Vários países

Um banco pode ter quantos países quiser, cada um com a sua pirâmide de competições, as suas regras
econômicas e o seu banco de nomes — tudo só com dados. Um exemplo pronto com 3 países de estruturas
diferentes (uma divisão; duas divisões; duas divisões e copa) está em `mods/exemplo-mundo`.

- **Competição principal do país:** a **primeira** competição de `competitions.json` com aquele
  `countryId`. Ela precisa ser de pontos corridos, grupos ou fases (nunca uma copa de mata-mata, erro
  `country.main_not_league`). Dela vêm as regras do país: `economy`, `market`, `board`, `fans`,
  `news` e `fitness` (seção 9). Para dar a um país uma economia diferente, declare a `economy` na
  competição principal dele: `wageFactorPct`, `fansBase`, `fansPerReputation`, `sponsorship`,
  `prizes`, `stadium` e `credit` andam juntos; um país que ganha mais e paga mais salários continua
  equilibrado. As competições secundárias do país (copas e regionais) só têm clubes da principal dele.
- **Clubes:** um clube só pode estar na competição principal de um país (erro
  `unique.duplicate_club_in_country`). O `countryId` do clube é o país dele; o `nationalityId` dos
  jogadores define quem é estrangeiro para o limite `foreignLimit`.
- **Reputação:** cada clube tem a sua `reputation`, a mesma em qualquer país. Ela define para quais
  clubes o técnico recebe propostas de emprego (de qualquer país) e o interesse dos jogadores.
- **Transferências entre países:** a taxa é paga em valor de mercado, sem conversão (o valor do
  jogador depende só dele e da reputação do clube); o salário segue a escala do país do clube de
  destino (`wageFactorPct`). A IA contrata de outros países, no máximo `aiMarket.maxInternationalPerClub`
  vezes por clube e janela (padrão 1).
- **Calendário:** cada competição tem a sua `schedule`; todos os países jogam na mesma temporada de
  52 semanas. Para os jogos caírem no mesmo dia, use a mesma agenda.
- **Banco de nomes:** `names` de cada país gera os jovens e os técnicos do país dos clubes dele.
- **Escala:** com muitos clubes, os jogos de ligas de outros países que o técnico não acompanha usam
  uma simulação resumida (resultado, gols, cartões e lesões), estatisticamente equivalente à
  completa; os do país do técnico usam a completa.

## 9. Seções opcionais de regras

Todas as regras abaixo ficam dentro da competição e são **opcionais**: campos ausentes usam os
valores padrão do jogo, e você pode informar só o que quer mudar. Todos os valores são inteiros.

- `economy` — torcida base e por reputação (`fansBase`, `fansPerReputation`), elasticidade do preço
  (`priceElasticityPct`, múltiplo de 25), faixa de preço do ingresso (`priceRange.min/max`), crédito
  (`credit.perReputation`, `credit.interestBp`), obras de estádio (`stadium.maxCapacity`,
  `stadium.options[]` com `seats`, `cost`, `rounds`), rodadas para entrar em crise (`crisisRounds`),
  fator de salários (`wageFactorPct`) e regras por divisão (`divisions[]` com `level`,
  `referencePrice`, `fanFactorPct`, `sponsorship`, `prizes`, `creditBase`).
- `market` — janelas (`windows[]` com `fromRound`/`toRound`), anos de contrato (`contractYears`),
  valor no fim de contrato (`lastYearValuePct`, `twoYearsValuePct`), respostas dos clubes (`club`),
  exigências dos jogadores (`player`), propostas recebidas (`incoming`), livres (`freeAgents`), IA de
  mercado (`aiMarket`) e renovações da IA (`ai`).
- `board` — metas, confiança, demissão, reputação, vagas e propostas da diretoria, e o peso dos
  clássicos (`derbyPct`) e a copa (`cupOut`, `cupTitle`, `cupGoal`).
- `fans` — humor da torcida: pesos de resultado, expectativa, clássicos, ídolos, público, pressão na
  diretoria, virada de temporada, faixas (`bands`, 4 limites) e a copa (`cupOut`, `cupTitle`).
- `news` — manchetes: limiares (`routMargin`, `upsetGap`, `streakMin`, `droughtMin`,
  `bigTransferPct`), relevância e variações por tipo (`relevance`, `variants`), limites do feed
  (`feedLimit`, `homeLimit`, `extrasPerMatch`) e do histórico (`allTimeTop`, `legendsPerClub`).

Os nomes e as faixas exatas de cada campo estão no schema do jogo; um valor fora da faixa gera o
erro `schema.out_of_range` indicando o campo e a faixa aceita. O banco padrão (`mods/default`)
traz `economy` explícita, que serve de modelo.

## 10. Planilhas (CSV)

Na tela **Mods** é possível exportar os clubes e os jogadores de qualquer banco em CSV, editar numa
planilha e importar de volta, gerando um pacote novo (validado antes do download). Países,
competições e regras continuam em JSON.

- Codificação UTF-8 (com ou sem BOM); separador vírgula ou ponto e vírgula; texto com separador ou
  aspas vai entre aspas duplas, e aspas dentro do texto são escritas duas vezes (`""`).
- Uma linha por item; célula vazia = campo opcional ausente.
- Colunas extras geram aviso e são ignoradas; colunas obrigatórias ausentes geram erro.

### `clubs.csv`

`id`, `name`, `shortName`, `abbreviation`, `city`, `countryId`, `reputation`, `stadiumCapacity`, `initialCash`, `colorPrimary`, `colorSecondary`, `crestShape`, `crestColor1`, `crestColor2`, `crestColor3`, `crestInitials`, `crestImage`, `region`

### `players.csv`

`id`, `name`, `displayName`, `birthDate`, `nationalityId`, `clubId`, `position`, `strength`, `traits`, `potential`, `temperament`, `injuryProneness`, `contractWage`, `contractUntilYear`, `loanFromClubId`, `loanUntilYear`

`traits` lista as características separadas por `|` (ex.: `finisher|pace`).

## 11. Como o jogo valida

O jogo confere o pacote inteiro e lista **todos** os problemas de uma vez, cada um com o arquivo, o
item (índice e identificador) e o campo. Erros impedem o carregamento; avisos não. Depois de
carregado, o mod fica no navegador e aparece na criação de carreira. Cada carreira guarda a própria
cópia do banco: trocar ou remover o mod não afeta carreiras já criadas.

Fora do jogo, `pnpm validate-bank <pasta|arquivo.zip>` faz a mesma validação na linha de comando.

## 12. Mensagens de erro

| Código | Mensagem |
|---|---|
| `schema.required` | Falta o campo obrigatório {field}. |
| `schema.unknown_field` | O campo {field} não é reconhecido e foi ignorado. |
| `schema.invalid_type` | O campo {field} deveria ser do tipo {expected}, mas é do tipo {received}. |
| `schema.out_of_range` | O campo {field} vale {value}, mas deve estar entre {min} e {max}. |
| `schema.invalid_length` | O campo {field} tem tamanho {length}, mas deve ter entre {min} e {max}. |
| `schema.invalid_format` | O campo {field} tem o valor "{value}", que não está no formato esperado ({format}). |
| `schema.invalid_value` | O campo {field} tem o valor "{value}", que não é permitido. Valores aceitos: {allowed}. |
| `schema.not_integer` | O campo {field} vale {value}, mas deve ser um número inteiro. |
| `manifest.unsupported_format_version` | A versão {found} do formato não é suportada. Versões suportadas: {supported}. |
| `format.unsupported` | O formato de disputa "{type}" ainda não é suportado. |
| `format.points_order` | A pontuação ({win} por vitória, {draw} por empate e {loss} por derrota) é inválida: a vitória deve valer mais que o empate, e o empate pelo menos o mesmo que a derrota. |
| `format.duplicate_tiebreaker` | O critério de desempate "{tiebreaker}" aparece mais de uma vez. |
| `unique.duplicate_id` | O identificador {id} já é usado por outro item (seção {otherSection}, índice {otherIndex}). |
| `unique.duplicate_abbreviation` | A sigla {abbreviation} já é usada pelo clube {otherClubId}. |
| `unique.duplicate_country_code` | O código de país {code} já é usado pelo país {otherCountryId}. |
| `ref.country_not_found` | {section, select, players {O jogador} clubs {O clube} competitions {A competição} other {O item}} {entityId} referencia o país {countryId} no campo {field}, mas esse país não existe. |
| `ref.club_not_found` | {section, select, players {O jogador} competitions {A competição} rivalries {A rivalidade} other {O item}} {entityId} referencia o clube {clubId}, que não existe. |
| `division.levels_not_contiguous` | Os níveis das divisões ({levels}) devem ser contínuos e começar em 1. |
| `division.club_count` | A divisão tem {count, plural, one {# clube} other {# clubes}}, mas deve ter entre {min} e {max}. |
| `division.duplicate_club` | O clube {clubId} aparece mais de uma vez na mesma divisão. |
| `division.club_in_multiple` | O clube {clubId} já está em outra divisão (competição {otherCompetitionId}, nível {otherLevel}). |
| `calendar.club_double_booked` | As competições {competitionId} e {otherCompetitionId} marcam jogos do clube {clubId} no mesmo dia ({date}). |
| `calendar.competition_overflow` | A competição {competitionId} precisa de {needed, plural, one {# semana} other {# semanas}} para as suas rodadas, mas a temporada tem {available, plural, one {# semana} other {# semanas}}. |
| `knockout.phase_count` | A fase {phase} da copa fica com {count, plural, one {# clube} other {# clubes}} e o chaveamento não fecha (cada fase precisa de número par de clubes e a última, de 2). Diferença para fechar: {delta} (positivo = faltam clubes; negativo = sobram). |
| `knockout.entry_phase` | A entrada na fase {phase} é inválida: a copa tem {phases, plural, one {# fase} other {# fases}} e as entradas só valem da fase 1 até a penúltima. |
| `knockout.entry_duplicate` | O clube {clubId} aparece em mais de uma entrada da copa. |
| `knockout.entry_not_participant` | O clube {clubId} da entrada não está na divisão da copa. |
| `knockout.no_decider` | A fase {phase} da copa precisa terminar com o critério "penalties" para sempre ter um classificado. |
| `knockout.neutral_two_legs` | A fase {phase} da copa não pode ter campo neutro em ida e volta. |
| `knockout.single_division` | A copa precisa de uma única divisão, mas tem {divisions}. |
| `stages.gap_conflict` | A competição {competitionId} declara respiros entre as fases (gapWeeks), mas as datas são uma grade só por competição; só competições de uma divisão podem ter respiros. |
| `stages.group_size_mismatch` | A fase {stage} tem {clubs, plural, one {# clube} other {# clubes}}, que não formam grupos de {groupSize}: o número de clubes precisa ser múltiplo do tamanho do grupo. |
| `stages.group_count` | A fase {stage} formaria {groups, plural, one {# grupo} other {# grupos}}, mas uma fase de grupos precisa de pelo menos 2. |
| `stages.qualify_range` | A fase {stage} classifica {qualified} por grupo (ou da tabela), mas o valor precisa estar entre 1 e {max}; só a última fase pode não declarar classificados. |
| `stages.extra_exceeds_groups` | A fase {stage} tem {extra, plural, one {# vaga extra} other {# vagas extras}}, mais do que seus {groups, plural, one {# grupo} other {# grupos}}: só há um clube na posição seguinte de cada grupo. |
| `stages.qualify_mismatch` | A fase {stage} classifica {qualifying, plural, one {# clube} other {# clubes}}; com os que entram, a fase {next} fica com {nextClubs, plural, one {# clube} other {# clubes}}, o que não fecha os grupos ou o chaveamento dela. |
| `stages.qualified_without_next` | A fase {stage} é a última e não pode declarar classificados (qualified ou extra). |
| `stages.knockout_count` | A fase {phase} do mata-mata da fase {stage} fica com {count, plural, one {# clube} other {# clubes}} e o chaveamento não fecha. Diferença para fechar: {delta} (positivo = faltam clubes; negativo = sobram). |
| `stages.enter_unknown_club` | O clube {clubId}, que entra na fase {stage}, não está na divisão. |
| `stages.enter_first_stage` | O clube {clubId} não pode entrar na fase {stage}: é a primeira, e todo clube que não entra depois já a disputa. |
| `stages.enter_duplicate` | O clube {clubId} aparece mais de uma vez nas entradas das fases. |
| `stages.pots_range` | A fase {stage} declara {pots, plural, =0 {potes sem número} one {# pote} other {# potes}}, mas o número de potes precisa ser igual ao tamanho do grupo ({groupSize}), e o pote dos classificados da fase anterior exige o número de potes. |
| `stages.pot_size` | O pote {pot} da fase {stage} teria {clubs, plural, one {# clube} other {# clubes}}, mas precisa de um por grupo ({groups, plural, one {# grupo} other {# grupos}}). |
| `stages.rule_exempt_pot` | A regra de sorteio da fase {stage} isenta o pote {pot}, que não existe: a fase tem {pots, plural, =0 {nenhum pote} one {# pote} other {# potes}}. |
| `stages.separation_impossible` | Na fase {stage}, {clubs, plural, one {# clube} other {# clubes}} com {attribute, select, country {o mesmo país} region {a mesma região} other {o mesmo atributo}} ({value}) não cabem em {groups, plural, one {# grupo} other {# grupos}} sem se encontrar. |
| `stages.pairs_invalid` | A tabela de confrontos da fase {stage} tem uma origem inválida ou fora de lugar: {origin}. Cada classificado precisa aparecer uma vez (A1 = 1º do Grupo A, T1 = 1º da tabela, X1 = primeira vaga extra). |
| `stages.relegation_exceeds_eliminated` | O nível {level} rebaixa {relegation, plural, one {# clube} other {# clubes}}, mas só {eliminated, plural, one {# clube fica} other {# clubes ficam}} fora da fase seguinte à primeira: o rebaixamento sai de quem não avança. |
| `competition.club_outside_main` | O clube {clubId} da competição {competitionId} não está na competição principal do país (a primeira competição dele na lista). |
| `country.main_not_league` | A primeira competição do país {countryId} ({competitionId}) é uma copa de mata-mata; a competição principal do país precisa ser uma liga, com divisões ou fases. |
| `country.names_missing` | O país {countryId} não tem banco de nomes; num banco com mais de um país, cada país com competição precisa do seu (campo names). |
| `country.foreign_limit_exceeded` | O clube {clubId} começa com {count, plural, one {# jogador estrangeiro} other {# jogadores estrangeiros}}, mais que o limite de {limit} do país. |
| `unique.duplicate_club_in_country` | O clube {clubId} já está na competição principal {otherCompetitionId}; um clube só pode estar na liga de um país. |
| `division.top_has_promotion` | A divisão mais alta não pode ter vagas de acesso, mas tem {slots}. |
| `division.bottom_has_relegation` | A divisão mais baixa não pode ter vagas de rebaixamento, mas tem {slots}. |
| `division.slots_mismatch` | O nível {level} rebaixa {relegated, plural, one {# clube} other {# clubes}}, mas o nível {nextLevel} promove {promoted, plural, one {# clube} other {# clubes}}; os números devem ser iguais. |
| `division.slots_exceed_clubs` | O nível {level} tem {slots} vagas de acesso e rebaixamento, mais do que seus {clubs} clubes. |
| `economy.price_range` | O preço mínimo do ingresso ({min}) é maior que o máximo ({max}). |
| `country.names_too_few` | O banco de nomes do país tem {count, plural, one {# {kind, select, firstNames {nome} other {sobrenome}}} other {# {kind, select, firstNames {nomes} other {sobrenomes}}}}; são necessários ao menos {min}. |
| `economy.unknown_division` | As regras econômicas citam a divisão de nível {level}, que não existe na competição. |
| `squad.size` | O clube {clubId} tem {count, plural, =0 {nenhum jogador} one {# jogador} other {# jogadores}}; o elenco deve ter entre {min} e {max}. |
| `squad.min_goalkeepers` | O clube {clubId} {count, plural, =0 {não tem goleiros} one {tem apenas # goleiro} other {tem apenas # goleiros}}; o mínimo é {min}. |
| `player.potential_below_strength` | O jogador {entityId} tem potencial {potential}, menor que a força atual ({strength}). |
| `player.duplicate_trait` | O jogador {entityId} tem a característica "{trait}" repetida. |
| `player.age_out_of_range` | O jogador {entityId} teria {age} anos na data de referência; a idade deve estar entre {min} e {max}. |
| `rivalry.same_club` | A rivalidade {entityId} liga o clube {clubId} a ele mesmo. |
| `rivalry.duplicate_pair` | A rivalidade entre {clubA} e {clubB} já foi definida (índice {otherIndex}). |
| `package.not_zip` | O arquivo não é um pacote de mod (.zip) válido. |
| `package.too_large` | O pacote tem {size} bytes; o máximo é {max} bytes. |
| `package.images_too_large` | As imagens do pacote somam {size} bytes; o máximo é {max} bytes. |
| `file.too_large` | O arquivo {file} tem {size} bytes; o máximo é {max} bytes. |
| `image.missing` | O clube {clubId} usa a imagem {file}, que não está no pacote. |
| `image.unused` | A imagem {file} está no pacote, mas nenhum clube a usa. |
| `image.too_large` | A imagem {file} tem {size} bytes; o máximo é {max} bytes. |
| `image.too_big_dimensions` | A imagem {file} tem {width} × {height} pixels; o máximo é {max} × {max}. |
| `image.bad_format` | A imagem {file} não é PNG, JPEG nem WebP. |
| `csv.missing_column` | Falta a coluna {column} no arquivo {file}. |
| `csv.unknown_column` | A coluna {column} do arquivo {file} não é reconhecida e foi ignorada. |
| `csv.row_length` | A linha {line} do arquivo {file} tem {found} colunas; eram esperadas {expected}. |
| `csv.invalid_number` | Na linha {line} do arquivo {file}, a coluna {column} deveria ser um número, mas tem "{value}". |
| `csv.unclosed_quote` | A linha {line} do arquivo {file} abre aspas que não são fechadas. |
| `file.missing` | O arquivo {file} não foi encontrado. |
| `file.invalid_json` | O arquivo {file} não é um JSON válido (linha {line}, coluna {column}). |

As mensagens entre chaves (`{campo}`) são preenchidas com os valores do problema encontrado.
