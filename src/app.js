import { loadConfig } from './config.js';
import { runPipeline } from './pipeline.js';

function qs(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento nao encontrado: ${id}`);
  return element;
}

function setStatus(statusBox, statusText, tone, text) {
  statusBox.dataset.tone = tone;
  statusText.textContent = text;
}

function renderSummary(summaryCards, config, summary) {
  const metrics = [
    [config.ui.metrics.mvv_count, summary.mvvCount],
    [config.ui.metrics.rd_raw_count, summary.rdRawCount],
    [config.ui.metrics.rd_unique_count, summary.rdUniqueCount],
    [config.ui.metrics.rd_matched_count, summary.rdMatchedCount],
    [config.ui.metrics.rd_missing_count, summary.rdMissingCount],
    [config.ui.metrics.dual_prefix_count, summary.dualPrefixCount],
  ];

  summaryCards.innerHTML = metrics
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join('');
}

function renderLog(logOutput, summary, config) {
  const payload = {
    mvvCount: summary.mvvCount,
    rdRawCount: summary.rdRawCount,
    rdUniqueCount: summary.rdUniqueCount,
    rdMatchedCount: summary.rdMatchedCount,
    rdMissingCount: summary.rdMissingCount,
    dualPrefixCount: summary.dualPrefixCount,
    missingHoles: summary.missingHoles,
    rdOnlyHoles: summary.rdOnlyHoles,
    discardedRdCount: summary.discardedRdCount,
    labels: config.output.labels,
  };
  logOutput.textContent = JSON.stringify(payload, null, 2);
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

  const appTitle = qs('appTitle');
  const appSubtitle = qs('appSubtitle');
  const appEyebrow = qs('appEyebrow');
  const systemBadge = qs('systemBadge');
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
  const mvvFileName = qs('mvvFileName');
  const rdFileName = qs('rdFileName');
  const generateBtn = qs('generateBtn');
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
  appTitle.textContent = config.app.title;
  appSubtitle.textContent = config.app.subtitle;
  appEyebrow.textContent = config.ui.eyebrow;
  systemBadge.textContent = config.ui.system_badge;
  filesTitle.textContent = config.ui.files_title;
  filesHint.textContent = config.ui.files_hint;
  mvvFileLabel.textContent = config.ui.mvv_file_label;
  mvvFileHint.textContent = config.ui.mvv_file_hint;
  rdFileLabel.textContent = config.ui.rd_file_label;
  rdFileHint.textContent = config.ui.rd_file_hint;
  summaryTitle.textContent = config.ui.summary_title;
  summaryHint.textContent = config.ui.summary_hint;
  detailsTitle.textContent = config.ui.details_title;
  detailsBadge.textContent = config.ui.details_badge;
  mvvFileName.textContent = config.ui.no_file_selected;
  rdFileName.textContent = config.ui.no_file_selected;
  generateBtn.textContent = config.ui.primary_action;
  downloadLink.textContent = `${config.ui.download_action} ${config.output.file_name}`;

  const state = {
    mvv: null,
    rd: null,
    downloadUrl: null,
  };

  const syncGenerateButton = () => {
    const ready = Boolean(state.mvv && state.rd);
    generateBtn.disabled = !ready;
  };

  const setFile = (kind, file) => {
    state[kind] = file;
    if (kind === 'mvv') mvvFileName.textContent = file ? file.name : config.ui.no_file_selected;
    if (kind === 'rd') rdFileName.textContent = file ? file.name : config.ui.no_file_selected;
    syncGenerateButton();
    const ready = Boolean(state.mvv && state.rd);
    setStatus(statusBox, statusText, ready ? 'ready' : 'idle', ready ? config.ui.status_ready : config.ui.status_idle);
  };

  wireDropzone(mvvDropzone, mvvFile, (file) => setFile('mvv', file));
  wireDropzone(rdDropzone, rdFile, (file) => setFile('rd', file));

  generateBtn.addEventListener('click', async () => {
    if (!state.mvv || !state.rd) return;

    try {
      if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
      downloadLink.hidden = true;
      setStatus(statusBox, statusText, 'working', config.ui.status_working);
      logOutput.textContent = config.ui.log_processing;
      generateBtn.disabled = true;

      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await runPipeline({ config, mvvFile: state.mvv, rdFile: state.rd });

      const blob = new Blob([result.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      state.downloadUrl = URL.createObjectURL(blob);
      downloadLink.href = state.downloadUrl;
      downloadLink.download = config.output.file_name;
      downloadLink.hidden = false;

      renderSummary(summaryCards, config, result.summary);
      renderLog(logOutput, result.summary, config);
      setStatus(statusBox, statusText, 'done', config.ui.status_done);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(statusBox, statusText, 'error', message);
      logOutput.textContent = message;
      downloadLink.hidden = true;
      console.error(error);
    } finally {
      syncGenerateButton();
    }
  });

  summaryCards.innerHTML = '';
  logOutput.textContent = config.ui.log_waiting;
  syncGenerateButton();
  setStatus(statusBox, statusText, 'idle', config.ui.status_idle);
}
