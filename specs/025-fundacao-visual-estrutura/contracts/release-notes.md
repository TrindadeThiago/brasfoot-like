# Contrato: notas de versão

- `packages/i18n/locales/pt-BR/release-notes.json`: exatamente uma nota, `1.0.0`; lida por `check-release.ts` e pelo workflow `release.yml` (sem mudança nesses).
- `release-notes-beta.json`: 23 notas atuais, mesmo esquema; exposto por `betaReleaseNotes()`.
- Página `/notas-de-versao/`: h2 por nota atual; `<details>` "Fase beta" (fechado por padrão) com h3 "beta X.Y.Z".
- Aviso "novidades": continua comparando `seen !== APP_VERSION`.
- Chaves i18n novas em `ui.json`: título da seção beta, rótulo "beta {versão}".
