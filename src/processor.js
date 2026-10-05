import { asText, compareHoleKeys, dipNumber, firstNonBlank, getPitdevFieldPositions, normalizeHoleKey, normalizeIdValue, optionalNumber, prefixFromId, toNumber } from './utils.js?v=20261005-added-depth-3';

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
      item[column] = column === 'Dip' ? dipNumber(item[column], `MVV linha ${rawRow.sourceRow}`, column) : optionalNumber(item[column]);
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
      item[column] = numericFields.has(column) ? (column === 'Dip' ? dipNumber(value, `MVV linha ${rawRow.sourceRow}`, column) : optionalNumber(value)) : asText(value);
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

export function resolveRdOnlyExportMode(config, exportMode = null) {
  const exportConfig = config?.rd_only_export;
  if (!exportConfig || !exportConfig.default_mode || !exportConfig.modes) {
    throw new Error('Configuração inválida: modos de exportação do executado');
  }

  const selectedMode = exportMode ?? exportConfig.default_mode;
  const modeConfig = exportConfig.modes[selectedMode];
  if (!modeConfig || typeof modeConfig.columns_key !== 'string') {
    throw new Error(`Configuração inválida: modo de exportação do executado (${selectedMode})`);
  }

  const columns = config.columns?.[modeConfig.columns_key];
  if (!Array.isArray(columns) || columns.length < 4) {
    throw new Error(`Configuração inválida: colunas do modo de exportação do executado (${selectedMode})`);
  }

  if (Boolean(modeConfig.requires_depth_parameters) && columns.length < 5) {
    throw new Error(`Configuração inválida: o modo ${selectedMode} exige a coluna de profundidade`);
  }

  return {
    key: selectedMode,
    ...modeConfig,
    columns,
  };
}

export function buildRdOnlyRows(rdTreatedRows, config, toeElevation, subdrilling = 0, exportMode = null) {
  if (!rdTreatedRows.length) {
    throw new Error('RD has no usable rows after validation');
  }

  const modeConfig = resolveRdOnlyExportMode(config, exportMode);
  const [idColumn, yColumn, xColumn, zColumn, depthColumn] = modeConfig.columns;
  const includesDepth = Boolean(modeConfig.requires_depth_parameters);
  const toe = Number(toeElevation);
  const sub = Number(subdrilling);
  if (includesDepth && (!Number.isFinite(toe) || !Number.isFinite(sub) || sub < 0)) {
    throw new Error('Invalid toe elevation or subdrilling');
  }

  return rdTreatedRows.map((row) => {
    const holeId = Number(row.holeKey);
    if (!Number.isFinite(holeId)) {
      throw new Error(`RD line ${row.sourceLine ?? '?'}: invalid numeric hole ID`);
    }

    const outputRow = {
      [idColumn]: holeId,
      [yColumn]: row.Y_RD,
      [xColumn]: row.X_RD,
      [zColumn]: row.Z_RD,
    };

    if (includesDepth) {
      const calculatedDepth = Number((row.Z_RD - toe + sub).toFixed(3));
      if (calculatedDepth <= 0) {
        throw new Error(`RD line ${row.sourceLine ?? '?'}: calculated depth must be greater than zero`);
      }
      outputRow[depthColumn] = calculatedDepth;
    }

    return outputRow;
  });
}

export function buildConsolidatedRows(mvvRows, rdSelected, rdRawCount, dualPrefixCount, config, unplannedDepthOptions = null) {
  const mvvKeys = new Set(mvvRows.map((row) => row.holeKey));
  const missingHoles = [];
  const consolidatedRows = [];
  const importFields = config.matching.unplanned_import;
  const toeElevation = unplannedDepthOptions ? Number(unplannedDepthOptions.toeElevation) : null;
  const subdrilling = unplannedDepthOptions ? Number(unplannedDepthOptions.subdrilling) : null;
  if (unplannedDepthOptions && (!Number.isFinite(toeElevation) || toeElevation <= 0 || !Number.isFinite(subdrilling) || subdrilling < 0)) {
    throw new Error('Invalid toe elevation or subdrilling for unplanned RD holes');
  }

  for (const row of mvvRows) {
    const rdRow = rdSelected.get(row.holeKey) || null;
    if (!rdRow) missingHoles.push(row.holeKey);

    const idFinal = rdRow ? rdRow.ID_RD : row.ID;
    const yFinal = firstNonBlank(rdRow ? rdRow.Y_RD : null, row['Y Collar']);
    const xFinal = firstNonBlank(rdRow ? rdRow.X_RD : null, row['X Collar']);
    const zCollarFinal = firstNonBlank(rdRow ? rdRow.Z_RD : null, row['Z Collar']);
    const profundidadeFinal = rdRow ? rdRow.Z_RD - row['Z Toe'] : row.Depth;

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

  const rdOnlyRows = [...rdSelected.values()]
    .filter((rdRow) => !mvvKeys.has(rdRow.holeKey))
    .sort((a, b) => compareHoleKeys(a.holeKey, b.holeKey));

  for (const rdRow of rdOnlyRows) {
    const plannedId = normalizeIdValue(rdRow.holeKey);
    if (typeof plannedId !== 'number' || !Number.isFinite(plannedId)) {
      throw new Error(`RD line ${rdRow.sourceLine ?? '?'}: invalid numeric hole ID for unplanned row`);
    }
    const calculatedDepth = unplannedDepthOptions
      ? Number(rdRow[importFields.source_elevation_field]) - toeElevation + subdrilling
      : null;
    if (unplannedDepthOptions && (!Number.isFinite(calculatedDepth) || calculatedDepth <= 0)) {
      throw new Error(`RD line ${rdRow.sourceLine ?? '?'}: cannot calculate depth for unplanned row`);
    }
    consolidatedRows.push({
      ID: null,
      Type: null,
      Descricao: null,
      Diameter: null,
      'X Collar': null,
      'Y Collar': null,
      'X Toe': null,
      'Y Toe': null,
      'Z Toe': null,
      'Z Collar': null,
      Depth: null,
      'Sub Drill': null,
      Azimuth: null,
      Dip: null,
      ID_RD: rdRow.ID_RD,
      TIPO_RD: rdRow.TIPO_RD,
      Y_RD: rdRow.Y_RD,
      X_RD: rdRow.X_RD,
      Z_RD: rdRow.Z_RD,
      ID_FINAL: rdRow.ID_RD,
      Y_FINAL: rdRow.Y_RD,
      X_FINAL: rdRow.X_RD,
      Z_COLLAR_FINAL: rdRow.Z_RD,
      PROFUNDIDADE_FINAL: null,
      'Diâmetro': null,
      'Azimute': null,
      'Ângulo planejado': null,
      'Ângulo do talude': null,
      'Profundidade': null,
      [importFields.id_field]: plannedId,
      [importFields.description_field]: importFields.description_value,
      [importFields.x_collar_field]: rdRow[importFields.x_source_field],
      [importFields.y_collar_field]: rdRow[importFields.y_source_field],
      [importFields.z_collar_field]: rdRow[importFields.z_source_field],
      [importFields.toe_field]: unplannedDepthOptions ? toeElevation : null,
      [importFields.subdrilling_field]: unplannedDepthOptions ? subdrilling : null,
      [importFields.depth_field]: calculatedDepth,
      [importFields.secondary_depth_field]: calculatedDepth,
      [importFields.final_depth_field]: calculatedDepth,
    });
  }

  const summary = {
    mvvCount: mvvRows.length,
    rdRawCount,
    rdUniqueCount: rdSelected.size,
    rdMatchedCount: mvvRows.length - missingHoles.length,
    rdMissingCount: missingHoles.length,
    rdOnlyIncludedCount: rdOnlyRows.length,
    dualPrefixCount,
    missingHoles,
    rdOnlyHoles: rdOnlyRows.map((row) => row.holeKey),
    discardedRdCount: rdRawCount - rdSelected.size,
    ...(rdOnlyRows.length ? { unplannedToeSuggestion: suggestUnplannedToeElevation(mvvRows, config) } : {}),
    ...(unplannedDepthOptions ? {
      unplannedDepthOptions: {
        toeElevation,
        subdrilling,
        formula: importFields.depth_formula,
      },
    } : {}),
  };

  return { consolidatedRows, summary };
}

function suggestUnplannedToeElevation(mvvRows, config) {
  const suggestionConfig = config.matching.unplanned_import.toe_suggestion;
  if (suggestionConfig.tie_break !== 'first_valid_in_document') {
    throw new Error(`Invalid unplanned toe suggestion tie break: ${suggestionConfig.tie_break}`);
  }
  const field = suggestionConfig.source_field;
  const frequencies = new Map();
  let validCount = 0;
  for (const row of mvvRows) {
    if (row[field] === null || row[field] === undefined || row[field] === '') continue;
    const value = Number(row[field]);
    if (!Number.isFinite(value)) continue;
    const current = frequencies.get(value);
    if (current) current.frequency += 1;
    else frequencies.set(value, { value, frequency: 1, firstIndex: validCount });
    validCount += 1;
  }
  if (!frequencies.size) throw new Error(`No valid ${field} values to suggest a toe elevation`);
  const selected = [...frequencies.values()].reduce((best, candidate) => {
    if (!best || candidate.frequency > best.frequency) return candidate;
    if (candidate.frequency === best.frequency && candidate.firstIndex < best.firstIndex) return candidate;
    return best;
  }, null);
  return { value: selected.value, frequency: selected.frequency, validCount, sourceColumn: field };
}

export function suggestPitdevToeElevation(rawPlan, planValidation, config) {
  const suggestionConfig = config?.pitdev?.toe_suggestion;
  const sourceField = suggestionConfig?.source_field;
  const sourcePosition = planValidation?.columns?.[sourceField];
  if (!sourceField || !Number.isInteger(sourcePosition)) {
    throw new Error('Configuração inválida: coluna de sugestão da cota do pé no plano O-PitDev');
  }
  if (suggestionConfig.tie_break !== 'first_valid_in_document') {
    throw new Error(`Configuração inválida: desempate da sugestão da cota do pé (${suggestionConfig.tie_break || 'ausente'})`);
  }

  const sourceColumn = asText(rawPlan.headers?.[sourcePosition]) || sourceField;
  const frequencies = new Map();
  let validCount = 0;

  for (const row of rawPlan.rows) {
    if (row.blank) continue;
    const value = toNumber(row.values[sourcePosition], `Plano linha ${row.sourceRow}`, sourceColumn);
    const current = frequencies.get(value);
    if (current) {
      current.frequency += 1;
    } else {
      frequencies.set(value, { value, frequency: 1, firstIndex: validCount });
    }
    validCount += 1;
  }

  if (!frequencies.size) {
    throw new Error(`Plano O-PitDev: a coluna ${sourceColumn} não possui valores válidos para sugerir a cota do pé`);
  }

  const selected = [...frequencies.values()].reduce((best, candidate) => {
    if (!best) return candidate;
    if (candidate.frequency > best.frequency) return candidate;
    if (candidate.frequency === best.frequency && candidate.firstIndex < best.firstIndex) return candidate;
    return best;
  }, null);

  return {
    value: selected.value,
    frequency: selected.frequency,
    validCount,
    distinctValueCount: frequencies.size,
    sourceField,
    sourceColumn,
    tieBreak: suggestionConfig.tie_break,
  };
}

export function buildPitdevRows(rawField, rawPlan, fieldValidation, planValidation, config, auxiliaryOptions = null, toeSuggestion = null) {
  const [idColumn, yColumn, xColumn, zColumn, diameterColumn, azimuthColumn, plannedAngleColumn, slopeAngleColumn, depthColumn] = config.columns.pitdev_consolidated;
  const planByHole = new Map();
  const planColumns = planValidation.columns;

  for (const row of rawPlan.rows) {
    if (row.blank) continue;
    const id = row.values[planColumns.id];
    const holeKey = normalizeHoleKey(id, []);
    planByHole.set(holeKey, {
      diameter: toNumber(row.values[planColumns.diameter], `Plano linha ${row.sourceRow}`, 'diameter'),
      azimuth: toNumber(row.values[planColumns.azimuth], `Plano linha ${row.sourceRow}`, 'azimuth'),
      angle: dipNumber(row.values[planColumns.angle], `Plano linha ${row.sourceRow}`, 'angle'),
      depth: toNumber(row.values[planColumns.depth], `Plano linha ${row.sourceRow}`, 'depth'),
      sourceRow: row.sourceRow,
    });
  }

  const rows = [];
  const fieldWithoutPlan = [];
  const matchedPlanKeys = new Set();
  const referenceAngle = Number(config.pitdev.angle_reference_degrees);
  const fieldPositions = getPitdevFieldPositions(config);

  if (!Number.isFinite(referenceAngle)) {
    throw new Error('Configuração inválida: pitdev.angle_reference_degrees');
  }

  for (const row of rawField.rows) {
    if (row.blank) continue;
    const id = normalizeIdValue(row.values[fieldPositions.id]);
    const holeKey = normalizeHoleKey(id, []);
    const plan = planByHole.get(holeKey);
    if (!plan) {
      fieldWithoutPlan.push(asText(row.values[fieldPositions.id]));
      if (!auxiliaryOptions) continue;
      const customToe = Number(auxiliaryOptions.toeElevation);
      const subdrilling = Number(auxiliaryOptions.subdrilling || 0);
      if (!Number.isFinite(customToe) || !Number.isFinite(subdrilling) || customToe <= 0 || subdrilling < 0) throw new Error('Cota do pé e subfuração dos furos auxiliares são inválidas');
      rows.push({ [idColumn]: id, [yColumn]: toNumber(row.values[fieldPositions.y], `Levantamento linha ${row.sourceLine}`, 'Y'), [xColumn]: toNumber(row.values[fieldPositions.x], `Levantamento linha ${row.sourceLine}`, 'X'), [zColumn]: toNumber(row.values[fieldPositions.z], `Levantamento linha ${row.sourceLine}`, 'Z'), [diameterColumn]: null, [azimuthColumn]: null, [plannedAngleColumn]: null, [slopeAngleColumn]: null, [depthColumn]: Number((Number(row.values[fieldPositions.z]) - customToe + subdrilling).toFixed(3)), auxiliary: true });
      continue;
    }

    matchedPlanKeys.add(holeKey);
    const plannedAngle = plan.angle;
    rows.push({
      [idColumn]: id,
      [yColumn]: toNumber(row.values[fieldPositions.y], `Levantamento linha ${row.sourceLine}`, 'Y'),
      [xColumn]: toNumber(row.values[fieldPositions.x], `Levantamento linha ${row.sourceLine}`, 'X'),
      [zColumn]: toNumber(row.values[fieldPositions.z], `Levantamento linha ${row.sourceLine}`, 'Z'),
      [diameterColumn]: plan.diameter,
      [azimuthColumn]: plan.azimuth,
      [plannedAngleColumn]: plannedAngle,
      [slopeAngleColumn]: Number((referenceAngle - plannedAngle).toFixed(3)),
      [depthColumn]: plan.depth,
    });
  }

  if (!rows.length) {
    throw new Error('Nenhum ID do levantamento de campo foi encontrado no plano de perfuração');
  }

  const planWithoutField = [...planByHole.keys()]
    .filter((holeKey) => !matchedPlanKeys.has(holeKey))
    .sort(compareHoleKeys);

  return {
    rows,
    summary: {
      mode: 'pitdev',
      fieldCount: fieldValidation.rowCount,
      planCount: planValidation.rowCount,
      matchedCount: rows.length,
      auxiliaryCount: rows.filter((row) => row.auxiliary).length,
      fieldWithoutPlan,
      fieldWithoutPlanCount: fieldWithoutPlan.length,
      planWithoutField,
      planWithoutFieldCount: planWithoutField.length,
      toeSuggestion,
      outputColumns: config.columns.pitdev_consolidated,
      sheetName: config.output.sheets.pitdev_consolidated,
      angleFormula: `${referenceAngle} - ângulo planejado`,
    },
  };
}

export function buildPitdevFieldOnlyRows(rawField, fieldValidation, config) {
  const [idColumn, yColumn, xColumn, zColumn] = config.columns.pitdev_field_only;
  const positions = getPitdevFieldPositions(config);
  const rows = [];

  for (const row of rawField.rows) {
    if (row.blank) continue;
    const context = `Levantamento linha ${row.sourceLine}`;
    rows.push({
      [idColumn]: normalizeIdValue(row.values[positions.id]),
      [yColumn]: toNumber(row.values[positions.y], context, 'Y'),
      [xColumn]: toNumber(row.values[positions.x], context, 'X'),
      [zColumn]: toNumber(row.values[positions.z], context, 'Z'),
    });
  }

  if (!rows.length) throw new Error('Levantamento de campo sem linhas validas');

  return {
    rows,
    summary: {
      mode: 'pitdev_field_only',
      fieldCount: fieldValidation.rowCount,
      fieldOnlyCount: rows.length,
      outputColumns: config.columns.pitdev_field_only,
      sheetName: config.output.sheets.pitdev_field_only,
    },
  };
}
