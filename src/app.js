import { loadConfig } from './config.js';
import { runMvvPlanPipeline, runPipeline, runRdOnlyPipeline } from './pipeline.js';

function qs(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento nao encontrado: ${id}`);
  return element;
}

function setStatus(statusBox, statusText, tone, text) {
  statusBox.dataset.tone = tone;
  statusText.textContent = text;
}

function getLanguagePack(config, languageCode) {
  const languages = config.ui.languages || {};
  return languages[languageCode] || languages[config.ui.default_language] || languages.pt;
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
      [languagePack.metrics.toe_elevation, `${summary.toeElevation.toFixed(3)} m`],
      [languagePack.metrics.subdrilling, `${summary.subdrilling.toFixed(3)} m`],
    ];
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

export async function bootstrapApp() {
  const config = await loadConfig();
  const defaultLanguage = config.ui.default_language || 'pt';

  const appTitle = qs('appTitle');
  const appSubtitle = qs('appSubtitle');
  const appEyebrow = qs('appEyebrow');
  const topbar = document.querySelector('.topbar');
  const signalRow = document.querySelector('.signal-row');
  const languageLabel = qs('languageLabel');
  const languageSelect = qs('languageSelect');
  const filesTitle = qs('filesTitle');
  const filesHint = qs('filesHint');
  const mvvFile = qs('mvvFile');
  const rdFile = qs('rdFile');
  const mvvDropzone = qs('mvvDropzone');
  const rdDropzone = qs('rdDropzone');
  const mvvFileLabel = qs('mvvFileLabel');
  const mvvFileHint = qs('mvvFileHint');
  const rdFileLabel = qs('rdFileLabel');
  const rdFileHint = qs('rdFileHint');
  const workflowStep1 = qs('workflowStep1');
  const workflowStep2 = qs('workflowStep2');
  const workflowStep3 = qs('workflowStep3');
  const mvvFileName = qs('mvvFileName');
  const rdFileName = qs('rdFileName');
  const generateBtn = qs('generateBtn');
  const mvvOnlyBtn = qs('mvvOnlyBtn');
  const rdOnlyBtn = qs('rdOnlyBtn');
  const downloadLink = qs('downloadLink');
  const statusBox = qs('statusBox');
  const statusText = qs('statusText');
  const summaryTitle = qs('summaryTitle');
  const summaryHint = qs('summaryHint');
  const detailsTitle = qs('detailsTitle');
  const detailsBadge = qs('detailsBadge');
  const summaryCards = qs('summaryCards');
  const logOutput = qs('logOutput');
  const executedOptions = qs('executedOptions');
  const executedOptionsTitle = qs('executedOptionsTitle');
  const executedOptionsHint = qs('executedOptionsHint');
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

  document.title = config.app.title;
  const state = {
    mvv: null,
    rd: null,
    downloadUrl: null,
    outputFileName: config.output.file_name,
    language: defaultLanguage,
    phase: 'idle',
    errorMessage: null,
    summary: null,
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

  const closeExecutedOptions = () => {
    executedOptions.hidden = true;
    executedOptionsError.hidden = true;
    executedOptions.reset();
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
    if (signalRow) signalRow.setAttribute('aria-label', ui.workflow_label);

    renderLanguageOptions(languageSelect, ui, state.language);

    languageLabel.textContent = ui.language_label;
    languageSelect.setAttribute('aria-label', ui.language_label);
    appTitle.textContent = config.app.title;
    appSubtitle.textContent = ui.app_subtitle;
    appSubtitle.hidden = !ui.app_subtitle;
    appEyebrow.textContent = ui.eyebrow;
    filesTitle.textContent = ui.files_title;
    filesHint.textContent = ui.files_hint;
    mvvFileLabel.textContent = ui.mvv_file_label;
    mvvFileHint.textContent = ui.mvv_file_hint;
    rdFileLabel.textContent = ui.rd_file_label;
    rdFileHint.textContent = ui.rd_file_hint;
    workflowStep1.textContent = ui.workflow_steps[0];
    workflowStep2.textContent = ui.workflow_steps[1];
    workflowStep3.textContent = ui.workflow_steps[2];
    summaryTitle.textContent = ui.summary_title;
    summaryHint.textContent = ui.summary_hint;
    detailsTitle.textContent = ui.details_title;
    detailsBadge.textContent = ui.details_badge;
    mvvFileName.textContent = state.mvv ? state.mvv.name : ui.no_file_selected;
    rdFileName.textContent = state.rd ? state.rd.name : ui.no_file_selected;
    generateBtn.textContent = ui.primary_action;
    rdOnlyBtn.textContent = ui.rd_only_action;
    mvvOnlyBtn.textContent = ui.mvv_only_action;
    executedOptionsTitle.textContent = ui.executed_options_title;
    executedOptionsHint.textContent = ui.executed_options_hint;
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

    if (state.summary && (state.phase === 'done' || state.phase === 'mvv_done' || state.phase === 'rd_done')) {
      renderSummary(summaryCards, ui, state.summary);
    } else {
      summaryCards.innerHTML = '';
    }

    downloadLink.hidden = !state.downloadUrl;

    updateStatus();
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

  renderLanguage();

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
      const message = error instanceof Error ? error.message : String(error);
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
      const message = error instanceof Error ? error.message : String(error);
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

    executedOptions.hidden = false;
    toeElevationInput.focus();
  });

  document.querySelectorAll('input[name="subdrilling"]').forEach((input) => {
    input.addEventListener('change', () => {
      subdrillingValueField.hidden = input.value !== 'yes' || !input.checked;
      if (input.value === 'no' && input.checked) subdrillingValueInput.value = '';
    });
  });

  [cancelExecutedOptions, cancelExecutedOptionsSecondary].forEach((button) => {
    button.addEventListener('click', closeExecutedOptions);
  });

  executedOptions.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.rd) return;

    const ui = currentUi();
    const toeElevation = parseNumberInput(toeElevationInput.value);
    const hasSubdrilling = document.querySelector('input[name="subdrilling"]:checked')?.value === 'yes';
    const subdrilling = hasSubdrilling ? parseNumberInput(subdrillingValueInput.value) : 0;
    if (toeElevation === null || (hasSubdrilling && (subdrilling === null || subdrilling < 0))) {
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
      const result = await runRdOnlyPipeline({ config, rdFile: state.rd, toeElevation, subdrilling });

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
      const message = error instanceof Error ? error.message : String(error);
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
