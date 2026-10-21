# 021 — Classificação entre competições

Marco 8 — Mundo

`/speckit-specify`

```text
Vagas de uma competição para outra e supercopas, como regras de dados (ver docs/design.md §3 e §11).

Objetivo: as competições passam a se alimentar umas das outras de uma temporada para a seguinte, como no futebol real: a posição na liga ou o título da copa dão vaga em outra competição, e campeões se enfrentam em supercopas. Tudo descrito no banco, sem código específico por competição.

Histórias de usuário:
- Como jogador, quero saber na tabela quais posições dão vaga em outras competições.
- Como jogador, quero que o título da copa ou uma boa campanha na liga levem o meu clube a outra competição na temporada seguinte.
- Como modder, quero descrever essas vagas só com dados.

Escopo:
- Regra de vaga: posições (ou o título, ou a fase alcançada) da competição A dão vaga na competição B, numa fase definida, na temporada seguinte.
- Repasse de vaga quando o clube já está classificado por outro caminho, ou quando a vaga não pode ser usada (ex.: clube rebaixado), com ordem de repasse definida nos dados.
- Supercopa: confronto entre campeões de duas competições, com repasse quando o mesmo clube ganha as duas.
- Acesso entre competições diferentes (ex.: o desempenho numa competição regional dá vaga na copa nacional ou na divisão nacional mais baixa).
- Participantes da primeira temporada definidos no banco.
- Telas: zonas de vaga na tabela, com legenda por competição; página da competição mostrando de onde veio cada participante.
- Integração: metas da diretoria podem ser vagas ("classificar para a competição X"), manchetes e histórico registram as classificações.

Requisitos:
- Validação do banco: regras apontam para competições e fases existentes, e o número de vagas fecha com o número de participantes de cada fase.
- Nenhuma vaga sobra nem é dada duas vezes.

Fora de escopo: competições continentais propriamente ditas (022), estaduais (023).

Critérios de aceite:
- Em 30 temporadas de um banco de teste com liga, copa e supercopa em vários países, toda competição começa sempre com o número certo de participantes e nenhum clube aparece duas vezes na mesma fase.
- Quando o campeão da liga também ganha a copa, a supercopa e as vagas são preenchidas pelo repasse definido nos dados.
```
