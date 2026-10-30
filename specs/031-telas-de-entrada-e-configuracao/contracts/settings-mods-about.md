# Contrato de interface: configurações, mods, sobre, notas, atalhos e atualização

## Configurações (`/configuracoes`)

- Seções em cartões: Rodada ao vivo (velocidade padrão, pausa automática), Aparência e idioma (tema claro, escuro ou do sistema; idioma), Dicas (mostrar de novo, com o resultado confirmado em texto), Sobre (versão e links para Notas de versão e Sobre).
- Cada mudança grava na hora, como hoje; nada de "apagar todos os dados".

## Mods (`/mods`)

- Cartões: Introdução (documentação do formato e mod de exemplo), Mundo padrão (descrição e download), Carregar mod (.zip) com mensagens e o relatório de validação (erros e avisos em texto), Mods carregados (resumo, países, divisões, imagens e Remover; vazio desenhado), Planilhas (exportar clubes e jogadores, importar e gerar pacote, baixar e carregar o gerado).
- Substituir e Remover em diálogo com foco inicial em Cancelar e foco devolvido ao controle de origem.
- Sem ativar nem desativar mods.

## Sobre (`/sobre`)

- Apresentação, "O que dá para fazer", capturas de tela com texto alternativo (regeneradas com a interface nova), aviso de que não há nomes reais, gratuito, privacidade e como levar as carreiras a outro navegador, versão e link para o formato de mods.

## Notas de versão (`/notas-de-versao`)

- Uma versão por `details`: a atual aberta, as outras recolhidas, cada uma com data; versões ainda não vistas (acima da `lastSeenVersion` lida antes de gravar) marcadas "Nova" em texto; ao abrir a tela a versão atual passa a contar como vista, mas a marca da visita corrente se mantém até sair.
- No fim, "Fase beta" recolhida (1.0.0 a 1.10.0, de 20 a 28 de outubro de 2026) com uma frase explicando o que foi e as versões rotuladas "beta".

## Ajuda de atalhos e aviso de atualização

- Ajuda: `Dialog` acessível (foco preso e devolvido, Esc fecha) com os atalhos gerais e os da tela.
- Atualização: `Notice` com "Recarregar"; nunca aparece na rodada ao vivo.

## Comum

Contraste 016; estado e erro nunca só em cor; foco visível; sem rolagem horizontal da página em 1 440, 1 280 e 1 024 px.
