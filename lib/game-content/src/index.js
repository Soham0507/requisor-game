// Shared by the editor, API, and standalone games. No uploaded code is executed.
export const QUESTION_GAME_SLUGS = ["a8-match", "a8-trivia-rush", "a8-the-number", "a8-spin-to-win", "a8-recall", "jeopardy"];
export const MATCH_RESULTS = ["Aura", "Terra", "Vela", "Nomad"];

// A memory card's own picture: an uploaded PNG, JPG, WebP or GIF kept as a
// base64 data URL. The editor shrinks uploads first; this caps what is accepted.
export const CARD_IMAGE_MAX_CHARS = 700000;
const CARD_IMAGE = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/;

/** @returns {{ok: true, content: any} | {ok: false, error: string}} */
export function validateGameContent(input, slug) {
  try {
    const fail = (message) => { throw new Error(message); };
    if (!QUESTION_GAME_SLUGS.includes(slug)) fail("This game does not support custom questions.");
    if (!input || typeof input !== "object" || Array.isArray(input) || input.gameSlug !== slug) fail("The question file belongs to a different game.");
    if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 50) fail("Add between 1 and 50 questions.");
    const text = (value, label, max = 500, optional = false) => {
      if (optional && (value === undefined || value === "")) return "";
      if (typeof value !== "string" || !value.trim() || value.length > max) fail(`${label} must contain 1–${max} characters.`);
      return value.trim();
    };
    const number = (value, label, integer = false) => {
      if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1e9 || (integer && !Number.isInteger(value))) fail(`${label} must be a valid ${integer ? "whole " : ""}number.`);
      return value;
    };
    const questions = input.questions.map((q, index) => {
      const label = `Question ${index + 1}`;
      if (!q || typeof q !== "object" || Array.isArray(q)) fail(`${label} is not an object.`);
      const clean = { text: text(q.text, label), explanation: text(q.explanation, `${label}: explanation`, 1000, true) };
      if (slug === "a8-the-number") {
        for (const key of ["answer", "min", "max", "step"]) clean[key] = number(q[key], `${label}: ${key}`);
        if (clean.max <= clean.min || clean.answer < clean.min || clean.answer > clean.max) fail(`${label}: answer must be inside a non-empty minimum/maximum range.`);
        if (clean.step < 0.001 || clean.step > clean.max - clean.min || (clean.max - clean.min) / clean.step > 100000) fail(`${label}: step must be at least 0.001 and produce no more than 100,000 dial positions.`);
        const steps = (clean.answer - clean.min) / clean.step;
        const rangeSteps = (clean.max - clean.min) / clean.step;
        if (Math.abs(steps - Math.round(steps)) > 0.00001 || Math.abs(rangeSteps - Math.round(rangeSteps)) > 0.00001) fail(`${label}: answer and maximum must align with the dial step.`);
        clean.unit = text(q.unit, `${label}: unit`, 40, true);
      } else {
        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) fail(`${label}: provide 2–4 answer choices.`);
        clean.options = q.options.map((option, i) => text(option, `${label}: answer ${i + 1}`, 200));
        if (new Set(clean.options.map((o) => o.toLowerCase())).size !== clean.options.length) fail(`${label}: answer choices must be different.`);
        if (slug === "a8-match") {
          if (!Array.isArray(q.outcomes) || q.outcomes.length !== clean.options.length || q.outcomes.some((v) => !Number.isInteger(v) || v < 0 || v > 3)) fail(`${label}: map each answer to one of the four product results.`);
          clean.outcomes = q.outcomes.slice();
        } else {
          clean.answerIndex = number(q.answerIndex, `${label}: correct answer`, true);
          if (clean.answerIndex < 0 || clean.answerIndex >= clean.options.length) fail(`${label}: select a correct answer from its choices.`);
        }
        if (slug === "jeopardy") {
          clean.category = text(q.category, `${label}: category`, 60);
          clean.points = number(q.points, `${label}: points`, true);
          if (clean.points < 1 || clean.points > 10000) fail(`${label}: points must be between 1 and 10,000.`);
        }
      }
      return clean;
    });
    if (slug === "jeopardy") {
      const groups = new Map();
      questions.forEach((q) => {
        const key = q.category.toLowerCase();
        const points = groups.get(key) || new Set();
        if (points.has(q.points)) fail(`Category "${q.category}" contains duplicate point values.`);
        points.add(q.points); groups.set(key, points);
      });
      if (groups.size > 6 || [...groups.values()].some((p) => p.size > 6)) fail("Jeopardy supports up to 6 categories with up to 6 questions each.");
    }
    const content = { gameSlug: slug, questions };
    if (input.cards !== undefined) {
      if (slug !== "a8-recall" || !Array.isArray(input.cards) || input.cards.length !== 6) fail("Recall needs exactly six memory cards.");
      content.cards = input.cards.map((card, i) => {
        const clean = {
          title: text(card?.title, `Memory card ${i + 1}: title`, 100),
          detail: text(card?.detail, `Memory card ${i + 1}: detail`, 200),
        };
        const image = card?.image;
        if (image !== undefined && image !== null && image !== "") {
          if (typeof image !== "string" || image.length > CARD_IMAGE_MAX_CHARS || !CARD_IMAGE.test(image)) fail(`Memory card ${i + 1}: the image must be a PNG, JPG, WebP or GIF under 500 KB.`);
          clean.image = image;
        }
        return clean;
      });
      if (new Set(content.cards.map((c) => c.title.toLowerCase())).size !== 6) fail("Memory-card titles must be different.");
    }
    return { ok: true, content };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid question content." };
  }
}

export function sampleContent(slug) {
  if (slug === "a8-the-number") return { gameSlug: slug, questions: [
    { text: "How many days are in a leap year?", answer: 366, min: 300, max: 400, step: 1, unit: "days", explanation: "A leap year includes February 29." },
  ] };
  if (slug === "a8-match") return { gameSlug: slug, questions: [
    { text: "What matters most to you?", options: ["City convenience", "Outdoor adventures", "Performance", "Family space"], outcomes: [0, 1, 2, 3] },
  ] };
  const content = { gameSlug: slug, questions: [
    { text: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Venus", "Jupiter"], answerIndex: 1, explanation: "Iron oxide gives Mars its reddish appearance." },
  ] };
  if (slug === "jeopardy") Object.assign(content.questions[0], { category: "Science", points: 100 });
  if (slug === "a8-recall") {
    content.cards = [
      { title: "Mars", detail: "The Red Planet" }, { title: "Earth", detail: "Our home planet" },
      { title: "Jupiter", detail: "The largest planet" }, { title: "Venus", detail: "The hottest planet" },
      { title: "Mercury", detail: "Closest to the Sun" }, { title: "Neptune", detail: "Farthest from the Sun" },
    ];
  }
  return content;
}

export function adaptFiveGameContent(content, products) {
  if (!content) return {};
  if (content.gameSlug === "a8-the-number") return {
    rounds: content.questions.map((q) => ({
      prompt: q.text, answer: q.answer, min: q.min, max: q.max, step: q.step, unit: q.unit || "",
      start: q.min + Math.round((q.max - q.min) / q.step / 2) * q.step, context: q.explanation || "", icon: "target",
    })),
  };
  const ids = Object.keys(products);
  const questions = content.questions.map((q) => content.gameSlug === "a8-match" ? {
    q: q.text, options: q.options.map((label, i) => ({
      label, sub: "", icon: "sparkles", score: Object.fromEntries(ids.map((id, j) => [id, j === q.outcomes[i] ? 1 : 0])),
    })),
  } : { q: q.text, options: q.options.slice(), answer: q.answerIndex, fact: q.explanation || "" });
  const result = { questions };
  if (content.cards) result.pairs = content.cards.map((card, i) => ({ id: `custom-card-${i}`, icon: "sparkles", title: card.title, detail: card.detail, ...(card.image ? { image: card.image } : {}) }));
  return result;
}
