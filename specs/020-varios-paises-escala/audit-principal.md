# Auditoria: leituras de "competição principal" (T001)

Busca: `grep -rnE "competitions\[0\]|league\.competitionId|state\.league"` em `packages/engine/src` e
`packages/save/src`. ~115 ocorrências em ~55 arquivos.

## Conclusão

Todos os sistemas (finanças, mercado, mercado da IA, diretoria, torcida, notícias, renovação) obtêm
as regras por `rules(world, context.league.competitionId)`, onde `context.league` é a liga que
eles percorrem. Portanto **não é preciso trocar cada leitura por uma variante `...ForClub`**: basta
executar o pipeline de cada sistema **uma vez por liga principal**, com a liga do país como
`context.league` (research.md R6). As regras do país certo saem sozinhas. O estado compartilhado
(`world`, `finances`, `market`, `board`, `fans`, `news`, `renewal`) é indexado por clube e continua
global; cada passada por liga só toca os clubes dela.

Isso simplifica T010/T011 e T017–T020: nenhuma variante `...ForClub`; os helpers de `world/` e a
passada por liga bastam.

## Classificação

| Classe | Ocorrências | Tratamento |
|---|---|---|
| Regra da liga em `context.league.competitionId` (market, board, fans, news, finance, renewal) | ~95 | Sem mudança de código: o pipeline roda por liga principal |
| "Do mundo", `world.competitions[0]` | `market/value.ts:23` (fator de contrato), `market/squad.ts:13` (limite de elenco), `finance/create.ts:35` (fallback), `save/create.ts:77`, `save/migrate.ts:646` | `value.ts`: manter de propósito (valor universal, FR-013). `squad.ts`: trocar para a principal do país do clube. `finance/create.ts`: fallback pela principal do país. `save/create.ts`: escolher a liga pelo clube. `migrate.ts`: legado, mantém |
| "Liga do jogador" (`state.league`) | `career/day.ts` (15), `career/season-state.ts` (11) e leitores da UI | Continua a liga do país do clube em foco; as demais em `otherLeagues` |
| Específicas do jogador (`board/offers`, `board/goals`, `board/round`) | board | Já operam sobre a liga em que a vaga está; a troca de país passa a liga nova como `context.league` |

## Pontos de atenção para a passada por liga

- `managerClubId` fora da liga: os sistemas devem tratar como "sem clube do jogador" (a IA joga
  todos os clubes da liga). Cada ponto que usa `managerClubId` precisa de teste com liga alheia.
- Mercado entre ligas: `aiClubs`, `purchaseTarget` e `market/search` enxergam só jogadores dos
  clubes da `context.league`; o mercado internacional (US2) precisa ampliar a busca.
- Janela: `windowIndex`/`isWindowOpen` são por liga; transferência internacional exige as duas.
- `createFinances`, `createFans`, `createBoard`, `initialRenewal`, `emptyMarket`: criados uma vez por
  liga e mesclados por clube.
