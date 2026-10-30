# Contrato de interface: menu inicial e carreiras salvas

## Menu inicial (`/`)

- **Conteúdo**: nome do jogo (`h1`), chamada principal que diz o que ele é, ações Nova carreira, Carreiras salvas (com a quantidade, plural) e Mods.
- **Continuar**: com carreira recente, a ação Continuar de hoje (técnico, clube e rodada); sem carreira, não aparece. Nenhuma ação nova.
- **Rodapé**: Configurações, Sobre, Atalhos (abre o diálogo de ajuda) e a versão (link para as notas).
- **Avisos**: novidades da versão (dispensável, com link para as notas), armazenamento indisponível e dica de primeiro acesso apontando para Nova carreira; todos em `Notice` ou na dica de hoje.
- **Acessibilidade**: um `h1`; foco inicial no documento; ações com o nome só da ação e a quantidade e a descrição ligadas por `aria-describedby`; foco visível; sem rolagem horizontal da página.

## Carreiras salvas (`/carreiras`)

- **Lista**: um cartão por carreira com escudo, clube, técnico, divisão, temporada, rodada (ou "temporada encerrada") e a data; carreira de versão futura ou corrompida leva marcação em texto e não oferece Continuar.
- **Ações**: Continuar (link), Exportar (arquivo), Apagar (diálogo). Importar carreira (arquivo) no alto.
- **Apagar**: diálogo com a carreira citada por técnico e clube; foco inicial em Cancelar; Esc cancela; cancelar não apaga; ao fechar, o foco volta ao botão de origem (ou à lista se o cartão sumiu).
- **Importar**: arquivo inválido, versão futura, cota cheia e falha têm cada um a sua mensagem de hoje, ligada ao campo de arquivo, e nada é importado nesses casos; conflito de id abre o diálogo substituir / salvar como cópia / cancelar com foco inicial em Cancelar.
- **Vazio**: `EmptyState` com Nova carreira e Importar carreira.
- **Acessibilidade e layout**: a quantidade anunciada; ações com nome que cita a carreira; sem rolagem horizontal em 1 440, 1 280 e 1 024 px.
