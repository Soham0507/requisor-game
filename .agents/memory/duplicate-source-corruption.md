---
name: Duplicate source corruption
description: Safely detect and repair recurring exact-module duplication in the Citrus frontend.
---

Some Citrus frontend source files have unexpectedly gained a second copy of the complete module appended to the first. Copies may differ in branding or recent feature work, so the intended active version must be established before cleanup. This causes duplicate import and declaration errors that can block unrelated pages.

**Why:** The corruption has recurred after earlier cleanup, including during unrelated catalog work. Treating it as a normal TypeScript problem wastes time and risks deleting non-duplicate code.

**How to apply:** When duplicate declaration errors appear, compare every possible split and inspect commit history or surrounding changes when the halves differ. Preserve the newer/intended copy, remove or isolate the stale copy, then run typecheck and build.