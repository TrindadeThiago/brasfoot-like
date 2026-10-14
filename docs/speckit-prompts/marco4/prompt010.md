# 010 — Contratos e mercado de transferências

Marco 4 — Mercado

`/speckit-specify`

```text
Contratos de jogadores e mercado de transferências para o jogador humano (ver docs/design.md §9).

Objetivo: comprar, vender, emprestar e renovar com decisões interessantes e simples, sem pingue-pongue infinito de negociação.

Histórias de usuário:
- Como jogador, quero buscar jogadores de todos os clubes e livres com filtros (posição, força, idade, valor, salário, contrato) e comparar jogadores lado a lado.
- Como jogador, quero fazer uma oferta por um jogador durante a janela; o clube aceita, recusa ou faz uma contraproposta única, que eu aceito ou recuso.
- Como jogador, quero negociar salário e duração de contrato com o jogador contratado; ele pode recusar por falta de interesse (reputação do clube, divisão).
- Como jogador, quero receber propostas de outros clubes pelos meus jogadores e aceitar, recusar ou contrapropor uma vez.
- Como jogador, quero pegar e ceder jogadores por empréstimo simples (sem opção de compra).
- Como jogador, quero renovar contratos e ser avisado de contratos terminando; jogador em fim de contrato fica mais barato e sai de graça se não renovar.
- Como jogador, quero contratar jogadores livres a qualquer momento.

Requisitos:
- Janelas de transferência configuráveis (padrão: início da temporada e meio do ano).
- Transferências afetam as finanças (008): valores e salários.
- As mesmas regras valem para todos os clubes; nesta feature a IA apenas responde a ofertas e faz propostas básicas.
- Limite máximo e mínimo de elenco.

Fora de escopo: IA de transferências entre clubes da IA (vem na 011), agentes, cláusulas complexas, opção de compra em empréstimos.

Critérios de aceite:
- Fora da janela não é possível comprar de outro clube (exceto livres).
- Uma negociação tem no máximo uma contraproposta de cada lado.
- Jogador com contrato expirado vira livre na virada de temporada.
```
