const SHEET_NAME = 'Tareas';
// Opción recomendada (script standalone): configura SPREADSHEET_ID en Script Properties.
// Si está vacío, intenta usar Spreadsheet "bound".
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '';

const HEADERS = [
  'id',
  'area',
  'workType',
  'description',
  'additionalComments',
  'technicianName',
  'shift',
  'signature',
  'beforePhoto',
  'afterPhoto',
  'createdAt',
  'finishedAt',
  'deleted',
];

function doGet() {
  try {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();

    if (values.length <= 1) {
      return jsonOutput_({ success: true, data: [] });
    }

    const header = values[0];
    const rows = values.slice(1).map((row) => {
      const record = {};
      header.forEach((key, index) => {
        record[key] = row[index];
      });

      return {
        ...record,
        deleted: String(record.deleted).toLowerCase() === 'true',
      };
    });

    return jsonOutput_({ success: true, data: rows });
  } catch (error) {
    return jsonOutput_({ success: false, error: String(error) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = String(payload.action || '').toLowerCase();

    if (!payload.id) {
      return jsonOutput_({ success: false, error: 'id is required' });
    }

    const sheet = getSheet_();

    if (action === 'delete' || payload.deleted === true) {
      deleteById_(sheet, payload.id);
      return jsonOutput_({ success: true, action: 'delete', id: payload.id });
    }

    upsertRow_(sheet, payload);
    return jsonOutput_({ success: true, action: 'upsert', id: payload.id });
  } catch (error) {
    return jsonOutput_({ success: false, error: String(error) });
  }
}

function getSheet_() {
  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error('No se encontró Spreadsheet. Configura SPREADSHEET_ID en Script Properties o usa un script vinculado a la hoja.');
  }

  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    const needsHeaderFix = HEADERS.some((header, index) => currentHeaders[index] !== header);

    if (needsHeaderFix) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }
  }

  return sheet;
}

function findRowById_(sheet, id) {
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i += 1) {
    if (String(data[i][0]) === String(id)) {
      return i + 1; // 1-based row number
    }
  }

  return -1;
}

function upsertRow_(sheet, payload) {
  const rowValues = [
    payload.id,
    payload.area || '',
    payload.workType || '',
    payload.description || '',
    payload.additionalComments || '',
    payload.technicianName || '',
    payload.shift || '',
    payload.signature || '',
    payload.beforePhoto || '',
    payload.afterPhoto || '',
    payload.createdAt || new Date().toISOString(),
    payload.finishedAt || new Date().toISOString(),
    false,
  ];

  const rowNumber = findRowById_(sheet, payload.id);

  if (rowNumber > 0) {
    sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function deleteById_(sheet, id) {
  const rowNumber = findRowById_(sheet, id);

  if (rowNumber > 0) {
    sheet.deleteRow(rowNumber);
  }
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
