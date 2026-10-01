import { loadConfig } from './config.js?v=20261001-csv-plan-merge-2';
import { runMvvPlanPipeline, runPitdevFieldOnlyPipeline, runPitdevPipeline, runPipeline, runRdOnlyPipeline } from './pipeline.js?v=20260921-source-profile-1';
import { runPlanMergePipeline } from './plan_merge_pipeline.js?v=20261001-csv-plan-merge-2';

function qs(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento nao encontrado: ${id}`);
  return element;
}

function setStatus(statusBox, statusText, tone, text) {
  statusBox.dataset.tone = tone;
  statusBox.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  statusBox.setAttribute('aria-busy', tone === 'working' ? 'true' : 'false');
  statusText.textContent = text;
}

function getLanguagePack(config, languageCode) {
  const languages = config.ui.languages || {};
  return languages[languageCode] || languages[config.ui.default_language] || languages.pt;
}

function formatPipelineError(error, languagePack) {
  const fallback = error instanceof Error ? error.message : String(error);
  const template = error?.code ? languagePack.errors?.[error.code] : null;
  if (!template) return fallback;

  const details = error.details || {};
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = details[key];
    if (Array.isArray(value)) return value.join(', ');
    return value === undefined || value === null ? '' : String(value);
  });
}

function formatNumberForUi(value) {
  if (!Number.isFinite(Number(value))) return '';
  return Number(value).toFixed(3).replace(/\.?(0+)$/, '');
}

function formatPitdevToeSuggestion(template, suggestion) {
  const values = {
    value: formatNumberForUi(suggestion.value),
    column: suggestion.sourceColumn,
    frequency: suggestion.frequency,
    validCount: suggestion.validCount,
  };
  return Object.entries(values).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(String(value)),
    template,
  );
}

function renderSummary(summaryCards, languagePack, summary) {
  let metrics;

  if (summary.mode === 'mvv_only') {
    metrics = [
      [languagePack.metrics.mvv_count, summary.mvvCount],
      [languagePack.metrics.mvv_plan_columns_count, summary.outputColumns.length],
    ];
  } else if (summary.mode === 'rd_only') {
    metrics = [
      [languagePack.metrics.rd_raw_count, summary.rdRawCount],
      [languagePack.metrics.rd_unique_count, summary.rdUniqueCount],
      [languagePack.metrics.dual_prefix_count, summary.dualPrefixCount],
    ];
    if (summary.includesDepth) {
      metrics.push(
        [languagePack.metrics.toe_elevation, `${summary.toeElevation.toFixed(3)} m`],
        [languagePack.metrics.subdrilling, `${summary.subdrilling.toFixed(3)} m`],
      );
    } else {
      metrics.push([languagePack.metrics.rd_only_columns_count, summary.outputColumns.length]);
    }
  } else {
    metrics = [
      [languagePack.metrics.mvv_count, summary.mvvCount],
      [languagePack.metrics.rd_raw_count, summary.rdRawCount],
      [languagePack.metrics.rd_unique_count, summary.rdUniqueCount],
      [languagePack.metrics.rd_matched_count, summary.rdMatchedCount],
      [languagePack.metrics.rd_missing_count, summary.rdMissingCount],
      [languagePack.metrics.dual_prefix_count, summary.dualPrefixCount],
    ];
  }

  summaryCards.innerHTML = metrics
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join('');
}

function renderPitdevSummary(summaryCards, languagePack, summary) {
  if (summary.mode === 'pitdev_field_only') {
    summaryCards.innerHTML = [
      [languagePack.pitdev_metrics.field_only_count, summary.fieldOnlyCount],
      [languagePack.pitdev_metrics.field_only_columns_count, summary.outputColumns.length],
    ]
      .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
      .join('');
    return;
  }

  const metrics = [
    [languagePack.pitdev_metrics.field_count, summary.fieldCount],
    [languagePack.pitdev_metrics.matched_count, summary.matchedCount],
    [languagePack.pitdev_metrics.field_without_plan_count, summary.fieldWithoutPlanCount],
    [languagePack.pitdev_metrics.plan_without_field_count, summary.planWithoutFieldCount],
    [languagePack.pitdev_metrics.toe_suggestion, summary.toeSuggestion ? `${formatNumberForUi(summary.toeSuggestion.value)} m` : '-'],
  ];
  summaryCards.innerHTML = metrics
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join('');
}

function renderPitdevLog(logOutput, summary, metadata, languageCode) {
  if (summary.mode === 'pitdev_field_only') {
    logOutput.textContent = JSON.stringify({
      language: languageCode,
      ...summary,
      ...metadata,
    }, null, 2);
    return;
  }

  const compactSummary = {
    ...summary,
    fieldWithoutPlan: summary.fieldWithoutPlan,
    planWithoutField: summary.planWithoutField.length <= 17
      ? summary.planWithoutField
      : [
        ...summary.planWithoutField.slice(0, 12),
        '…',
        ...summary.planWithoutField.slice(-5),
      ],
    planWithoutFieldNote: summary.planWithoutField.length > 17
      ? 'Lista resumida na tela; a lista completa está na aba LOG_O-PITDEV.'
      : null,
  };
  logOutput.textContent = JSON.stringify({
    language: languageCode,
    ...compactSummary,
    ...metadata,
  }, null, 2);
}

function renderLog(logOutput, summary, config, languagePack, languageCode) {
  const payload = {
    language: languageCode,
    ...summary,
    labels: languagePack.metrics,
    workbookLabels: config.output.labels,
  };
  logOutput.textContent = JSON.stringify(payload, null, 2);
}

function renderLanguageOptions(languageSelect, languagePack, languageCode) {
  const options = Object.entries(languagePack.language_options).map(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  });

  languageSelect.replaceChildren(...options);
  languageSelect.value = languageCode;
}

function wireDropzone(dropzone, input, onFile) {
  const setActive = (active) => dropzone.classList.toggle('is-active', active);

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    setActive(true);
  });
  dropzone.addEventListener('dragleave', () => setActive(false));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    setActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      onFile(file);
    }
  });
  input.addEventListener('change', () => {
    const file = input.files?.[0] || null;
    if (file) onFile(file);
  });
}

function wireMultiFileDropzone(dropzone, input, onFiles) {
  const setActive = (active) => dropzone.classList.toggle('is-active', active);

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    setActive(true);
  });
  dropzone.addEventListener('dragleave', () => setActive(false));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    setActive(false);
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length) onFiles(files);
  });
  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    if (files.length) onFiles(files);
    input.value = '';
  });
}

function interpolateTemplate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(String(value)),
    template,
  );
}

export async function bootstrapApp() {
  const config = await loadConfig();
  const defaultLanguage = config.ui.default_language || 'pt';

  const appTitle = qs('appTitle');
  const appEyebrow = qs('appEyebrow');
  const hubbarTitle = qs('hubbarTitle');
  const topbar = document.querySelector('.topbar');
  const languageLabel = qs('languageLabel');
  const languageSelect = qs('languageSelect');
  const filesKicker = qs('filesKicker');
  const filesTitle = qs('filesTitle');
  const filesHint = qs('filesHint');
  const mvvFile = qs('mvvFile');
  const rdFile = qs('rdFile');
  const mvvDropzone = qs('mvvDropzone');
  const rdDropzone = qs('rdDropzone');
  const mvvFileLabel = qs('mvvFileLabel');
  const rdFileLabel = qs('rdFileLabel');
  const mvvFileName = qs('mvvFileName');
  const rdFileName = qs('rdFileName');
  const mvvFileHint = qs('mvvFileHint');
  const rdFileHint = qs('rdFileHint');
  const generateBtn = qs('generateBtn');
  const mvvOnlyBtn = qs('mvvOnlyBtn');
  const rdOnlyBtn = qs('rdOnlyBtn');
  const downloadLink = qs('downloadLink');
  const statusBox = qs('statusBox');
  const statusText = qs('statusText');
  const summaryTitle = qs('summaryTitle');
  const summaryKicker = qs('summaryKicker');
  const summaryEmpty = qs('summaryEmpty');
  const summaryPanel = document.querySelector('.summary-panel');
  const detailsTitle = qs('detailsTitle');
  const detailsBadge = qs('detailsBadge');
  const summaryCards = qs('summaryCards');
  const logOutput = qs('logOutput');
  const executedOptions = qs('executedOptions');
  const executedOptionsTitle = qs('executedOptionsTitle');
  const executedOptionsHint = qs('executedOptionsHint');
  const executedExportModeLegend = qs('executedExportModeLegend');
  const executedExportWithDepthLabel = qs('executedExportWithDepthLabel');
  const executedExportWithoutDepthLabel = qs('executedExportWithoutDepthLabel');
  const executedDepthFields = qs('executedDepthFields');
  const columnsOnlyHint = qs('columnsOnlyHint');
  const toeElevationLabel = qs('toeElevationLabel');
  const subdrillingLegend = qs('subdrillingLegend');
  const subdrillingNoLabel = qs('subdrillingNoLabel');
  const subdrillingYesLabel = qs('subdrillingYesLabel');
  const subdrillingValueField = qs('subdrillingValueField');
  const subdrillingValueLabel = qs('subdrillingValueLabel');
  const depthFormula = qs('depthFormula');
  const cancelExecutedOptions = qs('cancelExecutedOptions');
  const cancelExecutedOptionsSecondary = qs('cancelExecutedOptionsSecondary');
  const confirmExecutedOptions = qs('confirmExecutedOptions');
  const toeElevationInput = qs('toeElevationInput');
  const subdrillingValueInput = qs('subdrillingValueInput');
  const executedOptionsError = qs('executedOptionsError');
  const pitdevTitle = qs('pitdevTitle');
  const pitdevHint = qs('pitdevHint');
  const pitdevFieldFile = qs('pitdevFieldFile');
  const pitdevPlanFile = qs('pitdevPlanFile');
  const pitdevFieldDropzone = qs('pitdevFieldDropzone');
  const pitdevPlanDropzone = qs('pitdevPlanDropzone');
  const pitdevFieldFileLabel = qs('pitdevFieldFileLabel');
  const pitdevFieldFileHint = qs('pitdevFieldFileHint');
  const pitdevPlanFileLabel = qs('pitdevPlanFileLabel');
  const pitdevPlanFileHint = qs('pitdevPlanFileHint');
  const pitdevFieldFileName = qs('pitdevFieldFileName');
  const pitdevPlanFileName = qs('pitdevPlanFileName');
  const pitdevGenerateBtn = qs('pitdevGenerateBtn');
  const pitdevFieldOnlyBtn = qs('pitdevFieldOnlyBtn');
  const pitdevFieldOnlyHint = qs('pitdevFieldOnlyHint');
  const pitdevDownloadLink = qs('pitdevDownloadLink');
  const pitdevStatusBox = qs('pitdevStatusBox');
  const pitdevStatusText = qs('pitdevStatusText');
  const pitdevSummaryCards = qs('pitdevSummaryCards');
  const pitdevLogOutput = qs('pitdevLogOutput');
  const pitdevDetailsTitle = qs('pitdevDetailsTitle');
  const pitdevDetailsBadge = qs('pitdevDetailsBadge');
  const pitdevPanel = document.querySelector('.pitdev-panel');
  const pitdevToggleLabel = qs('pitdevToggleLabel');
  const pitdevOptions = qs('pitdevOptions');
  const pitdevOptionsKicker = qs('pitdevOptionsKicker');
  const pitdevOptionsTitle = qs('pitdevOptionsTitle');
  const pitdevOptionsHint = qs('pitdevOptionsHint');
  const pitdevToeSuggestion = qs('pitdevToeSuggestion');
  const pitdevToeElevationLabel = qs('pitdevToeElevationLabel');
  const pitdevSubdrillingLabel = qs('pitdevSubdrillingLabel');
  const pitdevFormula = qs('pitdevFormula');
  const pitdevOptionsSubmit = qs('pitdevOptionsSubmit');
  const pitdevOptionsError = qs('pitdevOptionsError');
  const secondaryActions = qs('secondaryActions');
  const secondaryActionsTitle = qs('secondaryActionsTitle');
  const planMergePanel = document.querySelector('.plan-merge-panel');
  const planMergeDropzone = qs('planMergeDropzone');
  const planMergeFilesInput = qs('planMergeFiles');
  const planMergeFileLabel = qs('planMergeFileLabel');
  const planMergeFileName = qs('planMergeFileName');
  const planMergeFileHint = qs('planMergeFileHint');
  const planMergeTitle = qs('planMergeTitle');
  const planMergeHint = qs('planMergeHint');
  const planMergeOrderTitle = qs('planMergeOrderTitle');
  const planMergeOrderHint = qs('planMergeOrderHint');
  const planMergeList = qs('planMergeList');
  const planMergeGenerateBtn = qs('planMergeGenerateBtn');
  const planMergeDownloadLink = qs('planMergeDownloadLink');
  const planMergeSummary = qs('planMergeSummary');
  const planMergeStatusBox = qs('planMergeStatusBox');
  const planMergeStatusText = qs('planMergeStatusText');
  const planMergeLogTitle = qs('planMergeLogTitle');
  const planMergeLogBadge = qs('planMergeLogBadge');
  const planMergeLogOutput = qs('planMergeLogOutput');
  const pitdevToeElevationInput = qs('pitdevToeElevationInput');
  const pitdevSubdrillingValueInput = qs('pitdevSubdrillingValueInput');

  document.title = config.app.title;
  const state = {
    mvv: null,
    rd: null,
    pitdevField: null,
    pitdevPlan: null,
    downloadUrl: null,
    pitdevDownloadUrl: null,
    outputFileName: config.output.file_name,
    pitdevOutputFileName: config.output.pitdev_file_name,
    language: defaultLanguage,
    phase: 'idle',
    errorMessage: null,
    summary: null,
    pitdevSummary: null,
    pitdevMetadata: null,
    pitdevPhase: 'idle',
    pitdevErrorMessage: null,
    pitdevAuxiliaryOptions: null,
    planMergeFiles: [],
    planMergeDownloadUrl: null,
    planMergePhase: 'idle',
    planMergeErrorMessage: null,
    planMergeSummary: null,
    planMergeOutputFileName: config.output.plan_merge_file_name,
  };

  const currentUi = () => getLanguagePack(config, state.language);

  const parseNumberInput = (value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(',', '.');
    if (!normalized) return null;
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const number = Number(match[0]);
    return Number.isFinite(number) ? number : null;
  };

  const rdOnlyModeInputs = [...document.querySelectorAll('input[name="rdExportMode"]')];
  const getSelectedRdOnlyMode = () => {
    const selected = rdOnlyModeInputs.find((input) => input.checked);
    if (!selected) throw new Error('Selecione um formato de exportação do executado');
    return selected.value;
  };
  const getRdOnlyModeConfig = (mode = getSelectedRdOnlyMode()) => {
    const modeConfig = config.rd_only_export?.modes?.[mode];
    if (!modeConfig) throw new Error(`Configuração inválida: modo de exportação do executado (${mode})`);
    return modeConfig;
  };
  const setDefaultRdOnlyMode = () => {
    const defaultMode = config.rd_only_export?.default_mode;
    const input = rdOnlyModeInputs.find((candidate) => candidate.value === defaultMode);
    if (!input) throw new Error(`Configuração inválida: modo padrão do executado (${defaultMode || 'ausente'})`);
    input.checked = true;
  };
  const updateSubdrillingVisibility = () => {
    const includesDepth = Boolean(getRdOnlyModeConfig().requires_depth_parameters);
    const selected = document.querySelector('input[name="subdrilling"]:checked');
    subdrillingValueField.hidden = !includesDepth || selected?.value !== 'yes';
  };
  const updateExecutedModeUi = () => {
    const ui = currentUi();
    const includesDepth = Boolean(getRdOnlyModeConfig().requires_depth_parameters);
    executedOptionsTitle.textContent = includesDepth ? ui.executed_options_title : ui.executed_columns_only_title;
    executedOptionsHint.textContent = includesDepth ? ui.executed_options_hint : ui.executed_columns_only_hint;
    executedDepthFields.hidden = !includesDepth;
    depthFormula.hidden = !includesDepth;
    columnsOnlyHint.hidden = includesDepth;
    toeElevationInput.required = includesDepth;
    toeElevationInput.disabled = !includesDepth;
    document.querySelectorAll('input[name="subdrilling"]').forEach((input) => {
      input.disabled = !includesDepth;
    });
    subdrillingValueInput.disabled = !includesDepth;
    updateSubdrillingVisibility();
    if (!includesDepth) executedOptionsError.hidden = true;
  };

  const closeExecutedOptions = () => {
    executedOptions.hidden = true;
    executedOptionsError.hidden = true;
    executedOptions.reset();
    setDefaultRdOnlyMode();
    updateExecutedModeUi();
  };

  const updateStatus = () => {
    const ui = currentUi();
    const hasMvv = Boolean(state.mvv);
    const hasRd = Boolean(state.rd);

    let tone = 'idle';
    let text = ui.status_idle;

    if (state.phase === 'working') {
      tone = 'working';
      text = ui.status_working;
    } else if (state.phase === 'error') {
      tone = 'error';
      text = state.errorMessage || ui.status_error;
    } else if (state.phase === 'mvv_done') {
      tone = 'done';
      text = ui.status_mvv_done || ui.status_done;
    } else if (state.phase === 'rd_done') {
      tone = 'done';
      text = ui.status_rd_done || ui.status_done;
    } else if (state.phase === 'done') {
      tone = 'done';
      text = ui.status_done;
    } else if (hasMvv && hasRd) {
      tone = 'ready';
      text = ui.status_ready;
    } else if (hasMvv) {
      tone = 'ready';
      text = ui.status_ready_mvv || ui.status_ready;
    } else if (hasRd) {
      tone = 'ready';
      text = ui.status_ready_rd || ui.status_ready;
    }

    setStatus(statusBox, statusText, tone, text);
    generateBtn.disabled = !(hasMvv && hasRd) || state.phase === 'working';
    mvvOnlyBtn.disabled = !hasMvv || state.phase === 'working';
    rdOnlyBtn.disabled = !hasRd || state.phase === 'working';
  };

  const updatePitdevStatus = () => {
    const ui = currentUi();
    const hasField = Boolean(state.pitdevField);
    const hasPlan = Boolean(state.pitdevPlan);
    let tone = 'idle';
    let text = ui.pitdev_status_idle;

    if (state.pitdevPhase === 'working') {
      tone = 'working';
      text = ui.pitdev_status_working;
    } else if (state.pitdevPhase === 'error') {
      tone = 'error';
      text = state.pitdevErrorMessage || ui.pitdev_status_error;
    } else if (state.pitdevPhase === 'done') {
      tone = 'done';
      text = state.pitdevSummary?.mode === 'pitdev_field_only'
        ? ui.pitdev_field_only_status_done
        : ui.pitdev_status_done;
    } else if (hasField && hasPlan) {
      tone = 'ready';
      text = ui.pitdev_status_ready;
    } else if (hasField) {
      tone = 'ready';
      text = ui.pitdev_field_only_status_ready;
    }

    setStatus(pitdevStatusBox, pitdevStatusText, tone, text);
    pitdevGenerateBtn.disabled = !(hasField && hasPlan) || state.pitdevPhase === 'working';
    pitdevFieldOnlyBtn.disabled = !hasField || state.pitdevPhase === 'working';
  };

  const getLocalizedInteger = (value) => new Intl.NumberFormat(currentUi().document_lang, { maximumFractionDigits: 0 }).format(value);

  const updatePlanMergeList = () => {
    const ui = currentUi();
    const offsetLabel = (index) => index === 0
      ? ui.plan_merge_offset_none
      : interpolateTemplate(ui.plan_merge_offset_applied, { offset: getLocalizedInteger(index * config.plan_merge.increment) });

    planMergeList.replaceChildren(...state.planMergeFiles.map((file, index) => {
      const item = document.createElement('li');
      item.className = 'plan-merge-item';

      const order = document.createElement('span');
      order.className = 'plan-merge-item-order';
      const planLabel = document.createElement('strong');
      planLabel.textContent = `${ui.plan_merge_plan_prefix} ${index + 1}`;
      const numberOffset = document.createElement('small');
      numberOffset.textContent = offsetLabel(index);
      order.append(planLabel, numberOffset);

      const fileName = document.createElement('span');
      fileName.className = 'plan-merge-item-name';
      fileName.textContent = file.name;

      const controls = document.createElement('span');
      controls.className = 'plan-merge-item-controls';
      const moveUp = document.createElement('button');
      moveUp.type = 'button';
      moveUp.textContent = '↑';
      moveUp.setAttribute('aria-label', interpolateTemplate(ui.plan_merge_move_up, { planNumber: index + 1, fileName: file.name }));
      moveUp.disabled = index === 0 || state.planMergePhase === 'working';
      moveUp.addEventListener('click', () => movePlanMergeFile(index, -1));

      const moveDown = document.createElement('button');
      moveDown.type = 'button';
      moveDown.textContent = '↓';
      moveDown.setAttribute('aria-label', interpolateTemplate(ui.plan_merge_move_down, { planNumber: index + 1, fileName: file.name }));
      moveDown.disabled = index === state.planMergeFiles.length - 1 || state.planMergePhase === 'working';
      moveDown.addEventListener('click', () => movePlanMergeFile(index, 1));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', interpolateTemplate(ui.plan_merge_remove, { planNumber: index + 1, fileName: file.name }));
      remove.disabled = state.planMergePhase === 'working';
      remove.addEventListener('click', () => removePlanMergeFile(index));

      controls.append(moveUp, moveDown, remove);
      item.append(order, fileName, controls);
      return item;
    }));

    const count = state.planMergeFiles.length;
    planMergeFileName.textContent = count === 0
      ? ui.plan_merge_no_files
      : interpolateTemplate(count === 1 ? ui.plan_merge_file_count_one : ui.plan_merge_file_count_other, { count: getLocalizedInteger(count) });
  };

  const updatePlanMergeStatus = () => {
    const ui = currentUi();
    const count = state.planMergeFiles.length;
    let tone = 'idle';
    let text = ui.plan_merge_status_idle;

    if (state.planMergePhase === 'working') {
      tone = 'working';
      text = ui.plan_merge_status_working;
    } else if (state.planMergePhase === 'error') {
      tone = 'error';
      text = state.planMergeErrorMessage || ui.plan_merge_status_error;
    } else if (state.planMergePhase === 'done') {
      tone = 'done';
      text = ui.plan_merge_status_done;
    } else if (count === 1) {
      tone = 'ready';
      text = ui.plan_merge_status_add_more;
    } else if (count >= config.plan_merge.min_plan_count) {
      tone = 'ready';
      text = interpolateTemplate(ui.plan_merge_status_ready, { count: getLocalizedInteger(count) });
    }

    setStatus(planMergeStatusBox, planMergeStatusText, tone, text);
    planMergeGenerateBtn.disabled = count < config.plan_merge.min_plan_count || state.planMergePhase === 'working';
    planMergeFilesInput.disabled = state.planMergePhase === 'working';
    planMergeSummary.hidden = !state.planMergeSummary;
    if (state.planMergeSummary) {
      planMergeSummary.textContent = interpolateTemplate(ui.plan_merge_summary_template, {
        planCount: getLocalizedInteger(state.planMergeSummary.planCount),
        rowCount: getLocalizedInteger(state.planMergeSummary.rowCount),
        increment: getLocalizedInteger(state.planMergeSummary.increment),
      });
      planMergeLogOutput.textContent = JSON.stringify({ language: state.language, ...state.planMergeSummary }, null, 2);
    } else if (state.planMergePhase === 'working') {
      planMergeLogOutput.textContent = ui.plan_merge_log_processing;
    } else if (state.planMergePhase === 'error') {
      planMergeLogOutput.textContent = state.planMergeErrorMessage || ui.plan_merge_status_error;
    } else {
      planMergeLogOutput.textContent = ui.plan_merge_log_waiting;
    }
  };

  const clearPlanMergeOutput = () => {
    if (state.planMergeDownloadUrl) {
      URL.revokeObjectURL(state.planMergeDownloadUrl);
      state.planMergeDownloadUrl = null;
    }
    state.planMergeSummary = null;
    state.planMergeErrorMessage = null;
    state.planMergeOutputFileName = config.output.plan_merge_file_name;
    planMergeDownloadLink.hidden = true;
    planMergeSummary.hidden = true;
  };

  const movePlanMergeFile = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= state.planMergeFiles.length) return;
    const files = [...state.planMergeFiles];
    [files[index], files[nextIndex]] = [files[nextIndex], files[index]];
    state.planMergeFiles = files;
    clearPlanMergeOutput();
    state.planMergePhase = files.length >= config.plan_merge.min_plan_count ? 'ready' : 'idle';
    renderPlanMergeState();
  };

  const removePlanMergeFile = (index) => {
    state.planMergeFiles = state.planMergeFiles.filter((_, currentIndex) => currentIndex !== index);
    clearPlanMergeOutput();
    state.planMergePhase = state.planMergeFiles.length >= config.plan_merge.min_plan_count ? 'ready' : 'idle';
    renderPlanMergeState();
  };

  const renderPlanMergeState = () => {
    updatePlanMergeList();
    updatePlanMergeStatus();
  };

  const updateLog = () => {
    const ui = currentUi();
    if ((state.phase === 'done' || state.phase === 'mvv_done' || state.phase === 'rd_done') && state.summary) {
      renderLog(logOutput, state.summary, config, ui, state.language);
      return;
    }
    if (state.phase === 'working') {
      logOutput.textContent = ui.log_processing;
      return;
    }
    if (state.phase === 'error') {
      logOutput.textContent = state.errorMessage || ui.status_error;
      return;
    }
    logOutput.textContent = ui.log_waiting;
  };

  const renderLanguage = () => {
    const ui = currentUi();
    document.documentElement.lang = ui.document_lang;
    document.title = config.app.title;

    if (topbar) topbar.setAttribute('aria-label', ui.header_label);

    renderLanguageOptions(languageSelect, ui, state.language);

    languageLabel.textContent = ui.language_label;
    languageSelect.setAttribute('aria-label', ui.language_label);
    appEyebrow.textContent = ui.eyebrow;
    hubbarTitle.textContent = ui.hubbar_title;
    appTitle.textContent = config.app.title;
    filesKicker.textContent = ui.files_kicker;
    filesTitle.textContent = ui.files_title;
    filesHint.textContent = ui.files_hint;
    mvvFileLabel.textContent = ui.mvv_file_label;
    rdFileLabel.textContent = ui.rd_file_label;
    mvvFileHint.textContent = ui.mvv_file_hint;
    rdFileHint.textContent = ui.rd_file_hint;
    summaryTitle.textContent = ui.summary_title;
    summaryKicker.textContent = ui.summary_kicker;
    summaryEmpty.textContent = ui.summary_empty;
    detailsTitle.textContent = ui.details_title;
    detailsBadge.textContent = ui.details_badge;
    secondaryActionsTitle.textContent = ui.secondary_actions_title;
    pitdevDetailsTitle.textContent = ui.details_title;
    pitdevDetailsBadge.textContent = ui.details_badge;
    planMergeTitle.textContent = ui.plan_merge_title;
    planMergeHint.textContent = ui.plan_merge_hint;
    planMergeFileLabel.textContent = ui.plan_merge_file_label;
    planMergeFileHint.textContent = ui.plan_merge_file_hint;
    planMergeOrderTitle.textContent = ui.plan_merge_order_title;
    planMergeOrderHint.textContent = ui.plan_merge_order_hint;
    planMergeGenerateBtn.textContent = ui.plan_merge_action;
    planMergeDownloadLink.textContent = `${ui.plan_merge_download_prefix} ${state.planMergeOutputFileName}`;
    planMergeLogTitle.textContent = ui.plan_merge_log_title;
    planMergeLogBadge.textContent = ui.details_badge;
    mvvFileName.textContent = state.mvv ? state.mvv.name : ui.no_file_selected;
    rdFileName.textContent = state.rd ? state.rd.name : ui.no_file_selected;
    pitdevTitle.textContent = ui.pitdev_title;
    pitdevHint.textContent = ui.pitdev_hint;
    pitdevFieldFileLabel.textContent = ui.pitdev_field_label;
    pitdevFieldFileHint.textContent = ui.pitdev_field_hint;
    pitdevPlanFileLabel.textContent = ui.pitdev_plan_label;
    pitdevPlanFileHint.textContent = ui.pitdev_plan_hint;
    pitdevFieldFileName.textContent = state.pitdevField ? state.pitdevField.name : ui.no_file_selected;
    pitdevPlanFileName.textContent = state.pitdevPlan ? state.pitdevPlan.name : ui.no_file_selected;
    pitdevToggleLabel.textContent = pitdevPanel?.open ? ui.pitdev_close : ui.pitdev_open;
    generateBtn.textContent = ui.primary_action;
    rdOnlyBtn.textContent = ui.rd_only_action;
    mvvOnlyBtn.textContent = ui.mvv_only_action;
    pitdevGenerateBtn.textContent = ui.pitdev_action;
    pitdevFieldOnlyBtn.textContent = ui.pitdev_field_only_action;
    pitdevFieldOnlyHint.textContent = ui.pitdev_field_only_hint;
    pitdevDownloadLink.textContent = `${ui.pitdev_download_prefix} ${state.pitdevOutputFileName}`;
    executedOptionsTitle.textContent = ui.executed_options_title;
    executedOptionsHint.textContent = ui.executed_options_hint;
    executedExportModeLegend.textContent = ui.executed_export_mode_label;
    executedExportWithDepthLabel.textContent = ui.executed_export_with_depth;
    executedExportWithoutDepthLabel.textContent = ui.executed_export_without_depth;
    columnsOnlyHint.textContent = ui.executed_columns_only_hint;
    toeElevationLabel.textContent = ui.toe_elevation_label;
    subdrillingLegend.textContent = ui.subdrilling_question;
    subdrillingNoLabel.textContent = ui.no_label;
    subdrillingYesLabel.textContent = ui.yes_label;
    subdrillingValueLabel.textContent = ui.subdrilling_value_label;
    depthFormula.textContent = ui.depth_formula;
    cancelExecutedOptions.textContent = '×';
    cancelExecutedOptionsSecondary.textContent = ui.cancel_action;
    confirmExecutedOptions.textContent = ui.confirm_executed_action;
    downloadLink.textContent = `${ui.download_action} ${state.outputFileName}`;
    pitdevOptionsKicker.textContent = ui.pitdev_options_kicker;
    pitdevOptionsTitle.textContent = ui.pitdev_options_title;
    pitdevOptionsHint.textContent = ui.pitdev_options_hint;
    if (state.pitdevSummary?.toeSuggestion) {
      pitdevToeSuggestion.textContent = formatPitdevToeSuggestion(ui.pitdev_toe_suggestion, state.pitdevSummary.toeSuggestion);
      pitdevToeSuggestion.hidden = false;
    } else {
      pitdevToeSuggestion.textContent = '';
      pitdevToeSuggestion.hidden = true;
    }
    pitdevToeElevationLabel.textContent = ui.pitdev_toe_elevation_label;
    pitdevSubdrillingLabel.textContent = ui.pitdev_subdrilling_label;
    pitdevFormula.textContent = ui.pitdev_formula;
    pitdevOptionsSubmit.textContent = ui.pitdev_options_submit;
    pitdevOptionsError.textContent = ui.pitdev_options_invalid;
    secondaryActions.setAttribute('aria-label', ui.secondary_actions_label);
    updateExecutedModeUi();

    if (state.summary && (state.phase === 'done' || state.phase === 'mvv_done' || state.phase === 'rd_done')) {
      renderSummary(summaryCards, ui, state.summary);
    } else {
      summaryCards.innerHTML = '';
    }

    if (state.pitdevSummary && state.pitdevPhase === 'done') {
      renderPitdevSummary(pitdevSummaryCards, ui, state.pitdevSummary);
      renderPitdevLog(pitdevLogOutput, state.pitdevSummary, state.pitdevMetadata, state.language);
    } else if (state.pitdevPhase === 'working') {
      pitdevSummaryCards.innerHTML = '';
      pitdevLogOutput.textContent = ui.pitdev_status_working;
    } else if (state.pitdevPhase === 'error') {
      pitdevSummaryCards.innerHTML = '';
      pitdevLogOutput.textContent = state.pitdevErrorMessage || ui.pitdev_status_error;
    } else {
      pitdevSummaryCards.innerHTML = '';
      pitdevLogOutput.textContent = ui.pitdev_log_waiting;
    }

    downloadLink.hidden = !state.downloadUrl;
    pitdevDownloadLink.hidden = !state.pitdevDownloadUrl;
    if (summaryPanel) summaryPanel.hidden = !state.summary && state.phase !== 'error';
    summaryEmpty.hidden = Boolean(state.summary) || state.phase === 'error';

    updateStatus();
    updatePitdevStatus();
    updatePlanMergeList();
    updatePlanMergeStatus();
    updateLog();
  };

  const clearGeneratedOutput = () => {
    if (state.downloadUrl) {
      URL.revokeObjectURL(state.downloadUrl);
      state.downloadUrl = null;
    }
    state.summary = null;
    state.errorMessage = null;
    state.outputFileName = config.output.file_name;
    downloadLink.hidden = true;
  };

  const clearPitdevOutput = () => {
    if (state.pitdevDownloadUrl) {
      URL.revokeObjectURL(state.pitdevDownloadUrl);
      state.pitdevDownloadUrl = null;
    }
    state.pitdevSummary = null;
    state.pitdevMetadata = null;
    state.pitdevErrorMessage = null;
    state.pitdevPhase = 'idle';
    state.pitdevOutputFileName = config.output.pitdev_file_name;
    pitdevOptions.hidden = true;
    pitdevOptionsError.hidden = true;
    pitdevDownloadLink.hidden = true;
  };

  setDefaultRdOnlyMode();
  renderLanguage();

  pitdevPanel?.addEventListener('toggle', renderLanguage);

  languageSelect.addEventListener('change', () => {
    state.language = languageSelect.value || defaultLanguage;
    renderLanguage();
  });

  const setFile = (kind, file) => {
    state[kind] = file;
    state.phase = state.mvv && state.rd ? 'ready' : 'idle';
    clearGeneratedOutput();
    renderLanguage();
  };

  wireDropzone(mvvDropzone, mvvFile, (file) => setFile('mvv', file));
  wireDropzone(rdDropzone, rdFile, (file) => setFile('rd', file));

  const setPitdevFile = (kind, file) => {
    state[kind] = file;
    state.pitdevAuxiliaryOptions = null;
    pitdevOptions.hidden = true;
    pitdevOptionsError.hidden = true;
    pitdevToeElevationInput.value = '';
    pitdevSubdrillingValueInput.value = '0';
    clearPitdevOutput();
    renderLanguage();
  };

  wireDropzone(pitdevFieldDropzone, pitdevFieldFile, (file) => setPitdevFile('pitdevField', file));
  wireDropzone(pitdevPlanDropzone, pitdevPlanFile, (file) => setPitdevFile('pitdevPlan', file));

  const addPlanMergeFiles = (files) => {
    if (!files.length) return;
    state.planMergeFiles = [...state.planMergeFiles, ...files];
    clearPlanMergeOutput();
    state.planMergePhase = state.planMergeFiles.length >= config.plan_merge.min_plan_count ? 'ready' : 'idle';
    renderPlanMergeState();
  };

  wireMultiFileDropzone(planMergeDropzone, planMergeFilesInput, addPlanMergeFiles);
  planMergePanel.addEventListener('toggle', renderLanguage);

  planMergeGenerateBtn.addEventListener('click', async () => {
    if (state.planMergeFiles.length < config.plan_merge.min_plan_count) return;

    try {
      clearPlanMergeOutput();
      state.planMergePhase = 'working';
      renderPlanMergeState();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const result = await runPlanMergePipeline({ files: state.planMergeFiles, config });
      const blob = new Blob([result.csv], { type: config.plan_merge.output.mime_type });
      state.planMergeDownloadUrl = URL.createObjectURL(blob);
      state.planMergeOutputFileName = config.output.plan_merge_file_name;
      planMergeDownloadLink.href = state.planMergeDownloadUrl;
      planMergeDownloadLink.download = state.planMergeOutputFileName;
      state.planMergeSummary = result.summary;
      state.planMergePhase = 'done';
      state.planMergeErrorMessage = null;
      planMergeDownloadLink.hidden = false;
      renderLanguage();
    } catch (error) {
      const message = formatPipelineError(error, currentUi());
      state.planMergePhase = 'error';
      state.planMergeErrorMessage = message;
      state.planMergeSummary = null;
      planMergeDownloadLink.hidden = true;
      renderPlanMergeState();
      console.error(error);
    }
  });

  pitdevFieldOnlyBtn.addEventListener('click', async () => {
    if (!state.pitdevField) return;

    try {
      clearPitdevOutput();
      state.pitdevPhase = 'working';
      updatePitdevStatus();
      renderLanguage();

      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await runPitdevFieldOnlyPipeline({ config, fieldFile: state.pitdevField });
      const blob = new Blob([result.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      state.pitdevDownloadUrl = URL.createObjectURL(blob);
      state.pitdevOutputFileName = config.output.pitdev_field_only_file_name;
      pitdevDownloadLink.href = state.pitdevDownloadUrl;
      pitdevDownloadLink.download = state.pitdevOutputFileName;
      state.pitdevSummary = result.summary;
      state.pitdevMetadata = result.metadata;
      state.pitdevPhase = 'done';
      state.pitdevErrorMessage = null;
      renderLanguage();
    } catch (error) {
      const message = formatPipelineError(error, currentUi());
      state.pitdevPhase = 'error';
      state.pitdevErrorMessage = message;
      state.pitdevSummary = null;
      state.pitdevMetadata = null;
      pitdevDownloadLink.hidden = true;
      updatePitdevStatus();
      renderLanguage();
      console.error(error);
    }
  });

  generateBtn.addEventListener('click', async () => {
    if (!state.mvv || !state.rd) return;

    try {
      clearGeneratedOutput();
      state.phase = 'working';
      updateStatus();
      updateLog();

      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await runPipeline({ config, mvvFile: state.mvv, rdFile: state.rd });

      const blob = new Blob([result.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      state.downloadUrl = URL.createObjectURL(blob);
      state.outputFileName = config.output.file_name;
      downloadLink.href = state.downloadUrl;
      downloadLink.download = state.outputFileName;
      state.summary = result.summary;
      state.phase = 'done';
      state.errorMessage = null;
      renderLanguage();
    } catch (error) {
      const message = formatPipelineError(error, currentUi());
      state.phase = 'error';
      state.errorMessage = message;
      state.summary = null;
      downloadLink.hidden = true;
      summaryCards.innerHTML = '';
      logOutput.textContent = message;
      updateStatus();
      console.error(error);
    } finally {
      updateStatus();
      updateLog();
    }
  });

  mvvOnlyBtn.addEventListener('click', async () => {
    if (!state.mvv) return;

    try {
      clearGeneratedOutput();
      state.phase = 'working';
      updateStatus();
      updateLog();

      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await runMvvPlanPipeline({ config, mvvFile: state.mvv });

      const blob = new Blob([result.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      state.downloadUrl = URL.createObjectURL(blob);
      state.outputFileName = config.output.mvv_plan_file_name;
      downloadLink.href = state.downloadUrl;
      downloadLink.download = state.outputFileName;
      state.summary = result.summary;
      state.phase = 'mvv_done';
      state.errorMessage = null;
      renderLanguage();
    } catch (error) {
      const message = formatPipelineError(error, currentUi());
      state.phase = 'error';
      state.errorMessage = message;
      state.summary = null;
      downloadLink.hidden = true;
      summaryCards.innerHTML = '';
      logOutput.textContent = message;
      updateStatus();
      console.error(error);
    } finally {
      updateStatus();
      updateLog();
    }
  });

  rdOnlyBtn.addEventListener('click', async () => {
    if (!state.rd) return;

    setDefaultRdOnlyMode();
    executedOptions.hidden = false;
    updateExecutedModeUi();
    const selectedModeInput = rdOnlyModeInputs.find((input) => input.checked);
    selectedModeInput?.focus();
  });

  pitdevGenerateBtn.addEventListener('click', async () => {
    if (!state.pitdevField || !state.pitdevPlan) return;

    try {
      if (!state.pitdevAuxiliaryOptions) {
        const preview = await runPitdevPipeline({ config, fieldFile: state.pitdevField, planFile: state.pitdevPlan });
        if (preview.summary.fieldWithoutPlanCount > 0) {
          state.pitdevSummary = preview.summary;
          pitdevToeElevationInput.value = formatNumberForUi(preview.summary.toeSuggestion?.value);
          pitdevOptionsError.hidden = true;
          pitdevOptions.hidden = false;
          renderLanguage();
          pitdevToeElevationInput.focus();
          return;
        }
      }
      clearPitdevOutput();
      state.pitdevPhase = 'working';
      updatePitdevStatus();
      renderLanguage();

      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await runPitdevPipeline({
        config,
        fieldFile: state.pitdevField,
        planFile: state.pitdevPlan,
        auxiliaryOptions: state.pitdevAuxiliaryOptions,
      });
      const blob = new Blob([result.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      state.pitdevDownloadUrl = URL.createObjectURL(blob);
      state.pitdevOutputFileName = config.output.pitdev_file_name;
      pitdevDownloadLink.href = state.pitdevDownloadUrl;
      pitdevDownloadLink.download = state.pitdevOutputFileName;
      state.pitdevSummary = result.summary;
      state.pitdevMetadata = result.metadata;
      state.pitdevPhase = 'done';
      state.pitdevErrorMessage = null;
      renderLanguage();
      pitdevDownloadLink.hidden = false;
    } catch (error) {
      const message = formatPipelineError(error, currentUi());
      state.pitdevPhase = 'error';
      state.pitdevErrorMessage = message;
      state.pitdevSummary = null;
      state.pitdevMetadata = null;
      pitdevDownloadLink.hidden = true;
      updatePitdevStatus();
      renderLanguage();
      console.error(error);
    }
  });

  pitdevOptions.addEventListener('submit', (event) => {
    event.preventDefault();
    const toe = parseNumberInput(pitdevToeElevationInput.value);
    const sub = parseNumberInput(pitdevSubdrillingValueInput.value) || 0;
    if (toe === null || toe <= 0 || sub < 0) {
      pitdevOptionsError.hidden = false;
      return;
    }
    pitdevOptionsError.hidden = true;
    state.pitdevAuxiliaryOptions = { toeElevation: toe, subdrilling: sub };
    pitdevOptions.hidden = true;
    pitdevGenerateBtn.click();
  });

  document.querySelectorAll('input[name="subdrilling"]').forEach((input) => {
    input.addEventListener('change', () => {
      updateSubdrillingVisibility();
      if (input.value === 'no' && input.checked) subdrillingValueInput.value = '';
    });
  });

  rdOnlyModeInputs.forEach((input) => {
    input.addEventListener('change', updateExecutedModeUi);
  });

  [cancelExecutedOptions, cancelExecutedOptionsSecondary].forEach((button) => {
    button.addEventListener('click', closeExecutedOptions);
  });

  executedOptions.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.rd) return;

    const ui = currentUi();
    const exportMode = getSelectedRdOnlyMode();
    const includesDepth = Boolean(getRdOnlyModeConfig(exportMode).requires_depth_parameters);
    const toeElevation = includesDepth ? parseNumberInput(toeElevationInput.value) : null;
    const hasSubdrilling = includesDepth && document.querySelector('input[name="subdrilling"]:checked')?.value === 'yes';
    const subdrilling = hasSubdrilling ? parseNumberInput(subdrillingValueInput.value) : 0;
    if (includesDepth && (toeElevation === null || (hasSubdrilling && (subdrilling === null || subdrilling < 0)))) {
      executedOptionsError.textContent = ui.executed_options_invalid;
      executedOptionsError.hidden = false;
      return;
    }

    try {
      closeExecutedOptions();
      clearGeneratedOutput();
      state.phase = 'working';
      updateStatus();
      updateLog();

      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await runRdOnlyPipeline({ config, rdFile: state.rd, toeElevation, subdrilling, exportMode });

      const blob = new Blob([result.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      state.downloadUrl = URL.createObjectURL(blob);
      state.outputFileName = config.output.rd_only_file_name;
      downloadLink.href = state.downloadUrl;
      downloadLink.download = state.outputFileName;
      state.summary = result.summary;
      state.phase = 'rd_done';
      state.errorMessage = null;
      renderLanguage();
    } catch (error) {
      const message = formatPipelineError(error, currentUi());
      state.phase = 'error';
      state.errorMessage = message;
      state.summary = null;
      downloadLink.hidden = true;
      summaryCards.innerHTML = '';
      logOutput.textContent = message;
      updateStatus();
      console.error(error);
    } finally {
      updateStatus();
      updateLog();
    }
  });
}
