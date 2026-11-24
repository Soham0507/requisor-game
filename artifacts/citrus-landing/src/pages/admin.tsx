import { useCallback, useEffect, useMemo, useState } from "react";

const KEY_STORE = "a8.admin.key";
const API = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin`;

interface Overview {
  totals: { orders: number; drafts: number; submissions: number };
  perGame: { slug: string; name: string; orders: number; drafts: number; submissions: number }[];
}
interface OrderRow {
  id: string; createdAt: string; status: string; totalAmountCents: number; contactEmail: string | null;
  gameSlug: string; gameName: string; heading: string; tagline: string | null;
  primaryColor: string; secondaryColor: string; accentColor: string;
  hasLogo: boolean; hasBackground: boolean; hasFont: boolean; hasCustomContent: boolean; submissions: number;
}
interface SubRow {
  id: string; createdAt: string; orderId: string | null; gameSlug: string; gameName: string;
  name: string; email: string; extra: Record<string, unknown> | null;
}

class AuthError extends Error {}

async function call<T>(key: string, path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { headers: { "x-admin-key": key } });
  if (r.status === 401 || r.status === 503) throw new AuthError(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Access denied");
  if (!r.ok) throw new Error("Request failed");
  return r.json() as Promise<T>;
}

const when = (iso: string) => new Date(iso).toLocaleString();
const short = (id: string | null) => (id ? id.slice(0, 8) : "—");

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY_STORE) ?? "");
  const [draftKey, setDraftKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "orders" | "submissions">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [game, setGame] = useState("");
  const [order, setOrder] = useState("");
  const [busy, setBusy] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (game) p.set("game", game);
    if (order) p.set("order", order);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [game, order]);

  const load = useCallback(async () => {
    if (!key) return;
    setBusy(true);
    setError("");
    try {
      const [o, ord, s] = await Promise.all([
        call<Overview>(key, "/overview"),
        call<OrderRow[]>(key, `/orders${game ? `?game=${encodeURIComponent(game)}` : ""}`),
        call<SubRow[]>(key, `/submissions${qs}`),
      ]);
      setOverview(o); setOrders(ord); setSubs(s); setAuthed(true);
      sessionStorage.setItem(KEY_STORE, key);
    } catch (e) {
      if (e instanceof AuthError) { setAuthed(false); sessionStorage.removeItem(KEY_STORE); }
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, [key, game, qs]);

  useEffect(() => { void load(); }, [load]);

  async function download() {
    const r = await fetch(`${API}/submissions${qs}${qs ? "&" : "?"}format=csv`, { headers: { "x-admin-key": key } });
    if (!r.ok) { setError("Export failed"); return; }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url; a.download = "activate8-submissions.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function viewLeads(orderId: string) { setOrder(orderId); setTab("submissions"); }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <form
          className="w-full max-w-sm space-y-4 rounded-2xl border border-border p-6"
          onSubmit={(e) => { e.preventDefault(); setKey(draftKey.trim()); }}
        >
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">Enter the admin key to view orders and collected data.</p>
          <input
            type="password" autoFocus value={draftKey} onChange={(e) => setDraftKey(e.target.value)}
            placeholder="Admin key" aria-label="Admin key"
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2"
          />
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={!draftKey.trim() || busy} className="w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white disabled:opacity-50">
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  const games = overview?.perGame ?? [];
  const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
  const td = "px-3 py-2 align-top text-sm";

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Activate8 admin</h1>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="rounded-lg border border-border px-3 py-1.5 text-sm">{busy ? "Refreshing…" : "Refresh"}</button>
            <button onClick={() => { sessionStorage.removeItem(KEY_STORE); setKey(""); setAuthed(false); }} className="rounded-lg border border-border px-3 py-1.5 text-sm">Sign out</button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
          {(["overview", "orders", "submissions"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-orange-500 text-white" : "border border-border"}`}>
              {t === "submissions" ? "Collected data" : t}
            </button>
          ))}
          <select value={game} onChange={(e) => setGame(e.target.value)} aria-label="Filter by game" className="ml-auto rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm">
            <option value="">All games</option>
            {games.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
          </select>
        </nav>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

        {tab === "overview" && overview && (
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {([["Orders", overview.totals.orders], ["Saved customizations", overview.totals.drafts], ["Players / leads", overview.totals.submissions]] as const).map(([l, v]) => (
                <div key={l} className="rounded-2xl border border-border p-5"><div className="text-3xl font-bold">{v}</div><div className="text-sm text-muted-foreground">{l}</div></div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full">
                <thead><tr><th className={th}>Game</th><th className={th}>Customizations</th><th className={th}>Orders</th><th className={th}>Players / leads</th></tr></thead>
                <tbody>{overview.perGame.map((g) => (
                  <tr key={g.slug} className="border-t border-border"><td className={td}>{g.name}</td><td className={td}>{g.drafts}</td><td className={td}>{g.orders}</td><td className={td}>{g.submissions}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "orders" && (
          <section className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full">
              <thead><tr><th className={th}>Date</th><th className={th}>Game</th><th className={th}>Customer contact</th><th className={th}>Title / tagline</th><th className={th}>Brand</th><th className={th}>Custom</th><th className={th}>Order</th><th className={th}>Players</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td className={td} colSpan={8}>No orders yet.</td></tr>}
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className={td}>{when(o.createdAt)}</td>
                    <td className={td}>{o.gameName}</td>
                    <td className={td}>{o.contactEmail ?? "—"}</td>
                    <td className={td}><div className="font-medium">{o.heading}</div>{o.tagline && <div className="text-muted-foreground">{o.tagline}</div>}</td>
                    <td className={td}>
                      <div className="flex gap-1">{[o.primaryColor, o.secondaryColor, o.accentColor].map((c, i) => <span key={i} title={c} className="h-5 w-5 rounded-full border border-border" style={{ background: c }} />)}</div>
                    </td>
                    <td className={td}>{[o.hasLogo && "logo", o.hasBackground && "background", o.hasFont && "font", o.hasCustomContent && "questions"].filter(Boolean).join(", ") || "—"}</td>
                    <td className={td}><code title={o.id}>{short(o.id)}</code><div className="text-muted-foreground">{o.status.replace("_", " ")} · ${(o.totalAmountCents / 100).toFixed(2)}</div></td>
                    <td className={td}><button onClick={() => viewLeads(o.id)} className="text-orange-500 underline">{o.submissions} view</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {tab === "submissions" && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Filter by order" className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm">
                <option value="">All orders and previews</option>
                <option value="none">Previews only (no order)</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.gameName} · {o.heading} · {short(o.id)}</option>)}
              </select>
              <span className="text-sm text-muted-foreground">{subs.length} record{subs.length === 1 ? "" : "s"}</span>
              <button onClick={() => void download()} className="ml-auto rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white">Download CSV</button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full">
                <thead><tr><th className={th}>Time</th><th className={th}>Game</th><th className={th}>Order</th><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Score / details</th></tr></thead>
                <tbody>
                  {subs.length === 0 && <tr><td className={td} colSpan={6}>No data collected yet.</td></tr>}
                  {subs.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className={td}>{when(s.createdAt)}</td>
                      <td className={td}>{s.gameName}</td>
                      <td className={td}><code title={s.orderId ?? "preview"}>{short(s.orderId)}</code></td>
                      <td className={td}>{s.name}</td>
                      <td className={td}>{s.email}</td>
                      <td className={td}>{s.extra ? Object.entries(s.extra).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
