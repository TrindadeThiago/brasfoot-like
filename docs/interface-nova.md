# Nova interface

Documento de referência do **marco 10 — Nova interface**: a refatoração visual do jogo. Os
prompts de `/speckit-specify` estão em [`speckit-prompts/marco10/`](speckit-prompts/README.md)
(025 a 032). Este documento reúne as decisões de design que eles compartilham.

## 1. Origem e objetivo

A interface atual funciona, mas nasceu no marco 2 e recebeu só o polimento da 016: barra de navegação
horizontal, uma coluna estreita de conteúdo com muito espaço vazio nas laterais, fonte do sistema,
tabelas largas que estouram a janela (o Elenco passa de 1 440 px) e telas longas demais (Calendário
e Mercado). O marco 10 moderniza o visual **sem mudar nenhuma regra do jogo**.

A direção visual saiu de um canvas no Claude Design, "Treinador FC — Nova Interface", com 19 telas.
A fonte dos mockups está versionada em [`interface-nova/`](interface-nova/README.md) (como abri-los
e como lê-los). Eles foram conferidos tela por tela contra capturas da aplicação atual, e as
diferenças ficaram registradas na seção 5.

Princípios do marco:

- **Só a camada de apresentação muda.** Motor, regras, saves e dados ficam como estão; nenhum save
  novo, nenhuma migração (constituição, princípio I).
- **Paridade funcional.** Toda função da interface atual continua existindo, no mesmo caminho ou em
  um melhor. O mockup simplificou algumas telas; ele não é a lista de funções (seção 5).
- **O jogo continua o mesmo jogo:** offline, gratuito, acessível, em pt-BR, com tema claro e escuro.

## 2. Linguagem visual

**Cores (tema escuro).** Fundo `#0a0e13`; superfícies `#0f151c` (barra lateral), `#121922`
(cartões) e `#16222c` (item ativo, realce); bordas `#1d2733` e `#2e3a47`; texto `#eef2f6`, texto
secundário `#b4c0cd` e `#98a6b6`. Destaque `#3ddc84` (o verde do jogo), com `#06140c` sobre ele.
Estados: aviso `#ffb454`, perigo `#ff8a8a`, informação `#5ec8ff`. O destaque é um parâmetro: o
design foi montado para trocar de cor sem refazer telas. O **tema claro** não foi desenhado e entra
na 025.

**Tipografia.** Space Grotesk (500–700) nos títulos, nos números grandes e nos placares; Inter
(400–600) no corpo. Números tabulares em tabelas e placares. As fontes **são distribuídas com o
jogo**: os mockups as carregam de um CDN, mas o jogo funciona offline (constituição, princípio VIII).

**Forma.** Cartões de raio 14–20 px, controles de 10 px, bordas de 1 px, sem sombras pesadas;
rótulos de seção em caixa alta pequena com espaçamento; indicadores de condição, força e confiança
como barras de 6–8 px. Alvos de toque e clique com no mínimo 44 px de altura.

**Estados e cor.** Verde marca o que é bom ou ativo, âmbar o que pede atenção, vermelho o que é
perda, expulsão ou lesão. A cor nunca é o único sinal: lesão, expulsão e cartões têm texto ou forma.

## 3. Estrutura

**Dentro da carreira**, uma **barra lateral** de 232 px substitui a barra horizontal: logo, as dez
telas do clube (Início, Elenco, Escalação, Competição, Calendário, Finanças, Histórico, Mercado,
Carreira, Notícias) com ícones e os contadores que o jogo já mostra (propostas de emprego,
negociações do mercado), e um rodapé com **Menu inicial**, **Configurações** e **Atalhos de
teclado**. O cabeçalho atual (clube, técnico, série, temporada e rodada) vira o título da tela.
Quando a largura não comporta a barra, ela empilha acima do conteúdo.

**Telas de foco**, sem a barra lateral e com um botão Voltar ou Sair: rodada ao vivo, fim de
temporada, nova carreira, carreiras salvas, configurações, mods, sobre e notas de versão.

**Menu inicial**: tela de abertura com a chamada principal e as três ações (Nova carreira,
Carreiras salvas, Mods), mais Configurações, Sobre, Atalhos e a versão.

## 4. Telas

| Mockup | Rota | O que muda | Prompt |
|---|---|---|---|
| Início | `/jogo` | Cartão do próximo jogo em destaque com as ações de jogar, avisos acionáveis, posição e resultados, torcida e diretoria com barras | 026 |
| Elenco | `/jogo/elenco` | Tabela com rolagem própria, filtros por setor e condição, ações por linha | 026 |
| Escalação | `/jogo/escalacao` | Campo e reservas, "Fora da relação", condição visível | 026 |
| Competição | `/jogo/competicao` | Abas por competição, classificação, resultados, artilharia, chaveamento e campanha | 027 |
| Calendário | `/jogo/calendario` | Lista por competição com resumo e ver jogos | 027 |
| Histórico | `/jogo/historico` | Sete abas e estado vazio | 027 |
| Mercado | `/jogo/mercado` | Abas, filtros, comparação, tabela de jogadores | 028 |
| Finanças | `/jogo/financas` | Resumo, ingresso, estádio, crédito e jogos em casa | 028 |
| Carreira | `/jogo/carreira` | Abas Diretoria, Torcida, Propostas, Histórico e Técnicos | 029 |
| Notícias | `/jogo/noticias` | Manchetes por rodada, com o seu clube marcado | 029 |
| Rodada ao vivo | `/jogo/rodada` | Placar em destaque, linha do tempo, estatísticas, painel Meu time | 030 |
| Fim de temporada | `/jogo/fim-de-temporada` | Resultado do clube em destaque, campeões, quem sobe e desce, classificação final, premiação | 030 |
| Menu inicial | `/` | Abertura e ações | 031 |
| Nova carreira | `/nova-carreira` | Formulário e escolha de clube em duas colunas, botão fixo | 031 |
| Carreiras salvas | `/carreiras` | Lista com Continuar, Exportar e Apagar | 031 |
| Configurações | `/configuracoes` | Seções por assunto | 031 |
| Mods | `/mods` | Mundo padrão, pacote, mods carregados e planilhas | 031 |
| Sobre | `/sobre` | Apresentação, capturas e avisos | 031 |
| Notas de versão | `/notas-de-versao` | Versões recolhíveis | 031 |

## 5. Paridade: o que o mockup não mostra e o que ele inventou

A conferência com a aplicação atual achou diferenças nos dois sentidos. Elas valem como requisito
dos prompts.

**Funções da interface atual que os mockups simplificaram e que precisam continuar:**

- **Mercado:** abas Buscar, Negociações, Propostas recebidas e Contratos; resumo da janela; os onze
  filtros; comparação de 2 a 4 jogadores; lista longa (cerca de mil jogadores) sem travar; os
  diálogos de oferta, empréstimo, contratação de livre e renovação, com as respostas do clube e do
  jogador.
- **Competição:** seletor de país, competições estaduais e continentais, fases (grupos e
  mata-mata), chaveamento, origem das vagas e campanha do clube.
- **Rodada ao vivo:** esquema e postura durante o jogo, limite de substituições, troca de posição,
  aviso de lesão e de goleiro expulso, cartões, pênaltis, intervalo, pausa automática e
  confirmação ao sair.
- **Elenco:** situação, escalação, evolução, contrato e as ações Detalhes, Vender e Rescindir.
- **Nova carreira:** "Sem demissão", seed, país, divisão, busca e a tabela de clubes com os
  atributos.
- **Dicas de primeiro acesso, ajuda de atalhos e aviso de atualização** (016), em todas as telas.

**Itens do mockup que o jogo não tem e que não viram função neste marco:** gráfico de saldo por
mês nas Finanças; ativar e desativar mods (o jogo carrega e remove); "Continuar carreira" no menu;
blocos de atalhos e de apagar dados dentro de Configurações; categorias, destaque e filtros nas
Notícias; a reputação do clube no cabeçalho do Início; as estatísticas da campanha (vitórias,
empates, derrotas e saldo de gols) e o melhor jogador no Fim de temporada, que o jogo não mostra;
valores em R$ (o jogo usa a moeda do país).

**Dados de exemplo.** Os mockups usam clubes e jogadores inventados e a mesma moeda `$`; a
interface real mostra os dados do banco em uso.

## 6. Versões, branch e notas

O marco 10 reinicia a numeração do jogo. As versões **1.0.0 a 1.10.0** (23 versões, de 21 a 28 de
outubro de 2026) passam a ser a **fase beta**; o jogo só ganha o número 1.0.0 de novo no
lançamento oficial, ao fim do marco, já com a interface nova inteira.

**Branch de release.** Todo o marco é desenvolvido numa branch, `release/v1.0.0`, e vai ao ar de uma
vez:

1. Primeiro, a documentação do marco (este documento, os mockups e os prompts) entra na `main` por
   um PR. Mudanças só de documentação não disparam CI nem release.
2. Depois, `release/v1.0.0` é cortada da `main`.
3. Cada feature (025 a 031) sai de uma branch própria cortada de `release/v1.0.0` e volta para ela
   por um PR com `release/v1.0.0` como base. O CI roda nesses PRs como em qualquer outro. O release
   só dispara no push na `main`, então esses merges **não publicam nada**.
4. A 032 fecha o marco. Antes do PR final, os gates do release (simulações de 30 temporadas,
   `check-release` e e2e completo) rodam sobre a branch.
5. O lançamento é um PR de `release/v1.0.0` para a `main`, com **merge commit** (como nos PRs
   anteriores do projeto), que preserva o histórico das features. O workflow de release publica a
   versão 1.0.0, cria a tag `v1.0.0` e o Release do GitHub.

Enquanto o marco durar, a **`main` fica congelada**: nada novo entra nela e nenhum release sai.
Uma correção urgente do jogo atual seria a única exceção e se decide na hora; nesse caso a `main`
seria mesclada na branch de release e o conflito em `package.json` e nas notas se resolveria a favor
do 1.0.0. Não há pré-visualização online da branch: o trabalho em andamento roda localmente
(`pnpm dev:web`), e a Vercel só recebe a versão 1.0.0 final.

**Numeração.** A versão do jogo no `package.json` vai para **1.0.0 na 025** e fica assim até o
lançamento. Não há versões intermediárias.

**Git e GitHub.** As tags e os Releases da fase beta foram renomeados em 2026-10-28, antes do
reinício: `v1.0.0` a `v1.10.0` viraram `beta-v1.0.0` a `beta-v1.10.0` (mesmos commits), e os 23
Releases passaram a apontar para elas, marcados como pré-lançamento. Assim `v1.0.0` está livre, e o
workflow de release (que só publica se a tag `vX.Y.Z` ainda não existe) funciona sem alteração.

**Notas de versão.**

- As 23 notas da fase beta saem de `release-notes.json` e vão para um arquivo próprio
  (`release-notes-beta.json`), para que o 1.0.0 novo não encontre a nota do 1.0.0 antigo: o workflow
  e o `check-release` procuram a nota pela versão exata.
- `release-notes.json` passa a ter **uma única nota, a do 1.0.0**, criada na 025. Cada feature
  acrescenta a ela o que mudou, no mesmo PR; a 032 revisa o texto para resumir o marco inteiro: o que
  mudou na interface e que o jogo e os saves seguem os mesmos.
- A página de notas mostra no topo a nota do 1.0.0 e, no fim, uma seção recolhida **"Fase beta"**
  (1.0.0 a 1.10.0, de 21 a 28 de outubro de 2026), com uma frase explicando que o jogo passou por uma
  fase beta antes do lançamento oficial. Dentro dela, as versões aparecem como "beta 1.10.0" e
  assim por diante, para não se confundirem com a nova.

**O que não muda.** O formato de save é versionado à parte e não depende da versão do jogo. O aviso
de "novidades desta versão" compara por diferença: quem tinha visto a 1.10.0 vê o aviso do 1.0.0 novo.
O cache offline é por conteúdo. Só o `package.json` da raiz carrega a versão do jogo.

## 7. Em aberto

- **Tema claro:** desenhar e validar o contraste na 025, antes das telas.
- **Telas estreitas:** a interface atual exige 1 024 px. O alvo do marco é tablet (a partir de
  768 px) sem rolagem horizontal da página; versão para telefone continua no §14 do design.
- **Capturas da página Sobre:** precisam ser refeitas ao fim do marco (`pnpm screenshots`).
- **Revisão de dicas:** as dicas de primeiro acesso apontam para elementos da tela e precisam ser
  reancoradas.
