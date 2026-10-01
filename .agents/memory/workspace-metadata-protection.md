---
name: Protect root workspace metadata
description: Preserve root workspace manifests during imported-game cleanup and structural migrations.
---

Limit imported-game cleanup to the imported folder. Root workspace metadata is not redundant merely because nested games have their own package and TypeScript configuration files.

**Why:** Root manifests have been removed more than once during project restructuring. Existing filtered development servers can continue running, masking the problem until publishing fails during package installation before any artifact builds run.

**How to apply:** During cleanup or migration, inspect the diff for root metadata deletions. Before recommending publishing, confirm the root package manifest and TypeScript configuration are present and retained in the project snapshot. If missing, recover the authoritative previous versions and compare their dependency declarations with the current lockfile rather than inventing a replacement.