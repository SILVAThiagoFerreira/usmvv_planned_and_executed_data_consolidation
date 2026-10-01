import { readPlanCsvFile } from './plan_merge_reader.js?v=20261001-csv-plan-merge-2';
import { validatePlanMergeSources } from './plan_merge_validator.js?v=20261001-csv-plan-merge-2';
import { mergePlanRows } from './plan_merge_processor.js?v=20261001-csv-plan-merge-2';
import { serializePlanCsv } from './plan_merge_writer.js?v=20261001-csv-plan-merge-2';

export async function runPlanMergePipeline({ files, config }) {
  const plans = await Promise.all(files.map((file) => readPlanCsvFile(file, config)));
  const validation = validatePlanMergeSources(plans, config);
  const merged = mergePlanRows(plans, validation, config);
  return {
    csv: serializePlanCsv(merged.headers, merged.rows, config.plan_merge.output),
    summary: merged.summary,
  };
}
