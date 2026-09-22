---
name: xAI Grok Imagine API
description: Verified request/response formats for xAI image-edit and image-to-video, plus the image-generation 500 outage gotcha.
---

# xAI Grok Imagine API (base `https://api.x.ai/v1`, Bearer `XAI_API_KEY`)

Verified by live probing against a real funded key.

## Models (GET /v1/models, /v1/image-generation-models)
- `grok-imagine-image` and `grok-imagine-image-quality` — text+image input, image output.
- `grok-imagine-video` — image-to-video.

## Image edit — POST /v1/images/edits
- The `image` field is a struct, NOT a bare string. Correct shape:
  `image: { type: "image_url", image_url: "<data-uri-or-https-url>" }`
  (`image_url` is a STRING, not a nested `{url}` object.)
- Passing `image` as a plain string → 422 "invalid type: string ... expected struct ImageUrl".
- Body also takes `model`, `prompt`, `n`, `response_format: "b64_json"` (accepted).
- Response: `{ data: [ { b64_json | url } ] }`.

## Image-to-video — POST /v1/videos/generations (async)
- Body: `{ model:"grok-imagine-video", prompt, image:{ url:"<https-url-or-data-uri>" }, duration:6, aspect_ratio:"16:9", resolution:"720p" }`.
- CRITICAL: the REST API takes the source image as a NESTED object `image: { url }`. A flat
  `image_url` string (the Python-SDK shape) is SILENTLY IGNORED — no error, the job succeeds and
  bills, but the model falls back to text-to-video and produces a RANDOM person. The only way to
  catch this is to check the generated video's first frame against the source image.
- `image.url` accepts a base64 data URI directly, so you can pass the stored photo inline and avoid
  any dependency on the image being publicly reachable. (If you do use an https URL instead, it must
  be publicly fetchable by xAI server-side.)
- Image-to-video uses the source image as the FIRST FRAME. Output defaults to the image's aspect
  ratio unless `aspect_ratio` overrides (which stretches). `duration` 1–15s; `resolution` 720p/1080p.
- Returns `{ request_id }`.
- Poll GET /v1/videos/{request_id}: 202 `{status:"pending", progress}` while running, then 200 `{status:"done", video:{url, duration}}`. Download the mp4 from `video.url`.

## GOTCHA: image generation returns 500, video works
- As of 2026-05-29, ALL image generation/edit calls (even trivial `{model, prompt:"a red apple"}` text-to-image) return 500 `{"code":"Internal error","error":"Image generation failed. Please try again later."}`.
- This is server-side at xAI, NOT a request-format or auth problem: the same key successfully runs chat completions AND video generation (which bills `cost_in_usd_ticks`), `/v1/api-key` shows `acls:[model:*, endpoint:*]`, `team_blocked:false`, `api_key_blocked:false`.
- **Why it matters:** if the photo step fails with a 502, check whether xAI image gen is still down before touching the integration code — the request format is already correct.
