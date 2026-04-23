# Controlo de Despesas — PWA

Sistema pessoal de registo de despesas, inspirado em princípios Kaizen. Captura despesas no momento do pagamento, sem retrabalho.

## Arquitetura

```
[Apple Pay / Wallet]
    ↓ iOS Shortcut dispara automaticamente
[PWA no iPhone] → https://<user>.github.io/despesa/
    ↓ POST JSON
[Google Apps Script Web App]
    ↓ escreve linha
[Google Sheet — Transações + Dashboard de Orçamento]
```

## Ficheiros

| Ficheiro | Descrição |
|---|---|
| `index.html` | PWA completa (single-file, sem dependências) |
| `apps_script.js` | Código para colar no Google Apps Script |
| `controlo_despesas.xlsx` | Template do Google Sheet (importar para Drive) |

## Setup inicial (uma vez)

### 1. Google Sheet
1. Importa `controlo_despesas.xlsx` para o Google Drive
2. Abre o Sheet → **Extensões → Apps Script**
3. Apaga o código por defeito, cola o conteúdo de `apps_script.js`
4. Clica em **Implementar → Nova implementação**
   - Tipo: Aplicação Web
   - Executar como: Eu
   - Quem tem acesso: **Qualquer pessoa**
5. Copia o URL da Web App (formato: `https://script.google.com/macros/s/.../exec`)

### 2. PWA no iPhone
1. Abre `https://<user>.github.io/despesa/` no **Safari**
2. Toca no botão de partilha → **Adicionar ao Ecrã de Início**
3. Toca no ícone ⚙️ dentro da app → cola o URL do Apps Script → Guardar

### 3. Automação iOS (opcional, recomendado)
1. Abre **Atalhos** → Automação → Nova automação
2. Gatilho: **Transação com cartão** (Apple Pay)
3. Ação: **Abrir URL**: `https://<user>.github.io/despesa/?amount=[valor]&merchant=[comerciante]`
4. Desativa "Pedir antes de executar"

## Fluxo de uso

- **Com automação:** pagamento Apple Pay → app abre automaticamente com valor pré-preenchido → ecrã de categoria aparece após 600ms → seleciona/escreve categoria → ✓ gravado
- **Manual:** abre app → introduz valor → seleciona categoria → ✓ gravado

## Estrutura do Sheet

| Folha | Colunas |
|---|---|
| Transações | Data, Valor, Categoria, Subcategoria, Comerciante, Descrição |
| Categorias | Nome, Subcategoria, Cor |
| Orçamento | Categoria, Orçamento, Gasto, Diferença, %, Semáforo |

## Re-deploy (após alterações)

```bash
git add .
git commit -m "descrição da alteração"
git push origin main
```

GitHub Pages atualiza automaticamente em ~1 minuto.

## Troubleshooting

**A app não grava:**
- Verifica que o URL do Apps Script está configurado (⚙️)
- Confirma que o deploy do Apps Script está como "Qualquer pessoa"
- Nota: com `mode: 'no-cors'` o fetch não recebe resposta; a app assume sucesso. Verifica o Sheet para confirmar.

**Categorias novas não aparecem no Sheet:**
- A PWA guarda categorias novas localmente (localStorage). O Apps Script cria-as no Sheet quando gravares a primeira despesa nessa categoria com `isNewCategory: true`.

**A automação iOS não dispara:**
- A automação "Transação com cartão" requer iOS 16.4+ e Apple Card ou cartões compatíveis.
- Alternativa: criar atalho manual no Ecrã de Início.

**GitHub Pages não atualiza:**
- Pode demorar 1-3 minutos. Força reload no Safari com Cmd+Shift+R.
