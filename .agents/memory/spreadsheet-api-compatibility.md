---
name: Spreadsheet API compatibility
description: Avoid outdated spreadsheet reader/writer examples when implementing browser imports and templates.
---

Inspect the installed spreadsheet libraries' browser APIs before reusing examples from older major versions.

**Why:** Common examples assumed the reader returned rows directly and the writer performed a download immediately. The installed major versions changed those return shapes; an apparently plausible import/export integration therefore did not type-check.

**How to apply:** Use the installed declarations and migration notes as the source of truth, and round-trip a real downloaded workbook through the browser importer when upgrading either library. A passing CSV import does not verify Excel compatibility.
