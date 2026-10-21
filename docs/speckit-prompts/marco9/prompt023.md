# 023 — Estaduais

Marco 9 — Futebol sul-americano

`/speckit-specify`

```text
Competições regionais (estaduais) com duas divisões, disputadas no começo da temporada, antes das competições nacionais (ver docs/design.md §3 e §14).

Objetivo: um país pode ter competições regionais, uma por estado ou região, cada uma com duas divisões, disputadas no início do ano. Elas reúnem clubes das divisões nacionais e clubes que só jogam o regional. É o que falta para reproduzir a temporada brasileira, que começa com os estaduais.

Histórias de usuário:
- Como jogador, quero disputar o estadual do meu clube no começo da temporada, com clássicos regionais e um título que a torcida valoriza.
- Como jogador de um clube pequeno, quero subir para a primeira divisão do estadual e, com uma boa campanha nela, ganhar vaga na copa nacional ou na divisão nacional mais baixa.
- Como modder, quero definir os estados, as duas divisões de cada estadual e os clubes de cada uma.

Formato de cada divisão do estadual (o mesmo nas duas):
- Fase de grupos (019).
- Mata-mata em jogo único a partir da primeira fase eliminatória (018), com desempate nos pênaltis.
- Final em ida e volta.
- Tamanho dos grupos, número de classificados, mando no jogo único (ex.: melhor campanha) e critérios de desempate como dados de cada estadual.

Escopo:
- Região (estado) como atributo do clube; cada competição regional é ligada a uma região e tem duas divisões com acesso e rebaixamento entre elas.
- Acesso e rebaixamento definidos nos dados: por padrão, sobem os finalistas da segunda divisão e caem os piores da classificação geral da fase de grupos da primeira; o número de clubes de cada divisão se mantém.
- Clubes regionais: clubes que existem no mundo e jogam só o estadual, com elenco e economia menores, renovados pela evolução do mundo (009) e pelo mercado (010/011).
- Vagas a partir da primeira divisão do estadual (021): copa nacional, divisão nacional mais baixa.
- Calendário: as duas divisões no início da temporada, terminando antes do início das divisões nacionais (017).
- Integração: rivalidades regionais (013), metas da diretoria no estadual, manchetes, histórico de campeões das duas divisões.
- Telas: grupos, chaveamento até a final e campanha do clube; a divisão do estadual aparece junto das competições nacionais.

Requisitos:
- O peso do estadual na diretoria e na torcida é configurável por competição (pode valer pouco para clubes grandes).
- Um clube do jogador sempre disputa o estadual da sua região, na divisão em que estiver.
- Validação do banco: grupos e fases eliminatórias fecham com o número de clubes de cada divisão, e as vagas de acesso e rebaixamento são iguais.

Fora de escopo: terceira divisão ou divisões inferiores dos estaduais, competições interestaduais (ex.: copas regionais).

Critérios de aceite:
- Um banco de teste com 27 estaduais de duas divisões joga uma temporada inteira sem conflito de datas, com todas as finais (ida e volta) terminando antes das divisões nacionais.
- Em 30 temporadas, as duas divisões de cada estadual mantêm o seu número de clubes, os clubes regionais continuam com elencos válidos e o acesso e o rebaixamento acontecem toda temporada.
- O tempo da virada de temporada e o tamanho do save ficam dentro das metas da 020.
```
