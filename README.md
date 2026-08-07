# PCB BOM Checker

A free, browser-based BOM review tool for PCB projects. It helps engineers, buyers, makers, and assembly teams catch common BOM data problems before quotation, sourcing, or assembly.

The checker runs locally in the browser. BOM data is not uploaded to a server.

## Live tool

After GitHub Pages is enabled, the project can be used at:

`https://LokiZhan0.github.io/pcbcool-pcb-bom-checker/`

## Why this exists

A BOM can look complete while still containing problems that cause avoidable questions later: duplicated reference designators, quantities that do not match the RefDes list, placeholder MPNs, ambiguous DNP rows, inconsistent manufacturer data, or one supplier SKU mapped to multiple parts.

This tool focuses on checks that can be performed from the BOM itself. It deliberately avoids pretending to verify things that require CAD data, supplier databases, electrical design knowledge, or factory process review.

## Supported input

- CSV
- TSV / tab-delimited text
- TXT tables
- XLSX
- XLS
- XLSM
- XLSB
- Pasted cells copied from Excel, Google Sheets, or an ERP export

Excel-family files are parsed in the browser with SheetJS Community Edition.

## Main checks

### Reference designators

- Missing RefDes on placed component rows
- Duplicate RefDes within one BOM row
- Duplicate RefDes across multiple placed rows
- Same RefDes appearing on both placed and DNP/DNI rows
- Common numeric reference ranges such as `R1-R10`, `C1:C6`, and `U1..U4`
- Suspicious reference-designator formatting
- Very large RefDes ranges that are unsafe to expand automatically

### Quantity checks

- Blank quantity
- Non-numeric quantity
- Fractional quantity
- Zero quantity on a placed row
- Negative quantity
- Quantity vs. unique RefDes count mismatch
- Optional switch to disable Qty-vs-RefDes comparison for purchasing/build-level BOM quantities

### Manufacturer and MPN checks

- Missing manufacturer part number
- Missing manufacturer
- Placeholder values such as `TBD`, `N/A`, `?`, `unknown`, and similar markers
- Same MPN assigned to multiple manufacturers
- Same MPN assigned to conflicting footprints/packages
- Same MPN assigned to conflicting component values

### Assembly and DNP checks

- Missing footprint/package according to the selected profile
- Missing value or description according to the selected profile
- DNP, DNI, DNF, do-not-fit, and related terms
- Positive quantity on a DNP row, reported as an informational review item
- `Populate`, `Fitted`, and similar positive-logic columns are interpreted correctly (`No` means not populated)
- Option to exclude DNP rows from required-field checks while still checking them for conflicts
- Option to allow non-PCB / mechanical / off-board rows without reference designators

### Internal part number and lifecycle checks

When those columns exist, the checker can also review:

- One internal/company part number mapping to multiple manufacturer parts
- Lifecycle values already present in the BOM such as `EOL`, `obsolete`, `NRND`, `last time buy`, or `discontinued`

Lifecycle warnings only reflect data written in the BOM. The tool does not query manufacturers or real-time lifecycle databases.

### Supplier data checks

When the BOM contains supplier information:

- Supplier-part-number consistency
- One supplier P/N mapping to multiple manufacturer P/Ns

### BOM cleanup checks

- Exact duplicate BOM lines
- Same-part lines that may be candidates for consolidation
- Likely title / note / metadata rows are identified and excluded from component checks

## Check profiles

The tool includes three profiles. Profiles change which fields are treated as required, warning-level, or informational.

### Assembly-ready

Focuses on placement information. Designator and quantity are required. Value/description and footprint are reviewed.

### Procurement-ready

Adds exact part identity. Designator, quantity, and MPN are required, with manufacturer, description, and footprint reviewed.

### Engineering release

Uses stricter release checks. Designator, quantity, MPN, manufacturer, and footprint are required, with description/value and sourcing context reviewed.

A profile is a review policy, not a universal industry standard. Teams should adapt the result to their own AVL, ERP, PLM, and manufacturing process.

## Column mapping

The checker recognizes many common header names, including examples such as:

- `Reference Designator`, `RefDes`, `Refs`, `Locations`
- `Quantity`, `Qty`, `Count`, `PCS`
- `Manufacturer`, `Mfr`, `Brand`
- `Manufacturer Part Number`, `MPN`, `Part Number`, `Mfr P/N`
- `Description`, `Desc`
- `Value`, `Rating`
- `Footprint`, `Package`, `Land Pattern`
- `DNP`, `DNI`, `Populate`, `Fitted`
- `Supplier`, `Distributor`, `Vendor`
- `Supplier Part Number`, `Distributor P/N`, `SKU`
- `Internal Part Number`, `IPN`, `Company Part Number`, `Material Code`
- `Alternate MPN`, `Approved Alternate`, `Second Source`
- `Lifecycle Status`, `Part Lifecycle`, `Product Status`
- `Notes`, `Remarks`, `Comments`

Always confirm the mapping after loading a BOM. Internal ERP field names can be ambiguous.

## Automatic header-row detection

The BOM does not need to start on row 1. The checker inspects the first rows and attempts to find the most likely header row. The detected row can be changed manually.

This helps with spreadsheet exports that include project names, revision notes, or report titles before the actual BOM table.

## Multi-sheet Excel files

For Excel workbooks, the tool provides a worksheet selector. Each sheet can be reviewed independently.

## Report output

The browser report includes:

- Overall status
- Error / warning / info counts
- BOM line count
- Unique placed reference count
- Total placed quantity
- Unique MPN count
- MPN coverage
- Manufacturer coverage
- Footprint coverage
- Searchable issue list
- Row-level source preview with issue status

## Export options

### Issue report CSV

Exports one line per detected issue, including severity, code, source row, field, message, detail, value, and related references.

### Reviewed BOM CSV

Preserves the source BOM columns and adds:

- `Checker Status`
- `Checker Issues`
- `Normalized Designators`
- `Detected Reference Count`
- `DNP Detected`

The tool does not silently correct or overwrite the source BOM.

### Full report JSON

Exports the complete machine-readable analysis result for scripts, CI workflows, or audit records.

## Privacy

Analysis is performed in the browser. The application does not include a server-side upload endpoint.

For Excel files, the SheetJS script is loaded from the official SheetJS CDN. File contents remain in the browser and are parsed client-side.

If your organization requires fully self-hosted dependencies, vendor the SheetJS standalone script into the repository and update the `<script>` reference in `index.html`.

## Quick local use

For CSV / TSV files, simply opening `index.html` in a modern browser is normally sufficient.

For the most representative test, use a local static server:

```bash
python -m http.server 8000
```

Then open:

`http://localhost:8000/`

## Test samples

Two sample files are included:

- `sample-bom-with-issues.csv` — intentionally contains several common BOM problems
- `sample-bom-clean.csv` — a cleaner example for comparison

The web UI also contains built-in sample buttons, so the tool can be demonstrated without selecting a file.

## Automated tests

The rule engine is dependency-free and can be tested with Node.js:

```bash
node tests/core.test.js
```

## GitHub Pages deployment

A Pages workflow is included at:

`.github/workflows/pages.yml`

After uploading the project to GitHub:

1. Open the repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. Open **Actions** and run `Deploy PCB BOM Checker to GitHub Pages` if it did not start automatically.
5. After deployment, the public URL will normally be:
   `https://YOUR-USERNAME.github.io/pcbcool-pcb-bom-checker/`

The workflow also deploys automatically after future pushes to `main`.

## Project structure

```text
pcbcool-pcb-bom-checker/
├── .github/
│   └── workflows/
│       └── pages.yml
├── tests/
│   └── core.test.js
├── .nojekyll
├── app.js
├── bom-core.js
├── index.html
├── styles.css
├── sample-bom-clean.csv
├── sample-bom-with-issues.csv
├── GUIDE_CN.md
├── SECURITY.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## What this tool does not verify

A BOM checker cannot determine everything required for production. This project intentionally does **not** claim to verify:

- Real-time stock
- Component lifecycle / NRND / EOL status
- Authorized-distributor status
- Counterfeit risk
- Electrical suitability
- Voltage, current, power, tolerance, or temperature requirements
- Manufacturer datasheet correctness
- Package dimensions
- Symbol-to-footprint correctness
- PCB connectivity
- Component polarity or orientation
- Pick-and-place coordinates
- Stencil design
- Feeder compatibility
- PCB DFM
- PCBA DFA
- AVL / AML policy
- Regulatory compliance
- Final production readiness

These require engineering, sourcing, CAD, supplier, and manufacturing review.

## Contributing

Bug reports and improvements are welcome. See `CONTRIBUTING.md`.

## Security

Do not upload confidential BOM examples to public GitHub issues. See `SECURITY.md`.

## About the maintainer

This utility is maintained by [PCBCool](https://pcbcool.com/) as a free engineering resource. The project is intended to be useful independently of any manufacturing service.

## License

MIT License. See `LICENSE`.
