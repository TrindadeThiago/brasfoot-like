# Feature Specification: Finanças do clube

**Feature Branch**: `008-financas-clube`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Finanças dos clubes no nível do Brasfoot (ver docs/design.md §8) — prompt `docs/speckit-prompts/marco3/prompt008.md`."

## Contexto

Segunda feature do Marco 3 ("jogo 5 temporadas e o mundo continua saudável"). Desde a 007 a
carreira é contínua, com Série A e Série B, acesso, rebaixamento e uma virada de temporada com
pontos de extensão. Mas o dinheiro ainda não existe no jogo: cada clube tem só um caixa inicial
no banco de dados, os jogadores têm um salário derivado da força que ninguém paga e o estádio tem
uma capacidade que não gera receita. Esta feature dá vida ao dinheiro: receitas (bilheteria,
patrocínio, premiação), despesas (folha, juros, obras), empréstimo bancário e as duas primeiras
alavancas do técnico — preço do ingresso e expansão do estádio —, com as mesmas regras para todos
os clubes, inclusive os do computador.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O dinheiro entra e sai a cada rodada (Priority: P1)

A cada rodada, todos os clubes das duas divisões têm o caixa movimentado: quem joga em casa recebe
a bilheteria do jogo; todos pagam a parte da folha salarial do período; quem tem empréstimo paga
os juros; obras em andamento consomem o orçamento previsto. O jogador vê o saldo do seu clube mudar
depois de cada rodada.

**Why this priority**: é a base de todo o resto; sem movimentação por rodada não há dilema
financeiro nem economia para balancear.

**Independent Test**: jogar uma rodada e conferir, para um clube mandante e um visitante, que a
diferença de caixa é exatamente bilheteria (só o mandante) menos a folha do período, e que os
números batem com o detalhamento mostrado.

**Acceptance Scenarios**:

1. **Given** uma carreira antes de uma rodada, **When** a rodada é jogada (ao vivo ou direto),
   **Then** cada clube mandante recebe a bilheteria do seu jogo e todos os clubes pagam a folha do
   período, e o novo saldo é salvo junto com a rodada.
2. **Given** um jogo em casa, **When** ele termina, **Then** o jogo registra o público, o preço do
   ingresso e a renda, e o público nunca passa da capacidade do estádio.
3. **Given** a mesma carreira e as mesmas decisões, **When** a rodada é jogada ao vivo ou direto,
   **Then** públicos, rendas e saldos são idênticos.
4. **Given** um clube que folga na rodada, **When** a rodada é jogada, **Then** ele paga a folha do
   período e não recebe bilheteria.

---

### User Story 2 - Preço do ingresso: lotar ou faturar (Priority: P1)

O jogador define o preço do ingresso dos jogos em casa. Ingresso caro reduz o público; ingresso
barato enche o estádio, mas rende menos por torcedor. O público também depende da capacidade do
estádio, da fase do time, do adversário e da divisão.

**Why this priority**: é a alavanca financeira mais imediata e um dos critérios de aceite.

**Independent Test**: para o mesmo jogo (mesma carreira, mesmo adversário, mesma fase), comparar
três preços e conferir que o público cai com o preço e que a renda por torcedor sobe com ele.

**Acceptance Scenarios**:

1. **Given** a tela de finanças, **When** o jogador muda o preço do ingresso, **Then** o novo preço
   vale a partir do próximo jogo em casa e fica salvo.
2. **Given** o mesmo jogo em casa, **When** o preço é mais alto, **Then** o público esperado é menor
   ou igual; **When** o preço é mais baixo, **Then** o público esperado é maior ou igual e a renda por
   torcedor é menor.
3. **Given** dois jogos com o mesmo preço, **When** um é contra um adversário de reputação alta e o
   outro contra um de reputação baixa, **Then** o primeiro tem público esperado maior.
4. **Given** o time em boa fase (vitórias recentes), **When** joga em casa, **Then** o público esperado
   é maior do que com o time em má fase, com o resto igual.
5. **Given** o mesmo clube, **When** joga na Série A ou na Série B, **Then** o público esperado é maior
   na Série A, com o resto igual.
6. **Given** a tela de finanças, **When** o jogador escolhe um preço, **Then** vê uma estimativa do
   público e da renda do próximo jogo em casa antes de confirmar.
7. **Given** um preço fora da faixa permitida, **When** o jogador tenta usá-lo, **Then** o jogo
   recusa e mostra a faixa válida.

---

### User Story 3 - Receitas e despesas da temporada (Priority: P1)

Além da bilheteria e da folha, o clube recebe o patrocínio anual no início de cada temporada (maior
para clubes de reputação alta e para a Série A) e a premiação no fim da temporada, conforme a
colocação e os títulos. Tudo passa pela virada de temporada.

**Why this priority**: patrocínio e premiação equilibram o ano e diferenciam clubes grandes e
pequenos; sem eles a economia não fecha.

**Independent Test**: simular uma temporada inteira e conferir que cada clube recebeu um patrocínio
no início e uma premiação no fim, nos valores da tabela da sua divisão e reputação, e que o
campeão recebeu o prêmio de título.

**Acceptance Scenarios**:

1. **Given** o início de uma temporada (carreira nova ou depois da virada), **When** ela começa,
   **Then** cada clube recebe o patrocínio anual, calculado pela reputação e pela divisão em que vai
   jogar.
2. **Given** o fim de uma temporada, **When** acontece a virada, **Then** cada clube recebe a
   premiação pela posição final na sua divisão, e os campeões recebem também o prêmio de título.
3. **Given** um clube promovido, **When** a nova temporada começa, **Then** o patrocínio dele já é
   calculado pelas regras da Série A; um rebaixado, pelas da Série B.
4. **Given** a virada, **When** ela termina, **Then** o resumo financeiro da temporada encerrada de
   cada clube (receitas e despesas por categoria, saldo inicial e final) fica guardado no histórico.

---

### User Story 4 - Tela de finanças (Priority: P2)

O jogador abre a tela de finanças e vê o saldo, as receitas e despesas da temporada por categoria,
os últimos jogos em casa (público, preço, renda), a folha salarial, o empréstimo e o histórico das
temporadas anteriores.

**Why this priority**: torna o dinheiro visível e decidível; sem ela as alavancas ficam às cegas.

**Independent Test**: depois de algumas rodadas, conferir que os totais por categoria somados ao
saldo inicial dão o saldo atual, e que o histórico mostra uma linha por temporada encerrada.

**Acceptance Scenarios**:

1. **Given** uma carreira em andamento, **When** o jogador abre Finanças, **Then** vê o saldo atual,
   receitas (bilheteria, patrocínio, premiação, empréstimos recebidos) e despesas (salários, juros,
   amortização, obras) da temporada, com totais.
2. **Given** jogos em casa disputados, **When** o jogador abre Finanças, **Then** vê, para cada um,
   o adversário, o público, a ocupação do estádio, o preço e a renda.
3. **Given** temporadas encerradas, **When** o jogador abre o histórico financeiro, **Then** vê, por
   temporada, saldo inicial, receitas, despesas e saldo final.
4. **Given** qualquer tela de finanças, **When** um valor é mostrado, **Then** ele usa a moeda e o
   formato numérico do idioma (pt-BR).

---

### User Story 5 - Empréstimo bancário (Priority: P2)

O jogador pode tomar um empréstimo até um limite, pagando juros por rodada sobre o saldo devedor,
e pode amortizar ou quitar quando quiser. O limite depende do tamanho do clube.

**Why this priority**: é a válvula para atravessar um aperto; cria o dilema de endividar-se agora
e pagar depois.

**Independent Test**: tomar um empréstimo, jogar rodadas e conferir os juros cobrados; amortizar
parte e quitar o resto; tentar passar do limite e ser recusado.

**Acceptance Scenarios**:

1. **Given** uma dívida abaixo do limite, **When** o jogador toma um empréstimo de um valor permitido,
   **Then** o valor entra no caixa e a dívida aumenta na mesma quantia.
2. **Given** uma dívida, **When** uma rodada é jogada, **Then** o clube paga os juros do período sobre
   a dívida.
3. **Given** uma dívida e caixa suficiente, **When** o jogador amortiza um valor, **Then** o caixa e a
   dívida diminuem na mesma quantia; quitar zera a dívida.
4. **Given** um pedido que faria a dívida passar do limite, **When** o jogador confirma, **Then** o
   pedido é recusado com o limite disponível.
5. **Given** a tela do empréstimo, **When** o jogador simula um valor, **Then** vê o limite disponível,
   a taxa de juros e o custo por rodada antes de confirmar.

---

### User Story 6 - Expansão do estádio (Priority: P2)

O jogador manda ampliar o estádio: escolhe um dos tamanhos de obra, vê o custo e o tempo, e paga.
A obra leva um número de rodadas para terminar; ao terminar, a capacidade aumenta.

**Why this priority**: é o investimento de longo prazo (gastar agora para faturar depois) previsto
como alavanca no design.

**Independent Test**: contratar uma obra, conferir o débito, jogar as rodadas da obra e conferir que
a capacidade só aumenta quando ela termina e que os jogos seguintes usam a nova capacidade.

**Acceptance Scenarios**:

1. **Given** nenhuma obra em andamento e caixa suficiente, **When** o jogador contrata uma ampliação,
   **Then** o custo é cobrado conforme as regras de pagamento da obra e a obra aparece com a data
   prevista de conclusão (em rodadas).
2. **Given** uma obra em andamento, **When** as rodadas previstas passam, **Then** a capacidade do
   estádio aumenta no valor contratado e os jogos em casa seguintes usam a nova capacidade.
3. **Given** uma obra em andamento, **When** o jogador tenta contratar outra, **Then** o jogo recusa.
4. **Given** caixa insuficiente, **When** o jogador tenta contratar, **Then** o jogo recusa e mostra
   quanto falta.
5. **Given** o estádio no tamanho máximo permitido, **When** o jogador abre a expansão, **Then** não há
   obra disponível.
6. **Given** uma obra que atravessa a virada de temporada, **When** a temporada muda, **Then** a obra
   continua de onde parou.

---

### User Story 7 - Clubes do computador com as mesmas regras (Priority: P1)

Os clubes do computador recebem e pagam pelas mesmas regras e também decidem, por regras simples,
o preço do ingresso e quando ampliar o estádio.

**Why this priority**: é o princípio da economia fechada do design e condição do critério de
aceite de 30 temporadas.

**Independent Test**: simular temporadas sem interação e conferir que clubes do computador mudam o
preço do ingresso (quando o estádio vive lotado ou vazio) e contratam ampliações quando têm caixa
folgado e ocupação alta.

**Acceptance Scenarios**:

1. **Given** um clube do computador cujo estádio lotou em quase todos os jogos recentes, **When** ele
   revisa o preço, **Then** aumenta o ingresso; com ocupação baixa, diminui.
2. **Given** um clube do computador com caixa bem acima da sua necessidade e ocupação alta, **When**
   ele revisa investimentos, **Then** contrata uma ampliação que cabe no caixa.
3. **Given** um clube do computador com caixa negativo, **When** ele revisa, **Then** não contrata
   obras e pode tomar empréstimo dentro do limite para cobrir o rombo.
4. **Given** a mesma carreira, **When** a simulação é repetida, **Then** as decisões dos clubes do
   computador são idênticas.

---

### User Story 8 - Crise financeira registrada (Priority: P3)

Quando o caixa de um clube fica negativo por tempo prolongado, o clube entra em "crise financeira",
um estado registrado e visível. A punição pela diretoria virá na feature 012; aqui o estado só é
registrado, mostrado e encerrado quando o caixa volta ao positivo.

**Why this priority**: prepara a diretoria sem implementar punição; baixo risco e baixo custo.

**Independent Test**: forçar caixa negativo por mais rodadas que o limite e conferir que o clube
entra em crise, que isso aparece na tela de finanças e que sai da crise quando o caixa volta a ser
positivo.

**Acceptance Scenarios**:

1. **Given** um clube com caixa negativo, **When** completa o número de rodadas seguidas definido nas
   regras, **Then** entra em crise financeira, com a rodada de início registrada.
2. **Given** um clube em crise, **When** o caixa volta a ser positivo ao fim de uma rodada, **Then** a
   crise termina e fica registrada no histórico (início e fim).
3. **Given** o clube do jogador em crise, **When** ele abre Finanças ou a tela inicial, **Then** vê o
   aviso de crise com há quantas rodadas está negativo.

---

### Edge Cases

- **Caixa negativo**: permitido (folha e juros continuam sendo pagos); conta rodadas para a crise.
  Ninguém deixa de pagar salário nesta feature.
- **Jogo abandonado**: a bilheteria é a do jogo (público já entrou); a renda vale normalmente.
- **Público fracionário**: o público é sempre um número inteiro de torcedores; a renda é público ×
  preço, sem arredondamentos que criem ou destruam dinheiro.
- **Preço no limite da faixa**: preço mínimo e máximo são válidos; fora da faixa é recusado.
- **Obra que termina na última rodada**: a capacidade nova vale a partir do próximo jogo em casa,
  mesmo que seja na temporada seguinte.
- **Rebaixamento com folha alta**: o patrocínio cai, mas a folha não muda (não há mercado ainda);
  a crise pode chegar e é só registrada.
- **Empréstimo e virada**: a dívida e os juros atravessam a temporada sem mudança.
- **Save antigo** (antes desta feature): abre com o caixa inicial do banco, preço padrão do ingresso,
  sem dívida, sem obra e sem histórico financeiro; se estiver no meio da temporada, as rodadas já
  disputadas não geram receita retroativa.
- **Divisões com número diferente de rodadas**: o período da folha é por rodada da divisão do clube;
  uma divisão que já terminou não paga mais folha até a virada (o total anual é o mesmo para todos).
- **Mod sem regras econômicas**: valores padrão documentados são usados.

## Requirements *(mandatory)*

### Functional Requirements

**Caixa e período**

- **FR-001**: Todo clube da competição DEVE ter um caixa, iniciado no valor do banco do mod (caixa
  inicial) ao criar a carreira.
- **FR-002**: Toda movimentação de dinheiro DEVE ser registrada como lançamento com categoria,
  valor, temporada e rodada; o caixa é sempre o saldo inicial mais a soma dos lançamentos.
- **FR-003**: A movimentação da rodada DEVE acontecer para todos os clubes ao fechar a rodada, ao
  vivo ou direto, com o mesmo resultado, e ser salva junto com a rodada.

**Folha salarial**

- **FR-004**: A folha salarial de um clube DEVE ser a soma dos salários dos seus jogadores.
- **FR-005**: A folha DEVE ser paga por rodada disputada pela divisão do clube, de forma que o total
  pago numa temporada seja igual a 12 salários mensais de cada jogador.

**Bilheteria**

- **FR-006**: Cada jogo em casa DEVE gerar um público, limitado pela capacidade do estádio, que
  depende de: capacidade, preço do ingresso, fase recente do time (resultados), reputação do
  adversário, reputação do mandante e divisão.
- **FR-007**: O público DEVE diminuir (ou não aumentar) quando o preço sobe e aumentar (ou não
  diminuir) quando o preço cai, com todo o resto igual.
- **FR-008**: A renda do jogo DEVE ser público × preço e ir integralmente para o mandante.
- **FR-009**: O público DEVE ter uma pequena variação aleatória por jogo, derivada da seed da
  carreira, de forma reproduzível.
- **FR-010**: Cada jogo em casa DEVE registrar público, capacidade, preço e renda.

**Patrocínio e premiação**

- **FR-011**: Cada clube DEVE receber, no início de cada temporada, um patrocínio anual formado
  por uma parte fixa da divisão, uma parte pela reputação e uma parte proporcional à folha salarial
  do elenco (o patrocinador paga mais por um elenco mais caro), com valores por divisão. *(Revisado
  na implementação: sem elenco que reaja ao caixa até o mercado da 010, a parte ligada à folha é o
  que impede a deriva de caixa de cada clube em 30 temporadas — decisão registrada em
  research.md R10.)*
- **FR-012**: Na virada de temporada, cada clube DEVE receber a premiação pela posição final na sua
  divisão; o campeão de cada divisão recebe um prêmio de título adicional; os valores são maiores na
  divisão superior.

**Empréstimo**

- **FR-013**: Cada clube DEVE poder ter uma dívida bancária até um limite que depende do tamanho do
  clube (reputação e divisão).
- **FR-014**: A dívida DEVE gerar juros por rodada, cobrados do caixa, a uma taxa definida nas regras.
- **FR-015**: O jogador DEVE poder tomar empréstimo (até o limite disponível) e amortizar ou quitar
  (até o caixa disponível) entre rodadas; pedidos inválidos são recusados com o motivo.

**Alavancas**

- **FR-016**: O jogador DEVE poder definir o preço do ingresso dentro de uma faixa permitida, valendo
  a partir do próximo jogo em casa; o preço padrão de um clube novo depende da divisão e reputação.
- **FR-017**: O jogador DEVE ver, antes de confirmar um preço, a estimativa de público e renda do
  próximo jogo em casa (sem a variação aleatória).
- **FR-018**: O jogador DEVE poder contratar uma ampliação do estádio entre opções de tamanho, cada
  uma com custo e duração em rodadas; só uma obra por vez; capacidade máxima definida nas regras.
- **FR-019**: A capacidade nova DEVE valer só depois que a obra termina; a obra atravessa a virada.

**Clubes do computador**

- **FR-020**: Clubes do computador DEVEM seguir exatamente as mesmas regras de receita, despesa,
  empréstimo e obras do clube do jogador.
- **FR-021**: Clubes do computador DEVEM revisar o preço do ingresso e decidir ampliações e
  empréstimos por regras simples e determinísticas baseadas em ocupação recente, caixa e folha.

**Crise financeira**

- **FR-022**: Um clube com caixa negativo ao fim de um número de rodadas seguidas definido nas regras
  DEVE entrar em "crise financeira"; a crise termina quando o caixa fecha uma rodada positivo.
  Início e fim ficam registrados. Esta feature não aplica punição.

**Regras como dados**

- **FR-023**: Os parâmetros econômicos (faixa e padrão de preço, sensibilidade do público, tabelas
  de patrocínio e premiação por divisão, taxa de juros e limite de crédito, opções de obra, rodadas
  para crise) DEVEM ser dados do mod, com valores padrão no banco padrão, validados como o resto do
  banco.

**Telas e histórico**

- **FR-024**: Uma tela de finanças DEVE mostrar saldo, receitas e despesas da temporada por
  categoria, últimos jogos em casa, folha, dívida, obra em andamento, crise e o histórico por
  temporada; e conter os controles de preço, empréstimo e ampliação.
- **FR-025**: Na virada, o resumo financeiro da temporada encerrada de cada clube DEVE ir para o
  histórico; os lançamentos detalhados da temporada encerrada podem ser descartados.
- **FR-026**: O save DEVE ganhar uma nova versão com migração da anterior: saves antigos abrem com
  as finanças iniciais descritas no caso "Save antigo" dos Edge Cases.
- **FR-027**: Todo texto e valor monetário visível DEVE vir do sistema de idiomas, com formato de
  moeda pt-BR.
- **FR-028**: Os controles de finanças DEVEM ser operáveis por teclado e mouse.

### Key Entities *(include if feature involves data)*

- **Finanças do clube**: caixa, dívida, preço do ingresso, obra em andamento, contador de rodadas
  negativas e estado de crise; uma por clube da competição.
- **Lançamento**: movimentação com categoria (bilheteria, patrocínio, premiação, empréstimo
  recebido, salários, juros, amortização, obras), valor, temporada e rodada.
- **Bilheteria de um jogo**: público, capacidade, preço e renda do jogo em casa.
- **Obra do estádio**: aumento de capacidade, custo, rodada de início e de conclusão.
- **Resumo financeiro da temporada**: saldo inicial e final e totais por categoria de um clube numa
  temporada; vai para o histórico na virada.
- **Regras econômicas**: parâmetros do mod (preços, sensibilidade do público, patrocínio,
  premiação, crédito, obras, crise).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 30 temporadas simuladas sem interação, nenhum clube termina uma temporada com caixa
  acima de um múltiplo da mediana dos caixas definido no plano (limite declarado no teste).
- **SC-002**: Em 30 temporadas simuladas sem interação, a maioria dos clubes não quebra: ao fim de
  cada temporada, ao menos 80% dos clubes não estão em crise financeira (limite revisável no plano).
- **SC-003**: Em 30 temporadas simuladas sem interação, os clubes de maior reputação inicial
  continuam financeiramente mais fortes: a correlação entre reputação inicial e caixa médio
  permanece positiva e acima de um mínimo definido no plano.
- **SC-004**: Para um mesmo jogo, aumentar o preço do ingresso em um passo reduz o público esperado
  de forma mensurável (redução mínima definida no plano) e diminuir o preço aumenta o público e
  reduz a renda por torcedor — verificado por teste automatizado.
- **SC-005**: Em 100% das rodadas testadas, o dinheiro é conservado: a soma das variações de caixa de
  todos os clubes é igual à soma dos lançamentos daquela rodada, sem centavos criados ou perdidos.
- **SC-006**: Ao vivo e direto produzem públicos, rendas e saldos idênticos em 100% dos testes.
- **SC-007**: O jogador encontra o saldo atual e ajusta o preço do ingresso em menos de 30 segundos
  a partir da tela inicial.
- **SC-008**: Saves das versões anteriores abrem com finanças iniciais válidas em 100% dos fixtures.
- **SC-009**: Nenhum texto ou valor monetário visível fica fora do sistema de idiomas.

## Assumptions

- A moeda é fictícia e sem nome próprio (exibida com símbolo genérico do idioma); valores inteiros,
  sem centavos.
- Os salários são os derivados da força e da reputação já existentes (sem contratos nem
  negociação; contratos e mercado vêm na 010). A regra de salário pode ser recalibrada nesta
  feature para fechar o balanço.
- O elenco não muda (sem mercado); a folha só muda com evolução/aposentadoria em features futuras.
- O calendário não tem datas reais: o "período" da folha é a rodada; uma temporada equivale a 12
  meses de salário.
- O patrocínio é recebido de uma vez no início da temporada; não há metas de patrocinador.
- A premiação é paga na virada, antes de a nova temporada começar; acesso e rebaixamento não têm
  bônus próprio além da diferença de patrocínio e premiação entre divisões.
- O jogador ajusta preço, empréstimo e obras só entre rodadas (nunca durante a rodada ao vivo).
- Clubes do computador revisam preço e investimentos em momentos fixos (por exemplo, a cada algumas
  rodadas e na virada), definidos no plano.
- O empréstimo é uma linha de crédito única por clube (sem prazo fixo nem parcelas obrigatórias);
  a amortização é voluntária.
- Saldo negativo prolongado só é registrado; demissão e punições ficam para a feature 012.
- Fora de escopo: direitos de TV detalhados, sócio-torcedor, merchandising, compra e venda de
  jogadores.
