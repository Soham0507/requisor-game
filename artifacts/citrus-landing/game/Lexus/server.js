const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const PORT = process.env.PORT || 5000;
const MAIN = path.join(__dirname, "lexus_energy_quiz_tuned_v018.html");
const DASHBOARD_HTML = path.join(__dirname, "dashboard.html");
const ANALYTICS_FILE = path.join(__dirname, "analytics.json");
const SURVEY_REPORTS = {
  "/reports/arizona-survey-results.pdf": path.join(__dirname, "attached_assets", "Arizona_Survey_Results_Report_1_1788178590751.pdf"),
  "/reports/ohio-survey-results.pdf": path.join(__dirname, "attached_assets", "Ohio_Survey_Results_Report_1788178590751.pdf"),
  "/reports/texas-survey-results.pdf": path.join(__dirname, "attached_assets", "Texas_Survey_Results_Report_1788178590752.pdf"),
};

// ── PostgreSQL pool ───────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function dbReady() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_sessions (
        id TEXT PRIMARY KEY,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        answers JSONB DEFAULT '[]'::jsonb,
        result TEXT,
        event_name TEXT DEFAULT 'default',
        synced_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Add event_name column to existing tables that predate this feature
    await pool.query(`
      ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS event_name TEXT DEFAULT 'default'
    `);
    await pool.query(`ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS country TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS city    TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS region  TEXT DEFAULT ''`);
    return true;
  } catch (e) {
    console.error("DB init error:", e.message);
    return false;
  }
}
dbReady();

// ── JSON file fallback ────────────────────────────────────────────
function readLocal() {
  try { return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf8")); }
  catch (e) { return { sessions: [] }; }
}
function writeLocal(data) {
  try { fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2)); } catch (e) {}
}

// ── DB helpers ────────────────────────────────────────────────────
async function applyEvent(event) {
  const { type, id, ts } = event;
  const eventName = event.event_name || "default";

  if (type === "start") {
    await pool.query(
      `INSERT INTO quiz_sessions (id, started_at, answers, event_name, country, city, region)
       VALUES ($1, $2, '[]'::jsonb, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [id, ts || new Date().toISOString(), eventName,
       event.country||'', event.city||'', event.region||'']
    );
  } else if (type === "answer") {
    await pool.query(
      `INSERT INTO quiz_sessions (id, started_at, answers, event_name, country, city, region)
       VALUES ($1, $2, '[]'::jsonb, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [id, ts || new Date().toISOString(), eventName,
       event.country||'', event.city||'', event.region||'']
    );
    const q = parseInt(event.q, 10);
    await pool.query(
      `UPDATE quiz_sessions
       SET answers = jsonb_set(
         CASE WHEN jsonb_array_length(answers) >= $2
              THEN answers
              ELSE answers || '[null,null,null,null,null]'::jsonb
         END,
         $3::text[],
         $4::jsonb
       )
       WHERE id = $1`,
      [id, q, `{${q - 1}}`, JSON.stringify(event.text)]
    );
  } else if (type === "result") {
    await pool.query(
      `UPDATE quiz_sessions SET result = $2, completed_at = $3 WHERE id = $1`,
      [id, event.winner, ts || new Date().toISOString()]
    );
  }
}

async function applyEventToLocal(event, local) {
  const { type, id, ts } = event;
  const eventName = event.event_name || "default";
  if (type === "start") {
    if (!local.sessions.find(s => s.id === id)) {
      local.sessions.push({ id, startedAt: ts, answers: [], result: null, completedAt: null, eventName });
    }
  } else if (type === "answer") {
    const s = local.sessions.find(s => s.id === id);
    if (s) s.answers[event.q - 1] = event.text;
  } else if (type === "result") {
    const s = local.sessions.find(s => s.id === id);
    if (s) { s.result = event.winner; s.completedAt = ts; }
  }
}

async function getAllSessionsFromDB() {
  const res = await pool.query(
    `SELECT id, started_at, completed_at, answers, result, event_name, country, city, region
     FROM quiz_sessions ORDER BY COALESCE(completed_at, started_at) DESC`
  );
  return res.rows.map(r => ({
    id: r.id,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    answers: r.answers || [],
    result: r.result,
    eventName: r.event_name || "default",
    country: r.country || "",
    city: r.city || "",
    region: r.region || ""
  }));
}

// ── GA4 snippet injection ─────────────────────────────────────────
function injectGA4(html) {
  const mid = process.env.GA_MEASUREMENT_ID;
  let snippet = "";
  if (mid) {
    snippet = `<script async src="https://www.googletagmanager.com/gtag/js?id=${mid}"></script>\n` +
              `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
              `gtag('js',new Date());gtag('config','${mid}');</script>`;
  }
  return html.replace("{{GA4_SNIPPET}}", snippet);
}

// ── HTTP helpers ──────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Server ────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  cors(res);
  const url = req.url.split("?")[0];

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // ── POST /track — single event ──────────────────────────────────
  if (req.method === "POST" && url === "/track") {
    try {
      const event = JSON.parse(await readBody(req));
      try { await applyEvent(event); } catch (e) { console.error("DB write error:", e.message); }
      const local = readLocal();
      await applyEventToLocal(event, local);
      writeLocal(local);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400); res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── POST /sync — batch of queued offline events ─────────────────
  if (req.method === "POST" && url === "/sync") {
    try {
      const { events } = JSON.parse(await readBody(req));
      if (!Array.isArray(events)) throw new Error("events must be array");
      const local = readLocal();
      for (const event of events) {
        try { await applyEvent(event); } catch (e) { console.error("DB sync error:", e.message); }
        await applyEventToLocal(event, local);
      }
      writeLocal(local);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, synced: events.length }));
    } catch (e) {
      res.writeHead(400); res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── GET /dashboard/data ─────────────────────────────────────────
  if (url === "/dashboard/data") {
    try {
      const sessions = await getAllSessionsFromDB();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ sessions }));
    } catch (e) {
      const local = readLocal();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(local));
    }
    return;
  }

  // ── GET /dashboard ──────────────────────────────────────────────
  if (url === "/dashboard") {
    fs.readFile(DASHBOARD_HTML, "utf8", (err, data) => {
      if (err) { res.writeHead(500); res.end("Error loading dashboard"); return; }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(injectGA4(data));
    });
    return;
  }

  // ── GET /reports/* — approved survey reports ─────────────────────
  if (url.startsWith("/reports/")) {
    const reportPath = SURVEY_REPORTS[url];
    if (!reportPath) { res.writeHead(404); res.end("Report not found"); return; }
    fs.readFile(reportPath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Report not found"); return; }
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600",
      });
      res.end(data);
    });
    return;
  }

  // ── GET /sw.js — service worker ─────────────────────────────────
  if (url === "/sw.js") {
    fs.readFile(path.join(__dirname, "sw.js"), (err, data) => {
      if (err) { res.writeHead(404); res.end(""); return; }
      res.writeHead(200, {
        "Content-Type": "application/javascript",
        "Service-Worker-Allowed": "/",
        "Cache-Control": "no-cache"
      });
      res.end(data);
    });
    return;
  }

  // ── GET /manifest.json — PWA manifest ───────────────────────────
  if (url === "/manifest.json") {
    fs.readFile(path.join(__dirname, "manifest.json"), (err, data) => {
      if (err) { res.writeHead(404); res.end(""); return; }
      res.writeHead(200, {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "no-cache"
      });
      res.end(data);
    });
    return;
  }

  // ── GET /favicon.ico ────────────────────────────────────────────
  if (url === "/favicon.ico") {
    fs.readFile(path.join(__dirname, "icons", "favicon.ico"), (err, data) => {
      if (err) { res.writeHead(404); res.end(""); return; }
      res.writeHead(200, {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=86400"
      });
      res.end(data);
    });
    return;
  }

  // ── GET /icons/* — PWA icons ────────────────────────────────────
  if (url.startsWith("/icons/")) {
    const name = path.basename(url);
    if (!/^[\w.-]+\.png$/.test(name)) { res.writeHead(404); res.end(""); return; }
    fs.readFile(path.join(__dirname, "icons", name), (err, data) => {
      if (err) { res.writeHead(404); res.end(""); return; }
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400"
      });
      res.end(data);
    });
    return;
  }

  // ── GET / — main quiz ───────────────────────────────────────────
  fs.readFile(MAIN, "utf8", (err, data) => {
    if (err) { res.writeHead(500); res.end("Error loading page"); return; }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(injectGA4(data));
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
