# 015 — Saves portáteis e formato de mod

Marco 6 — Lançamento

`/speckit-specify`

```text
Exportar/importar saves e abrir o formato de banco de dados para a comunidade (ver docs/design.md §11 e §12).

Objetivo: o jogador não perde carreiras ao limpar o navegador, e a comunidade consegue criar e compartilhar bancos de dados (inclusive com nomes reais, distribuídos por ela, não pelo jogo).

Histórias de usuário:
- Como jogador, quero baixar um arquivo com meu save e carregá-lo depois, em outro navegador ou computador.
- Como modder, quero carregar um banco de dados de terceiros (pacote com JSON e imagens) ao criar uma nova carreira e ver erros de validação claros se o pacote tiver problemas.
- Como modder, quero exportar e importar jogadores e clubes em CSV para editar em uma planilha.
- Como modder, quero que escudos possam ser imagens no lugar do escudo gerado.
- Como modder, quero uma documentação do formato do banco (campos, faixas válidas, exemplos).

Requisitos:
- Arquivo de save compactado e versionado; importar save de versão antiga passa pelas migrações.
- Saves corrompidos ou de versão futura são rejeitados com mensagem clara, sem quebrar o jogo.
- Trocar ou remover um mod não afeta carreiras já criadas (o banco foi copiado para o save).
- Limites de tamanho para pacotes e imagens.

Fora de escopo: editor de mods embutido, repositório online de mods.

Critérios de aceite:
- Exportar e reimportar um save produz um estado idêntico.
- Um mod de exemplo diferente do padrão (outro país fictício) cria uma carreira jogável.
- A documentação do formato permite a um modder criar um banco válido sem ler o código.
```
