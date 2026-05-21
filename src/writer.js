function getExcelJS() {
  if (!globalThis.ExcelJS || !globalThis.ExcelJS.Workbook) {
    throw new Error('ExcelJS nao foi carregado.');
  }
  return globalThis.ExcelJS;
}

function hexColor(value) {
  return `FF${String(value).replace('#', '').toUpperCase()}`;
}

function columnLetter(index) {
  let value = index;
  let letters = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

function applyHeaderStyle(row, config, highlightFinal, finalColumns) {
  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: hexColor(config.formatting.header_fill) },
  };
  const finalFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: hexColor(config.formatting.final_fill) },
  };

  row.eachCell((cell, colNumber) => {
    const header = cell.value;
    cell.font = { name: config.formatting.font_name, size: 11, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = highlightFinal && finalColumns.has(header) ? finalFill : headerFill;
    cell.border = {
      top: { style: 'thin', color: { argb: '33223344' } },
      left: { style: 'thin', color: { argb: '33223344' } },
      bottom: { style: 'thin', color: { argb: '33223344' } },
      right: { style: 'thin', color: { argb: '33223344' } },
    };
  });
}

function applyDataStyle(sheet, headers, config, finalColumns) {
  const numericHeaders = new Set(config.formatting.numeric_headers);
  const finalFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: hexColor(config.formatting.final_fill) },
  };

  for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx += 1) {
    const row = sheet.getRow(rowIdx);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      cell.font = { name: config.formatting.font_name, size: 11, color: { argb: 'FF000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'hair', color: { argb: '22445566' } },
        left: { style: 'hair', color: { argb: '22445566' } },
        bottom: { style: 'hair', color: { argb: '22445566' } },
        right: { style: 'hair', color: { argb: '22445566' } },
      };

      if (numericHeaders.has(header) && cell.value !== null && cell.value !== undefined && cell.value !== '') {
        cell.numFmt = config.formatting.numeric_format;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }

      if (finalColumns.has(header)) {
        cell.fill = finalFill;
      }
    });
  }
}

function autoFitColumns(sheet, headers, config) {
  const numericHeaders = new Set(config.formatting.numeric_headers);
  const minWidth = config.formatting.min_width;
  const maxWidth = config.formatting.max_width;

  headers.forEach((header, idx) => {
    let maxLength = String(header).length;
    sheet.getColumn(idx + 1).eachCell({ includeEmpty: true }, (cell) => {
      let text = '';
      if (cell.value === null || cell.value === undefined) {
        text = '';
      } else if (numericHeaders.has(header) && typeof cell.value === 'number') {
        text = cell.value.toFixed(3);
      } else {
        text = String(cell.value);
      }
      if (text.length > maxLength) maxLength = text.length;
    });
    sheet.getColumn(idx + 1).width = Math.max(minWidth, Math.min(maxWidth, maxLength + 2));
  });
}

function addTableSheet(workbook, sheetName, headers, rows, config, options = {}) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = headers.map((header) => ({ header, key: header }));
  rows.forEach((row) => sheet.addRow(row));
  const finalColumns = new Set(options.finalColumns || []);
  applyHeaderStyle(sheet.getRow(1), config, Boolean(options.highlightFinal), finalColumns);
  applyDataStyle(sheet, headers, config, finalColumns);
  autoFitColumns(sheet, headers, config);
  sheet.autoFilter = `A1:${columnLetter(headers.length)}${sheet.rowCount}`;
  return sheet;
}

function addLogSheet(workbook, summary, config, metadata) {
  const sheet = workbook.addWorksheet(config.output.sheets.log, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: hexColor(config.formatting.header_fill) },
  };
  const sectionFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: hexColor(config.formatting.section_fill) },
  };

  sheet.getCell('A1').value = 'Indicador';
  sheet.getCell('B1').value = 'Valor';
  sheet.getCell('D1').value = 'Campo';
  sheet.getCell('E1').value = 'Valor';

  const metricRows = [
    [config.output.labels.mvv_count, summary.mvvCount],
    [config.output.labels.rd_raw_count, summary.rdRawCount],
    [config.output.labels.rd_unique_count, summary.rdUniqueCount],
    [config.output.labels.rd_matched_count, summary.rdMatchedCount],
    [config.output.labels.rd_missing_count, summary.rdMissingCount],
    [config.output.labels.dual_prefix_count, summary.dualPrefixCount],
  ];

  metricRows.forEach(([label, value], idx) => {
    sheet.getCell(`A${idx + 2}`).value = label;
    sheet.getCell(`B${idx + 2}`).value = value;
  });

  const metadataRows = [
    ['Run ID', metadata.runId],
    ['Generated at', metadata.generatedAt],
    ['Config', metadata.configPath],
    ['Output', metadata.outputPath],
  ];

  metadataRows.forEach(([label, value], idx) => {
    sheet.getCell(`D${idx + 2}`).value = label;
    sheet.getCell(`E${idx + 2}`).value = value;
  });

  sheet.getCell('A9').value = config.output.labels.missing_title;
  sheet.getCell('D9').value = config.output.labels.rd_only_title;
  sheet.getCell('A9').fill = sectionFill;
  sheet.getCell('D9').fill = sectionFill;
  sheet.getCell('A9').font = { name: config.formatting.font_name, bold: true };
  sheet.getCell('D9').font = { name: config.formatting.font_name, bold: true };

  summary.missingHoles.forEach((hole, idx) => {
    sheet.getCell(`A${idx + 10}`).value = hole;
  });

  summary.rdOnlyHoles.forEach((hole, idx) => {
    sheet.getCell(`D${idx + 10}`).value = hole;
  });

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { name: config.formatting.font_name, size: 11, bold: true };
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  ['A', 'B', 'D', 'E'].forEach((column) => {
    sheet.getColumn(column).width = column === 'B' || column === 'E' ? 24 : 48;
  });

  sheet.autoFilter = 'A1:B7';
}

export async function createWorkbookBuffer({ config, consolidatedRows, rdTreatedRows, summary, metadata }) {
  const ExcelJS = getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MVV RD GitHub Pages';
  workbook.lastModifiedBy = 'MVV RD GitHub Pages';
  workbook.created = new Date();
  workbook.modified = new Date();

  addTableSheet(
    workbook,
    config.output.sheets.consolidated,
    config.columns.consolidated,
    consolidatedRows,
    config,
    { highlightFinal: true, finalColumns: config.formatting.highlight_final_columns },
  );

  addTableSheet(
    workbook,
    config.output.sheets.rd_treated,
    config.columns.rd_treated,
    rdTreatedRows,
    config,
  );

  addLogSheet(workbook, summary, config, metadata);
  return workbook.xlsx.writeBuffer();
}

export async function createMvvPlanWorkbookBuffer({ config, mvvPlanRows }) {
  const ExcelJS = getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MVV RD GitHub Pages';
  workbook.lastModifiedBy = 'MVV RD GitHub Pages';
  workbook.created = new Date();
  workbook.modified = new Date();

  addTableSheet(
    workbook,
    config.output.sheets.mvv_plan,
    config.columns.mvv_plan,
    mvvPlanRows,
    config,
  );

  return workbook.xlsx.writeBuffer();
}
