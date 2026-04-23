# CLAUDE.md — Controlo de Despesas

Contexto para sessões futuras de Claude Code neste projeto.

## O que é este projeto

PWA single-file de registo de despesas pessoais para Tomás Brito (Kaizen Institute). Filosofia Kaizen: captura no gemba (momento do pagamento), zero retrabalho, visual management via Google Sheets.

## Estado atual

- `index.html` — PWA completa, deployada em GitHub Pages
- `apps_script.js` — endpoint REST (Google Apps Script), colado manualmente no GAS pelo utilizador
- `controlo_despesas.xlsx` — template do Sheet, importado pelo utilizador para Google Drive
- GitHub Pages URL: `https://tomasporto1999-ops.github.io/despesa/`
- GitHub repo: `https://github.com/tomasporto1999-ops/despesa`

## Decisões de design (não alterar sem perguntar)

- **Single-file HTML** — sem frameworks, sem build step. Portabilidade máxima.
- **Dark theme** — fundo `#0A0A0A`, acento Kaizen Orange `#E8501A`
- **Tipografia:** Instrument Serif itálico (labels) + Nunito Sans 900 (valores) + JetBrains Mono (mono)
- **3 ecrãs:** Valor → Categoria → Sucesso
- **Fluxo adaptativo:** `?amount=X&merchant=Y` na URL salta automaticamente para Categoria após 600ms
- **Categorias on-the-fly:** nova categoria → modal de confirmação → guardada localmente + enviada para Sheet com flag `isNewCategory: true`
- **`mode: 'no-cors'`** no fetch — Apps Script não devolve CORS headers. A app assume sucesso após o envio.
- **Google Sheet é a source of truth** — `localStorage` só para categorias e URL do webhook

## Paleta de cores

```
--bg: #0A0A0A
--surface: #141414
--surface-2: #1C1C1C
--border: #262626
--text: #F5F5F5
--text-dim: #737373
--text-faint: #404040
--accent: #E8501A
--accent-glow: rgba(232, 80, 26, 0.35)
--accent-soft: rgba(232, 80, 26, 0.1)
```

## Estrutura do payload enviado ao Apps Script

```json
{
  "data": "2024-01-15",
  "valor": 12.50,
  "categoria": "Restauração",
  "subcategoria": "",
  "comerciante": "McDonald's",
  "descricao": "",
  "isNewCategory": false
}
```

## O que o utilizador configura manualmente (não automatizável por Claude)

1. Importar `controlo_despesas.xlsx` para Google Drive
2. Criar Web App no Google Apps Script (colar `apps_script.js`, deploy "Qualquer pessoa")
3. Configurar URL do Apps Script na PWA via ⚙️
4. Adicionar PWA ao Ecrã de Início no Safari iOS
5. Criar automação "Cartão Usado" no iOS Atalhos

## Re-deploy

```bash
git add index.html
git commit -m "descrição"
git push origin main
```

## Contexto do utilizador

- Tomás Brito, Kaizen Institute (metodologia Lean/Kaizen)
- Usa iPhone com Apple Pay
- O projeto foi desenhado em sessão separada; esta sessão materializou e deployou
