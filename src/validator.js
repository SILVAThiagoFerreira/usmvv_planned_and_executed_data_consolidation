import { asText, headerIndexMap, isBlank, toNumber } from './utils.js';

export function validateMvvSource(rawMvv, config) {
  const headers = rawMvv.headers;
  const requiredHeaders = config.columns.mvv;
  const requiredRowColumns = config.validation.mvv_required_row_columns;
  const numericFields = new Set(config.validation.mvv_numeric_fields);
  const allowEmptyRows = Boolean(config.validation.allow_empty_rows);

  const indexMap = headerIndexMap(headers);
  const missing = requiredHeaders.filter((header) => !indexMap.has(header));
  if (missing.length) {
    throw new Error(`Missing MVV columns: ${missing.join(', ')}`);
  }

  let rowCount = 0;
  for (const row of rawMvv.rows) {
    if (row.blank) {
      if (allowEmptyRows) continue;
      throw new Error(`Empty MVV row found at line ${row.sourceRow}`);
    }
    rowCount += 1;
    const context = `MVV linha ${row.sourceRow}`;
    if (isBlank(row.values[indexMap.get('ID')])) {
      throw new Error(`${context}: missing ID`);
    }
    for (const column of requiredRowColumns) {
      const value = row.values[indexMap.get(column)];
      if (isBlank(value)) {
        throw new Error(`${context}: missing required field ${column}`);
      }
      if (numericFields.has(column)) {
        toNumber(value, context, column);
      }
    }
  }

  if (rowCount === 0 && config.validation.fail_on_missing_mvv_rows) {
    throw new Error('MVV has no data rows');
  }

  return { rowCount, headerCount: headers.length, indexMap };
}

export function validateRdSource(rawRd, config) {
  const expectedFields = config.input.rd_expected_fields;
  const allowedPrefixes = config.matching.strip_prefixes;
  const numericFields = config.validation.rd_numeric_fields || ['Y_RD', 'X_RD', 'Z_RD'];
  const allowEmptyRows = Boolean(config.validation.allow_empty_rows);

  let rowCount = 0;
  for (const row of rawRd.rows) {
    if (row.blank) {
      if (allowEmptyRows) continue;
      throw new Error(`Empty RD row found at line ${row.sourceLine}`);
    }

    rowCount += 1;
    if (row.values.length !== expectedFields) {
      if (config.validation.fail_on_bad_rd_rows) {
        throw new Error(`RD line ${row.sourceLine}: expected ${expectedFields} fields, found ${row.values.length}`);
      }
      continue;
    }

    const context = `RD line ${row.sourceLine}`;
    const id = asText(row.values[0]);
    if (!id) {
      throw new Error(`${context}: missing ID_RD`);
    }
    if (!isBlank(row.values[1])) {
      throw new Error(`${context}: expected empty second field`);
    }
    if (!allowedPrefixes.some((prefix) => id.startsWith(prefix))) {
      if (config.validation.fail_on_invalid_prefix) {
        throw new Error(`${context}: invalid prefix in ID_RD -> ${id}`);
      }
    }
    if (config.validation.fail_on_unparseable_coordinates) {
      for (const [index, fieldName] of [[2, numericFields[0]], [3, numericFields[1]], [4, numericFields[2]]]) {
        toNumber(row.values[index], context, fieldName);
      }
    }
  }

  return { rowCount };
}
