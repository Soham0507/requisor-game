---
name: Shared React Query runtime
description: Preventing production-only context failures between the frontend and generated workspace API hooks.
---

The frontend bundle must resolve the app's React Query provider and generated workspace hooks to one shared React Query runtime.

**Why:** Development worked, but the optimized production bundle included two React Query instances. Catalog hooks then failed with “No QueryClient set” despite being rendered below a provider.

**How to apply:** When a Vite frontend imports generated hooks from a linked workspace package, keep React Query in Vite's dependency dedupe list and verify the production bundle, not only the dev server.