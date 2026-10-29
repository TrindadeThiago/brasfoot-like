# Contrato: shell da interface

- `Sidebar({ save, careerId })`: `<nav aria-label>` com as 10 telas na ordem de `GAME_SCREENS`; item ativo com `aria-current="page"`; selo de contador dentro do link, nome acessível "Mercado (2)"; rodapé com Menu inicial, Configurações, Atalhos e `SaveIndicator`.
- `ScreenHeader({ title, club, coach, series, season, round, actions? })`: um `<h1>` por tela; ações na linha do título.
- `FocusScreen({ title, back?, actions?, children })`: sem barra lateral; Voltar fora da carreira.
- `GameLayout`: variante `club | focus` por rota; mantém atalhos `go-*`, `confirmLeave()`, redirecionamento de desempregado, `TipHost`, diálogos.
- Largura: ≥ 768 px barra lateral sticky + conteúdo; < 768 px empilhado; página nunca rola na horizontal.
- Navegação por teclado: ordem Tab lógica (sidebar → conteúdo), foco visível; testes e2e de teclado existentes passam.
