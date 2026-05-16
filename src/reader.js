import { asText, isBlank } from './utils.js';

function getExcelJS() {
  if (!globalThis.ExcelJS || !globalThis.ExcelJS.Workbook) {
    throw new Error('ExcelJS nao foi carregado. Verifique o script CDN em index.html.');
  }
  return globalThis.ExcelJS;
}

export async function readMvvFile(file, config) {
  const ExcelJS = getExcelJS();
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet(config.input.mvv_sheet_name);
  if (!sheet) {
    throw new Error(`Aba MVV nao encontrada: ${config.input.mvv_sheet_name}`);
  }

  const headerRowNumber = config.input.mvv_header_row;
  const headerRow = sheet.getRow(headerRowNumber);
  const headerCount = headerRow.cellCount;
  const headers = Array.from({ length: headerCount }, (_, idx) => asText(headerRow.getCell(idx + 1).value));

  const rows = [];
  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = Array.from({ length: headerCount }, (_, idx) => row.getCell(idx + 1).value ?? null);
    const blank = values.every(isBlank);
    rows.push({ sourceRow: rowNumber, values, blank });
  }

  return {
    fileName: file.name,
    sheetName: sheet.name,
    headers,
    rows,
  };
}

export async function readRdFile(file, config) {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const rows = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const values = trimmed.split(config.input.rd_delimiter).map((value) => value.trim());
    rows.push({ sourceLine: idx + 1, values, blank: false });
  });

  return {
    fileName: file.name,
    rows,
  };
}
