# brasfoot-like — Documento de Design

> Nome público do jogo: **Treinador FC** (decidido na 016). "brasfoot-like" segue só como nome
> interno do repositório e dos pacotes. Jogo de gerenciamento de futebol no estilo do clássico
> Brasfoot. Decisões tomadas em sessão de refinamento em 2026-10-14.

## 1. Visão

- **Objetivo:** um jogo que eu quero jogar, construído com qualidade suficiente para publicar.
- **Diferencial em relação ao Brasfoot:**
  - **Base — UI moderna:** interface limpa, responsiva, atalhos de teclado, filtros e comparação de jogadores.
  - **Identidade — drama e narrativa:** manchetes, diretoria, torcida e rivalidades geram histórias.
  - **Estratégia — modding de primeira classe:** a comunidade fornece nomes reais de clubes, jogadores e competições; o jogo não distribui nada protegido (nomes de países, estados e cidades podem ser os reais).
- **Publicação:** gratuito, sem monetização e sem anúncios. Distribuição via web estática + itch.io (Steam opcional, por visibilidade).
- **Regra fixa:** nenhum nome, escudo ou marca real embutido no jogo.

## 2. Plataforma e stack

- **Web primeiro**, **desktop depois** (Electron).
- **TypeScript + Next.js (React, static export) + Vitest + Biome.**
- **Motor do jogo em TypeScript puro**, sem dependência de React, testável isoladamente (simulação, regras, IA).
- **Hospedagem:** site estático na **Vercel** (Hobby), sem backend e sem integração Git: a
  publicação é feita pelo workflow `release` do GitHub Actions quando a `main` ganha uma versão
  nova (a tag `vX.Y.Z` é criada por ele ao fim), só depois de todos os gates (016, `specs/016-polimento-publicacao/contracts/release.md`).
  itch.io continua possível como distribuição adicional.
- **i18n desde o dia 1**; apenas pt-BR no lançamento.

## 3. Mundo do jogo

- **MVP:** um país fictício com **Série A e Série B**, 20 times cada, com acesso e rebaixamento. Desde a 1.10 o mundo padrão do jogo é o das cinco confederações (024); o país único segue como o banco de testes e como base dos mods de exemplo.
- País, competição e formato (pontos corridos, mata-mata, grupos) são **dados, não código** — adicionar ligas/países deve ser trabalho de dados.
- Primeira expansão sugerida: copa nacional em mata-mata.
- **Vários países (020):** um banco pode ter quantos países quiser; cada um com a sua pirâmide, a sua economia (a da competição principal dele) e o seu banco de nomes. O valor de mercado do jogador é universal, o salário segue a escala do país do clube, a reputação é do clube, e o técnico recebe propostas de qualquer país. Os jogos das ligas de outros países que o técnico não acompanha usam uma simulação resumida, equivalente à completa.
- **Classificação entre competições (021):** a divisão de destino declara as suas vagas (`berths`): posição, título, vice ou fase alcançada em outra competição, a fase de entrada, a ordem de repasse e as condições. A resolução acontece na virada, sem sorteio: nenhum clube aparece duas vezes numa competição e nenhuma vaga sobra. A supercopa é um mata-mata de uma fase com vagas de campeão.
- **Estaduais (023):** um país pode ter competições regionais, uma por região, cada uma com duas divisões em fases (grupos, mata-mata em jogo único e final em ida e volta) e acesso e rebaixamento entre elas. Reúnem clubes das divisões nacionais e **clubes regionais**, que só jogam o estadual (controlados pela IA). Acontecem no começo da temporada, antes das competições nacionais. O peso na diretoria e na torcida é um dado da competição, com multiplicador por faixa de reputação (clube grande valoriza menos). As vagas para a copa nacional e a divisão nacional mais baixa usam a classificação entre competições (021).

## 4. Jogadores

- **Visível:** posição, força (1–100), idade, até **2 características** (ex.: Artilheiro, Muralha, Cobrador de falta, Cabeceio).
- **Oculto:** potencial, temperamento (cartões), propensão a lesões — descobertos com o tempo.
- O motor usa força + modificadores de posição/características.
- **Evolução:** curva de idade — cresce até ~27 anos rumo ao potencial, estável até ~30, declina depois. Minutagem em jogos acelera o crescimento.
- **Aposentadoria:** probabilística a partir dos ~33 anos.

## 5. Renovação do mundo

- Novos jovens gerados conforme estrutura/reputação do clube, com nomes de bancos de nomes por país.
- **Regulador global:** a cada temporada verifica a distribuição de forças do mundo e ajusta a geração, mantendo poucos craques e muitos medianos.
- **Teste automatizado de 30 temporadas** sem interação: média, extremos e economia devem permanecer em faixas saudáveis.

## 6. Partidas

- **Motor minuto a minuto**, gerando eventos (chances, gols, cartões, lesões) a partir de atributos + aleatoriedade.
- **Determinístico com seed:** mesmo estado + mesma seed = mesmo resultado.
- **Rodada ao vivo em texto** (estilo Brasfoot): todos os jogos da rodada em paralelo, relógio correndo (~30–60 s por rodada), placares mudando simultaneamente.
- Pausa para substituições e mudanças táticas durante o jogo.
- **Atalho "simular direto":** mesmo motor, a UI apenas exibe o resultado de uma vez.
- Escalação: 11 titulares, esquema (4-4-2, 4-3-3…), postura (ofensiva/defensiva).

## 7. Carreira

- O jogador é um **técnico com carreira**: reputação, metas da diretoria, risco de demissão, propostas de outros clubes.
- **Escolha livre do time inicial**; a reputação define as metas e a paciência da diretoria.
- Opção **"sem demissão"** nas configurações de novo jogo.

## 8. Finanças

- Nível Brasfoot: caixa, folha salarial, bilheteria (estádio, preço do ingresso, fase do time), premiações, patrocínio anual, empréstimos bancários, venda de jogadores.
- **Alavancas ativas no início:** preço do ingresso e expansão do estádio.
- **Economia fechada e balanceada:** clubes da IA seguem exatamente as mesmas regras.
- Meta financeira da diretoria integrada ao sistema de demissão.

## 9. Mercado de transferências

- **Janelas** de transferência (início da temporada e meio do ano).
- **Uma rodada de contraproposta:** oferta → clube aceita / recusa / pede X.
- **Contratos com duração**; fim de contrato barateia ou libera o jogador.
- **Empréstimos simples** (sem opção de compra no MVP).
- Interesse do jogador baseado em reputação do clube e divisão.
- **IA de transferências** com necessidades por posição, usando as mesmas regras do jogador. Módulo próprio, com testes de simulação longa.

## 10. Drama e narrativa (MVP)

Incluído:
1. **Manchetes** geradas a partir de eventos.
2. **Diretoria:** metas por temporada, confiança, avaliação, demissão.
3. **Torcida:** humor que afeta bilheteria e pressiona a diretoria.
4. **Rivalidades:** clássicos com peso extra em torcida e diretoria.
5. **Histórico:** títulos, recordes, lendas do clube — alimenta manchetes futuras.

Ciclo central: resultado → manchete → humor da torcida → pressão da diretoria.

- Manchetes por **templates com variáveis e múltiplas variações**; **sem LLM no runtime** (offline, gratuito, determinístico).
- Templates com frases completas (sem concatenação), suporte a plural e gênero, prontos para tradução.

Fora do MVP: vestiário/moral, coletivas de imprensa interativas.

## 11. Modding / banco de dados

- **Formato aberto e documentado** (JSON + imagens; import/export CSV).
- **Schema validado** (ex.: Zod) com mensagens de erro claras.
- O banco fictício padrão é **"o primeiro mod"** — o jogo usa o mesmo formato.
- **Escudos como dados:** cores + forma + iniciais, renderizados em SVG; mods podem substituir por imagens.
- O banco é **copiado para o save** ao criar a carreira; trocar o mod não corrompe carreiras em andamento.
- Nomes de competições ficam no mod, não nas traduções.
- Editor embutido: pós-MVP.
- Referência completa do formato (arquivos, campos, imagens, CSV, limites e códigos de erro): [`docs/mod-format.md`](mod-format.md); mod de exemplo em `mods/exemplo/`.

## 12. Persistência

- **IndexedDB** no navegador; arquivo em disco no desktop.
- **Exportar/importar save** (JSON compactado).
- Múltiplas carreiras simultâneas.
- **Autosave** ao fim de cada rodada.
- **Formato de save versionado** com migrações desde o primeiro dia.

## 13. Roadmap

Cada marco é jogável de ponta a ponta. Ordem: motor antes da UI.

Desenvolvimento via Spec-Driven Development com Spec Kit. Os prompts de `/speckit-specify` de cada marco estão em [`speckit-prompts/`](speckit-prompts/README.md), organizados por marco (`marcoN/promptNNN.md`).

| Marco | Conteúdo | Pronto quando… |
|---|---|---|
| **M1 — Motor** | Modelo de dados, banco fictício, motor de partida, temporada da Série A com tabela. Sem UI (scripts/Vitest). | Uma temporada simulada gera tabela crível (placares realistas, favoritos geralmente no topo). |
| **M2 — Uma temporada jogável** | UI React: escolher time, escalar, rodada ao vivo, tabela. Save local. | Jogo uma temporada inteira no navegador. |
| **M3 — Carreira** | Série B, acesso/rebaixamento, finanças, evolução/aposentadoria, jovens, regulador, teste de 30 temporadas. | Jogo 5 temporadas e o mundo continua saudável. |
| **M4 — Mercado** | Janelas, propostas, contratos, empréstimos, IA de transferências. | A IA monta elencos coerentes por 30 temporadas. |
| **M5 — Drama** | Diretoria, demissão/propostas, torcida, manchetes, rivalidades, histórico. | Uma temporada "conta uma história". |
| **M6 — Lançamento** | Polimento de UI, export de save, formato de mod documentado, publicação na web. | Um estranho consegue jogar sem explicação. |
| **M7 — Copas** | Calendário por datas com várias competições, mata-mata (copa nacional no mundo padrão), fase de grupos e competições em fases. | Jogo uma temporada com liga e copa nacional no mesmo calendário, e a copa termina com um campeão. |
| **M8 — Mundo** | Vários países, simulação resumida para escala, vagas entre competições e supercopas. | Um mundo com 10 países roda 30 temporadas dentro das metas de tamanho e tempo, e as vagas entre competições se renovam sozinhas. |
| **M9 — Futebol sul-americano** | Competições continentais, estaduais e o gerador do mod sul-americano (nomes fictícios). | Uma carreira no mod passa por estadual, campeonato nacional, copa nacional e competição continental na mesma temporada. |
| **M10 — Nova interface** | Refatoração visual: tokens e tema claro e escuro, barra lateral, componentes compartilhados, todas as telas refeitas (clube, competição, mercado, carreira, rodada ao vivo, entrada e configuração) e adaptação a telas menores. Sem mudança de motor, regras ou saves. | Jogo uma temporada inteira com a interface nova, nos dois temas, sem perder nenhuma função da anterior e sem regressão de desempenho. É desenvolvido na branch `release/v1.0.0` e vai ao ar inteiro como o **lançamento oficial 1.0.0** (032); a numeração é reiniciada na 025. |

**Estado do M6:** export/import de carreiras e formato de mod (015); dicas de primeiro acesso,
Configurações (tema claro/escuro), ajuda de atalhos em todas as telas, revisão de
acessibilidade, versão e notas, aviso de atualização e publicação na Vercel (016). Primeira
publicação em https://treinador-fc.vercel.app, em 2026-10-21. As versões 1.0.0 a 1.10.0 (de 20 a 28
de outubro de 2026) passaram a ser chamadas de **fase beta**: o lançamento oficial 1.0.0 é o fim do
marco 10 (ver [`interface-nova.md`](interface-nova.md), seção 6). Falta o teste de usabilidade com
quem nunca viu o jogo (`specs/016-polimento-publicacao/usability.md`).

**Estado do M7:** calendário por datas e várias competições na mesma temporada (017): agenda de
cada competição como dado (`schedule`), avanço até o próximo jogo do clube de qualquer competição,
condição física e descanso entre jogos, cartões por competição, finanças, torcida, diretoria,
manchetes, janelas e evolução por datas, calendário do clube e abas por competição. Saves v12.
Mata-mata e copa nacional (018): formato `knockout` descrito só por dados (fases, ida e volta,
entradas tardias, mando, campo neutro, prêmios), prorrogação e pênaltis na partida, inclusive ao
vivo, chaveamento, prêmios e bilheteria, reflexo na torcida, diretoria e manchetes, histórico das
copas. Saves v13. Fase de grupos e competições em fases (019): uma divisão (ou a competição) pode
ser uma sequência de fases de pontos corridos, grupos e mata-mata, só com dados; sorteio dos grupos
com potes e regras por competição (separação por país ou região, com potes isentos, e concentração
por região), classificados por grupo e vagas extras na posição seguinte, classificação geral,
chaveamento pela posição no grupo (ou tabela própria), acesso e rebaixamento pela posição final,
atributo de região do clube e telas de grupos, classificação geral e chaveamento com a origem das
vagas. Saves v14. As vagas entre competições ficam para o Marco 8.

**Estado do M8:** vários países no mesmo banco (020): competição principal por país como fonte das
regras, calendário único, virada de temporada por país (prêmios, evolução, jovens, regulador,
diretoria), mercado entre países (taxa em valor de mercado, salário na escala de destino, teto de
contratações da IA e limite opcional de estrangeiros), propostas de emprego de qualquer país com
troca de país a qualquer momento, simulação resumida para as ligas de outros países, registro
compacto, histórico por país, escolha de clube por país e divisão, banco de teste de 400 clubes e
`mods/exemplo-mundo`. Saves v15. As vagas entre competições e as supercopas ficam para a 021.

**M9 (parcial, 022):** competições entre países (continental maior e menor): preliminar, grupos
separados por país e mata-mata, vagas por país vindas das ligas e copas, ligação durante a
temporada (terceiros dos grupos descem à menor), prêmios por fase e por vitória, bilheteria,
reputação com teto, meta da diretoria, torcida, manchetes, histórico de campeões e campanha do
clube. Saves v17 e `mods/exemplo-continental`.

**M9 (024):** **mundo padrão** novo: cinco confederações (CONMEBOL, UEFA, CONCACAF, CAF e AFC, sem Oceania), 15 países, 440 clubes (ligas de 20), Brasil com 4 divisões e 5 estaduais de duas divisões de 16, competições continentais por confederação, nomes de clubes, competições e jogadores fictícios em países, estados e cidades reais; gerado na hora no navegador. Ferramenta `pnpm gen:football-world`, planilhas (CSV) para nomes reais locais e download na página de Mods. Mundos maiores (até 44 países e 1 650 clubes) foram testados e descartados por pesar demais. Ver [`mundo-completo.md`](mundo-completo.md).

**M9 (parcial, 023):** estaduais de duas divisões no começo da temporada, antes das nacionais:
grupos, mata-mata em jogo único com mando do melhor campanha e final em ida e volta, acesso dos
finalistas e rebaixamento dos piores dos grupos, clubes regionais, vagas nacionais, peso por
reputação, meta da diretoria, manchetes e histórico de campeões das duas divisões. Saves v18 e
`mods/exemplo-estadual`.

Os marcos 7 a 9 são pós-lançamento: trazem as copas e o mundo maior do §14 até o mod do
futebol sul-americano. Os prompts estão em [`speckit-prompts/`](speckit-prompts/README.md)
(017 a 024).

O marco 10 é a refatoração visual da interface (025 a 032), sem mudança de regras. Direção visual,
estrutura das telas, requisitos de paridade, a branch de release e a numeração de versões (reinício
com a 1.0.0 na 025 e lançamento oficial só no fim) em [`interface-nova.md`](interface-nova.md).

## 14. Pós-lançamento

- Copas e outras competições (nacionais, continentais) → marcos 7 a 9
- Editor de mods embutido
- Gestão profunda: categorias de base, olheiros, estrutura do clube
- Vestiário/moral e coletivas de imprensa
- Multiplayer (hot-seat local, ligas entre amigos, desafios por seed)
- Versão mobile com UI adaptada
- Traduções: espanhol (prioridade), inglês

## 15. Em aberto

- ~~Nome definitivo do jogo~~ → **Treinador FC** (016).
- Abrir o código-fonte (open source) ou não — decidir antes do lançamento.
- Disponibilidade semanal / estimativa de prazos.
