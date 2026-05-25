import { asText, compareHoleKeys, firstNonBlank, normalizeHoleKey, normalizeIdValue, optionalNumber, prefixFromId, toNumber } from './utils.js';

export function buildMvvRows(rawMvv, config, validation) {
  const indexMap = validation.indexMap;
  const headers = config.columns.mvv;
  const stripPrefixes = config.matching.strip_prefixes;
  const numericFields = new Set(config.validation.mvv_numeric_fields);
  const rows = [];

  for (const rawRow of rawMvv.rows) {
    if (rawRow.blank) continue;
    const item = { sourceRow: rawRow.sourceRow };
    for (const column of headers) {
      const index = indexMap.get(column);
      item[column] = rawRow.values[index] ?? null;
    }

    item.ID = normalizeIdValue(item.ID);
    item.Type = asText(item.Type);
    item.Descricao = asText(item.Descricao);

    for (const column of numericFields) {
      item[column] = optionalNumber(item[column]);
    }

    item.holeKey = normalizeHoleKey(item.ID, stripPrefixes);
    rows.push(item);
  }

  if (!rows.length) {
    throw new Error('MVV has no usable rows after validation');
  }

  return rows;
}

export function buildMvvPlanRows(rawMvv, config, validation) {
  const indexMap = validation.indexMap;
  const headers = config.columns.mvv_plan;
  const numericFields = new Set(config.validation.mvv_plan_numeric_fields);
  const rows = [];

  for (const rawRow of rawMvv.rows) {
    if (rawRow.blank) continue;
    const item = {};
    for (const column of headers) {
      const value = rawRow.values[indexMap.get(column)] ?? null;
      item[column] = numericFields.has(column) ? optionalNumber(value) : asText(value);
    }
    rows.push(item);
  }

  if (!rows.length) {
    throw new Error('MVV has no usable rows after validation');
  }

  return rows;
}

export function buildRdRows(rawRd, config) {
  const stripPrefixes = config.matching.strip_prefixes;
  const rows = [];

  for (const rawRow of rawRd.rows) {
    if (rawRow.blank) continue;
    if (rawRow.values.length !== config.input.rd_expected_fields) continue;
    const rawId = asText(rawRow.values[0]);
    rows.push({
      sourceLine: rawRow.sourceLine,
      ID_RD: rawId,
      TIPO_RD: prefixFromId(rawId, stripPrefixes),
      Y_RD: toNumber(rawRow.values[2], `RD line ${rawRow.sourceLine}`, 'Y_RD'),
      X_RD: toNumber(rawRow.values[3], `RD line ${rawRow.sourceLine}`, 'X_RD'),
      Z_RD: toNumber(rawRow.values[4], `RD line ${rawRow.sourceLine}`, 'Z_RD'),
      holeKey: normalizeHoleKey(rawId, stripPrefixes),
    });
  }

  return rows;
}

export function deduplicateRdRows(rdRows, config) {
  const priority = new Map(config.matching.prefix_priority.map((prefix, idx) => [prefix, idx]));
  const preferFirst = Boolean(config.matching.prefer_first_within_same_prefix);
  const selected = new Map();
  const prefixesByHole = new Map();

  for (const row of rdRows) {
    const holeKey = row.holeKey;
    if (!prefixesByHole.has(holeKey)) prefixesByHole.set(holeKey, new Set());
    prefixesByHole.get(holeKey).add(row.TIPO_RD);

    const current = selected.get(holeKey);
    if (!current) {
      selected.set(holeKey, row);
      continue;
    }

    const currentRank = priority.has(current.TIPO_RD) ? priority.get(current.TIPO_RD) : Number.POSITIVE_INFINITY;
    const newRank = priority.has(row.TIPO_RD) ? priority.get(row.TIPO_RD) : Number.POSITIVE_INFINITY;

    if (newRank < currentRank) {
      selected.set(holeKey, row);
    } else if (newRank === currentRank && !preferFirst) {
      selected.set(holeKey, row);
    }
  }

  const treatedRows = [...selected.values()].sort((a, b) => compareHoleKeys(a.holeKey, b.holeKey));
  const dualPrefixCount = [...prefixesByHole.values()].filter((set) => set.size > 1).length;

  return { treatedRows, selected, dualPrefixCount };
}

export function buildRdOnlyRows(rdTreatedRows, config, projectDepth) {
  if (!rdTreatedRows.length) {
    throw new Error('RD has no usable rows after validation');
  }

  const depth = Number(projectDepth);
  if (!Number.isFinite(depth) || depth <= 0) {
    throw new Error('Invalid project depth');
  }

  const fixedDepth = Number(depth.toFixed(3));

  const [idColumn, yColumn, xColumn, zColumn, depthColumn] = config.columns.rd_only;

  return rdTreatedRows.map((row) => {
    const holeId = Number(row.holeKey);
    if (!Number.isFinite(holeId)) {
      throw new Error(`RD line ${row.sourceLine ?? '?'}: invalid numeric hole ID`);
    }

    return {
      [idColumn]: holeId,
      [yColumn]: row.Y_RD,
      [xColumn]: row.X_RD,
      [zColumn]: row.Z_RD,
      [depthColumn]: fixedDepth,
    };
  });
}

export function buildConsolidatedRows(mvvRows, rdSelected, rdRawCount, dualPrefixCount) {
  const mvvKeys = new Set(mvvRows.map((row) => row.holeKey));
  const missingHoles = [];
  const consolidatedRows = [];

  for (const row of mvvRows) {
    const rdRow = rdSelected.get(row.holeKey) || null;
    if (!rdRow) missingHoles.push(row.holeKey);

    const idFinal = rdRow ? rdRow.ID_RD : row.ID;
    const yFinal = firstNonBlank(rdRow ? rdRow.Y_RD : null, row['Y Collar']);
    const xFinal = firstNonBlank(rdRow ? rdRow.X_RD : null, row['X Collar']);
    const zCollarFinal = firstNonBlank(rdRow ? rdRow.Z_RD : null, row['Z Collar']);
    const profundidadeFinal = rdRow ? (rdRow.Z_RD + row['Sub Drill']) - row['Z Toe'] : row.Depth;

    consolidatedRows.push({
      ID: row.ID,
      Type: row.Type,
      Descricao: row.Descricao,
      Diameter: row.Diameter,
      'X Collar': row['X Collar'],
      'Y Collar': row['Y Collar'],
      'X Toe': row['X Toe'],
      'Y Toe': row['Y Toe'],
      'Z Toe': row['Z Toe'],
      'Z Collar': row['Z Collar'],
      Depth: row.Depth,
      'Sub Drill': row['Sub Drill'],
      Azimuth: row.Azimuth,
      Dip: row.Dip,
      ID_RD: rdRow ? rdRow.ID_RD : null,
      TIPO_RD: rdRow ? rdRow.TIPO_RD : null,
      Y_RD: rdRow ? rdRow.Y_RD : null,
      X_RD: rdRow ? rdRow.X_RD : null,
      Z_RD: rdRow ? rdRow.Z_RD : null,
      ID_FINAL: idFinal,
      Y_FINAL: yFinal,
      X_FINAL: xFinal,
      Z_COLLAR_FINAL: zCollarFinal,
      PROFUNDIDADE_FINAL: profundidadeFinal,
    });
  }

  const summary = {
    mvvCount: mvvRows.length,
    rdRawCount,
    rdUniqueCount: rdSelected.size,
    rdMatchedCount: mvvRows.length - missingHoles.length,
    rdMissingCount: missingHoles.length,
    dualPrefixCount,
    missingHoles,
    rdOnlyHoles: [...rdSelected.keys()].filter((key) => !mvvKeys.has(key)).sort(compareHoleKeys),
    discardedRdCount: rdRawCount - rdSelected.size,
  };

  return { consolidatedRows, summary };
}
