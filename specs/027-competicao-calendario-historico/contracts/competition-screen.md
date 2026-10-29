# Contrato: tela de Competição

- **Abas** (`Tabs`): "Minhas competições" (padrão) e "Demais competições"; cada uma lista cartões.
- **Cartão** (link `competitionHref`): nome, país ou "entre países", formato, situação (texto: em disputa, eliminado, encerrada, começa em {data}, vaga em disputa); `aria-current="page"` no escolhido; foco visível.
- **Demais**: seletor de país (só em mundo com vários países) e contagem "{n} competições".
- **Competição escolhida**: de liga → seções Classificação, Resultados, Artilharia (rotas atuais) e divisões; mata-mata → Chaveamento; com fases → navegação de fases e origem das vagas.
- **Classificação**: zonas com texto/legenda (acesso, rebaixamento, vaga continental), forma recente (V/E/D em texto), clube do jogador destacado com `aria-current`.
- **Campanha** (`CampaignPanel`) só onde o clube joga; senão `Notice` "seu clube não participa".
- **Ainda não começou**: bloco com início, vaga e formato.
- **Vazios/erro**: competição sem jogos, sem classificados, país sem competições — `EmptyState`.
- **URL**: `comp`, `d`, `fase` e as subrotas `/resultados` e `/artilharia` inalterados.
