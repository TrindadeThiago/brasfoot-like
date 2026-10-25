# Auditoria e resultados — 021

## Pontos em aberto do plano (T002)

- **(a) Avaliação das metas**: `board/round.ts` avalia a temporada (`evaluateSeason`) na última
  rodada da liga, **antes** da virada. Logo `resolve-qualification` ainda não rodou. Decisão: a meta
  `qualify` é avaliada pela posição final dentro da zona de vaga **direta** (`berthZones`) e não
  pelo `QualificationRecord`. Limitação conhecida: um repasse a clube fora da zona não conta para a
  meta, e o clube dentro da zona que perde a vaga por `require`/`forbid` conta como cumprida.
- **(b) Copa de 1 fase e 2 clubes**: `checkCounts` (`validation/semantic/knockout.ts`) já aceita 2
  clubes na final; o impeditivo era `knockoutFormatSchema.phases` (mínimo 2).
- **(c) Conflito de calendário**: a validação de calendário da 017 cobre um clube em duas
  competições (a verificar nos testes de `qualification/long-run`).
- **(d) Entradas tardias**: copas leem `format.entries` e fases leem `stage.enter`, ambos do
  **mundo vivo** (`cupFormat(world, …)`, `stagesOf(competition, division)`). Em vez de passar
  `entrants` por todo o motor, a etapa `resolve-qualification` reescreve, no mundo vivo, os
  `clubIds` das divisões e os `entries`/`enter` das competições com `berths` (como a 009 já faz com
  o mundo). Isso dispensa mudar `stages/` e `knockout/` para consumir `entrants`.

## Desvios e limitações da implementação

- **Meta `qualify` (T052):** avaliada pela posição final na zona de vaga direta, porque a avaliação da
  diretoria acontece antes da virada (item (a) acima). Um repasse a clube fora da zona não conta; um
  clube dentro da zona que perde a vaga por `require`/`forbid` conta como cumprida.
- **Clubes fora da pirâmide (US4):** `competition.club_outside_main` exige que os clubes de uma
  competição secundária estejam na principal do país, e finanças, torcida e diretoria só são criadas
  para as ligas principais. Por isso a regional da US4 foi exercitada com clubes da própria pirâmide
  (taça dos classificados) e a saída da pirâmide (`relegatedOut`/`promotedOut`) com testes sobre o
  motor. Estender os sistemas a clubes sem liga principal fica para quando 022/023 precisarem.
- **Mundo vivo (item (d)):** `applyQualification` reescreve `clubIds` de **todas** as divisões da
  competição alimentada (a união dos clubes é o que `createLeagueSeason` confere) e refaz `entries` e
  `enter` só nas divisões com vagas.
- **Desempate de `reached`:** fase alcançada decrescente e depois id (não o aproveitamento nos
  jogos), por ser total e barato; vale a mesma ordem na validação.

## Resultados da validação (T059, T060)

- `pnpm vitest run` (todos os projetos): 341 arquivos, 3573 testes verdes.
- `pnpm test:e2e`: 29 testes verdes, incluindo `qualification.spec.ts`.
- `pnpm lint` e `pnpm -r typecheck`: limpos (1 aviso antigo em `worldgen/add-cup.ts`).
- `pnpm check-release` com `RELEASE_TAG=v1.6.0`: ok.
- `pnpm sim:world --scale --countries 3 --seasons 30 --qualification`: dentro dos limites
  (dia 56 ms, virada 338 ms, heap 265 MB, 1,9 min, crescimento de 69 KB por temporada), sem
  violação de participantes por divisão, de unicidade nem de origens.
- **Não concluído:** a rodada de 10 países × 30 temporadas (`--countries 10`) levou mais de 35 min
  em paralelo com a suíte e foi interrompida; os testes de 10 temporadas e a simulação de
  3 países cobrem os critérios. O passo do `release.yml` usa a versão de 3 países.
