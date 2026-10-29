# Mockups da nova interface

Fonte dos mockups do marco 10 ([`../interface-nova.md`](../interface-nova.md)), exportada do canvas
"Treinador FC — Nova Interface" do Claude Design em 2026-10-28. São a **referência visual** dos
prompts 025 a 032: o que cada tela deve parecer, com os dados e os estados de exemplo.

## O que tem aqui

- `canvas.json`: o índice do canvas (as 19 telas, a posição e o tamanho de cada uma).
- `*.dc.html`: uma tela por arquivo, no formato de componentes do Claude Design.

| Arquivo | Tela |
|---|---|
| `Menu` | Menu inicial |
| `NovaCarreira`, `Carreiras`, `Configuracoes`, `Mods`, `Sobre`, `NotasVersao` | Telas de entrada e configuração |
| `Main`, `Elenco`, `Escalacao` | Início, Elenco e Escalação |
| `Competicao`, `Calendario`, `Historico` | Competição, Calendário e Histórico |
| `Mercado`, `Financas` | Mercado e Finanças |
| `Carreira`, `Noticias` | Carreira e Notícias |
| `Rodada`, `FimTemporada` | Rodada ao vivo e Fim de temporada |

## Como abrir

Os arquivos **não abrem direto no navegador**: dependem do tempo de execução do Claude Design
(`support.js`), que não está no repositório. Para vê-los, importe a pasta em um canvas do Claude
Design. O que dá para ler sem isso é o HTML e o CSS de cada tela: cores, espaçamentos, textos e
estrutura estão em estilos diretos nos arquivos.

Algumas telas têm **ajustes** no painel do canvas, que mudam o que o mockup mostra: a cor de
destaque (todas), o estado ou a ocorrência da rodada ao vivo, o resultado e o estado do fim de
temporada, o estado do histórico (com ou sem dados) e o momento dos dados das finanças (início,
meio da temporada, com histórico ou em crise).

## Como usar nos prompts

Os mockups são a referência do **visual e da composição**, não da lista de funções nem dos dados.
A comparação com a aplicação real está em [`../interface-nova.md`](../interface-nova.md), seção 5:
ali estão as funções que o mockup simplifica e os itens que ele inventou.

Nos mockups:

- Os dados são de exemplo (clube União Canoas, jogadores e valores inventados, moeda `$`).
- As fontes vêm de um CDN (Google Fonts). No jogo elas são distribuídas junto com o pacote, porque o
  jogo funciona offline.
- Os botões e os campos de formulário são só visuais, exceto abas, filtros, seleções e as
  interações descritas no Claude Design (por exemplo, a troca de jogadores na rodada ao vivo).
- O tema claro não foi desenhado; ele entra na 025.

Se uma tela mudar no canvas, exporte de novo e substitua os arquivos desta pasta.
