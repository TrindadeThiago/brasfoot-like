# Contrato: telas de divisões, fim de temporada e histórico (007)

Complementa [specs/006-rodada-ao-vivo/contracts/ui.md](../../006-rodada-ao-vivo/contracts/ui.md).

## Rotas

| Rota | Tela |
|---|---|
| `/nova-carreira` | Escolha entre os clubes de **todas** as divisões, com filtro por divisão (padrão: nível 1) e a divisão visível em cada clube |
| `/jogo?c=<id>` | Início: rodada atual da liga; com a temporada encerrada, leva ao resumo e oferece "Próxima temporada" |
| `/jogo/rodada?c=<id>` | Rodada ao vivo só com os jogos da divisão do jogador; no fim, resultados da divisão do jogador e link "Resultados da outra divisão" |
| `/jogo/competicao?c=<id>&d=<nível>` | Classificação da divisão `d` (padrão: a do jogador), com zonas de acesso/rebaixamento |
| `/jogo/competicao/resultados?c=<id>&d=<nível>&r=<n>` | Jogos da rodada `r` da divisão `d` |
| `/jogo/competicao/artilharia?c=<id>&d=<nível>` | Artilharia da divisão `d` |
| `/jogo/fim-de-temporada?c=<id>` | **alterada** — resumo de fim de temporada |
| `/jogo/historico?c=<id>&t=<número>` | **nova** — histórico; com `t`, as classificações finais daquela temporada |

## Seletor de divisão (competição)

Abas com o nome da divisão vindo do mod ("Série A", "Série B"), na ordem de nível, com a divisão
do jogador marcada e selecionada por padrão. Teclado: `[` / `]` divisão anterior/seguinte.
A escolha fica na URL (`d`), não no save.

## Zonas na classificação

Linhas de acesso (topo, `promotion` vagas) e rebaixamento (base, `relegation` vagas) com cor e
legenda textual (não só cor): "Acesso", "Rebaixamento". Vagas vêm de `divisionZones`.

## Resumo de fim de temporada

- Título: "Temporada {year} encerrada".
- Destaque do clube do jogador: campeão / promovido / rebaixado / permanece, com posição final e
  divisão (mensagens próprias por caso, com gênero neutro).
- Campeão de cada divisão (escudo e nome).
- "Sobem para a {division}" e "Descem para a {division}": os clubes com posição final.
- Links: classificações finais de cada divisão; histórico.
- Botão principal "Próxima temporada" (atalho `N`): executa a virada, salva e volta à Início da
  nova temporada; durante a virada, botão desabilitado com estado "Preparando temporada…".

## Histórico

Tabela: temporada (ano), campeão de cada divisão, posição e divisão do clube do jogador. Linha
abre o detalhe com as classificações finais (tabelas somente leitura, com sobem/descem marcados).
Vazio na primeira temporada: mensagem "Nenhuma temporada encerrada ainda".

## Navegação e atalhos

| Tecla | Ação |
|---|---|
| `[` / `]` | Divisão anterior / seguinte (telas da competição) |
| `N` | Próxima temporada (no resumo de fim de temporada) |
| `H` | Histórico (de qualquer tela do jogo) |

Os atalhos `1`–`5`, `S`, `D` e os da rodada continuam. Todos documentados na ajuda (`?`).

## Outras mudanças

- Cabeçalho e lista de carreiras: ano = `league.year`, mostram a divisão do clube.
- Elenco e detalhes do jogador: idade calculada com `currentDate(save)`.
- Textos novos em `packages/i18n/locales/pt-BR/ui.json` (`division.*`, `seasonEnd.*`,
  `history.*`, `standings.zone.*`); nomes de divisão e clube só do mod.
