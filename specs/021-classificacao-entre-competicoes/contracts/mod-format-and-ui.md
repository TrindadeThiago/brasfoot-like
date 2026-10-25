# Contrato: formato de mod, save e telas

## Formato de mod (`docs/mod-format.md`)

`competitions[].divisions[].berths` (opcional); `knockout.phases` com 1 a 8 fases. O resto do
formato não muda e `formatVersion` continua 1. Exemplo (divisão de uma supercopa):

```json
{
  "level": 1, "name": "Supercopa", "clubIds": ["a1", "b3"],
  "promotionSlots": 0, "relegationSlots": 0,
  "berths": [
    { "id": "campeao-liga", "source": { "kind": "champion", "competitionId": "liga-a" },
      "fallback": [
        { "kind": "runnerUp", "competitionId": "liga-a" },
        { "kind": "position", "competitionId": "liga-a", "level": 1, "from": 1, "to": 20 }
      ] },
    { "id": "campeao-copa", "source": { "kind": "champion", "competitionId": "copa-a" },
      "fallback": [
        { "kind": "runnerUp", "competitionId": "liga-a" },
        { "kind": "position", "competitionId": "liga-a", "level": 1, "from": 1, "to": 20 }
      ] }
  ]
}
```

Mensagens de erro do mod seguem o padrão `arquivo › campo › código` já usado pela validação.

## Save v16

Campos novos opcionais: `LeagueSeason.origins`, `CareerHistory.qualificationHistory`. Migração
v15 → v16 só carimba a versão. Saves anteriores abrem como mundo sem vagas.

## Telas

- **Tabela** (`apps/web/src/ui/table`): faixas de cor por destino nas posições de `berthZones`,
  legenda por competição e fase de entrada; ao fim da temporada, o destino efetivo (após repasse) por
  linha. Sem vagas, nenhuma legenda nova.
- **Página da competição** (`apps/web/src/app/jogo/competicao`): lista de participantes com a
  origem de cada um (posição ou título em outra competição, acesso, repasse, banco inicial).
- **Diretoria**: meta "Classificar para {competição}" no catálogo de metas.
- **Resumo da temporada e notícias**: classificações (campeões e do clube do jogador) e vagas
  perdidas por repasse.
- Todos os textos em `packages/i18n/locales/pt-BR` (`ui.json`, `errors.json`, `release-notes.json`).
