# Mod mundo completo

O **mundo completo** reúne as seis confederações do futebol — Europa, América do Sul, América do
Norte, Central e Caribe, África, Ásia e Oceania — com os principais países de cada uma. Países, estados e
cidades usam os nomes reais; **clubes, competições e jogadores são fictícios**. O projeto não distribui
nomes, escudos ou marcas reais de clubes e jogadores; quem quiser nomes reais troca por planilha no próprio
computador (seção 4).

## 0. Escolher o mundo ao iniciar a carreira

Na tela de nova carreira, o seletor de mundo oferece três tamanhos, gerados na hora dentro do jogo (sem
baixar nada):

| Mundo | Países | Clubes | Para quem |
|---|---:|---:|---|
| **Reduzido** | 24 | ~260 | Qualquer computador; virada de temporada em poucos segundos |
| **Médio** | 44 | ~1 000 | Computador razoável; virada de uns 20 s |
| **Completo** | 44 | ~1 650 | Computadores potentes; os 27 estaduais; virada de uns 35 s |

A seed digitada em "avançado" muda o mundo. Os três também podem ser baixados na página de Mods, para a
troca de nomes por planilha (seção 4).

## 1. O que vem no mundo completo

| Parte | Conteúdo |
|---|---|
| Confederações | UEFA, CONMEBOL, CONCACAF, CAF, AFC e OFC, cada uma com a competição continental principal (e a secundária onde há clubes para isso) |
| Países | 44 nos mundos médio e completo (12 na Europa, 10 na América do Sul, 6 na América do Norte, Central e Caribe, 6 na África, 6 na Ásia, 4 na Oceania) |
| Brasil | Séries A, B e C de 20 clubes em pontos corridos, Série D em grupos regionais e mata-mata, 27 estaduais de duas divisões, copa nacional e supercopa |
| Demais países | Pirâmide pelo nível do país (1 a 4): duas divisões de 20 ou 16 clubes, ou uma de 14 ou 10, e copa nacional |
| Força | Cada país tem força de 0,5 a 1,5: reputação dos clubes, economia e vagas continentais seguem ela |

## 2. Gerar o mod

```bash
pnpm gen:football-world                                  # mundo completo, seed padrão, em dist/mundo-completo
pnpm gen:football-world --profile reduzido --seed teste  # mundo pequeno (24 países), bom para testar
pnpm gen:football-world --profile medio
pnpm gen:football-world --seed outra --out meu-mundo --folder
```

| Opção | Efeito |
|---|---|
| `--profile` | `reduzido`, `medio`, `completo` (apelidos `compacto` e `padrao`) ou o caminho de um arquivo de perfil (seção 3) |
| `--seed` | Mesma seed e mesmo perfil geram o mesmo pacote, byte a byte |
| `--out` | Pasta de saída; grava `mundo-completo.zip` |
| `--folder` | Grava também os JSON do mod numa subpasta `mod` |
| `--name` | Nome do mod no manifesto |
| `--clubs-csv`, `--players-csv` | Aplicam planilhas de nomes (seção 4) |

A ferramenta valida o pacote lendo-o de volta e só termina com sucesso se ele passar. Códigos de saída:
`0` ok, `1` pacote inválido, `2` perfil inválido, `3` planilha inválida. Para validar de novo:
`pnpm validate-bank dist/mundo-completo/mundo-completo.zip`.

## 3. Ajustar a estrutura

O mundo é descrito por um **perfil** (JSON): confederações, países de cada uma, nível (`tier`) e força de
cada país e o detalhe do Brasil. Copie um perfil existente (`packages/engine/src/worldgen/football-world/profiles`: `compact.ts` é o reduzido, `default.ts` traz o médio e o completo),
edite e passe o caminho em `--profile`.

```jsonc
{
  "id": "meu-perfil",
  "manifest": { "id": "meu-mundo", "name": "Meu mundo", "author": "eu", "version": "1.0.0" },
  "confederations": [
    {
      "id": "conmebol", "name": "Confederação da América do Sul", "minor": true,
      "countries": [
        { "geoId": "brasil", "tier": 1, "strength": 1.5 },
        { "geoId": "argentina", "tier": 1, "strength": 1.4 },
        { "geoId": "uruguai", "tier": 2, "strength": 1.0, "clubsPerDivision": 12 },
        { "geoId": "chile", "tier": 2, "strength": 1.0 }
      ]
    }
  ],
  "brazil": { "clubsPerDivision": 20, "states": 27, "estadual": { "firstDivision": 12, "secondDivision": 8 } }
}
```

| Campo | Regra |
|---|---|
| `geoId` | País existente em `geo/countries.json` (44 no repositório) |
| `tier` | 1 (duas divisões de 20), 2 (duas de 16), 3 (uma de 14), 4 (uma de 10) |
| `strength` | 0,5 a 1,5 |
| `divisions`, `clubsPerDivision`, `cup` | Ajustam a pirâmide do país |
| `minor` | Há competição continental secundária |
| `brazil` | Clubes por divisão (múltiplo de 4, ao menos 12), número de estados (1 a 27) e tamanho das divisões do estadual (múltiplos de 4, ao menos 8 e 8) |

Cada confederação precisa de **ao menos 4 países**, para a competição continental separar os clubes do
mesmo país nos grupos. Erros do perfil: `profile.unknown_country`, `profile.duplicate_country`,
`profile.few_countries`, `profile.tier_range`, `profile.strength_range`, `profile.cities_short`,
`profile.unknown_language`, `profile.brazil_range`. Os clubes nacionais do Brasil precisam caber na 1ª
divisão dos estaduais (`estados × clubes da 1ª divisão ≥ 4 × clubes por divisão`).

## 4. Trocar os nomes pela planilha

1. Gere o mod (seção 2) e carregue-o na tela **Mods** do jogo.
2. Na mesma tela, exporte **clubes** e **jogadores** em CSV e abra numa planilha.
3. Troque os nomes (`name`, `shortName`, `displayName`…), salve como CSV e importe de volta, ou passe os
   arquivos à ferramenta: `pnpm gen:football-world --clubs-csv clubes.csv --players-csv jogadores.csv`.
4. O pacote precisa continuar válido: erros apontam o arquivo, a linha e a coluna.

As colunas e as regras estão em `docs/mod-format.md`, seção "Planilhas (CSV)". Nomes reais ficam só no seu
computador: o projeto não os distribui.

## 5. Balanceamento e limites

- `pnpm sim:world --football-world --profile reduzido|medio|completo --seasons n` mede dia de jogos, virada,
  memória e tamanho do save e confere as metas (`SCALE_LIMITS` para o reduzido, `mediumWorld` e `fullWorld`
  em `packages/save/src/scale-limits.ts`). O reduzido foi simulado por 30 temporadas (divisões estáveis,
  elencos válidos, vagas continentais, economia); o médio e o completo foram medidos em uma temporada.
- Ligas mais curtas rendem menos bilheteria: a folha de salários do país acompanha o número de rodadas
  (38 = liga de 20 clubes).
- O arquivo de jogadores do mundo completo passa de 10 MB descompactado; o limite por arquivo JSON do
  pacote foi revisto para 16 MB (`docs/mod-format.md`, seção "Limites").
