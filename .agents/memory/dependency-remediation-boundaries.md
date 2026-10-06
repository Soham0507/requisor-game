---
name: Dependency remediation boundaries
description: Imported lockfile scope and misleading historical sandbox alerts during security updates.
---

Treat imported projects and the extracted migration backup as part of repository-wide dependency scanning, even when they are not used by the main app.

**Why:** Workspace-only pnpm auditing can be clean while independent npm lockfiles and the migration backup still contain the requested vulnerabilities.

**How to apply:** Compare workspace auditing with the repository-wide dependency scan, and remediate all retained lockfiles rather than hiding or deleting findings.

Historical advisories for gf3's `sandbox` evaluator can incorrectly match Vercel's modern Sandbox CLI after the npm package name was reused.

**Why:** The old advisories have open-ended version ranges; downgrading Vercel to avoid the name collision introduces genuine CLI vulnerabilities.

**How to apply:** Verify package identity and upstream references, document the collision without suppressing the scanner, and keep genuine vulnerabilities fixed.

Retain the known-working bundler version when a compatible security refresh introduces a build-time regression unrelated to a vulnerability.

**Why:** Rollup's tree-shaking update caused multi-minute CPU stalls in this project even though application typechecks and development previews worked.

**How to apply:** Profile a stalled build before changing app behavior; prefer a verified safe bundler pin over disabling tree shaking.
