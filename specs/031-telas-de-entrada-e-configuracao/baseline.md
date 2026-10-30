# Linha de base (início da 031, `release/v1.0.0` com a 025 a 030)

Medida em 2026-10-30, antes de qualquer mudança de código da 031.

- `apps/web/out`: 3,9 MB (JS 1 811 245 bytes; CSS 72 184 bytes; precache de 179 arquivos)
- Tempo de abertura (Playwright, mundo padrão, mediana de 5, do `goto` até o título ou campo principal visível): menu 109 ms (98 a 252), nova carreira 266 ms (255 a 360), carreiras salvas 85 ms (82 a 89), configurações 86 ms (79 a 100), mods 93 ms (87 a 105), sobre 96 ms (92 a 113), notas de versão 98 ms (94 a 106)
- Criar carreira no mundo padrão (440 clubes), do clique em Começar carreira até a URL `/jogo`, no Chromium: mediana **485 ms** (482 a 515). Está a ~3% do limite de 500 ms; qualquer custo novo no caminho do clique (validação, diálogo, renderização) precisa ficar fora dele.
- Vitest (happy-dom, mediana de 5): `defaultBankInput` 195 ms (geração do mundo, feita antes do clique, na abertura da tela) e `createSave` 558 ms (mais lento que no navegador). O limite de 0,5 s do SC-002 vale para o navegador (clique até o jogo); no Vitest o teste de T008 usa a margem do Vitest (limite de 1 s) e o e2e mede o limite real.
- Filtro da lista por busca com 440 clubes (Playwright, do preenchimento até a tabela atualizada): 24 a 31 ms
- Testes que tocam as telas (referência de paridade): `test/flows/new-career.test.tsx`, `saves.test.tsx`, `mods.test.tsx`, `save-file.test.tsx`, `performance.test.tsx`, `world.test.tsx`, `football-world.test.tsx`; e2e `first-run`, `career`, `save-file`, `mods`, `settings`, `update`, `offline`, `world`, `football-world`, `a11y`, `layout`. O resultado é o do CI da 030 (PR #56) e vale para a base `release/v1.0.0`, sem repetir a suíte aqui.
- Tolerância: mediana de abertura até 10% acima (menu 120 ms, nova carreira 293 ms, carreiras 94 ms, configurações 95 ms, mods 102 ms, sobre 106 ms, notas 108 ms) e criação com 440 clubes abaixo de 500 ms.

## Depois da 031 (T036)

Medida em 2026-10-30, mesmo método e mesma máquina da linha de base.

- `apps/web/out`: 3,8 MB (JS 1 827 755 bytes, +0,9%; CSS 73 728 bytes; precache de 180 arquivos)
- Abertura (mediana de 5; configurações e notas repetidas com 11 amostras por causa do ruído): menu 107 ms (limite 120), nova carreira 283 ms (limite 293), carreiras salvas 92 ms (limite 94), configurações 94 ms (limite 95), mods 97 ms (limite 102), sobre 93 ms (limite 106), notas de versão 99 ms (limite 108). Todas dentro da tolerância de 10% (SC-007).
- Criar carreira no mundo padrão (440 clubes), do clique até `/jogo`: mediana **477 ms** (468 a 508), contra 485 ms antes; abaixo de 500 ms (SC-002).
- Filtro da lista por busca com 440 clubes: 21 a 24 ms, abaixo de 200 ms (SC-002).

## Tabela de paridade (FR-019)

Cada opção, validação e mensagem das telas de hoje e onde fica depois da 031. A coluna "Conferido" é preenchida em T040.

| Hoje | Onde fica depois | Conferido |
|---|---|---|
| Menu: nome do jogo e abertura (`opening.*`) | menu, chamada principal |  ✓ |
| Menu: Continuar a carreira recente (técnico, clube, rodada) | menu, ação principal quando há carreira |  ✓ |
| Menu: Nova carreira, Carreiras salvas, Mods | menu, três ações (Carreiras salvas com a quantidade, novo) |  ✓ |
| Menu: rodapé Configurações, Sobre, Atalhos, versão com link para as notas | menu, rodapé |  ✓ |
| Menu: aviso de novidades da versão (dispensar grava `lastSeenVersion`) | menu, `Notice` |  ✓ |
| Menu: aviso de armazenamento indisponível | menu, `Notice` |  ✓ |
| Menu: dica de primeiro acesso (`TipHost`, âncora `new-career`) | menu, igual |  ✓ |
| Nova carreira: nome do técnico e limite (`save.invalid_name`) | campo com `Field`, erro ligado ao campo |  ✓ |
| Nova carreira: Sem demissão, explicação e aviso | caixa de marcação com explicação e aviso |  ✓ |
| Nova carreira: seed em avançado (texto livre) | `details` recolhido, igual |  ✓ |
| Nova carreira: banco de dados (mundo padrão e mods), descrição, link para Mods | campo Banco de dados, igual |  ✓ |
| Nova carreira: filtro de país (só vários países, com grupos continentais) | `ClubPicker`, igual |  ✓ |
| Nova carreira: filtro de divisão | `ClubPicker`, igual |  ✓ |
| Nova carreira: busca por nome ou cidade e contagem (hoje só em vários países) | `ClubPicker`, sempre visível |  ✓ |
| Nova carreira: tabela de clubes (escudo, país, cidade, reputação, força média, estádio, divisão; ordenável; reputação decrescente) | `ClubPicker`, igual, com escolha por teclado |  ✓ |
| Nova carreira: erro sem clube (`newCareer.noClub`) | erro ligado à tabela, com foco |  ✓ |
| Nova carreira: erros do `createCareer` por código | `Notice` de erro acima do botão |  ✓ |
| Nova carreira: clube escolhido e botão Começar carreira, "criando carreira" | rodapé fixo |  ✓ |
| Carreiras: escudo, técnico, clube, progresso, divisão, temporada, data | `SaveCard` |  ✓ |
| Carreiras: versão futura e corrompida (sem Continuar) | `SaveCard` com marcação em texto |  ✓ |
| Carreiras: Continuar, Exportar, Apagar com confirmação | `SaveCard` e diálogo (foco no Cancelar) |  ✓ |
| Carreiras: Importar e mensagens (arquivo inválido, versão futura, cota, falha) | campo de arquivo, mensagens em `Notice` |  ✓ |
| Carreiras: conflito de id (substituir, cópia, cancelar) | diálogo (foco no Cancelar) |  ✓ |
| Carreiras: lista vazia (`saves.empty`) | `EmptyState` com Nova carreira e Importar |  ✓ |
| Configurações: velocidade padrão e pausa automática | seção Rodada ao vivo |  ✓ |
| Configurações: tema e idioma | seção Aparência e idioma |  ✓ |
| Configurações: dicas de novo (`settings.tipsReset`) | seção Dicas, com confirmação (novo) |  ✓ |
| Configurações: sobre | seção Sobre (versão e links) |  ✓ |
| Mods: introdução, documentação, exemplo | cartão Introdução |  ✓ |
| Mods: mundo padrão (descrição, download) | cartão Mundo padrão |  ✓ |
| Mods: carregar .zip, carregando, mensagem, relatório de erros e avisos | cartão Carregar mod |  ✓ |
| Mods: lista (resumo, países, divisões, imagens), Remover com confirmação, vazio | cartão Mods carregados |  ✓ |
| Mods: substituir mod de mesmo id (confirmação) | diálogo (foco no Cancelar) |  ✓ |
| Mods: planilhas (exportar clubes e jogadores, importar, gerar pacote, baixar, carregar) | cartão Planilhas |  ✓ |
| Sobre: apresentação, o que dá para fazer, capturas, nomes reais, gratuito, privacidade e saves, versão, formato de mods | seções em cartões |  ✓ |
| Notas de versão: lista por versão, "Fase beta" recolhida, marca como vista | versões recolhíveis, "Nova", beta rotulada |  ✓ |
| Atalhos: diálogo de ajuda | `ShortcutsHelp`, igual em comportamento |  ✓ |
| Atualização: aviso com Recarregar, fora da rodada ao vivo | `UpdateNotice` com `Notice` |  ✓ |
| NÃO existe: ativar e desativar mods, apagar todos os dados, ação nova no menu | continuam sem existir |  ✓ |

## Usabilidade (SC-001)

Resultado do teste com uma pessoa que nunca viu o jogo: preenchido em T039.
