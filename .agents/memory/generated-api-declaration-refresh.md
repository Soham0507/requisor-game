---
name: Generated API declaration refresh
description: Why client typechecks may still fail immediately after successful OpenAPI code generation
---

After changing the OpenAPI contract, regenerate its client and validation types, then rebuild their TypeScript declaration outputs before checking dependent frontend packages if a newly generated type still appears missing.

**Why:** A successful source generation can leave dependent TypeScript projects resolving older emitted declarations, reporting that a type does not exist even though it is present in generated source.

**How to apply:** If a leaf package reports a missing new generated export, confirm it exists in generated source, rebuild the affected library declarations, and then retry the leaf typecheck. If the workspace-wide codegen command is unavailable, invoke the code generator and library builds separately rather than changing the import to mask stale output.