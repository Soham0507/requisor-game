---
name: Git imports with rewritten history
description: Safely reconcile copied repositories that have identical content but unrelated commit ancestry.
---

A repository copy can have unrelated Git history while still sharing an identical complete project snapshot. Compare tree identities, not just commit IDs, before deciding that imports conflict.

**Why:** A requested repository update had rewritten historical commits. Ordinary ancestor detection failed, but historical tree comparison proved the current workspace was identical to an earlier upstream snapshot.

**How to apply:** Check tracked and untracked local edits first. Find and verify the full shared snapshot before importing changes. Only prefer upstream wholesale when the local tree is demonstrably unchanged from that snapshot; otherwise preserve local edits through a real content comparison. Reconcile both histories so later pulls can use normal ancestor-based merging.
