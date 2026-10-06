# Dependency security verification

All advisories in the requested dependency remediation list have been removed
from the active workspace, imported npm projects, and extracted migration backup.
No audit exclusions or ignored advisories were added. The pnpm minimum release
age remains 1440 minutes.

## Remaining scanner name-collision alerts

The workspace dependency scanner reports two advisories twice for `sandbox@4.4.0`
(once from the pnpm graph and once from the Lexus npm lockfile):

- `GHSA-fm4j-4xhm-xpwx`
- `GHSA-gc25-3vc5-2jf9`

These historical advisories refer to the old `gf3/sandbox` JavaScript evaluator,
including its `new Sandbox().run(code)` API. The dependency installed by the
updated Vercel CLI is the unrelated **Vercel Sandbox CLI** from
`https://github.com/vercel/sandbox`, whose npm package metadata identifies it as
“Command line interface for Vercel Sandbox.” It is not the historical in-process
evaluator. The advisory records have open-ended version ranges and therefore
match the reused package name.

The Vercel CLI is kept on the latest release that satisfies the existing
one-day supply-chain safety delay. Downgrading it to avoid this name collision
would reintroduce genuine CLI advisories. These alerts are documented rather
than suppressed.

## Checks

- `pnpm audit`
- `cd .migration-backup && pnpm audit`
- `cd artifacts/citrus-landing/game/Lexus && npm audit --package-lock-only`
- `cd artifacts/citrus-landing/game/jeoparady/frontend && npm audit --package-lock-only`
- `pnpm run typecheck`
- `pnpm --filter rest-express exec tsc --noEmit`
- `pnpm --filter frontend exec tsc -b`
- `pnpm run test:dependency-security`
- `pnpm run build:web`
- `pnpm run build:api`

The regression tests exercise malformed proxy trust ranges, SQL identifier
escaping, preview discovery exclusions, and real XLSX generation with
formula-looking text remaining text.
