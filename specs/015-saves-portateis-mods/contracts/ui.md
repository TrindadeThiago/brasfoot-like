# Contrato: telas

| Onde | O quê |
|---|---|
| Carreiras (`/carreiras`) | botão **Exportar** em cada carreira (baixa `.blsave`); botão **Importar save** (escolher arquivo); diálogo de conflito de id (Substituir / Importar como cópia / Cancelar); mensagens de recusa (`not_a_save`, `corrupt`, `future_version`, armazenamento cheio) |
| Mods (`/mods`, novo; link na abertura e na nova carreira) | **Carregar mod** (`.zip`) com relatório de validação (erros e avisos agrupados por arquivo, com item e campo); lista de mods com resumo (país, divisões, clubes, jogadores, imagens) e **Remover**; **Exportar CSV** (clubes e jogadores) de qualquer banco; **Importar CSV** sobre um banco → relatório → baixar ou carregar o pacote gerado; link para a documentação; download do mod de exemplo |
| Nova carreira | seletor **Banco de dados** (padrão + mods carregados); a lista de clubes e os escudos vêm do banco escolhido |
| Qualquer escudo | `<img>` da imagem do clube quando o banco tem, senão o escudo gerado |

## Armazenamento

IndexedDB versão 2: stores `saves`, `summaries` (já existentes) e `mods`. Interface `ModStore`
(`list`, `get`, `put`, `remove`) ao lado de `SaveStore`; `SaveStore` ganha `exists(id)`.

## i18n

`ui.json`: `saves.export`, `saves.import`, `saves.import.*` (sucesso, recusas, conflito, cópia),
`mods.*` (título, carregar, relatório, lista, resumo, remover, csv, documentação, exemplo),
`newCareer.bank`, `newCareer.defaultBank`. `errors.json`: códigos novos de data-model.md.
