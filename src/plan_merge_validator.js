function createValidationError(code, details = {}) {
  const error = new Error(code);
  error.code = code;
  error.details = details;
  return error;
}

export function validatePlanMergeSources(plans, config) {
  const options = config.plan_merge;
  const { min_plan_count: minimumPlanCount, number_header: numberHeader, increment } = options;

  if (!Array.isArray(plans) || plans.length < minimumPlanCount) {
    throw createValidationError('plan_merge_minimum_count', { minimumPlanCount });
  }

  const referenceHeaders = plans[0]?.headers;
  if (!Array.isArray(referenceHeaders) || !referenceHeaders.length) {
    throw createValidationError('plan_merge_invalid_header', { fileName: plans[0]?.fileName || '' });
  }

  const numberIndexes = referenceHeaders
    .map((header, index) => (header === numberHeader ? index : -1))
    .filter((index) => index >= 0);
  if (numberIndexes.length !== 1) {
    throw createValidationError('plan_merge_number_column', { fileName: plans[0]?.fileName || '', numberHeader });
  }
  const numberIndex = numberIndexes[0];
  const seenNumbers = new Map();
  let totalRows = 0;

  plans.forEach((plan, planIndex) => {
    if (!Array.isArray(plan.headers) || plan.headers.length !== referenceHeaders.length
      || plan.headers.some((header, index) => header !== referenceHeaders[index])) {
      throw createValidationError('plan_merge_header_mismatch', { fileName: plan.fileName || '', referenceFileName: plans[0].fileName || '' });
    }
    if (!Array.isArray(plan.rows) || !plan.rows.length) {
      throw createValidationError('plan_merge_empty_plan', { fileName: plan.fileName || '', planNumber: planIndex + 1 });
    }

    const offset = planIndex * increment;
    plan.rows.forEach((row, rowIndex) => {
      const recordNumber = row.recordNumber ?? rowIndex + 2;
      if (!Array.isArray(row.values) || row.values.length !== referenceHeaders.length) {
        throw createValidationError('plan_merge_invalid_row_width', {
          fileName: plan.fileName || '',
          recordNumber,
          expectedFieldCount: referenceHeaders.length,
          actualFieldCount: row.values?.length ?? 0,
        });
      }

      const rawNumber = String(row.values[numberIndex] ?? '').trim();
      if (!/^[+-]?\d+$/.test(rawNumber)) {
        throw createValidationError('plan_merge_invalid_number', { fileName: plan.fileName || '', recordNumber, value: rawNumber });
      }
      const number = Number(rawNumber);
      const adjustedNumber = number + offset;
      if (!Number.isSafeInteger(number) || !Number.isSafeInteger(adjustedNumber)) {
        throw createValidationError('plan_merge_number_out_of_range', { fileName: plan.fileName || '', recordNumber, value: rawNumber, offset });
      }

      const previous = seenNumbers.get(adjustedNumber);
      if (previous) {
        throw createValidationError('plan_merge_duplicate_number', {
          fileName: plan.fileName || '',
          recordNumber,
          adjustedNumber,
          previousFileName: previous.fileName,
          previousRecordNumber: previous.recordNumber,
        });
      }
      seenNumbers.set(adjustedNumber, { fileName: plan.fileName || '', recordNumber });
      totalRows += 1;
    });
  });

  return { headers: referenceHeaders, numberIndex, totalRows };
}
