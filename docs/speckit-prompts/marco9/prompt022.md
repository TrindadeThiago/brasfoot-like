# 022 — Competições continentais

Marco 9 — Futebol sul-americano

`/speckit-specify`

```text
Competições entre clubes de vários países, no modelo das copas continentais (ver docs/design.md §14).

Objetivo: os melhores clubes de cada país disputam uma competição continental principal e uma secundária, com preliminares, fase de grupos e mata-mata, vagas por país e prêmios que pesam nas finanças, na diretoria e na torcida.

Histórias de usuário:
- Como jogador, quero classificar o meu clube para a competição continental e enfrentar clubes de outros países.
- Como jogador, quero que a campanha continental tenha peso: prêmios, reputação, expectativa da torcida e metas da diretoria.
- Como modder, quero definir as vagas de cada país e as fases da competição só com dados.

Escopo:
- Competição com clubes de vários países, vagas por país vindas das regras da 021 (liga, copa nacional, campeão continental anterior).
- Fases preliminares em mata-mata, fase de grupos com restrição de país no sorteio (019) e mata-mata final.
- Ligação entre as duas competições continentais: eliminados de uma fase da principal entram na secundária, como regra de dados.
- Datas no meio de semana, sem conflito com as competições nacionais (017).
- Prêmios por fase e por vitória, renda de bilheteria, aumento de reputação do clube; metas da diretoria por competição; expectativa da torcida; manchetes de campanha continental; histórico de campeões continentais e no histórico do técnico.
- Telas: grupos, chaveamento e campanha do clube; abas da competição continental junto das nacionais.

Requisitos:
- Os nomes das competições vêm do banco (o jogo não usa marcas reais).
- Os clubes da IA continuam usando as mesmas regras (rodízio e desgaste valem para eles).

Fora de escopo: mundial de clubes, supercopa continental, seleções nacionais, viagens e fuso horário.

Critérios de aceite:
- Em 30 temporadas, os campeões continentais têm força média acima da média dos participantes, e países com mais vagas e clubes mais fortes vencem mais vezes (faixas declaradas).
- Os prêmios continentais não tiram a economia das faixas da 008: os clubes que jogam a competição todo ano não acumulam caixa sem limite.
- Uma carreira de teste disputa a competição continental do início ao fim numa temporada, junto com a liga e a copa nacional.
```
