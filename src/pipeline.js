import { readMvvFile, readRdFile } from './reader.js';
import { validateMvvPlanSource, validateMvvSource, validateRdSource } from './validator.js';
import { buildConsolidatedRows, buildMvvPlanRows, buildMvvRows, buildRdRows, deduplicateRdRows } from './processor.js';
import { createMvvPlanWorkbookBuffer, createWorkbookBuffer } from './writer.js';

export async function runPipeline({ config, mvvFile, rdFile }) {
  const rawMvv = await readMvvFile(mvvFile, config);
  const rawRd = await readRdFile(rdFile, config);

  const mvvValidation = validateMvvSource(rawMvv, config);
  const rdValidation = validateRdSource(rawRd, config);

  const mvvRows = buildMvvRows(rawMvv, config, mvvValidation);
  const rdRows = buildRdRows(rawRd, config);
  const { treatedRows, selected, dualPrefixCount } = deduplicateRdRows(rdRows, config);
  const { consolidatedRows, summary } = buildConsolidatedRows(mvvRows, selected, rdValidation.rowCount, dualPrefixCount);

  const metadata = {
    runId: new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_'),
    generatedAt: new Date().toISOString(),
    configPath: 'config.json',
    outputPath: config.output.file_name,
  };

  const buffer = await createWorkbookBuffer({ config, consolidatedRows, rdTreatedRows: treatedRows, summary, metadata });
  return { buffer, summary, metadata };
}

export async function runMvvPlanPipeline({ config, mvvFile }) {
  const rawMvv = await readMvvFile(mvvFile, config);
  const mvvValidation = validateMvvPlanSource(rawMvv, config);
  const mvvPlanRows = buildMvvPlanRows(rawMvv, config, mvvValidation);
  const buffer = await createMvvPlanWorkbookBuffer({ config, mvvPlanRows });

  return {
    buffer,
    summary: {
      mvvCount: mvvPlanRows.length,
      outputColumns: config.columns.mvv_plan,
      sheetName: config.output.sheets.mvv_plan,
    },
  };
}
