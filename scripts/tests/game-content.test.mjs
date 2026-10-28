import test from "node:test";
import assert from "node:assert/strict";
import { QUESTION_GAME_SLUGS, sampleContent, validateGameContent, adaptFiveGameContent } from "../../lib/game-content/src/index.js";

for (const slug of QUESTION_GAME_SLUGS) {
  test(`${slug}: template validates and wrong-game content is rejected`, () => {
    const input = sampleContent(slug);
    assert.equal(validateGameContent(input, slug).ok, true);
    assert.equal(validateGameContent(input, slug === "jeopardy" ? "a8-match" : "jeopardy").ok, false);
    // Recall is memory cards only, so it has no questions to check (see its own test below).
    if (slug === "a8-recall") return;
    assert.equal(validateGameContent({ ...input, questions: [] }, slug).ok, false);
    assert.equal(validateGameContent({ ...input, questions: Array(51).fill(input.questions[0]) }, slug).ok, false);
    assert.equal(validateGameContent({ ...input, questions: [{ ...input.questions[0], text: " " }] }, slug).ok, false);
  });
}
test("multiple-choice answers must be valid, unique choices", () => {
  const input = sampleContent("a8-trivia-rush");
  for (const answerIndex of [-1, 4, 0.5, NaN]) {
    assert.equal(validateGameContent({ ...input, questions: [{ ...input.questions[0], answerIndex }] }, input.gameSlug).ok, false);
  }
  assert.equal(validateGameContent({ ...input, questions: [{ ...input.questions[0], options: ["Yes", "yes"] }] }, input.gameSlug).ok, false);
});
test("numeric questions enforce ranges and reachable dial positions", () => {
  const input = sampleContent("a8-the-number");
  for (const patch of [{ min: 400, max: 300 }, { answer: 500 }, { step: 0 }, { step: 0.00001 }, { step: 3 }, { answer: Infinity }, { answer: "366" }]) {
    assert.equal(validateGameContent({ ...input, questions: [{ ...input.questions[0], ...patch }] }, input.gameSlug).ok, false);
  }
});
test("Match maps choices to actual product scores", () => {
  const input = sampleContent("a8-match");
  const products = { aura: {}, terra: {}, vela: {}, nomad: {} };
  const output = adaptFiveGameContent(input, products);
  assert.deepEqual(output.questions[0].options[2].score, { aura: 0, terra: 0, vela: 1, nomad: 0 });
  assert.equal(validateGameContent({ ...input, questions: [{ ...input.questions[0], outcomes: [0, 1, 2, 4] }] }, input.gameSlug).ok, false);
});
test("Recall keeps six distinct memory pairs", () => {
  const input = sampleContent("a8-recall");
  const output = adaptFiveGameContent(input, {});
  assert.equal(new Set(output.pairs.map((p) => p.id)).size, 6);
  // Memory cards only: no questions anywhere in the game's content.
  assert.equal(output.questions, undefined);
  assert.equal(input.questions.length, 0);
  assert.equal(validateGameContent({ ...input, cards: input.cards.slice(1) }, input.gameSlug).ok, false);
});
test("Recall cards are a name and an optional picture", () => {
  const input = sampleContent("a8-recall");
  assert.equal(validateGameContent(input, input.gameSlug).ok, true);
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const withImage = { ...input, cards: input.cards.map((c, i) => (i === 0 ? { ...c, image: png } : c)) };
  const result = validateGameContent(withImage, input.gameSlug);
  assert.equal(result.ok, true);
  assert.equal(result.content.cards[0].image, png);
  assert.equal(adaptFiveGameContent(result.content, {}).pairs[0].image, png);
  // Only uploaded raster images are accepted: no links, no SVG.
  for (const image of ["https://example.com/x.png", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", "javascript:alert(1)"]) {
    assert.equal(validateGameContent({ ...input, cards: input.cards.map((c, i) => (i === 0 ? { ...c, image } : c)) }, input.gameSlug).ok, false);
  }
  // Older content that still has questions or detail lines keeps loading; they are ignored or kept harmlessly.
  const legacy = { ...input, questions: [{ text: "Old?", options: ["a", "b"], answerIndex: 0 }], cards: input.cards.map((c) => ({ ...c, detail: "Old detail" })) };
  const legacyResult = validateGameContent(legacy, input.gameSlug);
  assert.equal(legacyResult.ok, true);
  assert.equal(legacyResult.content.questions.length, 0);
});
test("Jeopardy rejects duplicate tiles but allows the same value in different categories", () => {
  const input = sampleContent("jeopardy");
  const q = input.questions[0];
  assert.equal(validateGameContent({ ...input, questions: [q, { ...q }] }, input.gameSlug).ok, false);
  assert.equal(validateGameContent({ ...input, questions: [q, { ...q, category: "Geography" }] }, input.gameSlug).ok, true);
});
test("untrusted strings remain data and unrecognized fields are removed", () => {
  const input = sampleContent("a8-trivia-rush");
  input.questions[0].text = '<img src=x onerror="window.evil=1">';
  input.questions[0].unexpected = { secret: "not retained" };
  const result = validateGameContent(input, input.gameSlug);
  assert.equal(result.ok, true);
  assert.equal(result.content.questions[0].text, input.questions[0].text);
  assert.equal("unexpected" in result.content.questions[0], false);
});
