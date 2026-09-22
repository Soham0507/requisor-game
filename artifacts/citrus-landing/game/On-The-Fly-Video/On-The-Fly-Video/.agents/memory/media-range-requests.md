---
name: Video media endpoint needs HTTP Range support
description: Why the booth video player showed "Failed to load video" and the serving-side rule that fixes it
---

# Serving video to a browser `<video>` element requires HTTP Range support

If a route serves video bytes with a plain full-body `200` response (e.g. `res.send(buffer)`),
the browser `<video>` element often fails to play and shows "Failed to load video" — even though
the bytes are correct and downloadable via curl.

**Why:** browsers issue a `Range:` request for media and expect `206 Partial Content` with
`Accept-Ranges: bytes` and a `Content-Range` header. A server that ignores `Range` and returns
`200` with the whole body breaks playback/seeking. Images do not need this; video (and audio) do.

**How to apply:** any endpoint streaming video/audio from memory or DB must:
- always set `Accept-Ranges: bytes`
- parse the `Range` header, respond `206` with `Content-Range: bytes start-end/total` and a
  `Content-Length` of the slice
- respond `416` with `Content-Range: bytes */total` for an unsatisfiable range
- fall back to full `200` body when there's no `Range` header

This applies to the boat-booth media route serving base64 video out of Postgres
(`GET /api/media/:id/video`). The photo route does not need it.
