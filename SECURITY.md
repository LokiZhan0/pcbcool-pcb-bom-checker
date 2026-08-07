# Security and Privacy

## BOM privacy

The current application performs BOM analysis in the browser and does not provide a server-side BOM upload endpoint.

Do not attach confidential customer BOMs, proprietary part lists, pricing, or unreleased product information to public GitHub issues.

When reporting a bug, create a minimal synthetic example that reproduces the behavior.

## Spreadsheet parsing dependency

Excel-family files are parsed client-side using SheetJS Community Edition loaded from the official SheetJS CDN.

Organizations with strict dependency or network policies can vendor the SheetJS standalone script into the repository and reference the local copy from `index.html`.

## Reporting a security issue

For a suspected security issue, avoid posting sensitive exploit details in a public issue until the maintainer has had an opportunity to review the report through an appropriate private contact channel.
