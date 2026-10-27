# Contrato: formato de mod, validação, save v18 e telas

## Formato de mod (aditivo, `formatVersion: 1`)

```jsonc
// competitions.json (trecho)
{
  "id": "estadual-norte",
  "countryId": "pais-exemplo",
  "name": "Estadual do Norte",
  "regional": {
    "region": "Norte",
    "weight": { "pct": 100, "byReputation": [{ "from": 70, "pct": 30 }] }
  },
  "format": { "type": "stages", "stages": [ /* grupos */ , /* mata-mata */ ] },
  "schedule": { "weekday": 7, "startWeek": 1, "everyWeeks": 1 },
  "divisions": [
    { "level": 1, "name": "Primeira divisão", "clubIds": [], "promotionSlots": 0, "relegationSlots": 2,
      "stages": [ /* grupos (019) → mata-mata: jogo único … final legs: 2 */ ] },
    { "level": 2, "name": "Segunda divisão", "clubIds": [], "promotionSlots": 2, "relegationSlots": 0,
      "stages": [ /* idem */ ] }
  ]
}
```

- Tamanho dos grupos, classificados, `home` do jogo único (ex.: melhor campanha) e `tiebreakers` são
  os campos de fase da 018/019; nenhum campo de formato é novo.
- `club.region` é obrigatório em países que declaram estaduais.
- Mods sem `regional` continuam válidos e idênticos.

## Validação

Códigos `regional.*` e `calendar.regional_after_national` da tabela em [data-model.md](../data-model.md).
Cada erro aponta arquivo, campo e id do estadual e da divisão; as mensagens ficam em `errors.json`.

## Save v18

- `regionalHistory` e a meta `regional` são opcionais; saves v17 migram sem alterar nada além da
  versão. Fixtures v17 em início, meio e fim de temporada.
- `SAVE_FORMAT_VERSION = 18`; o resumo do save (`summary.ts`) não muda.

## Telas

| Tela | Conteúdo |
|------|----------|
| Competições | A divisão do estadual do clube aparece junto das nacionais |
| Estadual | Abas 1ª e 2ª divisão: grupos, chaveamento até a final, campanha do clube |
| Diretoria | Meta `regional` com o peso aplicado |
| Histórico | Campeões das duas divisões por temporada, acesso e rebaixamento do clube |
| Notícias | Manchetes `regional.*` |

A UI não calcula classificação, zonas nem peso: tudo vem de `RegionalCampaign`, `finalOrder` e
`regionalWeightFor`. Textos em `ui.json`; nomes de estados e competições vêm do banco.
