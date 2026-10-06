import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const [src, dest] = process.argv.slice(2);
const j = JSON.parse(readFileSync(src, "utf8"));

// `keywords` in the PDF is just the union of the other fields (it's what the
// source builds from them), so the runtime derives it instead of shipping it.
const games = {};
for (const g of j.games) {
  const { slug, name, tagline, keywords, demo_url, ...meta } = g;
  games[slug] = meta;
}

// Not in the PDF: the Energy Quiz (slug lexus-energy-quiz), written to the
// same vocabulary so it's searchable and filterable like the rest.
games["lexus-energy-quiz"] = {
  family: "quiz",
  mechanic: "personality-quiz",
  goals: ["lead-capture", "lead-qualification", "product-recommendation", "brand-storytelling"],
  settings: ["trade-show", "retail", "dealership", "showroom", "conference", "mobile-tour", "virtual"],
  formats: ["tablet", "phone", "kiosk"],
  inputs: ["touch"],
  players: ["solo"],
  session: "1-2-min",
  energy: "calm",
  hardware: [],
  synonyms: [
    "multiple choice quiz",
    "mcq",
    "lifestyle quiz",
    "personality quiz",
    "questionnaire",
    "survey",
    "which one are you",
    "custom questions",
    "scored quiz",
  ],
  industries: ["auto & EV", "dealerships", "consumer products", "travel", "insurance", "financial products"],
  search_phrases: [
    "a multiple choice quiz we can write our own questions for",
    "a short survey that qualifies visitors while they play",
    "questionnaire for a showroom tablet",
  ],
};

mkdirSync(new URL(".", `file:///${dest.replace(/\\/g, "/")}`), { recursive: true });
writeFileSync(dest, JSON.stringify({ vocabulary: j.vocabulary, games }, null, 1) + "\n");
console.log("games:", Object.keys(games).join(", "));
