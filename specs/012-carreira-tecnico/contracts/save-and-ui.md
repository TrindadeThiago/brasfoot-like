# Contrato: save v8, provider e telas

## Save v8

- `formatVersion: 8`; campo `board: BoardState`.
- `save.clubId` = clube em foco: o atual, ou o último quando desempregado (research R3).
- `managedClubId(save): string` = `managerClubOf(save.board)`; `isEmployed(save): boolean`.
  Toda chamada ao motor que recebia `save.clubId` como `managerClubId` passa a usar
  `managedClubId(save)` (rodada, virada, contexto de mercado). As ações financeiras seguem no
  clube em foco: desempregado, as telas de Finanças (e Elenco, Escalação, Mercado) somem.
- `createSave({ …, noFiring?: boolean })` cria `board` com `createBoard`.
- Migração v7 → v8: research R12; fixture v7 + teste `migrate-v8.test.ts`.
- `commitRound`: `completeCareerRound(…, { state: save.board, careerSeed: save.seed })`; grava
  `board`. Se o jogador foi liberado, `clubId` fica como último clube e `lineupNotice` é limpo.
- `advanceCareerSeason`: repassa `board` à virada e grava o resultado.
- `withRoundResult(save, result)`: grava o resultado da rodada da carreira (usado pelo provider).
- `boardContextOf(save)`: contexto do motor para metas e andamento.
- Ações novas (pacote save):
  - `acceptManagerOffer(save, offerId)` → `board`, `market`, `clubId` = novo clube, escalação
    nova (`initialLineup`), `lineupNotice` limpo, esquema do clube na temporada.
  - `declineManagerOffer(save, offerId)`, `dismissBoardNotice(save)`.
- `boardProblem(save)` na validação do save: invariantes do data-model.

## GameProvider

Ações novas: `acceptJobOffer(offerId)`, `declineJobOffer(offerId)`, `dismissBoardNotice()`.
`createCareer` aceita `noFiring`. `playRound` com desempregado: sem validação de escalação e sem
escalação do jogador.

## Telas

| Onde | O quê |
|---|---|
| Nova carreira | caixa "Sem demissão" (desmarcada) com explicação |
| Início (empregado) | cartão Diretoria: confiança (0–100, medidor), tendência, 3 motivos recentes, metas com andamento; aviso de propostas; aviso de demissão/assunção até dispensar |
| Início (desempregado) | painel Sem clube: reputação, propostas (aceitar/recusar, prazo), botões de rodada |
| Carreira › Diretoria | metas da temporada e andamento, confiança e últimas mudanças com fatores, indicação "sem demissão" |
| Carreira › Propostas | propostas pendentes: clube, divisão, posição, reputação, metas esperadas, prazo |
| Carreira › Histórico | passagens (clube, período, saída), temporadas (divisão, posição, metas, conquistas, decisão), reputação por temporada |
| Carreira › Técnicos | por divisão: clube, técnico, reputação; o jogador destacado |
| Fim de temporada | Avaliação da diretoria: metas e cumprimento, decisão, reputação antes → depois |
| Cabeçalho/navegação | "Sem clube" quando desempregado; Elenco, Escalação, Finanças e Mercado ocultos e redirecionando para a Início |

## i18n

`ui.json`: `newCareer.noFiring*`, `board.*` (confiança, tendência, fatores, metas por nível e tipo
financeiro, andamento, avaliação, decisão, aviso de demissão/assunção), `career.*` (abas, propostas,
histórico, técnicos, sem clube), `nav.career`.
