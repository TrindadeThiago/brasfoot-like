# Research: Classificação entre competições

Decisões técnicas da 021. Números são pontos de partida, declarados nos testes.

## R1 — Vaga declarada no destino

- **Decision**: `division.berths?: Berth[]` na divisão **de destino**. Uma vaga tem: `id`, `source`
  (de onde vem), `entry?` (`{ stage?, phase? }`, padrão a primeira fase), `fallback?` (ordem de
  repasse) e `require?`/`forbid?` (condições sobre a temporada seguinte). Fontes (`source`):
  - `position`: `{ competitionId, level, from, to }`, posições finais inclusivas (1 a N clubes);
  - `champion` / `runnerUp`: título e vice de uma competição (liga: 1º/2º da divisão 1; copa e
    fases: o resultado da final);
  - `reached`: `{ competitionId, phase }`, quem alcançou ao menos a fase (copa ou fase eliminatória).
- **Rationale**: o validador conta vagas por destino e fase com uma soma; a origem do participante
  (US2 cenário 5) é a própria vaga; "vaga de A para B" do prompt vira "B declara de onde vêm os
  seus participantes". A zona da tabela de A (US1) é derivada: varre as vagas dos destinos cuja
  fonte é A.
- **Alternatives considered**: regra na origem (`A.qualifies: [{positions, to: B}]`): a contagem por
  destino exige varrer todas as competições e a ordem de repasse fica espalhada; tabela de regras
  global separada do banco de competições: novo arquivo/seção de mod sem ganho.

## R2 — Etapa de virada `resolve-qualification`

- **Decision**: nova etapa padrão depois de `promotion-relegation` e antes de `advance-year` e
  `generate-calendars`. Entrada: as temporadas encerradas (a liga em foco e `competitions`, onde a 020 deixou as ligas dos outros países, as secundárias e
  as copas), as composições já calculadas pelas pirâmides e o banco. Saída: `next.compositions`
  (substitui a composição das divisões com `berths`), `next.entrants` (clubes que entram numa fase
  que não é a primeira), `next.origins` e o `QualificationRecord` da temporada. A ordem de
  resolução das competições é topológica pelas condições `require`/`forbid` (R3); sem condições
  cruzadas, é a ordem do banco.
- **Rationale**: o gancho `TurnoverStep` já existe (017–020) e a etapa é pura. Resolver depois das
  pirâmides permite à vaga perguntar "esse clube foi rebaixado?" (`require`/`forbid` por divisão
  da temporada seguinte) sem lógica especial.
- **Alternatives considered**: resolver dentro de `generate-calendars` (mistura montagem do
  calendário com regras); calcular vagas ao longo da temporada (o encerramento das competições
  ainda não ocorreu para quase todas as fontes).

## R3 — Repasse, unicidade e fechamento

- **Decision**: para cada vaga, em ordem do banco (destino, divisão, `id`), toma-se o `source`
  na ordem natural (posição crescente, campeão, vice, fase alcançada decrescente com desempate por
  aproveitamento nos jogos da competição e depois por id). Um clube é **elegível** se (a) ainda
  não está no destino, (b) existe no mundo da temporada seguinte (clube não extinto) e (c) cumpre
  `require`/`forbid`. Inelegível ou já escolhido, a vaga passa ao próximo item do `fallback`, e
  daí em diante. O **último** item do `fallback` é o fechamento e precisa ser uma `position` que
  cubra a tabela inteira de uma divisão; a validação exige que a divisão de referência tenha
  clubes de sobra para o destino. Se, ainda assim, nada for elegível em execução, a virada falha
  com `qualification.exhausted` (competição, vaga), nunca com participante a menos.
- **Rationale**: nenhuma aleatoriedade (II); toda a sequência é função da posição e do id; a
  unicidade (FR-007) e a contagem (FR-020/SC-001) saem da construção, e o teste de simulação longa
  as confirma. A mesma ordem cobre "o mesmo clube ganha liga e copa" (SC-002).
- **Alternatives considered**: sorteio entre candidatos (perde reprodutibilidade por leitura dos
  dados); repasse implícito ao melhor colocado seguinte (não cobre supercopa nem acessos
  cruzados, e o modder perde controle).

## R4 — Supercopa como mata-mata de uma fase

- **Decision**: a supercopa é uma competição `knockout` com vagas `champion`/`runnerUp`. Para final
  única, `knockout.phases` passa a aceitar de **1 a 8** fases (hoje 2 a 8) e a validação de copa
  aceita 2 clubes. A data vem de `schedule` (017) e o histórico de copas (018) registra a edição.
  O mesmo clube campeão de duas competições gera repasse (R3): por exemplo, vice da liga como
  segundo participante.
- **Rationale**: nenhum tipo de competição novo; calendário, jogo e prêmios reaproveitados (FR-011).
- **Alternatives considered**: tipo `supercup` dedicado (duplica o mata-mata); jogo avulso fora do
  calendário (perde a integração com prêmios, histórico e jogo ao vivo).

## R5 — Acesso entre competições e saída da pirâmide

- **Decision**: a última divisão de uma pirâmide pode declarar `relegationSlots > 0` **se** declarar
  vagas externas (`berths` com fonte em outra competição) somando o mesmo número. Os clubes que
  descem ficam fora da pirâmide (voltam a ser elegíveis para a competição de origem se esta tiver
  vaga). A composição da divisão é: clubes mantidos + clubes promovidos + clubes das vagas externas,
  com o total igual ao do banco. `nextComposition` ganha `relegatedOut` para que a etapa saiba
  quem saiu.
- **Rationale**: é a ponte entre o modelo atual (acesso interno) e a vaga externa, sem regra nova
  de acesso; a validação já cobra "vagas fecham com participantes".
- **Alternatives considered**: manter a proibição (impossibilita US4); permitir entrada externa
  sem saída (muda o tamanho da divisão e quebra o calendário).

## R6 — Primeira temporada e tamanho por fase

- **Decision**: `clubIds` do banco continuam sendo os participantes da temporada 1. A validação
  confere que, para cada divisão com `berths`, (i) as vagas somam `clubIds.length` e (ii) por fase
  de entrada somam o que `stages`/`phases` esperam (`stageParticipantCounts`, entradas da copa).
  `enter` e `entries.clubIds` estáticos continuam valendo na temporada 1; nas seguintes, a fase de
  entrada vem de `entry` das vagas.
- **Rationale**: bancos existentes não mudam; mods novos descrevem a 1ª temporada e as seguintes
  com a mesma lista, e a validação do "número fecha" já existe e só é estendida.

## R7 — Zonas e origens na interface

- **Decision**: `berthZones(world, competitionId, level)` devolve faixas de posição → destino,
  fase e rótulo, derivadas de `berths` de **todos os destinos** cuja fonte é a divisão; `divisionZones`
  ganha `berths`. `LeagueSeason.origins` (opcional) guarda, por clube, `bank`, `berth` (id da vaga),
  `pass` (de qual clube e por quê) ou `promotion`. A tabela final mostra o destino efetivo (após
  repasse) pelo `QualificationRecord`.
- **Rationale**: a UI só lê dados prontos (I); `origins` é compacto (um código por clube) e
  existe só nas competições alimentadas.

## R8 — Metas, manchetes e histórico

- **Decision**: novo nível de meta da diretoria `qualify`, por competição de destino: a posição
  exigida é a última da zona que dá vaga **direta** (sem repasse) naquele destino; a avaliação no
  fim da temporada usa o `QualificationRecord` (cumprida se o clube é participante do destino na
  temporada seguinte, por qualquer caminho). `goalTiersFor` oferece o nível quando a divisão tem
  zona de vaga. Manchetes: classificação de campeão e do clube do jogador; o histórico guarda o
  `QualificationRecord` por temporada (pequeno: uma linha por vaga).
- **Rationale**: reaproveita o modelo de níveis por posição (012); a avaliação final lê o
  resultado resolvido, não a posição, o que cobre repasse.

## R9 — Cadeia de dependências e ciclos

- **Decision**: as fontes leem sempre temporadas **encerradas**, então não há ciclo entre fontes. Só
  `require`/`forbid` leem a composição da temporada seguinte de outra competição; a ordem
  topológica dessas dependências é calculada na carga (`order.ts`) e a validação recusa ciclos
  (`qualification.cycle`), US5 cenário 4.

## R10 — Calendário e conflitos

- **Decision**: o motor não cria conflito: o calendário (017) já distribui competições por `schedule`
  e proíbe dois jogos do mesmo clube no mesmo dia; a validação existente cobre o caso. Uma
  competição alimentada que o clube passa a disputar entra no calendário do jogador sem lógica
  extra, porque `createCareerSeason` percorre todas as competições do banco.

## R11 — Compatibilidade

- **Decision**: sem `berths` nada muda (`nextComposition` é a única fonte). Save v16: `origins` e
  `qualificationHistory` opcionais; a migração v15 → v16 só carimba a versão. Competições de
  países diferentes podem se alimentar: a economia do clube continua a do país dele (020).
