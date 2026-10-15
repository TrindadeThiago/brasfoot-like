# Contrato: formato de banco (mod) — `formatVersion` 1

Um banco é um diretório:

```text
<mod>/
├── mod.json           # Manifest
├── countries.json     # Country[]
├── competitions.json  # Competition[]
├── clubs.json         # Club[]
└── players.json       # Player[]
```

Arquivos em UTF-8, JSON. O banco padrão do jogo fica em `mods/default/`, no mesmo formato.
Campos, tipos e regras: [data-model.md](../data-model.md).

## Exemplo mínimo (trechos)

`mod.json`
```json
{
  "formatVersion": 1,
  "id": "default",
  "name": "Mundo padrão",
  "author": "brasfoot-like",
  "version": "1.0.0",
  "referenceDate": "2027-01-01"
}
```

`countries.json`
```json
[{ "id": "pais-1", "name": "República de Valtória", "code": "VAL" }]
```

`competitions.json`
```json
[{
  "id": "liga-nacional",
  "countryId": "pais-1",
  "name": "Campeonato Valtoriano",
  "format": {
    "type": "league",
    "rounds": 2,
    "points": { "win": 3, "draw": 1, "loss": 0 },
    "tiebreakers": ["wins", "goal-difference", "goals-for", "head-to-head", "draw-lots"]
  },
  "divisions": [
    { "level": 1, "name": "Série A", "clubIds": ["clube-001", "..."], "promotionSlots": 0, "relegationSlots": 4 },
    { "level": 2, "name": "Série B", "clubIds": ["clube-021", "..."], "promotionSlots": 4, "relegationSlots": 0 }
  ]
}]
```

`clubs.json`
```json
[{
  "id": "clube-001",
  "name": "Esporte Clube Vila Serena",
  "shortName": "Vila Serena",
  "abbreviation": "VSE",
  "city": "Vila Serena",
  "countryId": "pais-1",
  "colors": { "primary": "#1E3A8A", "secondary": "#FFFFFF" },
  "crest": { "shape": "classic", "colors": ["#1E3A8A", "#FFFFFF"], "initials": "ECVS" },
  "reputation": 88,
  "stadiumCapacity": 62000,
  "initialCash": 45000000
}]
```

`players.json`
```json
[{
  "id": "jogador-00001",
  "name": "Rodrigo Albuquerque Mendes",
  "displayName": "Rodrigo Mendes",
  "birthDate": "2001-05-17",
  "nationalityId": "pais-1",
  "clubId": "clube-001",
  "position": "FW",
  "strength": 81,
  "traits": ["finisher"],
  "hidden": { "potential": 84 }
}]
```

`hidden` é opcional, assim como cada um dos seus campos (`potential`, `temperament`,
`injuryProneness`). O banco padrão não o inclui; o exemplo acima mostra um modder fixando só o
potencial de um jogador. Os valores ausentes são gerados a partir da seed da carreira ao criar o
jogo.

Campos desconhecidos geram aviso e são descartados; o banco ainda é aceito se não houver erros.

## Evolução do formato

- `formatVersion` aumenta a cada mudança incompatível; o validador informa versões suportadas.
- Quando houver `formatVersion` 2, bancos v1 serão migrados (mesma política dos saves,
  Princípio VI). Nesta feature só existe a v1.
- `format.type` `"knockout"` e `"groups"` estão reservados para versões futuras.
