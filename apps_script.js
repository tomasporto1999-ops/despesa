/**
 * ============================================================
 *  CONTROLO DE DESPESAS — APPS SCRIPT
 * ============================================================
 */

function deaccent(s) {
  var result = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c >= 0x0300 && c <= 0x036F) { continue; }
    if (c===0x00E0||c===0x00E1||c===0x00E2||c===0x00E3||c===0x00E4||c===0x00E5||
        c===0x00C0||c===0x00C1||c===0x00C2||c===0x00C3||c===0x00C4||c===0x00C5) { result+='a'; continue; }
    if (c===0x00E8||c===0x00E9||c===0x00EA||c===0x00EB||
        c===0x00C8||c===0x00C9||c===0x00CA||c===0x00CB) { result+='e'; continue; }
    if (c===0x00EC||c===0x00ED||c===0x00EE||c===0x00EF||
        c===0x00CC||c===0x00CD||c===0x00CE||c===0x00CF) { result+='i'; continue; }
    if (c===0x00F2||c===0x00F3||c===0x00F4||c===0x00F5||c===0x00F6||
        c===0x00D2||c===0x00D3||c===0x00D4||c===0x00D5||c===0x00D6) { result+='o'; continue; }
    if (c===0x00F9||c===0x00FA||c===0x00FB||c===0x00FC||
        c===0x00D9||c===0x00DA||c===0x00DB||c===0x00DC) { result+='u'; continue; }
    if (c===0x00E7||c===0x00C7) { result+='c'; continue; }
    if (c===0x00F1||c===0x00D1) { result+='n'; continue; }
    result += s[i].toLowerCase();
  }
  return result;
}

function findSheet(ss, name) {
  var target = deaccent(name);
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (deaccent(sheets[i].getName()) === target) return sheets[i];
  }
  return null;
}

// Devolve todas as transacoes como JSON (para sincronizacao local)
function doGet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = findSheet(ss, 'Transacoes');
    if (!sheet) throw new Error('Folha Transacoes nao encontrada');

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      if (!data[i][0]) continue; // ignorar linhas vazias
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        var val = data[i][j];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), 'dd/MM/yyyy');
        }
        row[headers[j]] = val;
      }
      rows.push(row);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', rows: rows }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    if (data.isNewCategory && data.categoria) {
      ensureCategoryExists(ss, data.categoria);
    }

    var sheet = findSheet(ss, 'Transacoes');
    if (!sheet) throw new Error('Folha Transacoes nao encontrada');

    // Reparar formulas do Orcamento se necessario (executa uma vez)
    repairOrcamentoFormulas(ss);

    var dateVal = new Date(data.data + 'T12:00:00'); // meio-dia evita problemas de timezone
    var valor = parseFloat(data.valor);
    var mes = dateVal.getMonth() + 1;   // numero 1-12
    var ano = dateVal.getFullYear();

    var lastRow = sheet.getLastRow() + 1;

    // Formatar data como DD/MM/YYYY
    sheet.getRange(lastRow, 1).setValue(dateVal).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(lastRow, 2).setValue(valor).setNumberFormat('#,##0.00');
    sheet.getRange(lastRow, 3).setValue(data.categoria);
    sheet.getRange(lastRow, 4).setValue(data.subcategoria || '');
    sheet.getRange(lastRow, 5).setValue(data.comerciante || '');
    sheet.getRange(lastRow, 6).setValue(data.descricao || '');
    sheet.getRange(lastRow, 7).setValue(mes);   // numero do mes
    sheet.getRange(lastRow, 8).setValue(ano);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Repara as formulas do Orcamento para usar numero do mes (1-12) em vez de nome
function repairOrcamentoFormulas(ss) {
  var sheet = findSheet(ss, 'Orcamento');
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Verificar se ja foi reparado (coluna C linha 2 deve ter SUMIFS com MONTH)
  var formula = sheet.getRange(2, 3).getFormula();
  if (formula && formula.indexOf('MONTH') >= 0) return; // ja reparado

  // Nome da folha Transacoes (com acento correto)
  var txSheet = findSheet(ss, 'Transacoes');
  if (!txSheet) return;
  var txName = txSheet.getName();

  for (var r = 2; r <= lastRow; r++) {
    var cat = sheet.getRange(r, 1).getValue();
    if (!cat || String(cat).toUpperCase() === 'TOTAL') continue;

    // Gasto mes atual: SUMIFS por categoria + mes + ano
    sheet.getRange(r, 3).setFormula(
      "=SUMIFS('" + txName + "'!B:B," +
      "'" + txName + "'!C:C,A" + r + "," +
      "'" + txName + "'!G:G,MONTH(TODAY())," +
      "'" + txName + "'!H:H,YEAR(TODAY()))"
    );
    sheet.getRange(r, 4).setFormula('=B' + r + '-C' + r);
    sheet.getRange(r, 5).setFormula('=IF(B' + r + '=0,0,C' + r + '/B' + r + ')');
    sheet.getRange(r, 6).setFormula(
      '=IF(B' + r + '=0,"-",IF(E' + r + '>1,"🔴 Ultrapassado",IF(E' + r + '>0.8,"🟡 Atenção","🟢 OK")))'
    );

    sheet.getRange(r, 3).setNumberFormat('#,##0.00');
    sheet.getRange(r, 4).setNumberFormat('#,##0.00');
    sheet.getRange(r, 5).setNumberFormat('0%');
  }

  // Reparar tambem linhas existentes na Transacoes (converter "April" -> 4)
  repairTransacoesMonths(ss, txSheet);
}

// Converte coluna G de nome de mes para numero nas linhas ja existentes
function repairTransacoesMonths(ss, sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var monthNames = {
    'january':1,'february':2,'march':3,'april':4,'may':5,'june':6,
    'july':7,'august':8,'september':9,'october':10,'november':11,'december':12,
    'janeiro':1,'fevereiro':2,'marco':3,'abril':4,'maio':5,'junho':6,
    'julho':7,'agosto':8,'setembro':9,'outubro':10,'novembro':11,'dezembro':12
  };

  for (var r = 2; r <= lastRow; r++) {
    var dateVal = sheet.getRange(r, 1).getValue();
    var mesCell = sheet.getRange(r, 7).getValue();

    if (dateVal instanceof Date) {
      sheet.getRange(r, 1).setNumberFormat('dd/MM/yyyy');
      sheet.getRange(r, 7).setValue(dateVal.getMonth() + 1);
      sheet.getRange(r, 8).setValue(dateVal.getFullYear());
    } else if (typeof mesCell === 'string') {
      var n = monthNames[deaccent(mesCell)];
      if (n) sheet.getRange(r, 7).setValue(n);
    }
  }
}

function ensureCategoryExists(ss, categoryName) {
  var name = String(categoryName).trim();
  if (!name) return;

  var catSheet = findSheet(ss, 'Categorias');
  if (catSheet) {
    var catValues = catSheet.getRange('A:A').getValues().map(function(r) { return String(r[0]).trim(); });
    var exists = catValues.some(function(v) { return v.toLowerCase() === name.toLowerCase(); });
    if (!exists) {
      var newRow = catValues.filter(function(v) { return v !== ''; }).length + 1;
      catSheet.getRange(newRow, 1).setValue(name);
      catSheet.getRange(newRow, 2).setValue('Geral');
      catSheet.getRange(newRow, 3).setValue('#7F8C8D');
    }
  }
}
