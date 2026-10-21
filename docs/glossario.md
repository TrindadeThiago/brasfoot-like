# Glossário de textos (pt-BR)

Termos adotados nos textos da interface (`packages/i18n/locales/pt-BR/`). Ao escrever um texto
novo, use estes termos; ao traduzir, mantenha a mesma distinção entre eles.

## Tom

- Tratamento por **você**, verbos no imperativo afirmativo ("Escolha", "Confira", "Jogue").
- Frases curtas e completas, com ponto final quando são frases; rótulos e botões sem ponto.
- Erros dizem o que aconteceu e, quando possível, o que fazer.
- Português do Brasil: nada de "equipa", "jornada", "golo", "plantel", "guarda-redes".

## Termos

| Termo | Uso | Evitar |
|---|---|---|
| **Treinador FC** | nome do jogo (vem de `app.name`; nunca escrito à mão) | "brasfoot" em qualquer texto visível |
| **técnico** | o papel do jogador ("Você é o técnico", "Carreira do técnico") | treinador (só no nome do jogo) |
| **clube** | a instituição: elenco, finanças, diretoria, torcida, escudo | time, para a instituição |
| **time** | os jogadores em campo, a equipe que joga ("meu time", "escalar o time", "time sem goleiro") | equipe |
| **elenco** | todos os jogadores do clube | plantel |
| **escalação** | formação + titulares + reservas para o próximo jogo | — |
| **jogo** | uma partida, em rótulos e títulos ("Próximo jogo", "Jogos da rodada") | — |
| **partida** | sinônimo de jogo, aceito em frases ("A partida já terminou") | — |
| **rodada** | o conjunto de jogos de uma data do calendário | jornada |
| **rodada ao vivo** / **simular direto** | os dois modos de jogar a rodada | — |
| **temporada** | um ano do calendário do jogo | — |
| **divisão** / **Série A**, **Série B** | níveis da competição | liga, para o nível |
| **acesso** / **rebaixamento** | subir / cair de divisão | promoção (só em textos técnicos de mods) |
| **diretoria** | quem define metas, avalia e demite o técnico | direção |
| **torcida** | os torcedores do clube, com humor e expectativa | fãs |
| **mercado de transferências** / **janela** | contratações e vendas; período em que o mercado abre | — |
| **carreira** | um jogo salvo: técnico + clube + mundo | save, para o jogador |
| **Carreiras salvas** / **Exportar** / **Importar carreira** | a lista de carreiras e o arquivo `.blsave` para levar a carreira a outro navegador | "save" |
| **mod** / **banco de dados** | pacote `.zip` com outro mundo de clubes e jogadores, feito pela comunidade | — |
| **dica** | os painéis do primeiro acesso | tutorial |
| **atalho** | tecla de atalho; a ajuda se chama "Atalhos de teclado" | — |
| **Configurações** | a tela de preferências | opções, preferências |
| **Notas de versão** / **Novidades da versão X** | lista de mudanças; aviso na tela inicial | changelog |

## Números e formatos

- Placar com "a" em frases ("vence por 2 a 1") e "×" em rótulos curtos ("Clube A 2 × 1 Clube B").
- Dinheiro sempre por `formatMoney` (moeda fictícia do jogo); números por `formatNumber`.
- Datas de calendário por extenso nas notas de versão ("20 de outubro de 2026").
