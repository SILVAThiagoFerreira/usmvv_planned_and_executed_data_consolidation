export function mergePlanRows(plans, validation, config) {
  const increment = config.plan_merge.increment;
  const rows = [];
  const planSummaries = [];

  plans.forEach((plan, planIndex) => {
    const offset = planIndex * increment;
    const adjustedRows = plan.rows.map(({ values }) => {
      const outputValues = [...values];
      if (offset !== 0) {
        outputValues[validation.numberIndex] = String(Number(outputValues[validation.numberIndex].trim()) + offset);
      }
      return outputValues;
    });

    rows.push(...adjustedRows);
    planSummaries.push({
      planNumber: planIndex + 1,
      fileName: plan.fileName,
      offset,
      rowCount: adjustedRows.length,
    });
  });

  return {
    headers: [...validation.headers],
    rows,
    summary: {
      mode: 'plan_merge',
      planCount: plans.length,
      rowCount: validation.totalRows,
      columnCount: validation.headers.length,
      numberHeader: config.plan_merge.number_header,
      increment,
      plans: planSummaries,
    },
  };
}
