# Constituição

`/speckit-constitution`

```text
Crie a constituição do projeto brasfoot-like, um jogo de gerenciamento de futebol no estilo do clássico Brasfoot. O documento de design completo está em docs/design.md. Princípios inegociáveis:

1. Motor separado da interface: toda a lógica de jogo (simulação, regras, IA, economia) vive em um pacote TypeScript puro, sem dependência de React, DOM ou APIs do navegador. A UI apenas consome o motor.
2. Determinismo: toda aleatoriedade passa por um gerador pseudoaleatório com seed explícita, armazenado no estado do jogo. Mesmo estado + mesma seed = mesmo resultado. É proibido usar Math.random ou Date.now dentro do motor.
3. Dados, não código: países, competições, formatos de disputa e o banco de times/jogadores são dados validados por schema. Adicionar uma liga não deve exigir mudar a lógica.
4. Nenhum conteúdo protegido: nenhum nome, escudo ou marca real de clube, jogador ou competição pode ser distribuído com o jogo. O banco padrão é fictício e usa o mesmo formato aberto dos mods.
5. Balanceamento verificável: todo sistema que afeta o equilíbrio do mundo (forças, economia, mercado) precisa de testes de simulação longa automatizados com limites numéricos explícitos.
6. Saves versionados: o formato de save tem número de versão e migrações desde a primeira versão; saves antigos devem continuar abrindo.
7. Internacionalização desde o início: nenhum texto visível ao usuário fica fixo no código; todos passam pelo sistema de i18n, com frases completas (sem concatenação) e suporte a plural/gênero. pt-BR é o único idioma do lançamento.
8. Offline e gratuito: o jogo funciona sem servidor e sem conexão; nada de LLM em runtime, anúncios ou monetização.
9. Testes primeiro no motor: regras do motor são cobertas por testes unitários com Vitest; bugs são reproduzidos com um teste (estado + seed) antes de corrigir.

Stack: TypeScript (strict), React + Vite para a UI web, Vitest para testes, Zod para validação de schemas, IndexedDB para persistência no navegador. Desktop futuro via Electron. Hospedagem como site estático. Idioma da documentação e das specs: português.
```
