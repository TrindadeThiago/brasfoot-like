# Contrato: formato de mod, validação, save e telas

## Formato de mod (aditivo; `formatVersion: 1`)

| Local | Campo | Observação |
|-------|-------|-----------|
| `competition` | `countryId` opcional | ausente = competição entre países |
| `competition` | `awards` | `win`, `draw`, `stage[]`, `title`, `reputation[]`, `reputationCeiling` |
| `division` | `dropIns[]` | ligação entre competições; só em competição entre países (a menor recebe os clubes) |
| `fans` | `continentalMatchPct`, `continentalExpectation`, `continentalTitle` | peso do jogo, expectativa e humor do título (campos planos, na principal do país) |
| `board` | `continentalTopPct`, `continentalMidPct`, `continentalMet`, `continentalMiss` | cortes por tercil de reputação para a meta e a confiança por meta cumprida e perdida |

`docs/mod-format.md` e `apps/web/public/docs/mod-format.md` ganham a seção "Competições entre
países" com o exemplo do [data-model](../data-model.md) (FR-027). O mod de exemplo
`mods/exemplo-mundo` traz as competições continentais maior e menor fictícias.

## Validação semântica (`validation/semantic/continental.ts`)

Cada mensagem aponta arquivo e campo (`competitions[i].divisions[j].dropIns[k]…`).

| Código | Quando |
|--------|--------|
| `continental.shape` | sem `countryId` e com mais de uma divisão ou formato inválido |
| `continental.single_country` | clubes de menos de dois países |
| `continental.club_without_league` | clube fora de qualquer liga principal |
| `continental.rules_ignored` | aviso: regras econômicas declaradas em competição sem país |
| `continental.dropin_self` | origem igual ao destino |
| `continental.dropin_unknown` | competição, fase ou posição inexistente |
| `continental.dropin_count` | contagem de ligação/vagas não fecha com a fase de destino |
| `continental.dropin_before_source` | fase de destino começa antes de a origem terminar |
| `continental.dropin_qualified` | fonte inclui clube que a origem classifica |
| `continental.awards_unknown_stage` | `awards.stage`/`reputation` aponta fase inexistente |
| `continental.awards_not_increasing` | tabela de reputação não crescente |

Validações já existentes que passam a cobrir a competição: conflito de datas por clube (017),
contagem de vagas (021), separação por país nos grupos (019), formatos de grupos e mata-mata.

`competition.club_outside_main` deixa de se aplicar a competições sem `countryId`.

## Save

`SAVE_FORMAT_VERSION = 17`. Campos novos opcionais (ver data-model). Migração v16 → v17 só carimba a
versão. Teste: abrir fixtures v16 (início, meio, fim de temporada), salvar, reabrir e jogar um dia.

## Telas

- **Competição → aba Continental** (ao lado de liga e copa nacional): fases em ordem; cada fase
  mostra o que já existe (grupos com zonas da 019, chaveamento da 018) mais a origem de cada
  participante (vaga por país, repasse, ligação).
- **Campanha do clube**: lista de jogos, fase atual, próxima partida com data e mando, prêmios
  recebidos e fases que ainda podem ser alcançadas.
- **Calendário**: jogos continentais nos dias de meio de semana, com o mesmo filtro por
  competição da 017.
- **Diretoria**: meta continental ao lado da meta esportiva; **Torcida**: expectativa considera a
  competição; **Finanças**: extrato com a origem de cada prêmio.
- **Histórico**: aba "Campeões continentais" (edição, campeão, vice, final) e a campanha do técnico.
- Textos: todas as chaves novas em `ui.json`, `errors.json` e `release-notes.json`; nomes de
  competições e fases vêm do banco.

Os componentes leem `continentalView`, `clubCampaign` e `continentalEdition`; nenhuma regra de jogo
na UI.
