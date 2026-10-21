# brasfoot-like — Documento de Design

> Nome público do jogo: **Treinador FC** (decidido na 016). "brasfoot-like" segue só como nome
> interno do repositório e dos pacotes. Jogo de gerenciamento de futebol no estilo do clássico
> Brasfoot. Decisões tomadas em sessão de refinamento em 2026-10-14.

## 1. Visão

- **Objetivo:** um jogo que eu quero jogar, construído com qualidade suficiente para publicar.
- **Diferencial em relação ao Brasfoot:**
  - **Base — UI moderna:** interface limpa, responsiva, atalhos de teclado, filtros e comparação de jogadores.
  - **Identidade — drama e narrativa:** manchetes, diretoria, torcida e rivalidades geram histórias.
  - **Estratégia — modding de primeira classe:** a comunidade fornece nomes reais; o jogo não distribui nada protegido.
- **Publicação:** gratuito, sem monetização e sem anúncios. Distribuição via web estática + itch.io (Steam opcional, por visibilidade).
- **Regra fixa:** nenhum nome, escudo ou marca real embutido no jogo.

## 2. Plataforma e stack

- **Web primeiro**, **desktop depois** (Electron).
- **TypeScript + Next.js (React, static export) + Vitest + Biome.**
- **Motor do jogo em TypeScript puro**, sem dependência de React, testável isoladamente (simulação, regras, IA).
- **Hospedagem:** site estático na **Vercel** (Hobby), sem backend e sem integração Git: a
  publicação é feita pelo workflow `release` do GitHub Actions a partir de uma tag `vX.Y.Z`, só
  depois de todos os gates (016, `specs/016-polimento-publicacao/contracts/release.md`).
  itch.io continua possível como distribuição adicional.
- **i18n desde o dia 1**; apenas pt-BR no lançamento.

## 3. Mundo do jogo

- **MVP:** um país fictício com **Série A e Série B**, 20 times cada, com acesso e rebaixamento.
- País, competição e formato (pontos corridos, mata-mata, grupos) são **dados, não código** — adicionar ligas/países deve ser trabalho de dados.
- Primeira expansão sugerida: copa nacional em mata-mata.

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

**Estado do M6:** export/import de carreiras e formato de mod (015); dicas de primeiro acesso,
Configurações (tema claro/escuro), ajuda de atalhos em todas as telas, revisão de
acessibilidade, versão e notas, aviso de atualização e publicação na Vercel (016). Versão
1.0.0 publicada em https://treinador-fc.vercel.app. Falta o teste de usabilidade com quem
nunca viu o jogo (`specs/016-polimento-publicacao/usability.md`).

**Estado do M7:** calendário por datas e várias competições na mesma temporada (017): agenda de
cada competição como dado (`schedule`), avanço até o próximo jogo do clube de qualquer competição,
condição física e descanso entre jogos, cartões por competição, finanças, torcida, diretoria,
manchetes, janelas e evolução por datas, calendário do clube e abas por competição. Saves v12.
Faltam o mata-mata (018) e as fases de grupos.

Os marcos 7 a 9 são pós-lançamento: trazem as copas e o mundo maior do §14 até o mod do
futebol sul-americano. Os prompts estão em [`speckit-prompts/`](speckit-prompts/README.md)
(017 a 024).

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
