# Contrato: diálogos do mercado

- **Oferta, empréstimo, contratação de livre, renovação**: título com o jogador; valor de mercado como referência; campos com `Field` (rótulo, ajuda, erro ligado por `aria-describedby`, `role="alert"` na mensagem); etapa em texto (aguardando, contraproposta, contrato); resposta do clube ou do jogador em texto, incluindo motivo de recusa (`market.reason.*`).
- **Contraproposta**: valor pedido com Aceitar e Recusar.
- **Contrato**: salário e duração; resposta do jogador (aceita, recusa com motivo, exige salário).
- **Venda e rescisão** (pelo modal do jogador no Elenco): cotação, confirmação, resultado.
- **Foco**: entra no diálogo, preso nele, Esc fecha o do topo, devolve ao elemento que abriu.
- **Travas** em texto: rodada ao vivo, janela fechada, elenco cheio, teto de estrangeiros, caixa insuficiente.
