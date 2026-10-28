# Mundo padrão

O **mundo padrão** do jogo reúne cinco confederações do futebol — América do Sul, Europa, América do
Norte, Central e Caribe, África e Ásia — com os 3 países mais fortes de cada uma (15 países, 440
clubes). A Oceania não faz parte. Países, estados e cidades usam os nomes reais; **clubes, competições e jogadores são
fictícios**. O projeto não distribui nomes, escudos ou marcas reais de clubes e jogadores; quem quiser nomes
reais troca por planilha no próprio computador (seção 4).

O jogo gera o mundo na hora, dentro da tela de nova carreira, em menos de meio segundo. A seed digitada em
"avançado" muda o mundo; a mesma seed dá sempre o mesmo mundo.

## 1. O que vem no mundo

| Parte | Conteúdo |
|---|---|
| Confederações | CONMEBOL, UEFA, CONCACAF, CAF e AFC, cada uma com a competição continental principal (12 clubes em 4 grupos de 3, pois são 3 países) |
| Países | 15: 3 por confederação (Brasil, Argentina e Colômbia; Inglaterra, Espanha e Itália; México, Estados Unidos e Costa Rica; Egito, Marrocos e África do Sul; Japão, Coreia do Sul e China) |
| Brasil | Séries A, B e C de 20 clubes em pontos corridos, Série D em grupos regionais e mata-mata, 5 estaduais de duas divisões (16 e 16 clubes), copa nacional e supercopa |
| Demais países | Uma divisão de 20 clubes e a copa nacional |
| Força | Cada país tem força de 0,5 a 1,5: reputação dos clubes, economia e vagas continentais seguem ela |

Roda bem em computadores comuns (dia de jogos de ~270 ms, virada de temporada em ~4 s, save de ~33 MB no fim da temporada). Mundos maiores
chegaram a ser testados (44 países e até 1 650 clubes), mas travavam nas rodadas da liga e foram
descartados; os dados de geografia dos 44 países continuam no repositório para quem quiser montar um
perfil maior por conta própria (seção 3).

## 2. Gerar o mod

```bash
pnpm gen:football-world                                  # mundo padrão, seed padrão, em dist/mundo-completo
pnpm gen:football-world --seed teste --out meu-mundo --folder
```

| Opção | Efeito |
|---|---|
| `--profile` | `padrao` ou o caminho de um arquivo de perfil (seção 3) |
| `--seed` | Mesma seed e mesmo perfil geram o mesmo pacote, byte a byte |
| `--out` | Pasta de saída; grava `mundo-completo.zip` |
| `--folder` | Grava também os JSON do mod numa subpasta `mod` |
| `--name` | Nome do mod no manifesto |
| `--clubs-csv`, `--players-csv` | Aplicam planilhas de nomes (seção 4) |

A ferramenta valida o pacote lendo-o de volta e só termina com sucesso se ele passar. Códigos de saída:
`0` ok, `1` pacote inválido, `2` perfil inválido, `3` planilha inválida. Para validar de novo:
`pnpm validate-bank dist/mundo-completo/mundo-completo.zip`. O mesmo mundo está para baixar na página de
Mods (`mundo-padrao.zip`).

## 3. Ajustar a estrutura

O mundo é descrito por um **perfil** (JSON): confederações, países de cada uma, nível (`tier`) e força de
cada país e o detalhe do Brasil. Copie o perfil padrão
(`packages/engine/src/worldgen/football-world/profiles/default.ts`), edite e passe o caminho em `--profile`.

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
| `continental` | `false` tira a competição continental da confederação (padrão: tem) |
| `brazil` | Clubes por divisão (múltiplo de 4, ao menos 12), número de estados (1 a 27) e tamanho das divisões do estadual (múltiplos de 4, ao menos 8 e 8) |

**Atenção:** perfis grandes são pesados. Com ~1 000 clubes a virada de temporada leva uns 20 s e com ~1 650
uns 35 s, e a memória passa de 1 GB. O mundo padrão (440 clubes) fica em ~4 s.

Cada confederação precisa de **ao menos 3 países**, para a competição continental separar os clubes do
mesmo país nos grupos (com 3 a 7 países a competição é pequena; com 8 ou mais, a grande de 40 clubes). Uma
confederação pode ter `"continental": false` para não ter competição continental, como a Oceania. Erros do perfil: `profile.unknown_country`, `profile.duplicate_country`,
`profile.few_countries`, `profile.tier_range`, `profile.strength_range`, `profile.cities_short`,
`profile.unknown_language`, `profile.brazil_range`. Os clubes nacionais do Brasil precisam caber na 1ª
divisão dos estaduais (`estados × clubes da 1ª divisão ≥ 4 × clubes por divisão`).

## 4. Trocar os nomes pela planilha

1. Na tela **Mods** do jogo, exporte **clubes** e **jogadores** do mundo padrão em CSV (ou gere o mod e
   carregue-o antes, para trabalhar sobre a seed que você escolheu).
2. Abra numa planilha e troque os nomes (`name`, `shortName`, `displayName`…).
3. Salve como CSV e importe de volta, ou passe os arquivos à ferramenta:
   `pnpm gen:football-world --clubs-csv clubes.csv --players-csv jogadores.csv`.
4. O pacote precisa continuar válido: erros apontam o arquivo, a linha e a coluna.

As colunas e as regras estão em `docs/mod-format.md`, seção "Planilhas (CSV)". Nomes reais ficam só no seu
computador: o projeto não os distribui.

## 5. Balanceamento e limites

- `pnpm sim:world --football-world --seasons n` mede dia de jogos, virada, memória e tamanho do save contra
  as metas da 020 (`SCALE_LIMITS`). O mundo padrão foi simulado por temporadas seguidas (divisões estáveis,
  elencos válidos, vagas continentais, economia dentro de faixas).
- Ligas mais curtas rendem menos bilheteria: a folha de salários do país acompanha o número de rodadas
  (38 = liga de 20 clubes).
- O limite por arquivo JSON do pacote passou de 10 para 16 MB (`docs/mod-format.md`, seção "Limites"), para
  caber perfis grandes.
