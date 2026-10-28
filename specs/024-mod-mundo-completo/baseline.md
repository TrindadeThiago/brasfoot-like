# Medidas do mundo completo (024)

> **Revisão (1.10.0)**: os mundos médio e completo foram descartados — a rodada da liga ficava pesada demais
> (travamentos) com dezenas de milhares de jogadores. O **mundo padrão** passou a ser o reduzido (24 países
> nas seis confederações, Brasil em quatro divisões com estaduais), gerado dentro do jogo e também
> disponível para baixar (`mundo-padrao.zip`); o antigo país fictício único saiu da lista de nova carreira.
> Onde este documento fala em três tamanhos, vale só o reduzido.

Medidas em 2026-10-27 na máquina de desenvolvimento (WSL2). A linha de base do mundo de 400 clubes da 020
(T003) é a da primeira medição desta sessão: dia mediano de 268 ms, virada de 3 630 ms, maior save de
37 MB, pico de heap de 539 MB; `pnpm sim:world --scale` reproduz.

## Gerar e começar a carreira, no navegador (Chromium sem tela, T070)

| Tamanho | Países | Clubes | Gerar o mundo e listar os clubes | Criar a carreira |
|---------|-------:|-------:|---------------------------------:|-----------------:|
| Reduzido | 24 | 264 | 0,2 s | 0,4 s |
| Médio | 44 | 1 012 | 0,5 s | 1,3 s |
| Completo | 44 | 1 654 | 0,7 s | 2,3 s |

Em Node, o completo gera em ~0,4 s, o save do primeiro dia tem 16,5 MB e os seis primeiros dias de jogo
levam de 46 a 1 029 ms.

## Custo de jogar

O custo que pesa não é o começo, e sim a **virada de temporada** e a **memória** dos mundos grandes
(ver `T069` e `research.md` R16). O reduzido tem dia de 60 ms, virada de 1,6 s e save de 13 MB.

## Uma temporada completa (T045, T069)

`pnpm sim:world --football-world --profile medio|completo --seasons 1`, no Node, depois de os estaduais
de regiões que não são a do técnico passarem à simulação resumida (antes disso, 3 temporadas do completo
passavam de 34 minutos de CPU sem terminar).

| Medida | Reduzido | Médio | Completo |
|---|---:|---:|---:|
| Clubes / jogadores | 264 / 6 471 | 1 012 / 25 060 | 1 654 / 38 709 |
| Dia de jogos (mediana) | 60 ms | 335 ms | 718 ms |
| Virada de temporada | 1,6 s | 18,0 s | 34,8 s |
| Pico de memória | 266 MB | 521 MB | 1 001 MB |
| Save no início | 3 MB | 10,6 MB | 16,6 MB |
| Maior save (última rodada) | 13 MB | 55,6 MB | 92,4 MB |
| Arquivo exportado | 1,2 MB | 4,5 MB | 7,4 MB |

As metas de `SCALE_LIMITS.mediumWorld` e `fullWorld` ficam em cerca de 150% do medido. Não foram
simuladas 30 temporadas dos dois maiores; o reduzido foi simulado por 30 (caixa médio sai de 1,9 para
-5,2 milhões, 9% dos clubes em crise, a mesma deriva da linha de base da 020).

## Mundo de 400 clubes da 020, depois das mudanças (T003)

`pnpm sim:world --scale --seasons 3` no fim da implementação: dia mediano de 243 ms (antes 268), virada de
3 554 ms (antes 3 630), pico de memória de 425 MB (antes 539), maior save de 32,2 MB (antes 31 a 37). Sem
piora; as metas da 020 continuam valendo para os mundos menores.
