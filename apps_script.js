/**
 * ============================================================
 *  CONTROLO DE DESPESAS — APPS SCRIPT
 *  Endpoint para receber POSTs da PWA "despesa.html"
 *
 *  Funcionalidades:
 *   1. Grava cada despesa na folha "Transações"
 *   2. Se a categoria for nova (isNewCategory=true), acrescenta-a
 *      automaticamente às folhas "Categorias" e "Orçamento"
 *
 *  Deploy: Extensões → Apps Script → cola este código →
 *          Implementar → Aplicação Web → Qualquer pessoa
 * ============================================================
 */

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);

    // ---- 1. Se for categoria nova, adicionar às folhas auxiliares ----
    if (data.isNewCategory && data.categoria) {
      ensureCategoryExists(ss, data.categoria);
    }

    // ---- 2. Gravar a despesa na folha Transações ----
    const sheet = ss.getSheetByName("Transações");
    if (!sheet) throw new Error("Folha 'Transações' não encontrada.");

    const lastRow = sheet.getRange("A:A").getValues().filter(r => r[0] !== "").length + 1;

    sheet.getRange(lastRow, 1).setValue(new Date(data.data));
    sheet.getRange(lastRow, 2).setValue(parseFloat(data.valor));
    sheet.getRange(lastRow, 3).setValue(data.categoria);
    sheet.getRange(lastRow, 4).setValue(data.subcategoria || "");
    sheet.getRange(lastRow, 5).setValue(data.comerciante || "");
    sheet.getRange(lastRow, 6).setValue(data.descricao || "");

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Garante que uma categoria existe nas folhas Categorias e Orçamento.
 * Se não existir, cria-a com valores padrão.
 */
function ensureCategoryExists(ss, categoryName) {
  const name = String(categoryName).trim();
  if (!name) return;

  // --- Folha Categorias ---
  const catSheet = ss.getSheetByName("Categorias");
  if (catSheet) {
    const catValues = catSheet.getRange("A:A").getValues().map(r => String(r[0]).trim());
    const exists = catValues.some(v => v.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const newRow = catValues.filter(v => v !== "").length + 1;
      catSheet.getRange(newRow, 1).setValue(name);
      catSheet.getRange(newRow, 2).setValue("Geral"); // Subcategoria default
      catSheet.getRange(newRow, 3).setValue("#7F8C8D"); // Cor default
    }
  }

  // --- Folha Orçamento ---
  const budgetSheet = ss.getSheetByName("Orçamento");
  if (budgetSheet) {
    const budgetValues = budgetSheet.getRange("A:A").getValues().map(r => String(r[0]).trim());
    const existsBudget = budgetValues.some(v => v.toLowerCase() === name.toLowerCase());
    if (!existsBudget) {
      // Encontrar a linha "TOTAL" para inserir antes dela
      let totalRow = -1;
      for (let i = 0; i < budgetValues.length; i++) {
        if (budgetValues[i].toUpperCase() === "TOTAL") {
          totalRow = i + 1; // 1-indexed
          break;
        }
      }

      if (totalRow > 0) {
        // Inserir linha antes de TOTAL
        budgetSheet.insertRowBefore(totalRow);
        const r = totalRow;

        budgetSheet.getRange(r, 1).setValue(name);
        budgetSheet.getRange(r, 2).setValue(0); // Orçamento 0 (tu defines depois)
        budgetSheet.getRange(r, 3).setFormula(
          '=SUMIFS(Transações!B:B,Transações!C:C,A' + r +
          ',Transações!G:G,TEXT(TODAY(),"mmmm"),Transações!H:H,YEAR(TODAY()))'
        );
        budgetSheet.getRange(r, 4).setFormula('=B' + r + '-C' + r);
        budgetSheet.getRange(r, 5).setFormula('=IF(B' + r + '=0,0,C' + r + '/B' + r + ')');
        budgetSheet.getRange(r, 6).setFormula(
          '=IF(B' + r + '=0,"-",IF(E' + r + '>1,"🔴 Ultrapassado",IF(E' + r + '>0.8,"🟡 Atenção","🟢 OK")))'
        );

        // Formatação das células
        budgetSheet.getRange(r, 2).setFontColor("#0000FF").setFontWeight("bold").setNumberFormat('#,##0.00 €');
        budgetSheet.getRange(r, 3).setNumberFormat('#,##0.00 €');
        budgetSheet.getRange(r, 4).setNumberFormat('#,##0.00 €;[Red](#,##0.00 €)');
        budgetSheet.getRange(r, 5).setNumberFormat('0%');
      } else {
        // Sem linha TOTAL — acrescenta no fim
        const lastRow = budgetValues.filter(v => v !== "").length + 1;
        const r = lastRow;

        budgetSheet.getRange(r, 1).setValue(name);
        budgetSheet.getRange(r, 2).setValue(0);
        budgetSheet.getRange(r, 3).setFormula(
          '=SUMIFS(Transações!B:B,Transações!C:C,A' + r +
          ',Transações!G:G,TEXT(TODAY(),"mmmm"),Transações!H:H,YEAR(TODAY()))'
        );
        budgetSheet.getRange(r, 4).setFormula('=B' + r + '-C' + r);
        budgetSheet.getRange(r, 5).setFormula('=IF(B' + r + '=0,0,C' + r + '/B' + r + ')');
        budgetSheet.getRange(r, 6).setFormula(
          '=IF(B' + r + '=0,"-",IF(E' + r + '>1,"🔴 Ultrapassado",IF(E' + r + '>0.8,"🟡 Atenção","🟢 OK")))'
        );

        budgetSheet.getRange(r, 2).setFontColor("#0000FF").setFontWeight("bold").setNumberFormat('#,##0.00 €');
        budgetSheet.getRange(r, 3).setNumberFormat('#,##0.00 €');
        budgetSheet.getRange(r, 4).setNumberFormat('#,##0.00 €;[Red](#,##0.00 €)');
        budgetSheet.getRange(r, 5).setNumberFormat('0%');
      }
    }
  }
}
