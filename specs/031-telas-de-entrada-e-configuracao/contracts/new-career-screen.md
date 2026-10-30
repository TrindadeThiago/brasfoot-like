# Contrato de interface: Nova carreira

Rota `/nova-carreira/`.

- **Campos** (todos com rótulo, dica e erro pelo `Field`):
  - Nome do técnico (limite `MANAGER_NAME_MAX` na dica e no erro).
  - Sem demissão (caixa de marcação) com a explicação e o aviso de que não muda depois.
  - Opções avançadas recolhidas (`details`) com a seed (texto livre, sem erro próprio); abre sozinha se um erro de criação for ligado a ela.
  - Banco de dados (mundo padrão e mods) com a descrição do mundo e o link para Mods.
  - País (só em mundos de vários países), divisão e busca por nome ou cidade, com a contagem de clubes (`role="status"`), sempre visível.
- **Tabela de clubes**: escudo, clube, país (se vários), cidade, reputação, força média, estádio e divisão; ordenável (reputação decrescente de início); a escolha é por clique na linha ou por Enter e Espaço na linha focada (teclado); a linha escolhida leva o selo "Escolhido" em texto e `aria-selected`. Sem clube que passe os filtros: `EmptyState` com "Limpar filtros".
- **Rodapé fixo**: clube escolhido (escudo e nome, ou "Nenhum clube escolhido") e o botão Começar carreira; durante a criação o botão mostra "criando carreira", fica `aria-busy` e não aceita novo clique.
- **Erros**:
  - Nome vazio ou longo demais e nenhum clube escolhido aparecem ligados ao próprio campo (`aria-invalid`, `aria-describedby`, `role="alert"`) e o foco vai ao primeiro campo com erro (o clube erra na tabela).
  - Erros de criação do banco ou do armazenamento aparecem num `Notice` de erro acima do botão.
  - Nada é criado quando há erro.
- **Desempenho**: criar com 440 clubes em menos de 0,5 s; filtrar abaixo de 200 ms; o mundo padrão continua gerado no navegador.
- **Layout**: o rodapé fixo nunca cobre o último campo nem a última linha da tabela (espaço reservado); sem rolagem horizontal em 1 440, 1 280 e 1 024 px; a 768 px o rodapé empilha.
