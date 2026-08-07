# Contributing

Contributions that make PCB BOM review more accurate, transparent, or useful are welcome.

## Good contributions

Examples include:

- Additional real-world BOM header aliases
- Better handling of reference-designator formats
- Reduced false positives
- New consistency checks that can be justified from BOM data alone
- Accessibility improvements
- Browser compatibility fixes
- Documentation improvements
- Test cases for unusual BOM exports

## Design principles

1. **Do not silently modify engineering data.** Suggestions and reviewed exports are preferred over automatic corrections.
2. **Do not overclaim.** If a rule cannot verify electrical suitability, lifecycle, stock, authenticity, or manufacturability, it must not imply that it can.
3. **Prefer explainable rules.** A user should understand why an issue was raised.
4. **Minimize data exposure.** BOM analysis should remain client-side unless a future feature clearly documents otherwise.
5. **Treat heuristics carefully.** False positives should be warning/info level unless the inconsistency is structurally clear.

## Testing

Run the core tests with:

```bash
node tests/core.test.js
```

When adding a rule, add at least one positive case and one case that should not trigger.

## Pull requests

Describe:

- What problem the change solves
- Example BOM data that demonstrates the problem
- Expected behavior
- Any known edge cases

Do not include confidential customer BOM data in a public pull request.
