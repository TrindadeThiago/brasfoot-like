# Contrato de interface: tela Carreira

Rota `/jogo/carreira/` (com `?c=` e, opcional, `?aba=`).

- **Abas** (`Tabs`): Diretoria (`board`), Torcida (`fans`), Propostas (`offers`, com contagem no nome quando há pendentes), Histórico (`history`), Técnicos (`coaches`). Setas, Home e End movem entre elas. `?aba=` abre a aba pedida.
- **Diretoria**: cartão Metas (esportiva, financeira, estadual e continental, as que existem; cada uma com rótulo, texto e situação em texto e símbolo; reputação; aviso de carreira sem demissão); cartão Confiança (valor, medidor, nível em texto, tendência em texto e símbolo, três motivos recentes com efeito); cartão Mudanças por rodada (lista da mais nova à mais antiga, com rolagem própria). Em 1 440 × 900 não há rolagem vertical da página.
- **Torcida**: faixa em texto, valor, medidor, tendência em texto e símbolo, motivos recentes com efeito, rivais.
- **Propostas**: um cartão por proposta (clube com escudo, divisão e posição, reputação, país, metas esperadas, validade); aviso de mudança de país antes das ações; Aceitar e Recusar; ações desativadas com a rodada ao vivo, com o motivo escrito.
- **Histórico**: passagens (período e saída) e temporadas (divisão, posição, meta, conquistas, decisão da diretoria, reputação, campanha continental).
- **Técnicos**: seletor de divisão, tabela com reputação e confiança, jogador destacado e vagas.
- **Desempregado**: a Diretoria mostra o estado de desempregado com a reputação; Propostas, Histórico, Torcida e Técnicos funcionam como hoje.
- **Estados vazios**: sem propostas, sem metas avaliadas, sem motivos, sem passagens ou temporadas.
- **Acessibilidade**: tendência e situação nunca só em cor; contraste 016 nos dois temas; nenhum controle sem nome acessível; foco visível.
- **Avisos**: demissão, nova contratação e propostas com `Notice`.
