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

## 5. `competitions.json`

Lista com ao menos 1 competição. Hoje o jogo usa a primeira, no formato de pontos corridos.

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

### `format`

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `"league"` | pontos corridos (`knockout` e `groups` são reservados para o futuro) |
| `rounds` | inteiro(1, 4) | turnos (2 = ida e volta) |
| `points` | objeto | `win`, `draw`, `loss`, inteiros(0, 10); vitória > empate ≥ derrota |
| `tiebreakers` | lista | critérios de desempate, sem repetição: `wins`, `goal-difference`, `goals-for`, `head-to-head`, `fewest-red-cards`, `draw-lots` |

### `divisions`

| Campo | Tipo | Descrição |
|---|---|---|
| `level` | inteiro(1, 99) | nível (1 = principal); os níveis devem ser contínuos começando em 1 |
| `name` | texto(1, 60) | nome da divisão |
| `clubIds` | lista de id | clubes da divisão: de 4 a 40, sem repetição, cada clube em uma só divisão |
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
  clássicos (`derbyPct`).
- `fans` — humor da torcida: pesos de resultado, expectativa, clássicos, ídolos, público, pressão na
  diretoria, virada de temporada e faixas (`bands`, 4 limites).
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

`id`, `name`, `shortName`, `abbreviation`, `city`, `countryId`, `reputation`, `stadiumCapacity`, `initialCash`, `colorPrimary`, `colorSecondary`, `crestShape`, `crestColor1`, `crestColor2`, `crestColor3`, `crestInitials`, `crestImage`

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
