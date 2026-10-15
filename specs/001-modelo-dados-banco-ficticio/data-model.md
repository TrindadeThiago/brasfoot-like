# Data Model: Modelo de dados e banco fictício

**Feature**: `001-modelo-dados-banco-ficticio` | **Date**: 2026-10-14

Formato em disco e exemplos completos: [contracts/mod-format.md](contracts/mod-format.md).
Códigos de erro: [contracts/validation-errors.md](contracts/validation-errors.md).

## Convenções

- **Id**: string `^[a-z0-9][a-z0-9-]{0,63}$`, única no banco inteiro (todas as seções).
- **Data**: string `YYYY-MM-DD` (calendário gregoriano, sem hora/fuso).
- **Cor**: string `#RRGGBB` (hexadecimal, maiúsculas ou minúsculas).
- **Escala 1–100**: inteiro de 1 a 100 (força, potencial, temperamento, propensão a lesões,
  reputação).
- **Dinheiro**: inteiro na moeda fictícia do jogo.
- Campos desconhecidos geram **aviso** (`schema.unknown_field`) e são descartados do banco
  aceito; não impedem a aceitação (FR-018a).

## ModPackage (pacote de banco)

| Campo | Tipo | Regras |
|---|---|---|
| `manifest` | Manifest | obrigatório |
| `countries` | Country[] | ≥ 1 |
| `competitions` | Competition[] | ≥ 1 |
| `clubs` | Club[] | ≥ 2 |
| `players` | Player[] | — |

### Manifest (`mod.json`)

| Campo | Tipo | Regras |
|---|---|---|
| `formatVersion` | inteiro | deve estar em `SUPPORTED_FORMAT_VERSIONS` (hoje `[1]`) |
| `id` | Id | identificador do mod |
| `name` | string | 1–80 caracteres |
| `author` | string | 1–80 caracteres |
| `version` | string | semver `X.Y.Z` (versão do conteúdo) |
| `referenceDate` | Data | data de referência do mundo (base para idades) |
| `description` | string? | opcional, até 500 caracteres |

## Country

| Campo | Tipo | Regras |
|---|---|---|
| `id` | Id | único |
| `name` | string | 1–60 |
| `code` | string | 3 letras maiúsculas, único entre países |

## Competition

| Campo | Tipo | Regras |
|---|---|---|
| `id` | Id | único |
| `countryId` | Id | → Country existente |
| `name` | string | 1–80 (nome vem do banco, não das traduções) |
| `format` | CompetitionFormat | tipo discriminado por `type` |
| `divisions` | Division[] | ≥ 1; níveis contíguos 1..n |

### CompetitionFormat (discriminado por `type`)

`type: "league"` (pontos corridos) — único aceito em `formatVersion` 1:

| Campo | Tipo | Regras |
|---|---|---|
| `type` | `"league"` | — |
| `rounds` | inteiro | 1–4 (2 = ida e volta) |
| `points` | `{ win, draw, loss }` | inteiros 0–10, `win > draw ≥ loss` |
| `tiebreakers` | Tiebreaker[] | ≥ 1, sem repetição |

`Tiebreaker` ∈ `wins`, `goal-difference`, `goals-for`, `head-to-head`, `fewest-red-cards`,
`draw-lots`. O sorteio (`draw-lots`), se usado, é feito com o PRNG do jogo.

Outros valores de `type` (`"knockout"`, `"groups"`) são reconhecidos como **reservados** e
rejeitados com `format.unsupported`; qualquer outro valor é `schema.invalid_value`.

### Division

| Campo | Tipo | Regras |
|---|---|---|
| `level` | inteiro | ≥ 1; 1 = mais alta |
| `name` | string | 1–60 (ex.: "Série A") |
| `clubIds` | Id[] | 4–40 clubes, sem repetição, → Club existente |
| `promotionSlots` | inteiro | ≥ 0; deve ser 0 no nível 1 |
| `relegationSlots` | inteiro | ≥ 0; deve ser 0 no último nível |

Regras entre divisões da mesma competição:
- `relegationSlots(n) == promotionSlots(n+1)`.
- `promotionSlots + relegationSlots ≤ número de clubes da divisão`.
- Um clube aparece em no máximo uma divisão **do banco inteiro**.

## Club

| Campo | Tipo | Regras |
|---|---|---|
| `id` | Id | único |
| `name` | string | 1–60 |
| `shortName` | string | 1–20 |
| `abbreviation` | string | 3 letras maiúsculas `^[A-Z]{3}$`, única no banco |
| `city` | string | 1–60 |
| `countryId` | Id | → Country existente |
| `colors` | `{ primary, secondary }` | Cor |
| `crest` | Crest | — |
| `reputation` | 1–100 | — |
| `stadiumCapacity` | inteiro | 1.000–150.000 |
| `initialCash` | inteiro | −10⁹ a 10¹⁰ |

### Crest

| Campo | Tipo | Regras |
|---|---|---|
| `shape` | CrestShape | `classic`, `round`, `triangle`, `rectangle` |
| `colors` | Cor[] | 2 ou 3 cores |
| `initials` | string | 1–4 caracteres, letras/dígitos |

Regras de elenco (semânticas, por clube): 16–40 jogadores com `clubId` = clube; ≥ 2 com posição
`GK`.

## Player

| Campo | Tipo | Regras |
|---|---|---|
| `id` | Id | único |
| `name` | string | 1–80 (nome completo) |
| `displayName` | string | 1–30 (nome de exibição) |
| `birthDate` | Data | idade na `referenceDate` entre 15 e 45 |
| `nationalityId` | Id | → Country existente |
| `clubId` | Id | → Club existente |
| `position` | Position | `GK`, `FB`, `CB`, `DM`, `MF`, `FW` |
| `strength` | 1–100 | — |
| `traits` | Trait[] | 0–2, sem repetição |
| `hidden` | HiddenAttributes? | **opcional**; ausente no banco padrão (FR-017a) |

### HiddenAttributes

Cada campo é opcional no banco; quando presente, segue a regra abaixo.

| Campo | Tipo | Regras |
|---|---|---|
| `potential` | 1–100? | ≥ `strength` |
| `temperament` | 1–100? | alto = mais cartões |
| `injuryProneness` | 1–100? | alto = mais lesões |

Os atributos ficam agrupados em `hidden` para que a separação visível/oculto (FR-017) seja
estrutural: a apresentação nunca lê `hidden` diretamente.

### Completação dos atributos ocultos (FR-017b)

`completeHiddenAttributes(bank, careerSeed)` produz um `CompletedBank`, em que todo jogador tem
`hidden` com os três campos preenchidos:

- Valores definidos no banco são mantidos.
- Cada valor ausente é sorteado por um sub-gerador `fork("hidden:" + player.id)` da seed da
  carreira. Como depende só da seed e do id, o resultado independe da ordem dos jogadores.
- Potencial gerado = força + margem que diminui com a idade, limitado a [força, 100].
  Temperamento e propensão a lesões seguem uma distribuição Irwin–Hall centrada em 50.
- Salário, valor de mercado e os testes do FR-035 operam sobre o `CompletedBank`.

## Catálogos fixos do jogo (código, não dados)

| Catálogo | Ids | Rótulo pt-BR (i18n) |
|---|---|---|
| Position | `GK`, `FB`, `CB`, `DM`, `MF`, `FW` | GOL, LAT, ZAG, VOL, MEI, ATA |
| Trait | `finisher`, `wall`, `free-kick`, `heading`, `pace`, `playmaker` | Artilheiro, Muralha, Cobrador de falta, Cabeceio, Velocidade, Armador |
| CrestShape | `classic`, `round`, `triangle`, `rectangle` | Clássico, Redondo, Triangular, Retangular |
| Tiebreaker | ver Competition | — |

## Valores derivados (não armazenados)

| Valor | Entradas | Regras |
|---|---|---|
| `age` | `birthDate`, `referenceDate` | anos completos |
| `wage` | força, idade, potencial, reputação do clube | inteiro > 0, múltiplo de 100, não decrescente na força |
| `marketValue` | idem | inteiro > 0, múltiplo de 1.000, não decrescente na força |

## ValidationIssue

| Campo | Tipo | Descrição |
|---|---|---|
| `severity` | `error` \| `warning` | erro rejeita o banco; aviso não |
| `code` | IssueCode | ver [validation-errors.md](contracts/validation-errors.md) |
| `section` | `manifest` \| `countries` \| `competitions` \| `clubs` \| `players` | arquivo de origem |
| `path` | (string \| number)[] | caminho dentro da seção (ex.: `[132, "strength"]`) |
| `entityId` | Id? | id da entidade, quando legível |
| `params` | Record<string, string \| number> | valores para a mensagem |

## Entidades do gerador

### NameBank (dados do jogo, não do banco gerado)

| Campo | Tipo |
|---|---|
| `countryName`, `countryCode` | string |
| `firstNames`, `surnames` | string[] (≥ 200 cada) |
| `cities` | string[] (≥ 60, fictícias) |
| `clubPrefixes` | string[] (ex.: "Esporte Clube", "Associação Atlética") |
| `clubSuffixes` | string[] (ex.: "Futebol Clube", "Atlético") |

### GeneratorTuning e DistributionLimits

- `GENERATOR_TUNING`: constantes de calibragem (faixas de reputação por camada, deslocamentos de
  força por papel, pesos de características por posição, taxa de craques).
- `DISTRIBUTION_LIMITS`: os limites verificáveis de FR-030 a FR-036, consumidos pelos testes.
  Mudar um limite exige justificativa na mesma alteração (Princípio V).
