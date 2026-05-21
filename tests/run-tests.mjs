import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildConsolidatedRows, buildMvvPlanRows, deduplicateRdRows } from '../src/processor.js';
import { normalizeHoleKey } from '../src/utils.js';

const projectConfig = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8'));

const config = {
  matching: {
    prefix_priority: ['E-', 'L_'],
    strip_prefixes: ['E-', 'L_'],
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
  assert.equal(normalizeHoleKey('L_001', ['E-', 'L_']), '1');
  assert.equal(normalizeHoleKey('E-157', ['E-', 'L_']), '157');
});

test('deduplicateRdRows prefers E-', () => {
  const rdRows = [
    { holeKey: '1', TIPO_RD: 'L_', ID_RD: 'L_1', Y_RD: 1, X_RD: 2, Z_RD: 3 },
    { holeKey: '1', TIPO_RD: 'E-', ID_RD: 'E-1', Y_RD: 4, X_RD: 5, Z_RD: 6 },
    { holeKey: '2', TIPO_RD: 'L_', ID_RD: 'L_2', Y_RD: 7, X_RD: 8, Z_RD: 9 },
  ];

  const { treatedRows, selected, dualPrefixCount } = deduplicateRdRows(rdRows, config);
  assert.equal(dualPrefixCount, 1);
  assert.equal(selected.get('1').ID_RD, 'E-1');
  assert.deepEqual(treatedRows.map((row) => row.ID_RD), ['E-1', 'L_2']);
});

test('buildConsolidatedRows falls back to MVV values', () => {
  const mvvRows = [
    { ID: 1, Type: 'TypeA', Descricao: 'A', Diameter: 4, 'X Collar': 100, 'Y Collar': 200, 'X Toe': 110, 'Y Toe': 210, 'Z Toe': 50, 'Z Collar': 60, Depth: 12, 'Sub Drill': 1, Azimuth: 90, Dip: 15, holeKey: '1' },
    { ID: 2, Type: 'TypeB', Descricao: 'B', Diameter: 5, 'X Collar': 101, 'Y Collar': 201, 'X Toe': 111, 'Y Toe': 211, 'Z Toe': 51, 'Z Collar': 61, Depth: 13, 'Sub Drill': 1.5, Azimuth: 95, Dip: 16, holeKey: '2' },
  ];
  const selected = new Map([
    ['1', { ID_RD: 'E-1', TIPO_RD: 'E-', Y_RD: 201, X_RD: 101, Z_RD: 61 }],
  ]);

  const { consolidatedRows, summary } = buildConsolidatedRows(mvvRows, selected, 2, 1);
  assert.equal(consolidatedRows[0].ID_FINAL, 'E-1');
  assert.equal(consolidatedRows[1].ID_FINAL, 2);
  assert.equal(consolidatedRows[0].PROFUNDIDADE_FINAL, 12);
  assert.equal(consolidatedRows[1].PROFUNDIDADE_FINAL, 13);
  assert.equal(summary.rdMatchedCount, 1);
  assert.equal(summary.rdMissingCount, 1);
  assert.deepEqual(summary.missingHoles, ['2']);
});

test('config exposes localized ui packs', () => {
  assert.equal(projectConfig.app.title, 'US Vale Verde PLAN/EXEC Data Console');
  assert.equal(projectConfig.ui.default_language, 'pt');
  assert.deepEqual(Object.keys(projectConfig.ui.languages), ['pt', 'en', 'zh']);
  assert.equal(projectConfig.ui.languages.pt.language_label, 'Idioma');
  assert.equal(projectConfig.ui.languages.en.primary_action, 'Generate workbook');
  assert.equal(projectConfig.ui.languages.zh.primary_action, '生成工作簿');
  assert.equal(projectConfig.ui.languages.pt.workflow_steps[0], 'Anexar MVV');
  assert.equal(projectConfig.ui.languages.pt.mvv_only_action, 'Organizar somente MVV');
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
