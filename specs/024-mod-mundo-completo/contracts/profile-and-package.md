# Contrato: perfil, dados do gerador, pacote e telas

## Perfil do mundo (JSON)

```jsonc
{
  "id": "padrao",
  "manifest": { "id": "mundo-completo", "name": "Mundo completo", "author": "brasfoot-like", "version": "1.0.0" },
  "confederations": [
    {
      "id": "conmebol", "name": "Confederação Sul-Americana",
      "continental": { "major": true, "minor": true, "size": "full" },
      "countries": [
        { "geoId": "brasil", "tier": 1, "strength": 1.5 },
        { "geoId": "argentina", "tier": 1, "strength": 1.4 }
      ]
    }
  ],
  "brazil": { "divisions": 4, "estadual": { "firstDivision": 12, "secondDivision": 8 } }
}
```

Erros do perfil: `profile.unknown_country`, `profile.duplicate_country`, `profile.few_countries`,
`profile.tier_range`, `profile.strength_range`, `profile.cities_short` (geografia insuficiente).

## Dados do gerador

- `geo/countries.json`, `geo/brazil-states.json`: lugares reais (R2).
- `names/<idioma>.json`: nomes por idioma (R3).
- Nenhum deles entra no pacote gerado nem no save.

## Pacote gerado

- Formato `formatVersion: 1`, sem campo novo; `countries.json` com `names` por país.
- Competições: por país, `liga-<codigo>`, `copa-<codigo>`, `supercopa-<codigo>` (quando houver) e, no
  Brasil, `estadual-<uf>` (27) e a divisão D; por confederação, `continental-<conf>-maior` e `-menor`.
- Ids estáveis: `clube-<codigo>-<n>`, `jogador-<codigo>-<n>`.
- Limites: `MOD_LIMITS` revistos só se a medição pedir (R10), com a justificativa registrada.

## Telas

| Tela | Mudança |
|------|---------|
| Mods | Link de download do `mundo-completo.zip` com descrição e tamanho; texto em `ui.json` |
| Nova carreira | Sem mudança de fluxo: a escolha por país (020) lista todos os países do mod |

A UI não gera o mundo: o `.zip` vem pronto do build.

## Constituição e teste de bloqueio

- `constitution.md` 1.2.0: Princípio IV com a emenda dos lugares (R13), Sync Impact Report.
- `blocklist.json` com `clubsExact`, `clubsContains`, `competitions` (e `places` só para nomes de clubes e
  competições). Teste: nomes fictícios gerados em várias seeds não batem com a lista.
