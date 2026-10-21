# 024 — Mod do futebol sul-americano

Marco 9 — Futebol sul-americano

`/speckit-specify`

```text
Gerador de um mod com a estrutura do futebol sul-americano, com clubes e competições fictícios (ver docs/design.md §11 e docs/mod-format.md; constituição, princípio IV).

Objetivo: entregar um mundo grande e completo que use tudo do marco 7 ao 9, gerado por uma ferramenta do projeto, validado e balanceado. A estrutura segue o futebol sul-americano; os nomes são fictícios, e quem quiser nomes reais os troca no próprio computador.

Estrutura do mod:
- Brasil: divisões nacionais A, B e C em pontos corridos (20 clubes cada) e D em grupos regionais seguidos de mata-mata; estaduais dos 27 estados, cada um com duas divisões em grupos → mata-mata em jogo único → final em ida e volta; copa nacional em mata-mata; supercopa nacional (campeão da liga × campeão da copa).
- Demais países sul-americanos (Argentina, Uruguai, Paraguai, Chile, Bolívia, Peru, Equador, Colômbia e Venezuela): divisões A e B e copa nacional.
- Continente: competição continental principal e secundária, com vagas por país.
- Força, reputação e economia proporcionais aos países (os mais fortes têm clubes e receitas maiores), e o número de vagas continentais por país segue essa proporção.

Histórias de usuário:
- Como jogador, quero uma carreira em que a temporada do meu clube tenha estadual, campeonato nacional, copa nacional e competição continental.
- Como modder, quero gerar o mod de novo com outra seed ou ajustar a estrutura e trocar os nomes por planilha (CSV, 015).

Escopo:
- Ferramenta que gera o pacote do mod (.zip) de forma determinística pela seed e o valida antes de terminar.
- Nomes de clubes, competições e jogadores fictícios, com bancos de nomes por país (português e espanhol); nomes de países e estados podem ser os reais.
- Documentação: como gerar, ajustar a estrutura e substituir os nomes localmente.
- Simulação de balanceamento de 30 temporadas com o mod (mundo, economia e competições).
- Mod disponível para download na página de Mods, se couber nos limites de pacote; se não couber, os limites são revistos com justificativa.

Requisitos:
- O projeto não distribui nomes, escudos ou marcas reais (princípio IV), inclusive nos nomes das competições; nomes reais só via CSV do próprio jogador ou mods da comunidade.
- O mod respeita as metas de tamanho e de desempenho da 020.

Fora de escopo: editor de mods embutido, seleções nacionais, mundial de clubes.

Critérios de aceite:
- `pnpm validate-bank` aceita o pacote gerado; a mesma seed gera o mesmo pacote byte a byte.
- Uma carreira de teste no mod passa, na mesma temporada, por estadual, divisão nacional, copa nacional e competição continental.
- 30 temporadas com o mod rodam sem erro, dentro das faixas de balanceamento e das metas de tamanho e de tempo.
```
