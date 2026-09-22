---
name: Duplicate source corruption
description: Safely detect and repair recurring exact-module duplication in the Citrus frontend.
---

Some Citrus frontend source files have unexpectedly gained a second, byte-for-byte copy of the complete module appended to the first. This causes duplicate import and declaration errors that can block unrelated pages.

**Why:** The corruption has recurred after earlier cleanup, including during unrelated catalog work. Treating it as a normal TypeScript problem wastes time and risks deleting non-duplicate code.

**How to apply:** When duplicate declaration errors appear, compare every possible split and only trim when the two halves are exactly identical. Before delivery, scan the frontend source tree for other exact duplicated halves, then run typecheck and build.