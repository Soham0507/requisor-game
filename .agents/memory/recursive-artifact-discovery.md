---
name: Recursive artifact discovery
description: Publishing behavior for imported projects that contain nested Replit artifact manifests.
---

Publishing recursively discovers `.replit-artifact/artifact.toml` files anywhere below `artifacts/`, including manifests copied inside imported game source trees.

**Why:** A publish passed compilation but failed during service startup because a nested API manifest reused the main API port and nested static manifests referenced output paths as if they were top-level artifacts.

**How to apply:** When imported sources contain nested manifests, ensure every server has a unique port and every static `publicDir` is workspace-relative to the manifest's real nested build output. Validate all manifest changes through the artifact TOML replacement flow.