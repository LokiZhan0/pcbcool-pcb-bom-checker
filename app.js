(function () {
  'use strict';

  const core = window.BomCore;
  if (!core) {
    document.body.innerHTML = '<main style="padding:40px;font-family:system-ui">PCB BOM Checker failed to load its analysis engine.</main>';
    return;
  }

  const XLSX_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  let xlsxLoadPromise = null;

  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxLoadPromise) return xlsxLoadPromise;
    xlsxLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = XLSX_URL;
      script.async = true;
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('Excel parser loaded but did not initialize.'));
      script.onerror = () => reject(new Error('Excel support could not load from the SheetJS CDN. Save the BOM as UTF-8 CSV/TSV or try again with an internet connection.'));
      document.head.appendChild(script);
    }).catch((error) => {
      xlsxLoadPromise = null;
      throw error;
    });
    return xlsxLoadPromise;
  }

  const state = {
    sourceType: null,
    sourceName: '',
    matrix: [],
    workbook: null,
    sheetName: null,
    table: null,
    mapping: {},
    report: null,
    issueFilter: 'all',
    issueSearch: '',
    page: 1,
    pageSize: 50
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    dropZone: $('dropZone'),
    fileInput: $('fileInput'),
    chooseFileBtn: $('chooseFileBtn'),
    pasteBtn: $('pasteBtn'),
    pasteCard: $('pasteCard'),
    closePasteBtn: $('closePasteBtn'),
    pasteArea: $('pasteArea'),
    analyzePasteBtn: $('analyzePasteBtn'),
    clearPasteBtn: $('clearPasteBtn'),
    loadBadSampleBtn: $('loadBadSampleBtn'),
    loadGoodSampleBtn: $('loadGoodSampleBtn'),
    workspace: $('workspace'),
    sourceName: $('sourceName'),
    sourceMeta: $('sourceMeta'),
    changeFileBtn: $('changeFileBtn'),
    sheetControl: $('sheetControl'),
    sheetSelect: $('sheetSelect'),
    headerRowInput: $('headerRowInput'),
    profileSelect: $('profileSelect'),
    excludeDnpToggle: $('excludeDnpToggle'),
    placeholderToggle: $('placeholderToggle'),
    compareQtyToggle: $('compareQtyToggle'),
    allowRefLessToggle: $('allowRefLessToggle'),
    mappingGrid: $('mappingGrid'),
    resetMappingBtn: $('resetMappingBtn'),
    readinessCard: $('readinessCard'),
    readinessBadge: $('readinessBadge'),
    readinessTitle: $('readinessTitle'),
    readinessSummary: $('readinessSummary'),
    statsGrid: $('statsGrid'),
    coverageGrid: $('coverageGrid'),
    issuesList: $('issuesList'),
    issueSearch: $('issueSearch'),
    previewTable: $('previewTable'),
    pagination: $('pagination'),
    allCount: $('allCount'),
    errorCount: $('errorCount'),
    warningCount: $('warningCount'),
    infoCount: $('infoCount'),
    downloadIssuesBtn: $('downloadIssuesBtn'),
    downloadReviewedBtn: $('downloadReviewedBtn'),
    downloadJsonBtn: $('downloadJsonBtn')
  };

  const badSample = `Project,Controller Board Rev C,,,,,,,,,,\nReference Designator,Quantity,Manufacturer,MPN,Description,Value,Footprint,DNP,Supplier,Supplier Part Number,Alternate MPN,Notes\nR1-R4,4,Yageo,RC0603FR-0710KL,Resistor,10k,0603,No,DigiKey,311-10.0KHRCT-ND,,\nC1 C2 C3,2,Murata,GRM188R71C104KA01D,MLCC,100nF,0603,No,Mouser,81-GRM188R71C104KA1D,,Quantity should be 3\nU1,1,Texas Instruments,TBD,MCU,,QFN-48,No,DigiKey,,,MPN pending\nD1,1,Nexperia,1N4148W,Switching diode,1N4148,SOD-123,No,Mouser,771-1N4148W115,,\nD1,1,Nexperia,1N4148W,Switching diode,1N4148,SOD-323,No,Mouser,771-1N4148W115,,Duplicate RefDes and footprint conflict\nR5,1,Yageo,RC0603FR-0710KL,Resistor,47k,0603,No,DigiKey,311-10.0KHRCT-ND,,Same MPN with different value\nC4,0,Murata,GRM188R71H103KA01D,MLCC,10nF,0603,No,Mouser,81-GRM188R71H103KA,,Zero qty on placed row\nLED1,1,Lite-On,LTST-C190KGKT,Green LED,Green,0603,DNP,DigiKey,160-1446-1-ND,,DNP with positive qty\nJ1,1,TE Connectivity,1-1734592-0,Connector,10 pos,,No,DigiKey,A100201CT-ND,,Missing footprint\nR6,1,Yageo,RC0603FR-0710KL,Resistor,10k,0603,No,DigiKey,311-10.0KHRCT-ND,,\nR6,1,Yageo,RC0603FR-0710KL,Resistor,10k,0603,DNP,DigiKey,311-10.0KHRCT-ND,,Same ref placed and DNP\nTP1,-1,,,Test point,,TestPoint,No,,,,Negative quantity\n`;

  const goodSample = `Reference Designator,Quantity,Manufacturer,MPN,Description,Value,Footprint,DNP,Supplier,Supplier Part Number,Alternate MPN,Notes\nR1-R4,4,Yageo,RC0603FR-0710KL,Thick film resistor,10k 1%,0603,No,DigiKey,311-10.0KHRCT-ND,CRCW060310K0FKEA,\nC1-C3,3,Murata,GRM188R71C104KA01D,MLCC X7R,100nF 16V,0603,No,Mouser,81-GRM188R71C104KA1D,CC0603KRX7R7BB104,\nU1,1,STMicroelectronics,STM32G431CBT6,Microcontroller,STM32G431,LQFP-48,No,DigiKey,497-19466-ND,,\nD1,1,Nexperia,1N4148W,Switching diode,1N4148,SOD-123,No,Mouser,771-1N4148W115,\nJ1,1,TE Connectivity,1-1734592-0,Board connector,10 position,1.0mm connector,No,DigiKey,A100201CT-ND,,\nLED1,1,Lite-On,LTST-C190KGKT,Green indicator LED,Green,0603,DNP,DigiKey,160-1446-1-ND,,Optional indicator not fitted\n`;

  function showMessage(message, type = 'error') {
    const existing = document.querySelector('.toast-message');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = `toast-message ${type}`;
    div.textContent = message;
    Object.assign(div.style, {
      position: 'fixed', right: '20px', bottom: '20px', zIndex: '1000', maxWidth: '430px',
      padding: '13px 16px', borderRadius: '10px', color: type === 'error' ? '#7f1d1d' : '#14532d',
      background: type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`,
      boxShadow: '0 12px 30px rgba(15,23,42,.12)', fontWeight: '650', fontSize: '13px'
    });
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000);
  }

  function fileStem(name) {
    return (name || 'bom').replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'bom';
  }

  function humanBytes(bytes) {
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function parseTextToMatrix(source) {
    return core.parseDelimited(source).matrix;
  }

  function setSourceFromMatrix(matrix, name, type = 'text', meta = '') {
    state.sourceType = type;
    state.sourceName = name;
    state.workbook = null;
    state.sheetName = null;
    state.matrix = matrix;
    els.sheetControl.classList.add('hidden');
    buildTableFromMatrix(null, meta);
  }

  function sheetToMatrix(sheetName) {
    if (!state.workbook || !window.XLSX) return [];
    const sheet = state.workbook.Sheets[sheetName];
    return window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: true
    });
  }

  function setWorkbook(workbook, name, size) {
    state.sourceType = 'workbook';
    state.sourceName = name;
    state.workbook = workbook;
    const names = workbook.SheetNames || [];
    if (!names.length) throw new Error('The workbook contains no readable worksheets.');
    state.sheetName = names[0];
    els.sheetSelect.innerHTML = '';
    names.forEach((sheetName) => {
      const option = document.createElement('option');
      option.value = sheetName;
      option.textContent = sheetName;
      els.sheetSelect.appendChild(option);
    });
    els.sheetControl.classList.remove('hidden');
    state.matrix = sheetToMatrix(state.sheetName);
    buildTableFromMatrix(null, `${names.length} worksheet${names.length === 1 ? '' : 's'} · ${humanBytes(size)}`);
  }

  function buildTableFromMatrix(headerRowIndex = null, metaOverride = null) {
    if (!state.matrix || !state.matrix.length) {
      showMessage('No tabular data was found in this source.');
      return;
    }
    state.table = core.matrixToTable(state.matrix, headerRowIndex);
    state.mapping = core.autoMapHeaders(state.table.headers);
    state.page = 1;
    els.headerRowInput.max = String(Math.max(1, state.matrix.length));
    els.headerRowInput.value = String(state.table.headerRowIndex + 1);
    els.sourceName.textContent = state.sourceName || 'BOM';
    const baseMeta = `${state.table.rows.length} data row${state.table.rows.length === 1 ? '' : 's'} · ${state.table.headers.length} columns · header detected on row ${state.table.headerRowIndex + 1}`;
    els.sourceMeta.textContent = metaOverride ? `${baseMeta} · ${metaOverride}` : baseMeta;
    els.workspace.classList.remove('hidden');
    renderMapping();
    runAnalysis();
    els.workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const spreadsheetExts = new Set(['xlsx', 'xls', 'xlsm', 'xlsb']);
    try {
      if (spreadsheetExts.has(ext)) {
        await ensureXlsx();
        const buffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(buffer, { type: 'array', cellDates: false });
        setWorkbook(workbook, file.name, file.size);
      } else {
        const source = await file.text();
        const parsed = core.parseDelimited(source);
        setSourceFromMatrix(parsed.matrix, file.name, 'text', `${humanBytes(file.size)} · ${parsed.delimiter === '\t' ? 'tab' : parsed.delimiter} delimiter`);
      }
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'The BOM could not be read.');
    }
  }

  function mappingOptions(currentField) {
    const current = state.mapping[currentField] || '';
    const options = [{ value: '', label: '— Not mapped —' }];
    state.table.headers.forEach((header) => options.push({ value: header, label: header }));
    return options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === current ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
  }

  function renderMapping() {
    if (!state.table) return;
    els.mappingGrid.innerHTML = '';
    core.CANONICAL_FIELDS.forEach((field) => {
      const item = document.createElement('div');
      item.className = 'mapping-item';
      const label = core.FIELD_LABELS[field] || field;
      const requiredForProfile = core.PROFILES[els.profileSelect.value]?.required.includes(field);
      item.innerHTML = `
        <label for="map-${field}">${escapeHtml(label)}${requiredForProfile ? ' *' : ''}</label>
        <select id="map-${field}" data-field="${field}">${mappingOptions(field)}</select>
        <span class="mapping-state">${state.mapping[field] ? `Mapped to “${escapeHtml(state.mapping[field])}”` : 'No source column mapped'}</span>
      `;
      const select = item.querySelector('select');
      select.addEventListener('change', (event) => {
        const chosen = event.target.value;
        if (chosen) state.mapping[field] = chosen;
        else delete state.mapping[field];
        const status = item.querySelector('.mapping-state');
        status.textContent = chosen ? `Mapped to “${chosen}”` : 'No source column mapped';
        runAnalysis();
      });
      els.mappingGrid.appendChild(item);
    });
  }

  function runAnalysis() {
    if (!state.table) return;
    state.report = core.analyze(state.table, state.mapping, {
      profile: els.profileSelect.value,
      excludeDnp: els.excludeDnpToggle.checked,
      strictPlaceholders: els.placeholderToggle.checked,
      compareQuantityToRefs: els.compareQtyToggle.checked,
      allowRefLessRows: els.allowRefLessToggle.checked,
      checkSupplierConsistency: true
    });
    renderReport();
  }

  function renderReport() {
    const report = state.report;
    if (!report) return;

    els.readinessCard.classList.remove('blocked', 'review', 'clear');
    els.readinessCard.classList.add(report.readiness.level);
    els.readinessBadge.textContent = report.profile.label;
    els.readinessTitle.textContent = report.readiness.label;
    els.readinessSummary.textContent = report.readiness.summary;

    const stats = [
      { value: report.stats.sourceRows, label: 'BOM lines' },
      { value: report.stats.uniquePlacedRefs, label: 'Unique placed refs' },
      { value: report.stats.totalPlacedQty, label: 'Placed quantity' },
      { value: report.stats.uniqueMpns, label: 'Unique MPNs' },
      { value: report.counts.error, label: 'Errors', cls: report.counts.error ? 'error' : '' },
      { value: report.counts.warning, label: 'Warnings', cls: report.counts.warning ? 'warning' : '' }
    ];
    els.statsGrid.innerHTML = stats.map((item) => `<div class="stat-card ${item.cls || ''}"><strong>${item.value}</strong><span>${escapeHtml(item.label)}</span></div>`).join('');

    renderCoverage(report);
    els.allCount.textContent = report.issues.length;
    els.errorCount.textContent = report.counts.error || 0;
    els.warningCount.textContent = report.counts.warning || 0;
    els.infoCount.textContent = report.counts.info || 0;
    renderIssues();
    renderPreview();
  }

  function renderCoverage(report) {
    const items = [
      { label: 'Manufacturer Part Number', pct: report.stats.mpnCoverage, mapped: Boolean(report.mapping.mpn) },
      { label: 'Manufacturer', pct: report.stats.manufacturerCoverage, mapped: Boolean(report.mapping.manufacturer) },
      { label: 'Footprint / Package', pct: report.stats.footprintCoverage, mapped: Boolean(report.mapping.footprint) }
    ];
    els.coverageGrid.innerHTML = items.map((item) => {
      const pct = item.pct === null ? 0 : item.pct;
      return `<div class="coverage-item">
        <strong>${escapeHtml(item.label)}</strong>
        <span class="pct">${item.mapped ? `${pct}%` : 'Not mapped'}</span>
        <div class="coverage-track"><div class="coverage-fill" style="width:${item.mapped ? pct : 0}%"></div></div>
        <span class="coverage-note">${item.mapped ? 'Coverage among placed rows included by the selected profile.' : 'Map a source column to calculate coverage.'}</span>
      </div>`;
    }).join('');
  }

  function getVisibleIssues() {
    if (!state.report) return [];
    const needle = state.issueSearch.trim().toLowerCase();
    return state.report.issues.filter((issue) => {
      if (state.issueFilter !== 'all' && issue.severity !== state.issueFilter) return false;
      if (!needle) return true;
      const haystack = [issue.code, issue.message, issue.detail, issue.value, issue.field, issue.sourceRow, ...(issue.refs || [])].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }

  function renderIssues() {
    const visible = getVisibleIssues();
    if (!visible.length) {
      els.issuesList.innerHTML = `<div class="empty-state">${state.report.issues.length ? 'No issues match the current filter.' : 'No issues were detected by the selected rules.'}</div>`;
      return;
    }
    els.issuesList.innerHTML = visible.map((issue) => {
      const fieldLabel = issue.field ? (core.FIELD_LABELS[issue.field] || issue.field) : '';
      const meta = [issue.code, issue.sourceRow ? `source row ${issue.sourceRow}` : '', fieldLabel].filter(Boolean).join(' · ');
      return `<article class="issue-item">
        <span class="issue-severity ${issue.severity}">${issue.severity}</span>
        <div>
          <div class="issue-message">${escapeHtml(issue.message)}</div>
          ${issue.detail ? `<div class="issue-detail">${escapeHtml(issue.detail)}</div>` : ''}
          <div class="issue-meta">${escapeHtml(meta)}</div>
        </div>
        ${issue.row !== null && issue.row !== undefined ? `<button class="row-jump" type="button" data-row="${issue.row}">View row</button>` : ''}
      </article>`;
    }).join('');

    els.issuesList.querySelectorAll('.row-jump').forEach((button) => {
      button.addEventListener('click', () => jumpToRow(Number(button.dataset.row)));
    });
  }

  function renderPreview() {
    if (!state.table || !state.report) return;
    const total = state.table.rows.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const start = (state.page - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, total);
    const headers = ['Status', 'Source Row', ...state.table.headers];

    const thead = `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>`;
    const bodyRows = state.table.rows.slice(start, end).map((rowObj, offset) => {
      const index = start + offset;
      const reportRow = state.report.rows[index] || {};
      const severity = reportRow.maxSeverity || 'ok';
      const rowClass = severity === 'ok' ? '' : `row-${severity}`;
      const cells = state.table.headers.map((header) => `<td title="${escapeHtml(rowObj.data[header] || '')}">${escapeHtml(rowObj.data[header] || '')}</td>`).join('');
      return `<tr id="bom-row-${index}" class="${rowClass}"><td><span class="status-pill ${severity}">${severity}</span></td><td>${rowObj.sourceRow}</td>${cells}</tr>`;
    }).join('');
    els.previewTable.innerHTML = `${thead}<tbody>${bodyRows}</tbody>`;

    els.pagination.innerHTML = `
      <span>Showing ${total ? start + 1 : 0}–${end} of ${total} rows</span>
      <div class="pagination-buttons">
        <button class="btn secondary" type="button" id="prevPageBtn" ${state.page <= 1 ? 'disabled' : ''}>Previous</button>
        <button class="btn secondary" type="button" id="nextPageBtn" ${state.page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    `;
    const prev = $('prevPageBtn');
    const next = $('nextPageBtn');
    if (prev) prev.addEventListener('click', () => { state.page -= 1; renderPreview(); });
    if (next) next.addEventListener('click', () => { state.page += 1; renderPreview(); });
  }

  function jumpToRow(rowIndex) {
    state.page = Math.floor(rowIndex / state.pageSize) + 1;
    renderPreview();
    requestAnimationFrame(() => {
      const row = document.getElementById(`bom-row-${rowIndex}`);
      if (!row) return;
      row.classList.add('highlight-row');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => row.classList.remove('highlight-row'), 2400);
    });
  }

  function downloadText(filename, content, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  els.chooseFileBtn.addEventListener('click', () => els.fileInput.click());
  els.changeFileBtn.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', () => {
    const file = els.fileInput.files && els.fileInput.files[0];
    if (file) loadFile(file);
    els.fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((eventName) => els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((eventName) => els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.remove('dragover');
  }));
  els.dropZone.addEventListener('drop', (event) => {
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  els.pasteBtn.addEventListener('click', () => {
    els.pasteCard.classList.remove('hidden');
    els.pasteArea.focus();
  });
  els.closePasteBtn.addEventListener('click', () => els.pasteCard.classList.add('hidden'));
  els.clearPasteBtn.addEventListener('click', () => { els.pasteArea.value = ''; });
  els.analyzePasteBtn.addEventListener('click', () => {
    if (!els.pasteArea.value.trim()) return showMessage('Paste at least one header row and one BOM row.');
    const parsed = core.parseDelimited(els.pasteArea.value, els.pasteArea.value.includes('\t') ? '\t' : null);
    setSourceFromMatrix(parsed.matrix, 'Pasted BOM', 'paste', 'clipboard data');
    els.pasteCard.classList.add('hidden');
  });

  els.loadBadSampleBtn.addEventListener('click', () => {
    setSourceFromMatrix(parseTextToMatrix(badSample), 'sample-bom-with-issues.csv', 'sample', 'built-in sample');
  });
  els.loadGoodSampleBtn.addEventListener('click', () => {
    setSourceFromMatrix(parseTextToMatrix(goodSample), 'sample-bom-clean.csv', 'sample', 'built-in sample');
  });

  els.sheetSelect.addEventListener('change', () => {
    state.sheetName = els.sheetSelect.value;
    state.matrix = sheetToMatrix(state.sheetName);
    buildTableFromMatrix(null, `worksheet: ${state.sheetName}`);
  });

  els.headerRowInput.addEventListener('change', () => {
    const row = Math.max(1, Number(els.headerRowInput.value) || 1);
    buildTableFromMatrix(row - 1, state.sourceType === 'workbook' ? `worksheet: ${state.sheetName}` : null);
  });

  els.profileSelect.addEventListener('change', () => {
    renderMapping();
    runAnalysis();
  });
  els.excludeDnpToggle.addEventListener('change', runAnalysis);
  els.placeholderToggle.addEventListener('change', runAnalysis);
  els.compareQtyToggle.addEventListener('change', runAnalysis);
  els.allowRefLessToggle.addEventListener('change', runAnalysis);
  els.resetMappingBtn.addEventListener('click', () => {
    state.mapping = core.autoMapHeaders(state.table.headers);
    renderMapping();
    runAnalysis();
  });

  document.querySelectorAll('.filter').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.issueFilter = button.dataset.filter;
      renderIssues();
    });
  });
  els.issueSearch.addEventListener('input', () => {
    state.issueSearch = els.issueSearch.value;
    renderIssues();
  });

  els.downloadIssuesBtn.addEventListener('click', () => {
    if (!state.report) return;
    downloadText(`${fileStem(state.sourceName)}-issues.csv`, core.issueReportCsv(state.report), 'text/csv;charset=utf-8');
  });
  els.downloadReviewedBtn.addEventListener('click', () => {
    if (!state.report || !state.table) return;
    downloadText(`${fileStem(state.sourceName)}-reviewed.csv`, core.reviewedBomCsv(state.table, state.report), 'text/csv;charset=utf-8');
  });
  els.downloadJsonBtn.addEventListener('click', () => {
    if (!state.report) return;
    downloadText(`${fileStem(state.sourceName)}-report.json`, core.reportJson(state.report), 'application/json;charset=utf-8');
  });
})();
