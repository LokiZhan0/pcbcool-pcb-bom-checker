# Changelog

## 1.0.0 - 2026-08-07

Initial public release.

### Added

- CSV / TSV / pasted-table BOM parsing
- Excel workbook support through SheetJS Community Edition
- Multi-sheet workbook selector
- Automatic header-row detection
- Automatic and manual column mapping
- Assembly-ready, procurement-ready, and engineering-release profiles
- RefDes range expansion and duplicate detection
- Quantity validation and Qty-vs-RefDes comparison
- DNP / DNI / DNF interpretation, including positive-logic Populate/Fitted columns
- Manufacturer / MPN consistency checks
- Internal/company part-number mapping checks
- Lifecycle status warnings based on data already present in the BOM
- Supplier part-number mapping checks
- Exact duplicate-row detection
- Same-part consolidation suggestions
- Likely metadata-row detection
- Searchable severity-filtered issue list
- Data coverage metrics
- Reviewed BOM CSV export
- Issue-report CSV export
- JSON report export
- GitHub Pages deployment workflow
- Sample clean and intentionally problematic BOMs
- Dependency-free Node.js tests for the rule engine
