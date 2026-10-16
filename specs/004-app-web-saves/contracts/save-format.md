# Contrato: formato do save e pacote `@brasfoot-like/save`

Pacote puro (sem DOM, sem armazenamento). Tipos em [data-model.md](../data-model.md).

```ts
const SAVE_FORMAT_VERSION: 1;

interface Migration { from: number; migrate(raw: unknown): unknown }
const MIGRATIONS: readonly Migration[];      // vazio na versão 1

function createSave(input: {
  id: string;
  now: string;                // ISO, vindo da interface
  managerName: string;
  clubId: string;
  seed: string;
  defaultBank: unknown;       // arquivos do banco padrão já unidos (joinBankFiles)
}): { ok: true; save: SaveFile } | { ok: false; error: SaveError };

function migrateSave(
  raw: unknown,
  migrations?: readonly Migration[],   // padrão: MIGRATIONS
  target?: number,                     // padrão: SAVE_FORMAT_VERSION (injetável nos testes)
): LoadResult;
function seasonYearOf(save: SaveFile): number;
function summarize(save: SaveFile): SaveSummary;
function touch(save: SaveFile, now: string): SaveFile;      // atualiza savedAt
```

- `createSave` valida o nome (1–40 caracteres após `trim`), valida o banco (`validateBank`),
  completa atributos ocultos com a seed (`completeHiddenAttributes`) e cria a temporada da Série A
  (`createSeason`), checando que o clube está nela.
- `migrateSave`: lê `formatVersion`; se maior que a atual → `future_version` (nada é alterado);
  aplica as migrações `from = v, v+1, …` até a atual; valida o envelope (Zod), o banco
  (`validateBank`) e a forma da temporada; qualquer falha → `corrupt`.

## SaveError

| Código | Quando | Params |
|---|---|---|
| `save.invalid_name` | nome vazio ou com mais de 40 caracteres | `length`, `max` |
| `save.invalid_bank` | banco padrão não passa na validação | `issues` |
| `save.club_not_in_league` | clube fora da Série A | `clubId` |

Mensagens pt-BR em `packages/i18n/locales/pt-BR/ui.json` (`save.*`).

---

# Contrato: armazenamento (`apps/web/src/storage`)

```ts
interface SaveStore {
  listSummaries(): Promise<SummaryEntry[]>;           // mais recente primeiro
  load(id: string): Promise<LoadResult | { status: "missing" }>; // aplica migrateSave; regrava se migrou
  save(file: SaveFile, expectedSavedAt?: string): Promise<SaveWriteResult>;
  remove(id: string): Promise<void>;
}

type SummaryEntry = SaveSummary & { status: "ok" | "future_version" | "corrupt" };

type SaveWriteResult =
  | { ok: true; savedAt: string }
  | { ok: false; reason: "conflict" | "quota" | "unavailable" | "unknown" };
```

- `save` grava `SaveFile` e `SaveSummary` na mesma transação; com `expectedSavedAt`, recusa
  (`conflict`) se o resumo gravado tiver `savedAt` diferente (R6).
- `createIndexedDbStore(name, reader = migrateSave)`: banco `name` com os object stores `saves` e
  `summaries`. Save sem resumo → `corrupt`; resumo com `formatVersion` maior que a atual →
  `future_version` (o save não é lido).
- Implementações: IndexedDB (produção) e a mesma implementação sobre `fake-indexeddb` nos testes.
- Outras abas são avisadas pelo `BroadcastChannel` `brasfoot-like:saves` para atualizar a lista.
