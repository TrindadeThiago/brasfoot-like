# Feature Specification: Evolução, aposentadoria e renovação do mundo

**Feature Branch**: `009-evolucao-renovacao`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Evolução dos jogadores e renovação do mundo ao longo das décadas (ver docs/design.md §4 e §5) — prompt `docs/speckit-prompts/marco3/prompt009.md`."

## Contexto

Terceira feature do Marco 3 ("jogo 5 temporadas e o mundo continua saudável"). Desde a 007 a
carreira atravessa temporadas, e desde a 008 o dinheiro circula. Mas os jogadores estão
congelados: a força é a do banco inicial, só a idade avança, ninguém se aposenta e nenhum jovem
surge. Em poucas temporadas o mundo envelheceria sem renovação. Esta feature faz os jogadores
evoluírem pela idade e pela minutagem rumo ao potencial oculto, aposenta os veteranos, gera jovens
todo ano e mantém, por um regulador, a distribuição de forças do mundo estável ao longo de 30
temporadas, com elencos sempre válidos mesmo antes de existir mercado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jogadores evoluem com a idade e a minutagem (Priority: P1)

Em momentos definidos da temporada (no meio e no fim), a força de cada jogador muda: jovens
crescem rumo ao potencial, quem está no auge fica estável e veteranos declinam. Jovens que jogam
muito crescem mais do que os que ficam no banco. O jogador vê a evolução do próprio elenco.

**Why this priority**: é o coração da feature e do design (§4); sem evolução não há revelações nem
declínio, e a carreira longa perde sentido.

**Independent Test**: simular uma temporada e conferir, no elenco, que jovens com potencial maior
que a força subiram, que jogadores de ~28 anos ficaram estáveis e que os de 32+ caíram, e que a
força nunca passa do potencial nem sai da faixa válida.

**Acceptance Scenarios**:

1. **Given** um jogador de 19 anos com potencial bem acima da força, **When** chega um momento de
   evolução, **Then** a força dele aumenta (sem passar do potencial).
2. **Given** um jogador entre ~27 e ~30 anos, **When** chega um momento de evolução, **Then** a força
   varia pouco (estável, com pequena variação).
3. **Given** um jogador de 33 anos, **When** chega um momento de evolução, **Then** a força tende a
   cair.
4. **Given** dois jovens iguais em idade, força e potencial, **When** um joga quase todas as partidas
   e o outro quase nenhuma, **Then** o que jogou evolui mais.
5. **Given** a mesma carreira, **When** a evolução é calculada de novo, **Then** o resultado é idêntico.
6. **Given** a tela do elenco depois de um momento de evolução, **When** o jogador a abre, **Then** vê
   a força atual de cada jogador e a variação desde a última evolução.

---

### User Story 2 - Veteranos se aposentam (Priority: P1)

Na virada de temporada, jogadores a partir de ~33 anos têm chance crescente de se aposentar e saem
do jogo. O jogador fica sabendo quem do seu elenco se aposentou.

**Why this priority**: sem aposentadoria o mundo só envelhece; é metade da renovação.

**Independent Test**: simular várias temporadas e conferir que ninguém abaixo da idade mínima se
aposenta, que a chance cresce com a idade, e que aposentados somem dos elencos e do jogo.

**Acceptance Scenarios**:

1. **Given** um jogador abaixo da idade mínima de aposentadoria, **When** a temporada vira, **Then** ele
   não se aposenta.
2. **Given** jogadores de 34 e de 38 anos, **When** muitas viradas são simuladas, **Then** os mais velhos
   se aposentam com mais frequência.
3. **Given** um jogador aposentado, **When** a nova temporada começa, **Then** ele não aparece em nenhum
   elenco, escalação ou lista do jogo (só no histórico de quem já jogou, se houver).
4. **Given** o clube do jogador, **When** jogadores dele se aposentam, **Then** o jogador vê a lista de
   aposentados ao entrar na nova temporada e a escalação é ajustada.

---

### User Story 3 - Jovens surgem todo ano (Priority: P1)

Na virada de temporada, cada clube recebe jovens novos, em quantidade e qualidade influenciadas pela
reputação do clube, com nomes do banco de nomes do país e potencial oculto. O jogador vê os jovens
que chegaram ao seu clube.

**Why this priority**: é a outra metade da renovação e a fonte de revelações e futuros craques.

**Independent Test**: simular uma virada e conferir que todo clube recebeu jovens com idade de base,
nomes do país, potencial acima da força e que clubes de reputação maior recebem, em média, jovens
melhores.

**Acceptance Scenarios**:

1. **Given** a virada de temporada, **When** ela acontece, **Then** cada clube recebe jovens novos (16–18
   anos) com nome, posição, força, potencial e características.
2. **Given** dois clubes de reputações muito diferentes, **When** muitas viradas são simuladas, **Then**
   o de maior reputação recebe, em média, jovens de força e potencial maiores.
3. **Given** um país com banco de nomes próprio, **When** jovens são gerados para clubes dele, **Then**
   os nomes vêm desse banco.
4. **Given** o clube do jogador, **When** jovens chegam, **Then** ele vê quem chegou ao entrar na nova
   temporada.

---

### User Story 4 - Elencos sempre válidos (Priority: P1)

Depois de aposentadorias e jovens, todo clube termina a virada com um elenco dentro do tamanho
mínimo e máximo e com cobertura mínima por posição (por exemplo, goleiros suficientes). Quem tem
gente demais dispensa os menos úteis; quem tem de menos promove jovens extras.

**Why this priority**: elenco inválido quebra partidas e escalações; antes do mercado (010) só a
renovação mantém os elencos.

**Independent Test**: simular 30 temporadas e conferir, em todas, que todo clube tem elenco no tamanho
e na cobertura de posições exigidos.

**Acceptance Scenarios**:

1. **Given** um clube que ficou abaixo do mínimo em uma posição, **When** a virada termina, **Then** ele
   recebe jovens extras naquela posição até atingir o mínimo.
2. **Given** um clube acima do tamanho máximo, **When** a virada termina, **Then** ele dispensa os
   jogadores de menor utilidade (critério definido nas regras) até o máximo, e os dispensados saem do
   jogo.
3. **Given** o clube do jogador, **When** reposição ou dispensa acontece, **Then** o jogador vê o que
   mudou no elenco e a escalação é ajustada.

---

### User Story 5 - Regulador global mantém o mundo estável (Priority: P1)

Ao fim de cada temporada, o jogo compara a distribuição de forças do mundo com uma distribuição-alvo
e ajusta a geração de novos jogadores (mais ou menos talento) para que o nível geral não suba nem
caia sem controle, mantendo poucos craques e muitos medianos.

**Why this priority**: sem regulação, pequenas tendências da evolução e da geração se acumulam por
décadas; é condição do critério de aceite de 30 temporadas.

**Independent Test**: simular 30 temporadas sem interação e conferir que média e percentis de força
ficam nas faixas e que sempre há ao menos um craque.

**Acceptance Scenarios**:

1. **Given** um mundo com força média acima do alvo, **When** a temporada termina, **Then** a geração
   seguinte de jovens é ajustada para baixo.
2. **Given** um mundo sem craques, **When** a temporada termina, **Then** a geração seguinte aumenta a
   chance de surgirem jovens de potencial alto.
3. **Given** a mesma carreira, **When** a virada é repetida, **Then** o ajuste do regulador é idêntico.

---

### User Story 6 - Ver a renovação acontecer (Priority: P3)

O jogador acompanha, ao entrar na nova temporada, um resumo do seu elenco: quem se aposentou, quem
chegou, quem foi dispensado ou promovido, e as maiores evoluções e quedas.

**Why this priority**: dá visibilidade e história à renovação; o jogo funciona sem ele, mas o jogador
não perceberia o que mudou.

**Independent Test**: depois de uma virada, abrir o resumo e conferir que ele bate com as mudanças do
elenco.

**Acceptance Scenarios**:

1. **Given** uma virada concluída, **When** o jogador entra na nova temporada, **Then** vê o resumo de
   mudanças do elenco (aposentados, chegadas, dispensas, promoções, maiores altas e quedas).
2. **Given** o resumo, **When** o jogador o dispensa, **Then** ele não volta a aparecer até a próxima
   virada.

---

### Edge Cases

- **Força nos limites**: a força fica sempre entre o mínimo e o máximo válidos e nunca passa do
  potencial; o potencial não muda com a evolução.
- **Jogador lesionado ou suspenso**: evolui normalmente; a minutagem considera só o que jogou.
- **Jogador que mudou de clube** (no futuro, mercado): a minutagem considera todas as partidas que ele
  jogou na temporada.
- **Clube rebaixado ou promovido**: as regras de evolução e geração não dependem da divisão, só da
  reputação; a geração de jovens pode considerar a divisão se as regras pedirem.
- **Aposentado escalado**: a escalação do clube do jogador é ajustada automaticamente, com aviso.
- **Clube sem jogadores suficientes numa posição depois de aposentadorias em massa**: a reposição por
  jovens garante o mínimo antes da primeira rodada.
- **Save antigo** (antes desta feature): abre com os jogadores atuais como estão, sem histórico de
  evolução; a primeira evolução acontece no próximo momento previsto.
- **Finanças**: salários derivam da força, então a folha muda com a evolução, a aposentadoria e os
  jovens; a economia da 008 precisa continuar saudável com isso.
- **Nomes repetidos**: jovens podem ter nomes iguais a jogadores existentes (como na vida real), mas
  cada jogador tem identificador único e nunca reaproveitado.
- **Mod sem banco de nomes para um país**: usa o banco de nomes padrão.

## Requirements *(mandatory)*

### Functional Requirements

**Evolução**

- **FR-001**: Em momentos definidos da temporada (ao menos no meio e no fim), cada jogador DEVE ter a
  força recalculada por uma curva de idade: crescimento rumo ao potencial até ~27 anos, estabilidade
  até ~30 e declínio depois.
- **FR-002**: O crescimento de jogadores jovens DEVE aumentar com a minutagem em partidas oficiais no
  período desde a última evolução.
- **FR-003**: A evolução DEVE ter uma variação aleatória controlada, reproduzível pela seed da carreira.
- **FR-004**: A força DEVE ficar sempre dentro da faixa válida e nunca passar do potencial; o potencial
  não muda.
- **FR-005**: O jogo DEVE registrar a variação de força de cada jogador na última evolução, para
  exibição.

**Aposentadoria**

- **FR-006**: Na virada de temporada, jogadores a partir de uma idade mínima (~33) DEVEM ter uma chance
  de aposentadoria que cresce com a idade; abaixo dela, a chance é zero; acima de uma idade máxima, a
  aposentadoria é certa.
- **FR-007**: Jogadores aposentados DEVEM sair de todos os elencos e não voltar a jogar.

**Jovens**

- **FR-008**: Na virada de temporada, cada clube DEVE receber jovens novos, com quantidade e qualidade
  (força e potencial) que crescem com a reputação do clube.
- **FR-009**: Os jovens DEVEM ter nome do banco de nomes do país do clube, idade de base, posição,
  força, potencial oculto acima da força, temperamento, propensão a lesões e até duas características,
  no mesmo formato dos jogadores do banco.
- **FR-010**: Bancos de nomes por país DEVEM ser dados (o mod pode fornecer o seu); sem banco próprio,
  vale o banco padrão.

**Elencos**

- **FR-011**: Ao fim da virada, todo clube DEVE ter elenco entre o tamanho mínimo e máximo e com a
  cobertura mínima por posição definidos nas regras.
- **FR-012**: Clubes abaixo do mínimo (total ou por posição) DEVEM receber jovens extras até atingi-lo;
  clubes acima do máximo DEVEM dispensar os jogadores de menor utilidade (critério das regras) até o
  máximo; dispensados saem do jogo.
- **FR-013**: As mesmas regras de elenco DEVEM valer para o clube do jogador, que é avisado das
  mudanças; a escalação dele é ajustada automaticamente quando necessário.

**Regulador**

- **FR-014**: Ao fim de cada temporada, o jogo DEVE medir a distribuição de forças do mundo (média,
  percentis e número de craques) e ajustar os parâmetros de geração da próxima leva de jovens em
  direção à distribuição-alvo, de forma determinística.
- **FR-015**: A distribuição-alvo e os limites do regulador DEVEM ser regras declaradas (dados ou
  configuração versionada), não números espalhados.

**Integração**

- **FR-016**: Evolução do fim da temporada, aposentadoria, jovens, ajuste de elencos e regulador DEVEM
  acontecer na virada de temporada em ordem definida, usando os pontos de extensão da virada.
- **FR-017**: A evolução do meio da temporada DEVE acontecer num ponto fixo da temporada, igual ao vivo
  e direto.
- **FR-018**: Todos os efeitos DEVEM ser determinísticos pela seed da carreira e iguais após salvar e
  carregar.
- **FR-019**: O save DEVE ganhar uma nova versão com migração da anterior (caso "Save antigo").

**Visibilidade**

- **FR-020**: A tela do elenco DEVE mostrar a força atual e a variação desde a última evolução.
- **FR-021**: Ao entrar na nova temporada, o jogador DEVE ver um resumo das mudanças do seu elenco
  (aposentados, chegadas, dispensas, promoções, maiores altas e quedas), dispensável.
- **FR-022**: Todo texto visível DEVE vir do sistema de idiomas (pt-BR).

### Key Entities *(include if feature involves data)*

- **Jogador do mundo**: os jogadores da carreira, que agora mudam (força, clube, aposentado) e
  incluem os gerados; cada um com identificador único e permanente.
- **Registro de evolução**: variação de força de cada jogador na última evolução e a minutagem que a
  influenciou.
- **Regras de evolução e renovação**: curva de idade, efeito da minutagem, variação, idades de
  aposentadoria, geração de jovens por reputação, tamanho e cobertura de elenco, critério de dispensa.
- **Estado do regulador**: distribuição medida e o ajuste aplicado à próxima geração.
- **Banco de nomes**: nomes e sobrenomes por país, dados do mod ou padrão.
- **Resumo de mudanças do elenco**: aposentados, chegadas, dispensas, promoções e maiores variações
  do clube do jogador na última virada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 30 temporadas simuladas sem interação, a força média e os percentis p10, p50, p90 e o
  máximo da força do mundo ficam, em todas as temporadas, dentro de faixas definidas no plano
  (declaradas no teste).
- **SC-002**: Em 30 temporadas simuladas sem interação, todo clube tem elenco válido (tamanho e
  cobertura de posições) em todas as temporadas.
- **SC-003**: Em 30 temporadas simuladas sem interação, existe ao menos um jogador acima do limiar de
  "craque" (definido no plano) em cada temporada.
- **SC-004**: Jovens com muita minutagem evoluem mais, em média, do que jovens com pouca — diferença
  mínima definida no plano, verificada por teste automatizado.
- **SC-005**: A idade média do mundo permanece numa faixa definida no plano em todas as temporadas
  (o mundo nem envelhece nem rejuvenesce sem controle).
- **SC-006**: Os critérios de economia da 008 (30 temporadas) continuam passando com evolução,
  aposentadoria e jovens ativos.
- **SC-007**: Repetir a simulação de 30 temporadas a partir da mesma carreira produz o mesmo mundo em
  100% das execuções.
- **SC-008**: Saves das versões anteriores abrem e continuam a carreira em 100% dos fixtures.
- **SC-009**: Nenhum texto visível novo fica fora do sistema de idiomas.

## Assumptions

- O potencial é o oculto já existente (completado na criação da carreira); ele não muda com o tempo.
- A idade continua derivada da data de nascimento e da data da temporada (007).
- A evolução do meio da temporada acontece depois da rodada central (metade das rodadas da divisão);
  a do fim acontece na virada, antes da aposentadoria.
- A minutagem conta partidas oficiais da temporada (da competição da carreira).
- Jovens chegam com 16 a 18 anos; o número por clube por temporada fica numa faixa pequena
  (por exemplo, 2 a 4), definida no plano.
- Dispensados e aposentados deixam o jogo (não há agentes livres até o mercado, na 010).
- O critério de dispensa prefere manter a cobertura de posições e descartar os de menor força
  ponderada pela idade (veteranos fracos antes de jovens promissores).
- Clubes do computador e o do jogador seguem as mesmas regras de renovação; o jogador não escolhe
  jovens nem dispensas nesta feature (sem categorias de base jogáveis, olheiros ou treino).
- Os salários continuam derivados da força (008); evolução e renovação mudam a folha, e a calibração
  da economia pode precisar de ajuste, registrado no plano.
- Fora de escopo: categorias de base jogáveis, olheiros, treino, mercado.
