(function (global) {
  'use strict';

  const VERSION = '1.0.0';

  const CANONICAL_FIELDS = [
    'designator', 'quantity', 'manufacturer', 'mpn', 'description', 'value',
    'footprint', 'dnp', 'internalPart', 'supplier', 'supplierPart', 'alternateMpn', 'lifecycle', 'notes'
  ];

  const FIELD_LABELS = {
    designator: 'Reference Designator',
    quantity: 'Quantity',
    manufacturer: 'Manufacturer',
    mpn: 'Manufacturer Part Number',
    description: 'Description',
    value: 'Value',
    footprint: 'Footprint / Package',
    dnp: 'DNP / DNI',
    internalPart: 'Internal / Company Part Number',
    supplier: 'Supplier',
    supplierPart: 'Supplier Part Number',
    alternateMpn: 'Alternate MPN',
    lifecycle: 'Lifecycle Status',
    notes: 'Notes'
  };

  const HEADER_ALIASES = {
    designator: [
      'reference designator', 'reference designators', 'refdes', 'ref des', 'refs',
      'reference', 'references', 'designator', 'designators', 'ref', 'ref.', 'component ref',
      'component reference', 'reference id', 'reference ids', 'locations', 'location'
    ],
    quantity: [
      'quantity', 'qty', 'qty.', 'qnty', 'count', 'component quantity', 'bom qty', 'bom quantity',
      'total qty', 'total quantity', 'pcs', 'pieces'
    ],
    manufacturer: [
      'manufacturer', 'mfr', 'mfg', 'maker', 'brand', 'manufacturer name', 'mfr name', 'vendor manufacturer'
    ],
    mpn: [
      'manufacturer part number', 'manufacturer part no', 'manufacturer pn', 'mfr part number',
      'mfr part no', 'mfr pn', 'mpn', 'part number', 'part no', 'part #', 'partnumber',
      'manufacturer part #', 'mfg part number', 'mfg pn'
    ],
    description: [
      'description', 'component description', 'part description', 'item description', 'desc',
      'component', 'component name', 'name'
    ],
    value: [
      'value', 'component value', 'part value', 'nominal value', 'rating', 'value/rating', 'value rating'
    ],
    footprint: [
      'footprint', 'package', 'package type', 'pcb footprint', 'land pattern', 'case', 'case/package',
      'package/footprint', 'footprint/package', 'housing'
    ],
    dnp: [
      'dnp', 'dni', 'do not populate', 'do not install', 'do not fit', 'dnf', 'not fitted',
      'populate', 'fitted', 'assembly option', 'mount'
    ],
    internalPart: [
      'internal part number', 'internal part no', 'internal pn', 'ipn', 'company part number',
      'company part no', 'company pn', 'item number', 'item no', 'item code', 'material number',
      'material no', 'material code', 'part id', 'internal item number'
    ],
    supplier: [
      'supplier', 'distributor', 'vendor', 'source', 'supplier name', 'distributor name'
    ],
    supplierPart: [
      'supplier part number', 'supplier pn', 'supplier part no', 'distributor part number',
      'distributor pn', 'vendor part number', 'vendor pn', 'sku', 'supplier sku', 'order code'
    ],
    alternateMpn: [
      'alternate mpn', 'alternate part number', 'alternative mpn', 'alternative part number',
      'approved alternate', 'approved alternates', 'second source', 'alternate', 'alternates'
    ],
    lifecycle: [
      'lifecycle status', 'part lifecycle', 'component lifecycle', 'life cycle status',
      'manufacturer lifecycle', 'mfr lifecycle', 'product status', 'part status'
    ],
    notes: [
      'notes', 'note', 'remarks', 'remark', 'comments', 'comment', 'special instruction', 'instructions'
    ]
  };

  const PROFILES = {
    assembly: {
      id: 'assembly',
      label: 'Assembly-ready',
      description: 'Focus on placement data: designators, quantity, value/description and footprint.',
      required: ['designator', 'quantity'],
      warnMissing: ['value', 'description', 'footprint'],
      infoMissing: ['mpn', 'manufacturer']
    },
    procurement: {
      id: 'procurement',
      label: 'Procurement-ready',
      description: 'Adds manufacturer and MPN coverage checks for sourcing and quotation.',
      required: ['designator', 'quantity', 'mpn'],
      warnMissing: ['manufacturer', 'description', 'footprint'],
      infoMissing: ['value', 'internalPart']
    },
    release: {
      id: 'release',
      label: 'Engineering release',
      description: 'Stricter release checks for designators, sourcing identity and assembly package data.',
      required: ['designator', 'quantity', 'mpn', 'manufacturer', 'footprint'],
      warnMissing: ['description', 'value'],
      infoMissing: ['internalPart', 'supplierPart', 'alternateMpn', 'lifecycle']
    }
  };

  const PLACEHOLDERS = new Set([
    '', '-', '--', '---', 'n/a', 'na', 'n.a.', 'none', 'null', 'nil', 'tbd', 'tbc', 'unknown',
    'not available', 'not specified', 'unspecified', 'pending', '?', 'xxx', 'xxxx'
  ]);

  const DNP_TRUE = new Set([
    '1', 'true', 'yes', 'y', 'dnp', 'dni', 'dnf', 'do not populate', 'do not install',
    'do not fit', 'not fitted', 'not populated', 'no fit', 'nofit', 'exclude', 'excluded', 'omit', 'omitted'
  ]);

  const DNP_FALSE = new Set([
    '0', 'false', 'no', 'n', 'fit', 'fitted', 'populate', 'populated', 'install', 'installed', 'include', 'included'
  ]);

  function text(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\u00a0/g, ' ').trim();
  }

  function normalizeSpaces(value) {
    return text(value).replace(/\s+/g, ' ');
  }

  function normalizeHeader(value) {
    return normalizeSpaces(value)
      .toLowerCase()
      .replace(/[\r\n]+/g, ' ')
      .replace(/[“”"'`]/g, '')
      .replace(/[_–—]+/g, ' ')
      .replace(/\s*[/\\]\s*/g, '/')
      .replace(/\s*#\s*/g, ' # ')
      .replace(/[^a-z0-9#+/.()\- ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isPlaceholder(value) {
    return PLACEHOLDERS.has(normalizeSpaces(value).toLowerCase());
  }

  function slug(value) {
    return normalizeSpaces(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function naturalCompare(a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  function unique(values) {
    return [...new Set(values)];
  }

  function countNonEmpty(row) {
    return row.reduce((count, cell) => count + (text(cell) ? 1 : 0), 0);
  }

  function aliasScore(headerValue, aliasValue) {
    const h = normalizeHeader(headerValue);
    const a = normalizeHeader(aliasValue);
    if (!h || !a) return 0;
    if (h === a) return 100;
    if (slug(h) === slug(a)) return 96;
    if (h.startsWith(a + ' ') || h.endsWith(' ' + a)) return 88;
    if (h.includes(a) && a.length >= 4) return 82;
    const hWords = new Set(h.split(/[ /()\-]+/).filter(Boolean));
    const aWords = a.split(/[ /()\-]+/).filter(Boolean);
    if (!aWords.length) return 0;
    const matches = aWords.filter((word) => hWords.has(word)).length;
    const ratio = matches / aWords.length;
    if (ratio === 1 && matches > 1) return 78;
    if (ratio >= 0.66 && matches > 1) return 68;
    return 0;
  }

  function scoreHeaderCell(cell) {
    let best = 0;
    for (const field of CANONICAL_FIELDS) {
      for (const alias of HEADER_ALIASES[field]) {
        best = Math.max(best, aliasScore(cell, alias));
      }
    }
    return best;
  }

  function detectHeaderRow(matrix, maxRows = 20) {
    if (!Array.isArray(matrix) || !matrix.length) return 0;
    let bestIndex = 0;
    let bestScore = -Infinity;
    const limit = Math.min(maxRows, matrix.length);

    for (let i = 0; i < limit; i += 1) {
      const row = Array.isArray(matrix[i]) ? matrix[i] : [];
      const values = row.map(text);
      const nonEmpty = values.filter(Boolean);
      if (!nonEmpty.length) continue;

      const strongMatches = nonEmpty.filter((cell) => scoreHeaderCell(cell) >= 78).length;
      const mediumMatches = nonEmpty.filter((cell) => scoreHeaderCell(cell) >= 60).length;
      const knownScore = nonEmpty.reduce((sum, cell) => sum + Math.min(scoreHeaderCell(cell), 100), 0);
      const numericPenalty = nonEmpty.filter((cell) => /^[-+]?\d+(\.\d+)?$/.test(cell)).length * 25;
      const widthBonus = Math.min(nonEmpty.length, 12) * 2;
      const score = strongMatches * 140 + mediumMatches * 45 + knownScore + widthBonus - numericPenalty - i;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  function makeUniqueHeaders(rawHeaders) {
    const used = new Map();
    return rawHeaders.map((header, index) => {
      let base = normalizeSpaces(header) || `Column ${index + 1}`;
      const count = used.get(base.toLowerCase()) || 0;
      used.set(base.toLowerCase(), count + 1);
      if (count > 0) base = `${base} (${count + 1})`;
      return base;
    });
  }

  function matrixToTable(matrix, headerRowIndex = null) {
    if (!Array.isArray(matrix)) return { headers: [], rows: [], headerRowIndex: 0 };
    const detected = headerRowIndex === null || headerRowIndex === undefined
      ? detectHeaderRow(matrix)
      : Math.max(0, Math.min(Number(headerRowIndex) || 0, Math.max(matrix.length - 1, 0)));

    const headerRow = Array.isArray(matrix[detected]) ? matrix[detected] : [];
    const maxColumns = Math.max(
      headerRow.length,
      ...matrix.slice(detected + 1).map((row) => (Array.isArray(row) ? row.length : 0)),
      0
    );
    const paddedHeaders = Array.from({ length: maxColumns }, (_, i) => headerRow[i] ?? '');
    const headers = makeUniqueHeaders(paddedHeaders);

    const rows = [];
    for (let i = detected + 1; i < matrix.length; i += 1) {
      const raw = Array.isArray(matrix[i]) ? matrix[i] : [];
      const cells = Array.from({ length: maxColumns }, (_, c) => text(raw[c]));
      if (!cells.some(Boolean)) continue;
      const data = {};
      headers.forEach((header, c) => { data[header] = cells[c]; });
      rows.push({ sourceRow: i + 1, cells, data });
    }

    return { headers, rows, headerRowIndex: detected };
  }

  function countDelimiter(line, delimiter) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') i += 1;
        else quoted = !quoted;
      } else if (!quoted && ch === delimiter) {
        count += 1;
      }
    }
    return count;
  }

  function detectDelimiter(source) {
    const candidates = [',', '\t', ';', '|'];
    const lines = String(source || '').split(/\r?\n/).filter((line) => line.trim()).slice(0, 12);
    let best = ',';
    let bestScore = -Infinity;
    for (const delimiter of candidates) {
      const counts = lines.map((line) => countDelimiter(line, delimiter));
      const positive = counts.filter((count) => count > 0);
      if (!positive.length) continue;
      const frequencies = new Map();
      positive.forEach((count) => frequencies.set(count, (frequencies.get(count) || 0) + 1));
      const consistency = Math.max(...frequencies.values());
      const maxCount = Math.max(...positive);
      const average = positive.reduce((sum, count) => sum + count, 0) / positive.length;
      const score = positive.length * 25 + consistency * 18 + maxCount * 3 + average;
      if (score > bestScore) {
        bestScore = score;
        best = delimiter;
      }
    }
    return best;
  }

  function parseDelimited(input, delimiter = null) {
    const source = String(input || '').replace(/^\uFEFF/, '');
    const sep = delimiter || detectDelimiter(source);
    const matrix = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (quoted) {
        if (ch === '"') {
          if (source[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            quoted = false;
          }
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === sep) {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell.replace(/\r$/, ''));
        matrix.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }

    if (cell.length || row.length) {
      row.push(cell.replace(/\r$/, ''));
      matrix.push(row);
    }

    return { matrix, delimiter: sep };
  }

  function autoMapHeaders(headers) {
    const candidates = [];
    headers.forEach((header) => {
      CANONICAL_FIELDS.forEach((field) => {
        let score = 0;
        HEADER_ALIASES[field].forEach((alias) => { score = Math.max(score, aliasScore(header, alias)); });
        if (score >= 60) candidates.push({ header, field, score });
      });
    });

    candidates.sort((a, b) => b.score - a.score || a.header.localeCompare(b.header));
    const mapping = {};
    const usedHeaders = new Set();
    const usedFields = new Set();
    for (const candidate of candidates) {
      if (usedHeaders.has(candidate.header) || usedFields.has(candidate.field)) continue;
      mapping[candidate.field] = candidate.header;
      usedHeaders.add(candidate.header);
      usedFields.add(candidate.field);
    }
    return mapping;
  }

  function parseQuantity(value) {
    const raw = normalizeSpaces(value);
    if (!raw) return { value: null, valid: false, reason: 'blank' };
    const normalized = raw.replace(/,/g, '');
    if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return { value: null, valid: false, reason: 'not-numeric' };
    const number = Number(normalized);
    if (!Number.isFinite(number)) return { value: null, valid: false, reason: 'not-finite' };
    if (!Number.isInteger(number)) return { value: number, valid: false, reason: 'not-integer' };
    return { value: number, valid: true, reason: null };
  }

  function canonicalRef(ref) {
    return normalizeSpaces(ref).replace(/\s+/g, '').toUpperCase();
  }

  function expandReferenceRange(token, maxExpansion = 10000) {
    const raw = canonicalRef(token);
    const match = raw.match(/^([A-Z]+)(\d+)([A-Z]?)\s*(?:-|:|\.\.|~)\s*([A-Z]+)?(\d+)([A-Z]?)$/i);
    if (!match) return null;

    const [, prefix1, startDigits, suffix1, prefix2Raw, endDigits, suffix2] = match;
    const prefix2 = prefix2Raw || prefix1;
    if (prefix1.toUpperCase() !== prefix2.toUpperCase()) return null;
    if (suffix1 || suffix2) return null;

    const start = Number(startDigits);
    const end = Number(endDigits);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0) return null;
    const distance = Math.abs(end - start) + 1;
    if (distance > maxExpansion) return { error: 'range-too-large', values: [raw] };

    const step = start <= end ? 1 : -1;
    const pad = Math.max(startDigits.length, endDigits.length);
    const values = [];
    for (let n = start; step > 0 ? n <= end : n >= end; n += step) {
      const numberText = (startDigits.startsWith('0') || endDigits.startsWith('0'))
        ? String(n).padStart(pad, '0')
        : String(n);
      values.push(`${prefix1.toUpperCase()}${numberText}`);
    }
    return { values, error: null };
  }

  function splitReferenceField(value) {
    const raw = text(value);
    if (!raw) return [];
    const compactRanges = raw.replace(/([A-Za-z]+\d+)\s*(?:-|:|\.\.|~)\s*([A-Za-z]*\d+)/g, '$1-$2');
    return compactRanges
      .replace(/[\r\n]+/g, ',')
      .replace(/[;|]+/g, ',')
      .split(',')
      .flatMap((part) => part.trim().split(/\s+/))
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function parseDesignators(value, options = {}) {
    const tokens = splitReferenceField(value);
    const refs = [];
    const malformed = [];
    const rangeWarnings = [];

    for (const token of tokens) {
      const range = expandReferenceRange(token, options.maxRangeExpansion || 10000);
      if (range) {
        if (range.error) rangeWarnings.push(token);
        refs.push(...range.values);
        continue;
      }
      const ref = canonicalRef(token);
      if (!ref) continue;
      refs.push(ref);
      if (!/^[A-Z][A-Z0-9_.+\-/]*\d[A-Z0-9_.+\-/]*$/i.test(ref)) malformed.push(ref);
    }

    const counts = new Map();
    refs.forEach((ref) => counts.set(ref, (counts.get(ref) || 0) + 1));
    const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([ref]) => ref);

    return {
      refs,
      uniqueRefs: [...counts.keys()],
      duplicates,
      malformed: unique(malformed),
      rangeWarnings: unique(rangeWarnings)
    };
  }

  function interpretDnp(value, row = {}, mapping = {}) {
    const raw = normalizeSpaces(value).toLowerCase();
    const dnpHeader = normalizeHeader(mapping.dnp || '');
    const positiveLogicHeader = /(^|\b)(populate|populated|fitted|fit|mount|mounted|install|installed)(\b|$)/i.test(dnpHeader)
      && !/do not|dnp|dni|dnf|not fitted/i.test(dnpHeader);
    if (raw) {
      if (positiveLogicHeader) {
        if (['no', 'n', '0', 'false', 'dnp', 'dni', 'dnf', 'not fitted', 'do not populate'].includes(raw)) return true;
        if (['yes', 'y', '1', 'true', 'fit', 'fitted', 'populate', 'populated', 'mount', 'mounted', 'install', 'installed'].includes(raw)) return false;
      }
      if (DNP_TRUE.has(raw)) return true;
      if (DNP_FALSE.has(raw)) return false;
      if (/\b(dnp|dni|dnf|do not (populate|install|fit)|not fitted|no\s*fit)\b/i.test(raw)) return true;
    }

    for (const field of ['value', 'description', 'mpn', 'notes']) {
      const header = mapping[field];
      if (!header) continue;
      const candidate = normalizeSpaces(row[header]);
      if (/^(dnp|dni|dnf|do not populate|do not install|do not fit|not fitted|no\s*fit)$/i.test(candidate)) return true;
    }
    return false;
  }

  function getRowValue(rowData, mapping, field) {
    const header = mapping[field];
    return header ? text(rowData[header]) : '';
  }

  function addIssue(issues, issue) {
    const severity = issue.severity || 'warning';
    issues.push({
      id: `${severity}-${issues.length + 1}`,
      severity,
      code: issue.code || 'GENERIC',
      row: issue.row ?? null,
      sourceRow: issue.sourceRow ?? null,
      field: issue.field || null,
      message: issue.message || '',
      detail: issue.detail || '',
      value: issue.value ?? '',
      refs: issue.refs || []
    });
  }

  function rowIdentity(rowData, mapping) {
    return [
      getRowValue(rowData, mapping, 'manufacturer').toLowerCase(),
      getRowValue(rowData, mapping, 'mpn').toLowerCase(),
      getRowValue(rowData, mapping, 'value').toLowerCase(),
      getRowValue(rowData, mapping, 'footprint').toLowerCase(),
      getRowValue(rowData, mapping, 'description').toLowerCase()
    ].join('|');
  }

  function analyze(table, userMapping = null, options = {}) {
    const headers = table?.headers || [];
    const rows = table?.rows || [];
    const mapping = { ...autoMapHeaders(headers), ...(userMapping || {}) };
    Object.keys(mapping).forEach((field) => {
      if (!mapping[field] || !headers.includes(mapping[field])) delete mapping[field];
    });

    const profile = PROFILES[options.profile] || PROFILES.procurement;
    const excludeDnp = options.excludeDnp !== false;
    const strictPlaceholders = options.strictPlaceholders !== false;
    const checkSupplierConsistency = options.checkSupplierConsistency !== false;
    const compareQuantityToRefs = options.compareQuantityToRefs !== false;
    const allowRefLessRows = options.allowRefLessRows === true;
    const issues = [];

    const mappedFields = new Set(Object.keys(mapping));
    const requiredColumns = unique(profile.required);
    for (const field of requiredColumns) {
      if (!mappedFields.has(field)) {
        addIssue(issues, {
          severity: 'error',
          code: 'MISSING_COLUMN',
          field,
          message: `Required column is not mapped: ${FIELD_LABELS[field]}.`,
          detail: 'Choose the matching source column in Column Mapping, or add the field to the BOM.'
        });
      }
    }

    for (const field of profile.warnMissing) {
      if (!mappedFields.has(field)) {
        addIssue(issues, {
          severity: 'warning', code: 'RECOMMENDED_COLUMN_NOT_MAPPED', field,
          message: `Recommended column is not mapped: ${FIELD_LABELS[field]}.`,
          detail: `The ${profile.label.toLowerCase()} profile uses this field to improve BOM review coverage.`
        });
      }
    }
    for (const field of profile.infoMissing) {
      if (!mappedFields.has(field)) {
        addIssue(issues, {
          severity: 'info', code: 'OPTIONAL_COLUMN_NOT_MAPPED', field,
          message: `Optional review column is not mapped: ${FIELD_LABELS[field]}.`,
          detail: 'This does not block the selected profile, but the field can provide useful release or sourcing context.'
        });
      }
    }

    const headerOwners = new Map();
    Object.entries(mapping).forEach(([field, header]) => {
      if (!headerOwners.has(header)) headerOwners.set(header, []);
      headerOwners.get(header).push(field);
    });
    for (const [header, fields] of headerOwners.entries()) {
      if (fields.length > 1) {
        addIssue(issues, {
          severity: 'error', code: 'MAPPING_COLLISION',
          message: `Source column “${header}” is mapped to multiple meanings.`,
          detail: `Mapped as: ${fields.map((field) => FIELD_LABELS[field]).join(', ')}. Review Column Mapping.`
        });
      }
    }

    const rowReports = [];
    const allRefOwners = new Map();
    const partIdentityRows = new Map();
    const mpnGroups = new Map();
    const internalPartGroups = new Map();
    const supplierPartGroups = new Map();
    const exactRows = new Map();

    let totalPlacedQty = 0;
    let uniquePlacedRefs = new Set();
    let dnpRows = 0;
    let placedRows = 0;
    let missingMpnRows = 0;
    let missingManufacturerRows = 0;
    let missingFootprintRows = 0;
    let placeholderCells = 0;

    rows.forEach((rowObj, rowIndex) => {
      const rowData = rowObj.data || {};
      const sourceRow = rowObj.sourceRow || rowIndex + 2;
      const dnpValue = getRowValue(rowData, mapping, 'dnp');
      const isDnp = interpretDnp(dnpValue, rowData, mapping);

      const designatorRaw = getRowValue(rowData, mapping, 'designator');
      const qtyRaw = getRowValue(rowData, mapping, 'quantity');
      const qtyParsed = parseQuantity(qtyRaw);
      const parsedRefs = parseDesignators(designatorRaw);
      const mpn = getRowValue(rowData, mapping, 'mpn');
      const manufacturer = getRowValue(rowData, mapping, 'manufacturer');
      const footprint = getRowValue(rowData, mapping, 'footprint');
      const description = getRowValue(rowData, mapping, 'description');
      const value = getRowValue(rowData, mapping, 'value');
      const internalPart = getRowValue(rowData, mapping, 'internalPart');
      const supplierPart = getRowValue(rowData, mapping, 'supplierPart');
      const supplier = getRowValue(rowData, mapping, 'supplier');
      const lifecycle = getRowValue(rowData, mapping, 'lifecycle');

      const nonEmptySourceCells = Object.values(rowData).filter((cell) => text(cell)).length;
      const likelyMetadataRow = !designatorRaw && !qtyRaw && !mpn && !manufacturer && !internalPart && !footprint && nonEmptySourceCells <= 2;
      const effectiveRow = !(excludeDnp && isDnp) && !likelyMetadataRow;
      const rowIssuesBefore = issues.length;
      if (!likelyMetadataRow) {
        if (isDnp) dnpRows += 1;
        else placedRows += 1;
      }

      if (likelyMetadataRow) {
        addIssue(issues, {
          severity: 'info', code: 'METADATA_ROW_IGNORED', row: rowIndex, sourceRow,
          message: 'A likely title, note, subtotal, or metadata row was excluded from component checks.',
          detail: 'If this is actually a component line, add its reference designator and quantity or adjust the source BOM.'
        });
      }

      if (mapping.designator && !designatorRaw && effectiveRow && !allowRefLessRows) {
        addIssue(issues, {
          severity: 'error', code: 'MISSING_DESIGNATOR', row: rowIndex, sourceRow, field: 'designator',
          message: 'Placed BOM row has no reference designator.',
          detail: 'Each placed line should identify the PCB reference designators it applies to.'
        });
      }

      if (mapping.quantity && effectiveRow) {
        if (!qtyParsed.valid) {
          addIssue(issues, {
            severity: 'error', code: 'INVALID_QUANTITY', row: rowIndex, sourceRow, field: 'quantity', value: qtyRaw,
            message: qtyParsed.reason === 'blank' ? 'Quantity is blank.' : `Quantity is not a valid positive integer: ${qtyRaw || '(blank)'}.`,
            detail: 'Use a whole-number placement quantity for each BOM line.'
          });
        } else if (qtyParsed.value <= 0) {
          addIssue(issues, {
            severity: 'error', code: 'NON_POSITIVE_QUANTITY', row: rowIndex, sourceRow, field: 'quantity', value: qtyRaw,
            message: `Placed BOM row has non-positive quantity ${qtyParsed.value}.`,
            detail: 'Use the DNP/DNI field for unpopulated items instead of a zero or negative placement quantity.'
          });
        }
      }

      if (designatorRaw) {
        if (parsedRefs.duplicates.length) {
          addIssue(issues, {
            severity: 'error', code: 'DUPLICATE_REF_IN_ROW', row: rowIndex, sourceRow, field: 'designator',
            message: `Reference designator repeated within the same row: ${parsedRefs.duplicates.join(', ')}.`,
            refs: parsedRefs.duplicates
          });
        }
        if (parsedRefs.malformed.length) {
          addIssue(issues, {
            severity: 'warning', code: 'SUSPICIOUS_REFDES', row: rowIndex, sourceRow, field: 'designator',
            message: `Reference designator format looks unusual: ${parsedRefs.malformed.slice(0, 8).join(', ')}${parsedRefs.malformed.length > 8 ? '…' : ''}.`,
            detail: 'This may be valid for your CAD system, but verify that each token is a component reference.',
            refs: parsedRefs.malformed
          });
        }
        if (parsedRefs.rangeWarnings.length) {
          addIssue(issues, {
            severity: 'warning', code: 'LARGE_REFDES_RANGE', row: rowIndex, sourceRow, field: 'designator',
            message: `Reference range was too large to expand safely: ${parsedRefs.rangeWarnings.join(', ')}.`
          });
        }
      }

      if (effectiveRow && compareQuantityToRefs && qtyParsed.valid && qtyParsed.value > 0 && parsedRefs.uniqueRefs.length) {
        if (qtyParsed.value !== parsedRefs.uniqueRefs.length) {
          addIssue(issues, {
            severity: 'error', code: 'QTY_REFDES_MISMATCH', row: rowIndex, sourceRow, field: 'quantity',
            message: `Quantity (${qtyParsed.value}) does not match the number of unique reference designators (${parsedRefs.uniqueRefs.length}).`,
            detail: `References detected: ${parsedRefs.uniqueRefs.slice(0, 20).join(', ')}${parsedRefs.uniqueRefs.length > 20 ? '…' : ''}`,
            refs: parsedRefs.uniqueRefs
          });
        }
      }

      if (effectiveRow) {
        const fieldPolicies = [
          ...profile.required.map((field) => ({ field, severity: 'error' })),
          ...profile.warnMissing.map((field) => ({ field, severity: 'warning' })),
          ...profile.infoMissing.map((field) => ({ field, severity: 'info' }))
        ];
        const seenPolicies = new Set();
        for (const policy of fieldPolicies) {
          if (seenPolicies.has(policy.field)) continue;
          seenPolicies.add(policy.field);
          if (policy.field === 'designator' || policy.field === 'quantity') continue;
          if (!mapping[policy.field]) continue;
          const valueRaw = getRowValue(rowData, mapping, policy.field);
          if (!valueRaw) {
            addIssue(issues, {
              severity: policy.severity,
              code: `MISSING_${policy.field.toUpperCase()}`,
              row: rowIndex, sourceRow, field: policy.field,
              message: `${FIELD_LABELS[policy.field]} is blank.`,
              detail: policy.field === 'mpn'
                ? 'A manufacturer part number helps purchasing and assembly identify the exact component.'
                : `Complete this field when it is required by your release or sourcing process.`
            });
          }
        }
      }

      if (effectiveRow && mapping.mpn && !mpn) missingMpnRows += 1;
      if (effectiveRow && mapping.manufacturer && !manufacturer) missingManufacturerRows += 1;
      if (effectiveRow && mapping.footprint && !footprint) missingFootprintRows += 1;

      if (strictPlaceholders && effectiveRow) {
        for (const field of ['mpn', 'manufacturer', 'internalPart', 'footprint', 'description', 'value', 'supplierPart', 'lifecycle']) {
          if (!mapping[field]) continue;
          const raw = getRowValue(rowData, mapping, field);
          if (raw && isPlaceholder(raw)) {
            placeholderCells += 1;
            const severity = ['mpn', 'manufacturer'].includes(field) && profile.required.includes(field) ? 'error' : 'warning';
            addIssue(issues, {
              severity, code: 'PLACEHOLDER_VALUE', row: rowIndex, sourceRow, field, value: raw,
              message: `${FIELD_LABELS[field]} contains a placeholder value: “${raw}”.`,
              detail: 'Replace placeholders such as TBD, N/A or ? with released data, or document why the field is intentionally unavailable.'
            });
          }
        }
      }

      if (effectiveRow && lifecycle) {
        const normalizedLifecycle = normalizeSpaces(lifecycle).toLowerCase();
        if (/\b(obsolete|eol|end of life|nrnd|not recommended for new designs?|last time buy|ltb|discontinued)\b/i.test(normalizedLifecycle)) {
          addIssue(issues, {
            severity: 'warning', code: 'LIFECYCLE_REVIEW', row: rowIndex, sourceRow, field: 'lifecycle', value: lifecycle,
            message: `Lifecycle field indicates a part that may require sourcing review: “${lifecycle}”.`,
            detail: 'This warning reflects only the status written in the BOM. Verify current lifecycle information with the manufacturer or an approved data source.'
          });
        }
      }

      if (isDnp) {
        if (qtyParsed.valid && qtyParsed.value > 0) {
          addIssue(issues, {
            severity: 'info', code: 'DNP_WITH_POSITIVE_QTY', row: rowIndex, sourceRow, field: 'dnp',
            message: `DNP/DNI row has quantity ${qtyParsed.value}.`,
            detail: 'This is common in design BOMs, but confirm your assembler knows the DNP flag overrides quantity.'
          });
        }
      } else if (qtyParsed.valid && qtyParsed.value > 0) {
        totalPlacedQty += qtyParsed.value;
      }

      parsedRefs.uniqueRefs.forEach((ref) => {
        if (!allRefOwners.has(ref)) allRefOwners.set(ref, []);
        allRefOwners.get(ref).push({ rowIndex, sourceRow, isDnp });
        if (!isDnp) uniquePlacedRefs.add(ref);
      });

      if (effectiveRow && (mpn || manufacturer || value || footprint || description)) {
        const identity = rowIdentity(rowData, mapping);
        if (identity.replace(/\|/g, '')) {
          if (!partIdentityRows.has(identity)) partIdentityRows.set(identity, []);
          partIdentityRows.get(identity).push({ rowIndex, sourceRow, qty: qtyParsed.value, refs: parsedRefs.uniqueRefs });
        }
      }

      if (effectiveRow && mpn) {
        const key = mpn.toLowerCase();
        if (!mpnGroups.has(key)) mpnGroups.set(key, []);
        mpnGroups.get(key).push({
          rowIndex, sourceRow, manufacturer, footprint, value, description, supplier, supplierPart
        });
      }

      if (effectiveRow && internalPart) {
        const key = internalPart.toLowerCase();
        if (!internalPartGroups.has(key)) internalPartGroups.set(key, []);
        internalPartGroups.get(key).push({ rowIndex, sourceRow, internalPart, manufacturer, mpn });
      }

      if (effectiveRow && supplierPart && checkSupplierConsistency) {
        const key = `${supplier.toLowerCase()}|${supplierPart.toLowerCase()}`;
        if (!supplierPartGroups.has(key)) supplierPartGroups.set(key, []);
        supplierPartGroups.get(key).push({ rowIndex, sourceRow, mpn, manufacturer, supplier, supplierPart });
      }

      const exactSignature = headers.map((h) => normalizeSpaces(rowData[h]).toLowerCase()).join('\u241f');
      if (!exactRows.has(exactSignature)) exactRows.set(exactSignature, []);
      exactRows.get(exactSignature).push({ rowIndex, sourceRow });

      rowReports.push({
        rowIndex,
        sourceRow,
        isDnp,
        likelyMetadataRow,
        designatorRaw,
        refs: parsedRefs.uniqueRefs,
        normalizedDesignators: parsedRefs.uniqueRefs.slice().sort(naturalCompare).join(', '),
        quantityRaw: qtyRaw,
        quantity: qtyParsed.valid ? qtyParsed.value : null,
        inferredQuantity: parsedRefs.uniqueRefs.length || null,
        mpn,
        manufacturer,
        internalPart,
        footprint,
        lifecycle,
        description,
        value,
        issueCount: issues.length - rowIssuesBefore
      });
    });

    for (const [ref, owners] of allRefOwners.entries()) {
      if (owners.length <= 1) continue;
      const placedOwners = owners.filter((owner) => !owner.isDnp);
      if (placedOwners.length > 1) {
        addIssue(issues, {
          severity: 'error', code: 'DUPLICATE_REF_ACROSS_ROWS',
          message: `Reference designator ${ref} appears on multiple placed BOM rows.`,
          detail: `Source rows: ${placedOwners.map((owner) => owner.sourceRow).join(', ')}.`, refs: [ref]
        });
      } else if (placedOwners.length === 1 && owners.some((owner) => owner.isDnp)) {
        addIssue(issues, {
          severity: 'warning', code: 'REF_PLACED_AND_DNP',
          message: `Reference designator ${ref} appears on both a placed row and a DNP/DNI row.`,
          detail: `Source rows: ${owners.map((owner) => owner.sourceRow).join(', ')}.`, refs: [ref]
        });
      }
    }

    for (const [identity, group] of partIdentityRows.entries()) {
      if (group.length <= 1) continue;
      const rowsList = group.map((item) => item.sourceRow);
      addIssue(issues, {
        severity: 'info', code: 'CONSOLIDATION_OPPORTUNITY',
        message: `The same part identity appears on ${group.length} BOM rows and may be consolidatable.`,
        detail: `Source rows: ${rowsList.join(', ')}. Confirm that design variants or notes do not require separate lines.`,
        value: identity
      });
    }

    for (const [mpnKey, group] of mpnGroups.entries()) {
      if (group.length <= 1) continue;
      const manufacturers = unique(group.map((item) => normalizeSpaces(item.manufacturer).toLowerCase()).filter(Boolean));
      const footprints = unique(group.map((item) => normalizeSpaces(item.footprint).toLowerCase()).filter(Boolean));
      const values = unique(group.map((item) => normalizeSpaces(item.value).toLowerCase()).filter(Boolean));
      if (manufacturers.length > 1) {
        addIssue(issues, {
          severity: 'error', code: 'MPN_MANUFACTURER_CONFLICT',
          message: `MPN “${group[0].mpn || mpnKey}” is associated with multiple manufacturers.`,
          detail: `Manufacturers: ${manufacturers.join(', ')}. Source rows: ${group.map((item) => item.sourceRow).join(', ')}.`
        });
      }
      if (footprints.length > 1) {
        addIssue(issues, {
          severity: 'warning', code: 'MPN_FOOTPRINT_CONFLICT',
          message: `The same MPN is associated with multiple footprints/packages.`,
          detail: `MPN: ${mpnKey}. Footprints: ${footprints.join(', ')}. Source rows: ${group.map((item) => item.sourceRow).join(', ')}.`
        });
      }
      if (values.length > 1) {
        addIssue(issues, {
          severity: 'warning', code: 'MPN_VALUE_CONFLICT',
          message: `The same MPN is associated with multiple component values.`,
          detail: `MPN: ${mpnKey}. Values: ${values.join(', ')}. Source rows: ${group.map((item) => item.sourceRow).join(', ')}.`
        });
      }
    }

    for (const [, group] of internalPartGroups.entries()) {
      if (group.length <= 1) continue;
      const exactParts = unique(group.map((item) => `${normalizeSpaces(item.manufacturer).toLowerCase()}|${normalizeSpaces(item.mpn).toLowerCase()}`).filter((item) => item !== '|'));
      if (exactParts.length > 1) {
        addIssue(issues, {
          severity: 'warning', code: 'INTERNAL_PN_MULTIPLE_MPN',
          message: 'One internal/company part number maps to multiple manufacturer parts.',
          detail: `Internal P/N: ${group[0].internalPart}. Source rows: ${group.map((item) => item.sourceRow).join(', ')}. This can be valid for an AVL, but should be intentional and documented.`
        });
      }
    }

    if (checkSupplierConsistency) {
      for (const [, group] of supplierPartGroups.entries()) {
        if (group.length <= 1) continue;
        const mpns = unique(group.map((item) => normalizeSpaces(item.mpn).toLowerCase()).filter(Boolean));
        if (mpns.length > 1) {
          addIssue(issues, {
            severity: 'warning', code: 'SUPPLIER_PN_CONFLICT',
            message: `One supplier part number maps to multiple MPNs.`,
            detail: `Supplier: ${group[0].supplier || '(not specified)'}. Supplier P/N: ${group[0].supplierPart}. MPNs: ${mpns.join(', ')}.`
          });
        }
      }
    }

    for (const [, group] of exactRows.entries()) {
      if (group.length > 1) {
        addIssue(issues, {
          severity: 'warning', code: 'EXACT_DUPLICATE_ROW',
          message: `Exact duplicate BOM rows detected.`,
          detail: `Source rows: ${group.map((item) => item.sourceRow).join(', ')}.`
        });
      }
    }

    const severityOrder = { error: 0, warning: 1, info: 2 };
    issues.sort((a, b) => {
      const severityDelta = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
      if (severityDelta) return severityDelta;
      const rowA = a.sourceRow ?? Number.MAX_SAFE_INTEGER;
      const rowB = b.sourceRow ?? Number.MAX_SAFE_INTEGER;
      if (rowA !== rowB) return rowA - rowB;
      return a.code.localeCompare(b.code);
    });

    rowReports.forEach((report) => {
      report.issueCount = issues.filter((issue) => issue.row === report.rowIndex).length;
      report.maxSeverity = ['error', 'warning', 'info'].find((sev) => issues.some((issue) => issue.row === report.rowIndex && issue.severity === sev)) || 'ok';
    });

    const counts = { error: 0, warning: 0, info: 0 };
    issues.forEach((issue) => { counts[issue.severity] = (counts[issue.severity] || 0) + 1; });

    const effectiveRows = rowReports.filter((row) => !row.likelyMetadataRow && !(excludeDnp && row.isDnp));
    const percentage = (numerator, denominator) => denominator ? Math.round((numerator / denominator) * 100) : null;
    const mpnCoverage = mapping.mpn
      ? percentage(effectiveRows.filter((row) => row.mpn && !isPlaceholder(row.mpn)).length, effectiveRows.length)
      : null;
    const manufacturerCoverage = mapping.manufacturer
      ? percentage(effectiveRows.filter((row) => row.manufacturer && !isPlaceholder(row.manufacturer)).length, effectiveRows.length)
      : null;
    const footprintCoverage = mapping.footprint
      ? percentage(effectiveRows.filter((row) => row.footprint && !isPlaceholder(row.footprint)).length, effectiveRows.length)
      : null;

    const readiness = counts.error > 0
      ? { level: 'blocked', label: 'Fix errors before release', summary: `${counts.error} error${counts.error === 1 ? '' : 's'} require attention.` }
      : counts.warning > 0
        ? { level: 'review', label: 'Review recommended', summary: `No rule-blocking errors; ${counts.warning} warning${counts.warning === 1 ? '' : 's'} remain.` }
        : { level: 'clear', label: 'No errors or warnings detected', summary: counts.info > 0 ? `The selected checks found no errors or warnings; ${counts.info} informational note${counts.info === 1 ? '' : 's'} remain.` : 'The selected checks found no errors, warnings, or informational notes.' };

    const uniqueMpns = unique(effectiveRows.map((row) => row.mpn.toLowerCase()).filter(Boolean)).length;
    const manufacturers = unique(effectiveRows.map((row) => row.manufacturer.toLowerCase()).filter(Boolean)).length;

    return {
      version: VERSION,
      profile,
      options: { excludeDnp, strictPlaceholders, checkSupplierConsistency, compareQuantityToRefs, allowRefLessRows },
      mapping,
      headers,
      rows: rowReports,
      issues,
      counts,
      readiness,
      stats: {
        sourceRows: rows.length,
        placedRows,
        dnpRows,
        totalPlacedQty,
        uniquePlacedRefs: uniquePlacedRefs.size,
        uniqueMpns,
        manufacturers,
        missingMpnRows,
        missingManufacturerRows,
        missingFootprintRows,
        placeholderCells,
        mpnCoverage,
        manufacturerCoverage,
        footprintCoverage
      },
      disclaimer: 'This checker validates BOM structure and common consistency rules only. It does not verify manufacturer lifecycle, stock, authenticity, electrical suitability, package dimensions, CAD connectivity, component polarity, or assembly manufacturability.'
    };
  }

  function escapeCsvCell(value) {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  function rowsToCsv(headers, rowObjects) {
    const lines = [headers.map(escapeCsvCell).join(',')];
    rowObjects.forEach((row) => {
      lines.push(headers.map((header) => escapeCsvCell(row[header])).join(','));
    });
    return '\uFEFF' + lines.join('\r\n');
  }

  function issueReportCsv(report) {
    const headers = ['Severity', 'Code', 'Source Row', 'Field', 'Message', 'Detail', 'Value', 'References'];
    const rows = report.issues.map((issue) => ({
      'Severity': issue.severity,
      'Code': issue.code,
      'Source Row': issue.sourceRow ?? '',
      'Field': issue.field ? FIELD_LABELS[issue.field] || issue.field : '',
      'Message': issue.message,
      'Detail': issue.detail,
      'Value': issue.value,
      'References': (issue.refs || []).join(', ')
    }));
    return rowsToCsv(headers, rows);
  }

  function reviewedBomCsv(table, report) {
    const extra = ['Checker Status', 'Checker Issues', 'Normalized Designators', 'Detected Reference Count', 'DNP Detected'];
    const headers = [...table.headers, ...extra];
    const rows = table.rows.map((rowObj, index) => {
      const reportRow = report.rows[index] || {};
      const rowIssues = report.issues.filter((issue) => issue.row === index);
      return {
        ...rowObj.data,
        'Checker Status': reportRow.maxSeverity || 'ok',
        'Checker Issues': rowIssues.map((issue) => `${issue.severity.toUpperCase()}: ${issue.message}`).join(' | '),
        'Normalized Designators': reportRow.normalizedDesignators || '',
        'Detected Reference Count': reportRow.inferredQuantity ?? '',
        'DNP Detected': reportRow.isDnp ? 'Yes' : 'No'
      };
    });
    return rowsToCsv(headers, rows);
  }

  function reportJson(report) {
    return JSON.stringify(report, null, 2);
  }

  const api = {
    VERSION,
    CANONICAL_FIELDS,
    FIELD_LABELS,
    HEADER_ALIASES,
    PROFILES,
    normalizeHeader,
    detectHeaderRow,
    matrixToTable,
    parseDelimited,
    autoMapHeaders,
    parseQuantity,
    parseDesignators,
    interpretDnp,
    analyze,
    issueReportCsv,
    reviewedBomCsv,
    reportJson,
    rowsToCsv,
    naturalCompare
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BomCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
