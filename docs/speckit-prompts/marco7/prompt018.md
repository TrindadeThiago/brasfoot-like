# 018 — Mata-mata e copa nacional

Marco 7 — Copas

`/speckit-specify`

```text
Formato de disputa em mata-mata e uma copa nacional no mundo padrão (ver docs/design.md §3 "primeira expansão sugerida: copa nacional em mata-mata", §6 e §14).

Objetivo: o jogo ganha a sua primeira competição eliminatória. O formato `knockout`, hoje só reservado no formato de mod, passa a funcionar, e o banco padrão ganha uma copa nacional disputada junto com a liga.

Histórias de usuário:
- Como jogador, quero disputar a copa nacional junto com o campeonato e acompanhar o chaveamento até a final.
- Como jogador, quero decidir um confronto empatado na prorrogação ou nos pênaltis, inclusive ao vivo.
- Como modder, quero descrever uma copa só com dados: fases, jogo único ou ida e volta, sorteio e prêmios.

Escopo:
- Fases definidas como dados: jogo único ou ida e volta, critérios de desempate (saldo no agregado, gols fora opcional, prorrogação opcional, pênaltis).
- Disputa de pênaltis no motor de partida, também na rodada ao vivo.
- Sorteio determinístico pela seed, com cabeças de chave opcionais; clubes podem entrar em fases diferentes (os mais fortes entram depois).
- Mando de campo definido por regra (sorteio, ranking ou divisão).
- Copa nacional no banco padrão, com clubes das duas divisões, prêmios por fase e renda de bilheteria.
- Telas: chaveamento, próximos confrontos, resultados por fase e campeão; histórico de campeões da copa.
- Integração: manchetes (zebras, eliminações, título), torcida (eliminação e título pesam), diretoria (meta de copa opcional por clube), histórico do técnico.
- Formato de mod documentado e validado (número de clubes compatível com as fases).

Requisitos:
- Mesma seed ⇒ mesmo sorteio e mesmos resultados.
- O motor de partida não muda nos 90 minutos; prorrogação e pênaltis são extensões.
- Em ida e volta, todo confronto empatado é decidido pelos critérios da fase.

Fora de escopo: fase de grupos, vagas da copa para outras competições, supercopa.

Critérios de aceite:
- Em 1.000 copas simuladas, os favoritos avançam mais vezes, mas há zebras (faixas declaradas no teste); todo confronto termina com um classificado.
- Uma carreira joga uma temporada inteira com liga e copa no mesmo calendário, e a copa termina com um campeão registrado no histórico.
- Uma disputa de pênaltis ao vivo mostra as cobranças e o resultado.
```
