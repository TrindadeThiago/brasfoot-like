# Contrato de interface: Polimento (016)

Textos sempre por chave em `packages/i18n/locales/pt-BR/ui.json`. Rotas com `trailingSlash`.

## Rotas novas

| Rota | Tela (`ScreenId`) | Conteúdo |
|---|---|---|
| `/configuracoes/` | `settings` | velocidade padrão da rodada ao vivo (lenta/normal/rápida), pausa automática, tema (seguir o sistema/claro/escuro), idioma (lista de `LOCALES`), "Mostrar as dicas de novo", seção Sobre (nome, versão, link Notas de versão, link Sobre o jogo), Voltar |
| `/notas-de-versao/` | `release-notes` | versões da mais recente para a mais antiga: título "Versão X — data", lista de mudanças |
| `/sobre/` | `about` | nome, descrição curta, ≥ 4 capturas com `alt`, aviso de conteúdo, "gratuito e sem anúncios", como levar a carreira (exportar/importar), botão Jogar (`/`), links Notas de versão e Formato de mods |

## Tela inicial (`/`)

- Rodapé: "Treinador FC · Versão X" (link Notas de versão), "Sobre o jogo", "Configurações",
  botão "Atalhos" (abre a ajuda).
- Boas-vindas (primeiro acesso): painel com título, 2–3 frases (objetivo; "comece por Nova
  carreira"), botões "Começar" (dispensa e foca "Nova carreira") e "Pular todas as dicas".
- Aviso de novidades (quando aplicável): faixa `role="status"` "Novidades da versão X" + link
  para as notas + fechar.

## Cabeçalho do jogo

- Botões existentes + "Configurações" (`,`) e "Atalhos" (`?`) visíveis.
- Aviso de nova versão (`role="status"`): "Nova versão disponível" + botão "Recarregar"; nunca
  durante a rodada ao vivo (aparece ao sair dela).

## Dicas (`TipHost`)

- Painel não modal: `role="dialog"`, `aria-modal="false"`, `aria-labelledby` = título; foco vai
  para o painel ao abrir e volta ao elemento anterior ao fechar.
- Conteúdo: título, texto (pode citar o atalho: "Aperte S para jogar ao vivo"), "Entendi"
  (dispensa esta), "Pular todas as dicas". Esc = "Entendi".
- Posição: junto do elemento `[data-tip-anchor="<anchor>"]` se visível; senão canto inferior.
  Não cobre o botão principal da tela. Não aparece com diálogo modal aberto.

| Dica | Tela | Mensagem (resumo) | Âncora |
|---|---|---|---|
| `welcome` | inicial | objetivo do jogo; comece por Nova carreira | botão Nova carreira |
| `home-next-step` | jogo/início | confira a escalação e jogue a rodada (ao vivo `S` ou direto `D`) | botão de jogar |
| `lineup` | escalação | 11 titulares, formação, `Enter` seleciona, Escalação automática | lista |
| `round-live` | rodada | velocidade `+`/`-`, pausa Espaço, substituições | controles |
| `round-direct` | jogo/início após 1ª rodada direta | resultados e tabela atualizados | tabela/resumo |
| `table` | competição | acesso/rebaixamento, abas de divisão `[`/`]` | tabela |
| `market` | mercado | janelas, propostas, orçamento | lista |
| `board` | carreira | metas da diretoria e confiança | metas |

## Ajuda de atalhos

- Abre com `?` em qualquer tela e pelo botão "Atalhos"; Esc fecha e devolve o foco.
- Grupos: "Gerais" (scope `global`) e "Desta tela" (scope da tela); cada linha: tecla
  (`<kbd>`) + frase. Gerada de `SHORTCUTS`.
- Globais: `?` ajuda, `,` configurações, `Esc` fechar. Dentro do jogo continuam globais da área
  do jogo: `1`–`6`, `H`, `M`, `C`, `J` (navegação).

## Temas e acessibilidade

- `<html data-theme="light|dark">` + `color-scheme`; definido antes da pintura.
- Contraste: texto ≥ 4,5:1, texto grande/bordas de controle/foco ≥ 3:1 em ambos os temas.
- `:focus-visible` com `--focus-ring` em todo elemento focável.
- `prefers-reduced-motion: reduce` ⇒ sem transições/animações não essenciais.
- Anúncios (`aria-live`): gol e fim da rodada (já existentes), save concluído, importação, aviso
  de nova versão.

## Checklist de consistência (revisão tela a tela)

Para cada tela: um `<h1>` com o nome da tela (ou do clube no jogo); botão primário único por
ação principal; botões secundários com o mesmo componente; espaçamentos pelos tokens; tabelas
com `caption` e `th scope`; estado vazio com frase + próxima ação; erro com `role="alert"` e
frase completa; links "Voltar" no mesmo lugar.
