import { readMvvFile, readPitdevFieldFile, readPitdevPlanFile, readRdFile } from './reader.js';
import { validateMvvPlanSource, validateMvvSource, validatePitdevFieldSource, validatePitdevPlanSource, validateRdSource } from './validator.js';
import { buildConsolidatedRows, buildMvvPlanRows, buildMvvRows, buildPitdevRows, buildRdOnlyRows, buildRdRows, deduplicateRdRows } from './processor.js';
import { createMvvPlanWorkbookBuffer, createPitdevWorkbookBuffer, createRdOnlyWorkbookBuffer, createWorkbookBuffer } from './writer.js';

export async function runPipeline({ config, mvvFile, rdFile }) {
  const rawMvv = await readMvvFile(mvvFile, config);
  const rawRd = await readRdFile(rdFile, config);

  const mvvValidation = validateMvvSource(rawMvv, config);
  const rdValidation = validateRdSource(rawRd, config);

  const mvvRows = buildMvvRows(rawMvv, config, mvvValidation);
  const rdRows = buildRdRows(rawRd, config);
  const { treatedRows, selected, dualPrefixCount } = deduplicateRdRows(rdRows, config);
  const { consolidatedRows, summary } = buildConsolidatedRows(mvvRows, selected, rdValidation.rowCount, dualPrefixCount);
  const enrichedSummary = {
    ...summary,
    mode: 'consolidated',
    outputColumns: config.columns.consolidated,
    sheetName: config.output.sheets.consolidated,
  };

  const metadata = {
    runId: new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_'),
    generatedAt: new Date().toISOString(),
    configPath: 'config.json',
    outputPath: config.output.file_name,
  };

  const buffer = await createWorkbookBuffer({ config, consolidatedRows, rdTreatedRows: treatedRows, summary: enrichedSummary, metadata });
  return { buffer, summary: enrichedSummary, metadata };
}

export async function runMvvPlanPipeline({ config, mvvFile }) {
  const rawMvv = await readMvvFile(mvvFile, config);
  const mvvValidation = validateMvvPlanSource(rawMvv, config);
  const mvvPlanRows = buildMvvPlanRows(rawMvv, config, mvvValidation);
  const buffer = await createMvvPlanWorkbookBuffer({ config, mvvPlanRows });

  return {
    buffer,
    summary: {
      mode: 'mvv_only',
      mvvCount: mvvPlanRows.length,
      outputColumns: config.columns.mvv_plan,
      sheetName: config.output.sheets.mvv_plan,
    },
  };
}

export async function runRdOnlyPipeline({ config, rdFile, toeElevation, subdrilling = 0 }) {
  const toe = Number(toeElevation);
  const sub = Number(subdrilling);
  if (!Number.isFinite(toe) || !Number.isFinite(sub) || sub < 0) {
    throw new Error('Invalid toe elevation or subdrilling');
  }

  const rawRd = await readRdFile(rdFile, config);
  const rdValidation = validateRdSource(rawRd, config);
  const rdRows = buildRdRows(rawRd, config);
  const { treatedRows, dualPrefixCount } = deduplicateRdRows(rdRows, config);
  const rdOnlyRows = buildRdOnlyRows(treatedRows, config, toe, sub);
  const summary = {
    mode: 'rd_only',
    rdRawCount: rdValidation.rowCount,
    rdUniqueCount: treatedRows.length,
    dualPrefixCount,
    discardedRdCount: rdRows.length - treatedRows.length,
    toeElevation: toe,
    subdrilling: sub,
    outputColumns: config.columns.rd_only,
    sheetName: config.output.sheets.executed,
  };

  const buffer = await createRdOnlyWorkbookBuffer({ config, rdOnlyRows });

  return { buffer, summary };
}

export async function runPitdevPipeline({ config, fieldFile, planFile }) {
  const rawField = await readPitdevFieldFile(fieldFile, config);
  const rawPlan = await readPitdevPlanFile(planFile, config);
  const fieldValidation = validatePitdevFieldSource(rawField, config);
  const planValidation = validatePitdevPlanSource(rawPlan, config);
  const processed = buildPitdevRows(rawField, rawPlan, fieldValidation, planValidation, config);
  const metadata = {
    runId: new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').replace('T', '_'),
    generatedAt: new Date().toISOString(),
    fieldFile: rawField.fileName,
    planFile: rawPlan.fileName,
    planSheet: rawPlan.sheetName,
    angleFormula: processed.summary.angleFormula,
    outputPath: config.output.pitdev_file_name,
  };

  const buffer = await createPitdevWorkbookBuffer({
    config,
    pitdevRows: processed.rows,
    summary: processed.summary,
    metadata,
  });

  return { buffer, summary: processed.summary, metadata };
}
