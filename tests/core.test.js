'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../bom-core.js');

function loadCsv(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const parsed = core.parseDelimited(source);
  return core.matrixToTable(parsed.matrix, null);
}

function hasIssue(report, code) {
  return report.issues.some((issue) => issue.code === code);
}

(function testReferenceRanges() {
  const parsed = core.parseDesignators('R1-R4, C1 C2, U1..U3');
  assert.deepStrictEqual(parsed.uniqueRefs, ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'U1', 'U2', 'U3']);
})();

(function testDuplicateRefWithinRow() {
  const parsed = core.parseDesignators('R1, R2, R1');
  assert.deepStrictEqual(parsed.duplicates, ['R1']);
})();

(function testQuantityParsing() {
  assert.deepStrictEqual(core.parseQuantity('12'), { value: 12, valid: true, reason: null });
  assert.strictEqual(core.parseQuantity('1.5').valid, false);
  assert.strictEqual(core.parseQuantity('abc').valid, false);
})();


(function testDelimiterDetectionWithPreamble() {
  const source = 'Project ABC\nRefDes\tQty\tMPN\nR1\t1\tABC123\n';
  const parsed = core.parseDelimited(source);
  assert.strictEqual(parsed.delimiter, '\t');
  const table = core.matrixToTable(parsed.matrix);
  assert.strictEqual(table.headerRowIndex, 1);
  assert.strictEqual(table.rows[0].data.MPN, 'ABC123');
})();

(function testHeaderDetection() {
  const matrix = [
    ['Project', 'Controller'],
    ['Revision', 'C'],
    ['Reference Designator', 'Quantity', 'Manufacturer', 'MPN', 'Footprint'],
    ['R1', '1', 'Yageo', 'RC0603FR-0710KL', '0603']
  ];
  assert.strictEqual(core.detectHeaderRow(matrix), 2);
})();

(function testPositiveLogicPopulateColumn() {
  const table = core.matrixToTable([
    ['RefDes', 'Qty', 'MPN', 'Populate'],
    ['R1', '1', 'ABC', 'No'],
    ['R2', '1', 'XYZ', 'Yes']
  ], 0);
  const mapping = core.autoMapHeaders(table.headers);
  const report = core.analyze(table, mapping, { profile: 'procurement', excludeDnp: true });
  assert.strictEqual(report.rows[0].isDnp, true);
  assert.strictEqual(report.rows[1].isDnp, false);
})();

(function testProblemSample() {
  const table = loadCsv('sample-bom-with-issues.csv');
  assert.strictEqual(table.headerRowIndex, 1);
  const mapping = core.autoMapHeaders(table.headers);
  const report = core.analyze(table, mapping, { profile: 'procurement', excludeDnp: true });
  assert.ok(report.counts.error >= 5, `Expected several errors, got ${report.counts.error}`);
  assert.ok(hasIssue(report, 'QTY_REFDES_MISMATCH'));
  assert.ok(hasIssue(report, 'DUPLICATE_REF_ACROSS_ROWS'));
  assert.ok(hasIssue(report, 'PLACEHOLDER_VALUE'));
  assert.ok(hasIssue(report, 'MPN_FOOTPRINT_CONFLICT'));
  assert.ok(hasIssue(report, 'NON_POSITIVE_QUANTITY'));
})();

(function testCleanSample() {
  const table = loadCsv('sample-bom-clean.csv');
  const mapping = core.autoMapHeaders(table.headers);
  const report = core.analyze(table, mapping, { profile: 'procurement', excludeDnp: true });
  assert.strictEqual(report.counts.error, 0, JSON.stringify(report.issues, null, 2));
})();

(function testQuantityComparisonCanBeDisabled() {
  const table = core.matrixToTable([
    ['RefDes', 'Qty', 'MPN'],
    ['R1-R4', '4000', 'ABC']
  ], 0);
  const mapping = core.autoMapHeaders(table.headers);
  const report = core.analyze(table, mapping, { profile: 'procurement', compareQuantityToRefs: false });
  assert.strictEqual(hasIssue(report, 'QTY_REFDES_MISMATCH'), false);
})();

(function testRefLessRowsCanBeAllowed() {
  const table = core.matrixToTable([
    ['RefDes', 'Qty', 'MPN', 'Description'],
    ['', '1', 'LABEL-01', 'Product label']
  ], 0);
  const mapping = core.autoMapHeaders(table.headers);
  const blocked = core.analyze(table, mapping, { profile: 'procurement', allowRefLessRows: false });
  assert.ok(hasIssue(blocked, 'MISSING_DESIGNATOR'));
  const allowed = core.analyze(table, mapping, { profile: 'procurement', allowRefLessRows: true });
  assert.strictEqual(hasIssue(allowed, 'MISSING_DESIGNATOR'), false);
})();


(function testLifecycleAndInternalPartChecks() {
  const table = core.matrixToTable([
    ['RefDes', 'Qty', 'Manufacturer', 'MPN', 'Internal Part Number', 'Lifecycle Status'],
    ['U1', '1', 'Vendor A', 'MPN-A', 'IPN-1001', 'Active'],
    ['U2', '1', 'Vendor B', 'MPN-B', 'IPN-1001', 'NRND']
  ], 0);
  const mapping = core.autoMapHeaders(table.headers);
  const report = core.analyze(table, mapping, { profile: 'procurement' });
  assert.ok(hasIssue(report, 'INTERNAL_PN_MULTIPLE_MPN'));
  assert.ok(hasIssue(report, 'LIFECYCLE_REVIEW'));
})();

console.log(`PCB BOM Checker core tests passed (v${core.VERSION}).`);
