import { loadConfig } from './config.js';
import { runMvvPlanPipeline, runPipeline } from './pipeline.js';

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
  const metrics = summary.outputColumns ? [
    [languagePack.metrics.mvv_count, summary.mvvCount],
    [languagePack.metrics.mvv_plan_columns_count, summary.outputColumns.length],
  ] : [
    [languagePack.metrics.mvv_count, summary.mvvCount],
    [languagePack.metrics.rd_raw_count, summary.rdRawCount],
    [languagePack.metrics.rd_unique_count, summary.rdUniqueCount],
    [languagePack.metrics.rd_matched_count, summary.rdMatchedCount],
    [languagePack.metrics.rd_missing_count, summary.rdMissingCount],
    [languagePack.metrics.dual_prefix_count, summary.dualPrefixCount],
  ];

  summaryCards.innerHTML = metrics
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join('');
}

function renderLog(logOutput, summary, config, languagePack, languageCode) {
  const payload = {
    language: languageCode,
    mvvCount: summary.mvvCount,
    rdRawCount: summary.rdRawCount,
    rdUniqueCount: summary.rdUniqueCount,
    rdMatchedCount: summary.rdMatchedCount,
    rdMissingCount: summary.rdMissingCount,
    dualPrefixCount: summary.dualPrefixCount,
    missingHoles: summary.missingHoles,
    rdOnlyHoles: summary.rdOnlyHoles,
    discardedRdCount: summary.discardedRdCount,
    outputColumns: summary.outputColumns,
    sheetName: summary.sheetName,
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
  const systemBadge = qs('systemBadge');
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
  const downloadLink = qs('downloadLink');
  const statusBox = qs('statusBox');
  const statusText = qs('statusText');
  const summaryTitle = qs('summaryTitle');
  const summaryHint = qs('summaryHint');
  const detailsTitle = qs('detailsTitle');
  const detailsBadge = qs('detailsBadge');
  const summaryCards = qs('summaryCards');
  const logOutput = qs('logOutput');

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

  const updateStatus = () => {
    const ui = currentUi();
    const ready = Boolean(state.mvv && state.rd);
    const phase = state.phase === 'working' || state.phase === 'done' || state.phase === 'error'
      ? state.phase
      : state.phase === 'mvv_done'
        ? 'done'
      : ready
        ? 'ready'
        : 'idle';

    let text = ui.status_idle;
    if (phase === 'ready') text = ui.status_ready;
    else if (phase === 'working') text = ui.status_working;
    else if (state.phase === 'mvv_done') text = ui.status_mvv_done || ui.status_done;
    else if (phase === 'done') text = ui.status_done;
    else if (phase === 'error') text = state.errorMessage || ui.status_error;
    else text = ready ? ui.status_ready : ui.status_idle;

    setStatus(statusBox, statusText, phase, text);
    generateBtn.disabled = !ready || phase === 'working';
    mvvOnlyBtn.disabled = !state.mvv || phase === 'working';
  };

  const updateLog = () => {
    const ui = currentUi();
    if ((state.phase === 'done' || state.phase === 'mvv_done') && state.summary) {
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
    appEyebrow.textContent = ui.eyebrow;
    systemBadge.textContent = ui.system_badge;
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
    mvvOnlyBtn.textContent = ui.mvv_only_action;
    downloadLink.textContent = `${ui.download_action} ${state.outputFileName}`;

    if (state.summary && (state.phase === 'done' || state.phase === 'mvv_done')) {
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
}
