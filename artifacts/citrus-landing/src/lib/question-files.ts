import type { GameContent } from "@workspace/api-client-react";
import { sampleContent, validateGameContent } from "@workspace/game-content";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const HEADERS = [
  "kind", "question", "option_1", "option_2", "option_3", "option_4",
  "correct_option", "category", "points", "answer", "min", "max", "step", "unit",
  "explanation", "result_1", "result_2", "result_3", "result_4", "card_title", "card_detail",
];

// RFC-style quoted cells, including commas, escaped quotes, and multiline prompts.
export function parseQuestionCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  const finishCell = () => { row.push(cell); cell = ""; closed = false; };
  const finishRow = () => {
    finishCell();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
    if (rows.length > 100) throw new Error("The file has too many rows. Use up to 50 questions and six memory cards.");
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === '"') {
      if (cell || closed) throw new Error("CSV contains an unexpected quote. Use the CSV template.");
      quoted = true;
    } else if (char === ",") finishCell();
    else if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      finishRow();
    } else {
      if (closed && !/\s/.test(char)) throw new Error("CSV contains text after a closing quote.");
      if (!closed) cell += char;
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted cell.");
  if (cell || row.length) finishRow();
  return rows;
}

// People name spreadsheet columns their own way ("Correct Answer", "Option A",
// "Value"), so headers are matched loosely: case, spaces and common synonyms.
const HEADER_ALIASES: Record<string, string> = {
  questions: "question", prompt: "question", clue: "question", text: "question",
  option_a: "option_1", option_b: "option_2", option_c: "option_3", option_d: "option_4",
  choice_1: "option_1", choice_2: "option_2", choice_3: "option_3", choice_4: "option_4",
  choice_a: "option_1", choice_b: "option_2", choice_c: "option_3", choice_d: "option_4",
  answer_1: "option_1", answer_2: "option_2", answer_3: "option_3", answer_4: "option_4",
  answer_a: "option_1", answer_b: "option_2", answer_c: "option_3", answer_d: "option_4",
  a: "option_1", b: "option_2", c: "option_3", d: "option_4",
  correct: "correct_option", correct_answer: "correct_option", correct_choice: "correct_option", right_answer: "correct_option",
  topic: "category", value: "points", score: "points", tile_value: "points", point_value: "points",
  fact: "explanation", notes: "explanation",
};

function normalizeHeader(value: unknown, gameSlug: string): string {
  let header = String(value ?? "").replace(/^﻿/, "").trim().toLowerCase().replace(/[\s.\-]+/g, "_");
  // In a quiz sheet a bare "Answer" column names the right choice; only The Number uses it as a numeric answer.
  if (header === "answer" && gameSlug !== "a8-the-number") header = "correct_option";
  return HEADER_ALIASES[header] ?? header;
}

function contentFromRows(rows: unknown[][], gameSlug: string): unknown {
  const filled = rows.filter((row) => row.some((value) => value !== null && value !== undefined && String(value).trim()));
  if (filled.length < 2 || filled.length > 100) throw new Error("The sheet must contain a header and 1–50 question rows.");
  const headers = filled[0].map((value) => normalizeHeader(value, gameSlug));
  // Columns this game does not use (an ID column, notes) are ignored; a column it does use must appear only once.
  const used = headers.filter((value) => HEADERS.includes(value));
  if (new Set(used).size !== used.length) throw new Error("A column appears twice. Each column (question, options, correct answer…) should appear once.");
  if (!headers.includes("question")) throw new Error('The sheet needs a "Question" column in its first row.');
  const questions: Record<string, unknown>[] = [], cards: { title: string; detail: string }[] = [];
  for (const [index, row] of filled.slice(1).entries()) {
    if (row.slice(headers.length).some((value) => value !== null && value !== undefined && String(value).trim())) throw new Error(`Row ${index + 2} contains more cells than the header.`);
    const data = Object.fromEntries(headers.flatMap((key, i) => {
      if (!HEADERS.includes(key)) return [];
      const value = row[i];
      if (value !== null && value !== undefined && typeof value !== "string" && typeof value !== "number") throw new Error(`Row ${index + 2}: use plain text or numbers, not dates or objects.`);
      return [[key, String(value ?? "").trim()]];
    }));
    const number = (key: string) => {
      // Spreadsheet-style numbers: "$200" and "1,000" are fine.
      const cleaned = (data[key] ?? "").replace(/[$,\s]/g, "");
      if (!cleaned || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)) throw new Error(`Row ${index + 2}: ${key} must be a number.`);
      return Number(cleaned);
    };
    // The right choice can be its number (1–4), its letter (A–D) or the choice's own text.
    const correctChoice = (options: string[]) => {
      const value = (data.correct_option ?? "").trim();
      if (/^\d+$/.test(value)) return Number(value) - 1;
      if (/^[a-d]$/i.test(value)) return value.toLowerCase().charCodeAt(0) - 97;
      const byText = options.findIndex((option) => option.trim().toLowerCase() === value.toLowerCase());
      if (byText >= 0) return byText;
      throw new Error(`Row ${index + 2}: the correct answer must be 1–4, A–D, or match one of the options.`);
    };
    const kind = data.kind?.toLowerCase() || "question";
    if (kind === "card") {
      if (gameSlug !== "a8-recall") throw new Error("Memory-card rows are only supported by Recall.");
      cards.push({ title: data.card_title || "", detail: data.card_detail || "" });
      continue;
    }
    if (kind !== "question") throw new Error(`Row ${index + 2}: kind must be "question" or "card".`);
    const question: Record<string, unknown> = { text: data.question || "", explanation: data.explanation || "" };
    if (gameSlug === "a8-the-number") {
      for (const field of ["answer", "min", "max", "step"]) question[field] = number(field);
      question.unit = data.unit || "";
    } else {
      const options = [1, 2, 3, 4].map((i) => data[`option_${i}`] || "");
      while (options.length && !options.at(-1)) options.pop();
      question.options = options;
      if (gameSlug === "a8-match") question.outcomes = options.map((_, i) => number(`result_${i + 1}`) - 1);
      else question.answerIndex = correctChoice(options);
      if (gameSlug === "jeopardy") { question.category = data.category || ""; question.points = number("points"); }
    }
    questions.push(question);
  }
  return { gameSlug, questions, ...(cards.length ? { cards } : {}) };
}

// Reject ordinary zip bombs before handing .xlsx data to the workbook parser.
function checkWorkbookSize(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  let end = -1;
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0 || view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0) throw new Error("This is not a supported Excel workbook.");
  const entries = view.getUint16(end + 10, true), start = view.getUint32(end + 16, true);
  if (entries < 1 || entries > 256) throw new Error("The workbook is too complex. Export its question sheet as CSV.");
  let cursor = start, total = 0;
  for (let i = 0; i < entries; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("The Excel workbook is malformed.");
    if (view.getUint16(cursor + 8, true) & 1) throw new Error("Password-protected workbooks are not supported.");
    total += view.getUint32(cursor + 24, true);
    if (total > 10 * 1024 * 1024) throw new Error("The expanded workbook exceeds 10 MB. Upload only its question sheet.");
    cursor += 46 + view.getUint16(cursor + 28, true) + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
  }
}

export async function parseQuestionFile(file: File, gameSlug: string): Promise<GameContent> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw new Error("Choose a non-empty file smaller than 2 MB.");
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  let content: unknown;
  if (extension === "json") {
    try { content = JSON.parse((await file.text()).replace(/^\uFEFF/, "")); }
    catch { throw new Error("This file is not valid JSON. Download the JSON template to see the required structure."); }
  } else if (extension === "csv") content = contentFromRows(parseQuestionCsv(await file.text()), gameSlug);
  else if (extension === "xlsx") {
    const buffer = await file.arrayBuffer();
    checkWorkbookSize(buffer);
    try {
      // Use the first sheet that has the questions, so a leading "Instructions" sheet does not matter.
      const { default: readWorkbook } = await import("read-excel-file/browser");
      const sheets = await readWorkbook(new Blob([buffer]));
      let firstError: unknown;
      for (const { data } of sheets.slice(0, 10)) {
        try { content = contentFromRows(data, gameSlug); firstError = undefined; break; }
        catch (error) { firstError ??= error; }
      }
      if (content === undefined) throw firstError ?? new Error("The workbook has no sheets.");
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "The Excel workbook could not be read.");
    }
  } else if (extension === "xls") throw new Error("Older Excel (.xls) files are not supported. In Excel choose File > Save As > Excel Workbook (.xlsx), then upload that.");
  else throw new Error("Supported formats are .xlsx, .csv, and .json.");
  const result = validateGameContent(content, gameSlug);
  if (!result.ok) throw new Error(result.error);
  return result.content as GameContent;
}

// Column order shown in a game's template. Each game only gets the columns it
// actually uses (Jeopardy: category and points; The Number: answer, min, max...),
// so a sample file reads like that game's own question form.
const TEMPLATE_ORDER = [
  "kind", "category", "points", "question", "option_1", "option_2", "option_3", "option_4", "correct_option",
  "answer", "min", "max", "step", "unit", "result_1", "result_2", "result_3", "result_4",
  "explanation", "card_title", "card_detail",
];

function templateRows(gameSlug: string): string[][] {
  const content = sampleContent(gameSlug) as GameContent;
  const rows = content.questions.map((q: Record<string, any>) => {
    const data: Record<string, string> = { kind: "question", question: q.text, explanation: q.explanation || "" };
    q.options?.forEach((option: string, i: number) => { data[`option_${i + 1}`] = option; });
    if (q.answerIndex !== undefined) data.correct_option = String(q.answerIndex + 1);
    q.outcomes?.forEach((outcome: number, i: number) => { data[`result_${i + 1}`] = String(outcome + 1); });
    for (const key of ["category", "points", "answer", "min", "max", "step", "unit"]) if (q[key] !== undefined) data[key] = String(q[key]);
    return HEADERS.map((header) => data[header] || "");
  });
  content.cards?.forEach((card: { title: string; detail: string }) => {
    rows.push(HEADERS.map((header) => header === "kind" ? "card" : header === "card_title" ? card.title : header === "card_detail" ? card.detail : ""));
  });
  const used = TEMPLATE_ORDER.filter((header) =>
    header === "kind" ? Boolean(content.cards?.length) : header === "question" || header === "explanation" || rows.some((row) => row[HEADERS.indexOf(header)]));
  const pick = (row: string[]) => used.map((header) => row[HEADERS.indexOf(header)]);
  return [used, ...rows.map(pick)];
}

export async function downloadQuestionTemplate(gameSlug: string, format: "csv" | "json" | "xlsx") {
  if (format === "xlsx") {
    const { default: writeWorkbook } = await import("write-excel-file/browser");
    await writeWorkbook(templateRows(gameSlug).map((row) => row.map((value) => ({ type: String, value }))), {
      sheet: "Questions",
    }).toFile(`${gameSlug}-questions.xlsx`);
    return;
  }
  const data = format === "json" ? JSON.stringify(sampleContent(gameSlug), null, 2)
    : "\uFEFF" + templateRows(gameSlug).map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([data], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = `${gameSlug}-questions.${format}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
