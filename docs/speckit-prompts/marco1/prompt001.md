# 001 — Modelo de dados e banco fictício

Marco 1 — Motor

`/speckit-specify`

```text
Modelo de dados do mundo do jogo e banco de dados fictício padrão (ver docs/design.md §3, §4 e §11).

Objetivo: definir como países, competições, clubes e jogadores são representados, e gerar o banco fictício que o jogo usa por padrão. O banco padrão é o "primeiro mod": usa exatamente o mesmo formato aberto que modders usarão para criar seus próprios bancos.

Escopo:
- Entidades: país, competição (com formato de disputa como dado: pontos corridos agora, preparado para mata-mata e grupos), divisão com regras de acesso/rebaixamento, clube, jogador.
- Clube: nome, nome curto, sigla, cidade, cores primária/secundária, definição de escudo como dados (forma + cores + iniciais), reputação, capacidade do estádio, caixa inicial.
- Jogador: nome, idade/data de nascimento, nacionalidade, posição (GOL, LAT, ZAG, VOL, MEI, ATA ou equivalente), força 1–100, até 2 características visíveis (ex.: Artilheiro, Muralha, Cobrador de falta, Cabeceio, Velocidade, Armador), e atributos ocultos: potencial, temperamento e propensão a lesões. Salário e valor de mercado derivados.
- Pacote de banco (mod): metadados (nome, autor, versão do formato), dados em JSON e validação com mensagens de erro claras e localizáveis (ex.: "jogador X referencia clube Y inexistente").
- Gerador determinístico do banco padrão a partir de uma seed: 1 país fictício, Série A e Série B com 20 clubes cada, elencos de ~25 jogadores com distribuição de posições coerente e distribuição de forças realista (clubes grandes, médios e pequenos; poucos craques, muitos medianos), nomes a partir de bancos de nomes e sobrenomes fictícios.
- Nenhum nome, escudo ou marca real.

Fora de escopo: interface gráfica, renderização de escudos, import/export CSV, editor de mods, carregar mods de terceiros.

Critérios de aceite:
- O banco padrão gerado passa na validação sem erros e é idêntico para a mesma seed.
- Bancos inválidos (referência quebrada, força fora da faixa, elenco sem goleiro, etc.) são rejeitados com mensagem que identifica o problema.
- A distribuição de forças e posições do banco gerado fica dentro de faixas definidas e verificadas por teste.
```
