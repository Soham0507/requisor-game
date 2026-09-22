# Boat Booth

A trade-show kiosk: a visitor picks a boat experience, snaps a webcam photo, and the xAI Grok Imagine API places them into a photoreal scene on the water, then animates it into a short shareable video.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract (source of truth): `lib/api-spec/openapi.yaml` → run codegen to regenerate hooks/zod
- DB schema: `lib/db/src/schema/generations.ts`
- xAI Grok client: `artifacts/api-server/src/lib/grok.ts` (image edit + image-to-video)
- Scene definitions + prompt templates: `artifacts/api-server/src/lib/scenes.ts`
- Generation flow (mapper, background video poller, restart sweeper): `artifacts/api-server/src/lib/generations.ts`
- Routes: `artifacts/api-server/src/routes/{scenes,generations,booth}.ts`
- Frontend kiosk: `artifacts/boat-booth/src/` (home attract screen + multi-step create flow)

## Architecture decisions

- Generated photo and video bytes are stored as base64 in Postgres and served via plain Express routes (`GET /api/media/:id/photo|video`), giving xAI a publicly fetchable image URL for the video step. Acceptable for kiosk volume; revisit object storage if usage grows.
- Photo generation is synchronous (request waits ~10-30s, returns the finished photo). Video generation is async: submit returns a `request_id`, a background loop polls xAI and stores the finished mp4; the client polls `GET /generations/:id`.
- Video-start is an atomic claim (`UPDATE ... WHERE video_status IN ('idle','failed')`) so concurrent taps can't launch duplicate paid jobs. A startup sweeper resumes `pending` jobs after a restart.

## Product

A self-serve booth experience: choose one of three boat scenes (sunset pontoon cruise, wakesurf session, trophy bass catch), capture a webcam selfie, receive a photoreal image of yourself in that scene, then animate it into a short looping video. The home screen shows a live gallery of recent creations and booth stats.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- xAI image-edit `image` field must be `{ type: "image_url", image_url: "<data-uri-or-url>" }` (a struct, not a bare string).
- xAI image-to-video needs the source image as a nested `image: { url: "<https-or-data-uri>" }`. A flat `image_url` string is silently ignored — the job still succeeds and bills, but produces a random person (text-to-video). We pass the photo as a base64 data URI so there's no public-reachability dependency. Verify by checking the video's first frame matches the photo.
- Known external issue (2026-05-29): xAI image generation returns server-side 500 ("Image generation failed. Please try again later.") for ALL calls, even trivial text-to-image. Chat and video generation work and bill fine on the same key, so this is an xAI-side outage with the Imagine image models, not a code/auth/billing problem. If the photo step 502s, check xAI status before touching the integration.
- After changing `lib/db` or other composite libs, run `pnpm run typecheck:libs` before typechecking the api-server, or it won't see the new exports.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
