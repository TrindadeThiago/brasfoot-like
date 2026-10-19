# Contrato: save v4 e economia no formato do mod

## Save v4 (`packages/save`)

`SAVE_FORMAT_VERSION = 4`; `SaveFile` ganha `finances: FinanceState`.

- `createSave`: `finances = createFinances(bank, league)` (patrocínio da temporada 1 já lançado).
- `advanceCareerSeason`: passa `finances` e `managerClubId` para `seasonTurnover` e grava o retorno.
- Funções novas do pacote (usadas pela UI; validam e devolvem um save novo, sem salvar):

```ts
function setManagerTicketPrice(save: SaveFile, price: number): FinanceSaveResult;
function takeManagerLoan(save: SaveFile, amount: number): FinanceSaveResult;
function repayManagerLoan(save: SaveFile, amount: number): FinanceSaveResult;
function startManagerStadiumWorks(save: SaveFile, optionIndex: number): FinanceSaveResult;
type FinanceSaveResult = { ok: true; save: SaveFile } | { ok: false; error: FinanceError };
```

- **Migração v3 → v4**: `finances = createFinances(bank, league)`; sem bilheteria/folha
  retroativas. Determinística.
- **Validação**: todo clube das divisões tem `ClubFinance`; `cash = seasonStartCash + Σ ledger`;
  preço na faixa; `debt ≥ 0`. Falha → `corrupt`.
- **Fixtures**: builders v3 (meio de temporada, encerrada) em `test/fixtures.ts`; cadeia v1 → v4.

## Economia no mod (`competition.economy`, opcional)

Campo opcional da competição (formato do mod continua `formatVersion: 1`). Exemplo do banco padrão
(valores calibrados em research.md R10):

```json
"economy": {
  "fansBase": 16000,
  "fansPerReputation": 50,
  "priceElasticityPct": 150,
  "priceRange": { "min": 5, "max": 200 },
  "credit": { "perReputation": 30000, "interestBp": 30 },
  "stadium": {
    "maxCapacity": 100000,
    "options": [
      { "seats": 2000, "cost": 1500000, "rounds": 6 },
      { "seats": 5000, "cost": 4000000, "rounds": 12 },
      { "seats": 10000, "cost": 9000000, "rounds": 20 }
    ]
  },
  "crisisRounds": 10,
  "wageFactorPct": 100,
  "divisions": [
    { "level": 1, "referencePrice": 12, "fanFactorPct": 100,
      "sponsorship": { "base": 1500000, "perReputation": 0, "wageSharePct": 18 },
      "prizes": { "first": 2000000, "last": 300000, "title": 1000000 },
      "creditBase": 2000000 },
    { "level": 2, "referencePrice": 8, "fanFactorPct": 70,
      "sponsorship": { "base": 600000, "perReputation": 0, "wageSharePct": 55 },
      "prizes": { "first": 900000, "last": 150000, "title": 400000 },
      "creditBase": 1000000 }
  ]
}
```

Validação (novos códigos em `validation/issues.ts`, textos em `errors.json`):
`economy.unknown_division` (nível sem divisão), `economy.price_range` (min > max), valores
negativos ou zero onde não cabe (pelo schema). Divisão sem entrada em `economy.divisions` usa os
padrões do motor para aquele nível (o último nível conhecido).
