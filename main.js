import { bootstrapApp } from './src/app.js';

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await bootstrapApp();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = document.getElementById('statusBox');
    const text = document.getElementById('statusText');
    const log = document.getElementById('logOutput');
    if (status) status.dataset.tone = 'error';
    if (text) text.textContent = message;
    if (log) log.textContent = message;
    console.error(error);
  }
});
