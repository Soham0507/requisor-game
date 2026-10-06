import data from "@/data/game-search.json";

// Search + filter metadata per game (see public/games-keywords.pdf), keyed by
// slug. A game with no entry is still listed and found by name/tagline; it
// just can't match the structured filters.
export interface GameSearchMeta {
  family: string;
  mechanic: string;
  goals: string[];
  settings: string[];
  formats: string[];
  inputs: string[];
  players: string[];
  session: string;
  energy: string;
  hardware: string[];
  synonyms: string[];
  industries: string[];
  search_phrases: string[];
}

const META = data.games as Record<string, GameSearchMeta>;
const VOCAB = data.vocabulary;

export type FacetId = "goals" | "settings" | "formats" | "inputs" | "players" | "session" | "energy";
export type Filters = Record<FacetId, string[]>;

export const EMPTY_FILTERS: Filters = {
  goals: [],
  settings: [],
  formats: [],
  inputs: [],
  players: [],
  session: [],
  energy: [],
};

export const FACETS: { id: FacetId; label: string; values: string[] }[] = [
  { id: "goals", label: "Goal", values: VOCAB.goals },
  { id: "settings", label: "Where it runs", values: VOCAB.settings },
  { id: "formats", label: "Screen", values: VOCAB.formats },
  { id: "inputs", label: "Controls", values: VOCAB.inputs },
  { id: "players", label: "Players", values: VOCAB.players },
  { id: "session", label: "Play time", values: VOCAB.session },
  { id: "energy", label: "Energy", values: VOCAB.energy },
];

const LABEL_OVERRIDES: Record<string, string> = {
  "webcam-gesture": "Webcam gesture",
  "under-1-min": "Under 1 min",
  "1-2-min": "1–2 min",
  "2-3-min": "2–3 min",
  "5-20-min": "5–20 min",
  "sales-kickoff": "Sales kickoff",
  "large-screen": "Large screen",
  "video-wall": "Video wall",
  "presenter-led": "Presenter-led",
  "pop-up": "Pop-up",
  "lead-capture": "Lead capture",
};

export function facetLabel(value: string): string {
  if (LABEL_OVERRIDES[value]) return LABEL_OVERRIDES[value];
  const words = value.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function activeFilterCount(filters: Filters): number {
  return FACETS.reduce((n, f) => n + filters[f.id].length, 0);
}

export function getMeta(slug: string): GameSearchMeta | undefined {
  return META[slug];
}

export function needsWebcam(slug: string): boolean {
  return META[slug]?.hardware.includes("webcam") ?? false;
}

function facetValues(meta: GameSearchMeta, facet: FacetId): string[] {
  const v = meta[facet];
  return Array.isArray(v) ? v : [v];
}

// Within a facet any selected value may match (OR); across facets all must (AND).
function matchesFilters(slug: string, filters: Filters): boolean {
  const meta = META[slug];
  for (const { id } of FACETS) {
    const wanted = filters[id];
    if (wanted.length === 0) continue;
    if (!meta) return false;
    const have = facetValues(meta, id);
    if (!wanted.some((w) => have.includes(w))) return false;
  }
  return true;
}

const STOPWORDS = new Set([
  "a", "an", "and", "the", "for", "our", "we", "us", "to", "of", "in", "on", "at", "it", "is", "are", "that",
  "with", "my", "me", "i", "you", "your", "game", "games", "something", "want", "need", "like", "can", "get",
  "make", "have", "has", "what", "which", "who", "how", "so", "do", "be", "this", "them", "they", "their",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^['-]+|['-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const stem = (w: string) => (w.length > 3 ? w.replace(/(es|s)$/, "") : w);

// A query word matches a haystack word if they're equal (ignoring a plural
// "s"), or the query is the start of the haystack word so results narrow as
// you type ("leader" finds "leaderboard"). Not the reverse: "touchless"
// must not match every game that merely mentions "touch".
function wordMatches(queryWord: string, hayWord: string): boolean {
  if (queryWord === hayWord || stem(queryWord) === stem(hayWord)) return true;
  return queryWord.length >= 3 && hayWord.startsWith(queryWord);
}

function anyWordMatches(queryWord: string, text: string): boolean {
  return tokenize(text).some((w) => wordMatches(queryWord, w));
}

interface Searchable {
  slug: string;
  name: string;
  tagline: string;
}

function scoreGame(game: Searchable, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const meta = META[game.slug];
  const name = game.name.toLowerCase();
  const synonyms = meta?.synonyms ?? [];
  const phrases = meta?.search_phrases ?? [];
  const industries = meta?.industries ?? [];
  const structured = meta
    ? [meta.family, meta.mechanic, meta.session, meta.energy, ...meta.goals, ...meta.settings, ...meta.formats, ...meta.inputs, ...meta.players, ...meta.hardware]
        .map((v) => v.replace(/-/g, " "))
    : [];

  let score = 0;
  // Whole-query hits: the strongest signal, and what makes "pub trivia" or
  // "photo booth" land on the right game.
  if (name.includes(q)) score += 40;
  if (synonyms.some((s) => s.toLowerCase().includes(q) || q.includes(s.toLowerCase()))) score += 25;
  if (phrases.some((p) => p.toLowerCase().includes(q))) score += 20;
  if (industries.some((i) => i.toLowerCase().includes(q))) score += 15;
  if (game.tagline.toLowerCase().includes(q)) score += 10;

  // Per-word hits cover free-form requests ("something loud that pulls a crowd").
  for (const word of tokenize(q)) {
    if (anyWordMatches(word, name)) score += 12;
    if (synonyms.some((s) => anyWordMatches(word, s))) score += 6;
    if (phrases.some((p) => anyWordMatches(word, p))) score += 4;
    if (industries.some((i) => anyWordMatches(word, i))) score += 3;
    if (structured.some((s) => anyWordMatches(word, s))) score += 3;
    if (anyWordMatches(word, game.tagline)) score += 2;
  }
  return score;
}

export function searchAndFilter<T extends Searchable>(games: T[], query: string, filters: Filters): T[] {
  const filtered = games.filter((g) => matchesFilters(g.slug, filters));
  if (!query.trim()) return filtered;
  const scored = filtered
    .map((game) => ({ game, score: scoreGame(game, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  // Drop stragglers that only share a stray word with the query.
  const cutoff = scored.length ? scored[0].score * 0.3 : 0;
  return scored.filter((r) => r.score >= cutoff).map((r) => r.game);
}
