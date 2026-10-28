# Data Model: Mod mundo completo do futebol

Sem campo novo no formato de mod nem no save. As entidades abaixo são **dados do gerador**, fora do
pacote gerado.

## WorldProfile (perfil do mundo)

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | texto | `padrao`, `compacto` ou id do arquivo do modder |
| `manifest` | `{ id, name, author, version }` | Identificação do mod gerado |
| `confederations` | lista de `Confederation` | Ordem fixa; ids únicos |
| `brazil` | `BrazilSpec` | Opcional; detalhe do Brasil (R5) |

### Confederation

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | `uefa`, `conmebol`, `concacaf`, `caf`, `afc`, `ofc` (ou outro) | Único |
| `name` | texto | Nome da confederação no mod |
| `countries` | lista de `CountrySpec` | Ao menos 3 (2 na validação continental); ordem fixa |
| `continental` | `{ major: true, minor: boolean, size }` | Tamanho da competição principal e se há secundária |

### CountrySpec

| Campo | Tipo | Regra |
|-------|------|-------|
| `geoId` | id do `geo/countries.json` | Nome, código, cidades e idioma vêm dali |
| `tier` | 1 a 4 | Pirâmide e número de clubes (R1) |
| `strength` | 0,5 a 1,5 | Peso na confederação; reputação, economia e vagas (R6) |
| `language` | id de `names/` | Opcional; padrão do `geo` |
| `overrides` | `{ divisions?, clubsPerDivision?, cup? }` | Ajustes de pirâmide |

### BrazilSpec

| Campo | Tipo | Regra |
|-------|------|-------|
| `divisions` | 4 | A, B, C em pontos corridos (20), D em grupos e mata-mata |
| `stateWeights` | por estado | Opcional; reparte os clubes nacionais pelos estados |
| `estadual` | `{ firstDivision: 12, secondDivision: 8 }` | Como a 023 |

## Dados de geografia (`geo/`)

- **País**: `id`, `name` (pt-BR), `code` (3 letras), `language`, `cities[]` (reais).
- **Estado (Brasil)**: `id`, `name`, `abbreviation`, `cities[]` (reais, ≥ 18).
- Regras de validação do conjunto: sem duplicatas de id/código; contagem mínima de cidades por tier;
  nomes de até 20 caracteres (limite do `shortName`); nenhum termo de clube.

## Banco de nomes por idioma (`names/`)

`firstNames`, `surnames`, `clubPrefixes`, `clubSuffixes`, `competitionAdjectives` (esquema da 015);
todos fictícios no sentido de combinação e sem nomes de jogadores ou clubes reais (R13).

## Pacote gerado (já existente)

`mod.json`, `countries.json`, `competitions.json`, `clubs.json`, `players.json`, `rivalries.json`.
Cada país com `names` próprio; cada confederação com competições `continental-<conf>-maior/menor`.

## Metas de escala (`SCALE_LIMITS.fullWorld`)

`dayMs`, `turnoverMs`, `heapBytes`, `saveStart31Bytes`, `saveLastRoundBytes`, `exportedBytes`,
`growthPerSeasonBytes`, `generateMs` (tempo de geração). Calibradas na linha de base.

## Regras de validação do gerador (além das do banco)

| Regra | Condição |
|-------|----------|
| Perfil | Ids únicos; cada confederação com ≥ 3 países (≥ 2 em casos justificados); `geoId` existente |
| Geografia | Cidades suficientes por país; sem duplicata |
| Nomes | Pelo menos 200 nomes e 200 sobrenomes por idioma usado |
| Vagas | Soma das vagas continentais por país = total da competição |
| Pacote | Passa em `readModPackage` e dentro dos limites; falha a geração se não passar |
