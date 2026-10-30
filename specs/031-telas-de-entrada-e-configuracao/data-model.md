# Modelo de dados: Telas de entrada e configuração

Nenhum dado persistido muda. Tudo abaixo são visões derivadas, calculadas na hora.

## Visões

| Visão | Campos | Origem |
|---|---|---|
| `NewCareerFormInput` | `managerName`, `seed`, `clubId`, `noFiring` | estado da tela Nova carreira |
| `FormError` | `field` (`managerName`, `club`), `code`, `params` | `validateNewCareerForm` (`apps/web/src/game/new-career-form.ts`) |
| `SaveRow` | `id`, `club`, `manager`, `divisionLevel`, `season`, `round`, `savedAt`, `status` (`ok`, `future`, `corrupt`), `finished` | lista de saves lida pelo armazenamento |
| `SavesView` | `count`, `rows` (do mais recente ao mais antigo) | `saves-view.ts` |
| `NoteGroup` | `current`, `older[]`, `beta[]`; cada nota com `version`, `date`, `isNew` | `releaseNotes`, `betaReleaseNotes` e `lastSeenVersion` |

## Regras

- `validateNewCareerForm` devolve os erros na ordem da tela (nome, clube) e é vazia quando
  tudo é válido; os códigos são os de hoje (`save.invalid_name`, `newCareer.noClub` e os que o
  `createCareer` já devolve), com os mesmos parâmetros (`MANAGER_NAME_MAX`).
- `SavesView.count` conta as carreiras listadas, inclusive as corrompidas e as de versão futura,
  porque o jogador pode apagá-las; o menu mostra a mesma contagem.
- `isNew` de uma nota é verdadeiro quando a versão é maior que a `lastSeenVersion` lida antes de
  gravar (sem `lastSeenVersion`, todas são novas); abrir as notas continua gravando a versão atual
  como vista, mas a marca da visita corrente não some.
- Nada disso é gravado: preferências, saves e mods mantêm o formato de hoje.
