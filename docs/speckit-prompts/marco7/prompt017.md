# 017 — Calendário multi-competição

Marco 7 — Copas

`/speckit-specify`

```text
Temporada organizada por datas, com um clube disputando várias competições ao mesmo tempo (ver docs/design.md §3, §6 e §14).

Objetivo: preparar a carreira para copas, estaduais e competições continentais. Hoje a temporada é uma sequência de rodadas de uma única liga; ela passa a ser um calendário de datas em que cada competição ocupa as suas datas e um clube pode ter jogos de competições diferentes na mesma semana.

Histórias de usuário:
- Como jogador, quero ver o meu próximo compromisso, seja de qual competição for, e jogá-lo ao vivo ou direto como hoje.
- Como jogador, quero um calendário do meu clube com todos os jogos da temporada, de todas as competições, por data.
- Como jogador, quero sentir o peso de jogos em sequência: pouco descanso entre partidas desgasta o elenco e pede rodízio.

Escopo:
- A competição define as suas datas como dados (ex.: fim de semana para ligas, meio de semana para copas); o calendário da temporada é montado a partir das competições do banco, sem conflito de datas para um mesmo clube.
- Avançar a carreira vai até a próxima data com jogo do clube do jogador; as datas no meio são simuladas.
- O intervalo entre jogos afeta a condição física dos jogadores.
- Suspensões contam por competição (cartões de uma competição não suspendem em outra), como regra de dados.
- Finanças (renda dos jogos em casa), diretoria, torcida, manchetes, mercado (janelas) e evolução passam a usar datas, valendo para jogos de qualquer competição.
- Telas: Início com o próximo compromisso e a competição; calendário por data com filtro por competição; competição escolhida por abas onde houver mais de uma.
- Carreiras existentes migram para o novo formato sem perder progresso nem histórico.

Requisitos:
- Determinismo mantido: mesma seed e mesmas escolhas geram a mesma temporada.
- Com o banco padrão (uma liga, duas divisões) o jogo se comporta como hoje.
- Banco com datas impossíveis (clube com dois jogos no mesmo dia, competição que não cabe na temporada) é recusado com erro claro.

Fora de escopo: mata-mata, fase de grupos, vários países, vagas entre competições.

Critérios de aceite:
- Um banco de teste com duas competições de pontos corridos em datas intercaladas e clubes em comum joga uma temporada completa sem conflito de datas, e o jogador disputa as duas.
- Uma carreira salva na versão anterior abre na mesma rodada, com o mesmo histórico, e continua jogável.
- O teste de 30 temporadas com o banco padrão continua dentro dos limites da 008 (economia) e da 009 (forças).
```
