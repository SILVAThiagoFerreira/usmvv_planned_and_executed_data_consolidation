import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildConsolidatedRows, buildMvvPlanRows, buildRdOnlyRows, deduplicateRdRows } from '../src/processor.js';
import { getNumericFormatForHeader } from '../src/writer.js';
import { normalizeHoleKey } from '../src/utils.js';

const projectConfig = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8'));

const config = {
  matching: {
    prefix_priority: ['L-', 'E-', 'L_'],
    strip_prefixes: ['L-', 'E-', 'L_'],
    prefer_first_within_same_prefix: true,
  },
  columns: {
    mvv: ['ID', 'Type', 'Descricao', 'Diameter', 'X Collar', 'Y Collar', 'X Toe', 'Y Toe', 'Z Toe', 'Z Collar', 'Depth', 'Sub Drill', 'Azimuth', 'Dip'],
  },
};

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('normalizeHoleKey strips prefixes', () => {
  assert.equal(normalizeHoleKey('L_001', ['E-', 'L-', 'L_']), '1');
  assert.equal(normalizeHoleKey('L-001', ['E-', 'L-', 'L_']), '1');
  assert.equal(normalizeHoleKey('E-157', ['E-', 'L-', 'L_']), '157');
});

test('deduplicateRdRows prefers L- over E-', () => {
  const rdRows = [
    { holeKey: '1', TIPO_RD: 'E-', ID_RD: 'E-1', Y_RD: 4, X_RD: 5, Z_RD: 6 },
    { holeKey: '1', TIPO_RD: 'L-', ID_RD: 'L-1', Y_RD: 1, X_RD: 2, Z_RD: 3 },
    { holeKey: '2', TIPO_RD: 'L_', ID_RD: 'L_2', Y_RD: 7, X_RD: 8, Z_RD: 9 },
  ];

  const { treatedRows, selected, dualPrefixCount } = deduplicateRdRows(rdRows, config);
  assert.equal(dualPrefixCount, 1);
  assert.equal(selected.get('1').ID_RD, 'L-1');
  assert.deepEqual(treatedRows.map((row) => row.ID_RD), ['L-1', 'L_2']);
});

test('buildRdOnlyRows maps treated RD rows to configured output columns', () => {
  const treatedRows = [
    { ID_RD: 'E-1', Y_RD: 11, X_RD: 21, Z_RD: 292, holeKey: '1', sourceLine: 1 },
    { ID_RD: 'L_2', Y_RD: 12, X_RD: 22, Z_RD: 280, holeKey: '2', sourceLine: 2 },
  ];
  const rdOnlyConfig = {
    columns: {
      rd_only: ['ID', 'Y', 'X', 'Z', 'Profundidade'],
    },
  };

  const rows = buildRdOnlyRows(treatedRows, rdOnlyConfig, 10);
  assert.deepEqual(rows, [
    { ID: 1, Y: 11, X: 21, Z: 292, Profundidade: 10 },
    { ID: 2, Y: 12, X: 22, Z: 280, Profundidade: 10 },
  ]);
});

test('buildConsolidatedRows falls back to MVV values', () => {
  const mvvRows = [
    { ID: 1, Type: 'TypeA', Descricao: 'A', Diameter: 4, 'X Collar': 100, 'Y Collar': 200, 'X Toe': 110, 'Y Toe': 210, 'Z Toe': 50, 'Z Collar': 60, Depth: 12, 'Sub Drill': 1, Azimuth: 90, Dip: 15, holeKey: '1' },
    { ID: 2, Type: 'TypeB', Descricao: 'B', Diameter: 5, 'X Collar': 101, 'Y Collar': 201, 'X Toe': 111, 'Y Toe': 211, 'Z Toe': 51, 'Z Collar': 61, Depth: 13, 'Sub Drill': 1.5, Azimuth: 95, Dip: 16, holeKey: '2' },
  ];
  const selected = new Map([
    ['1', { ID_RD: 'L-1', TIPO_RD: 'L-', Y_RD: 201, X_RD: 101, Z_RD: 61 }],
  ]);

  const { consolidatedRows, summary } = buildConsolidatedRows(mvvRows, selected, 2, 1);
  assert.equal(consolidatedRows[0].ID_FINAL, 'L-1');
  assert.equal(consolidatedRows[1].ID_FINAL, 2);
  assert.equal(consolidatedRows[0].PROFUNDIDADE_FINAL, 11);
  assert.equal(consolidatedRows[1].PROFUNDIDADE_FINAL, 13);
  assert.equal(summary.rdMatchedCount, 1);
  assert.equal(summary.rdMissingCount, 1);
  assert.deepEqual(summary.missingHoles, ['2']);
});

test('profundidade final uses a dedicated 2-decimal format', () => {
  const workbookConfig = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
  assert.equal(getNumericFormatForHeader('PROFUNDIDADE_FINAL', workbookConfig), '0.00');
  assert.equal(getNumericFormatForHeader('Z_RD', workbookConfig), '0.000');
});

test('config exposes localized ui packs', () => {
  assert.equal(projectConfig.app.title, 'US Vale Verde PLAN/EXEC Data Console');
  assert.equal(projectConfig.ui.default_language, 'pt');
  assert.deepEqual(Object.keys(projectConfig.ui.languages), ['pt', 'en', 'zh']);
  assert.equal(projectConfig.ui.languages.pt.language_label, 'Idioma');
  assert.equal(projectConfig.ui.languages.en.primary_action, 'Generate workbook');
  assert.equal(projectConfig.ui.languages.zh.primary_action, '生成工作簿');
  assert.equal(projectConfig.ui.languages.pt.app_subtitle, '');
  assert.deepEqual(projectConfig.ui.languages.pt.workflow_steps.slice(0, 2), ['Anexar Planejado', 'Anexar Realizado']);
  assert.equal(projectConfig.ui.languages.pt.mvv_file_label, 'PLANEJADO.xlsx');
  assert.equal(projectConfig.ui.languages.pt.rd_file_label, 'REALIZADO.txt');
  assert.equal(projectConfig.ui.languages.pt.mvv_file_hint, 'Plano de Perfuração');
  assert.equal(projectConfig.ui.languages.pt.rd_file_hint, 'Arquivo de Coordenadas da Topografia');
  assert.equal(projectConfig.ui.languages.pt.status_idle, 'Anexe PLANEJADO.xlsx para organizar PLANEJADO ou anexe tambem REALIZADO.txt para consolidar.');
  assert.equal(projectConfig.ui.languages.pt.files_title, 'ARQUIVOS DE ORIGEM');
  assert.equal(projectConfig.ui.languages.pt.summary_title, 'Resumo:');
  assert.equal(projectConfig.ui.languages.pt.details_title, 'LOG');
  assert.equal(projectConfig.ui.languages.pt.primary_action, 'Gerar Dado Consolidado Planejado vs Realizado');
  assert.equal(projectConfig.ui.languages.pt.mvv_only_action, 'Organize Somente o Dado Planejado');
  assert.equal(projectConfig.ui.languages.pt.rd_only_action, 'Organize Somente o Executado');
  assert.equal(projectConfig.ui.languages.pt.status_ready_mvv, 'Pronto para organizar somente o planejado.');
  assert.equal(projectConfig.ui.languages.pt.status_ready_rd, 'Pronto para organizar somente o executado.');
  assert.equal(projectConfig.ui.languages.pt.status_rd_done, 'Executado organizado.');
  assert.equal(projectConfig.ui.languages.pt.executed_depth_prompt, 'Informe a profundidade a ser aplicada a todos os furos (ex: 10).');
  assert.equal(projectConfig.ui.languages.pt.executed_depth_invalid, 'Informe uma profundidade valida maior que zero.');
  assert.equal(projectConfig.ui.languages.pt.metrics.project_depth, 'Profundidade aplicada');
  assert.equal(projectConfig.ui.languages.en.executed_depth_prompt, 'Enter the depth to apply to all holes (e.g. 10).');
  assert.equal(projectConfig.ui.languages.en.executed_depth_invalid, 'Enter a valid depth greater than zero.');
  assert.equal(projectConfig.ui.languages.en.metrics.project_depth, 'Applied depth');
  assert.equal(projectConfig.ui.languages.zh.executed_depth_prompt, '请输入要应用到所有孔的深度（米，例如 10）。');
  assert.equal(projectConfig.ui.languages.zh.executed_depth_invalid, '请输入大于 0 的有效深度。');
  assert.equal(projectConfig.ui.languages.zh.metrics.project_depth, '应用深度');
  assert.deepEqual(projectConfig.columns.rd_only, ['ID', 'Y', 'X', 'Z', 'Profundidade']);
  assert.equal(projectConfig.output.rd_only_file_name, 'RD_EXECUTADO_ORGANIZADO.xlsx');
  assert.equal(projectConfig.output.sheets.executed, 'RD_EXECUTADO');
  assert.equal(Object.hasOwn(projectConfig.ui.languages.pt, 'system_badge'), false);
});

test('mvv plan extraction keeps only configured output columns', () => {
  const rawMvv = {
    rows: [
      { blank: false, values: ['F1', 'P', 'ANFO', 6.5, 100, 200, 300, 12, 0.7, 45, -70, 2.1, 35, 'remove'] },
    ],
  };
  const planConfig = {
    columns: {
      mvv_plan: ['ID', 'Type', 'Explosivo', 'Diameter', 'X Collar', 'Y Collar', 'Z Collar', 'Depth', 'Sub Drill', 'Azimuth', 'Dip', 'Tampao', 'Carga'],
    },
    validation: {
      mvv_plan_numeric_fields: ['Diameter', 'X Collar', 'Y Collar', 'Z Collar', 'Depth', 'Sub Drill', 'Azimuth', 'Dip', 'Tampao', 'Carga'],
    },
  };
  const validation = {
    indexMap: new Map(planConfig.columns.mvv_plan.concat('Extra').map((header, index) => [header, index])),
  };

  const rows = buildMvvPlanRows(rawMvv, planConfig, validation);
  assert.deepEqual(Object.keys(rows[0]), planConfig.columns.mvv_plan);
  assert.equal(rows[0].Explosivo, 'ANFO');
  assert.equal(rows[0].Carga, 35);
  assert.equal(Object.hasOwn(rows[0], 'Extra'), false);
});

test('legacy branding is removed', () => {
  const configText = JSON.stringify(projectConfig);
  const legacyTitle = ['M', 'V', 'V', '/', 'R', 'D', ' ', 'D', 'a', 't', 'a', ' ', 'C', 'o', 'n', 's', 'o', 'l', 'e'].join('');
  const legacyEyebrow = ['E', 'M', 'T', 'S'].join('');
  assert.equal(configText.includes(legacyTitle), false);
  assert.equal(configText.includes(legacyEyebrow), false);
});

test('brand uses the OpenBlast asset', async () => {
  const { readFileSync } = await import('node:fs');
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(indexHtml, /src="\.\/assets\/openblast-logo\.png"/);
  assert.match(indexHtml, /alt="OpenBlast"/);
});
