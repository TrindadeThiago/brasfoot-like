# Contrato: ferramenta `gen:football-world`

## Uso

```bash
pnpm gen:football-world [opções]
```

| Opção | Padrão | Efeito |
|-------|--------|--------|
| `--profile <id\|arquivo>` | `padrao` | `padrao`, `compacto` ou um arquivo JSON de `WorldProfile` |
| `--seed <texto>` | `mundo-completo-1` | Seed do mundo; mesma seed, mesmo pacote byte a byte |
| `--out <pasta>` | `dist/mundo-completo` | Onde gravar o `.zip` (e a pasta, com `--folder`) |
| `--folder` | desligado | Grava também os JSON do mod numa pasta |
| `--clubs-csv <arquivo>` | — | Aplica uma planilha de clubes (nomes locais) antes de empacotar |
| `--players-csv <arquivo>` | — | Aplica uma planilha de jogadores |
| `--name <texto>` | do perfil | Nome do mod no manifesto |

## Comportamento

1. Lê e valida o perfil; erro de perfil sai com código 2 e lista de problemas.
2. Gera o mundo (`generateFootballWorld(profile, seed)`).
3. Aplica os CSV, se houver (`applyCsv`); erro de CSV sai com código 3 e linha/coluna.
4. Empacota (`writeModPackage`) e **valida lendo de volta** (`readModPackage`, limites inclusos).
5. Só conclui com código 0 se a validação passar; senão, código 1 e os erros por arquivo/campo.
6. Imprime resumo: confederações, países, competições, clubes, jogadores, tamanho do pacote e hash do
   arquivo.

## Garantias

- Determinismo: seed, perfil e CSV iguais dão o mesmo `.zip` byte a byte.
- Nenhuma rede, relógio ou aleatoriedade fora da seed.
- A ferramenta não altera arquivos do repositório fora de `--out`.

## Simulação

`pnpm sim:world --football-world [--profile p] [--seasons n]` roda a carreira de teste e imprime as
medidas de escala (dia, virada, heap, save) e as faixas de balanceamento; sai com código 1 se algo
estiver fora das metas.
