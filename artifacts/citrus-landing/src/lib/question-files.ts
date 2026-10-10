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

function contentFromRows(rows: unknown[][], gameSlug: string): unknown {
  const filled = rows.filter((row) => row.some((value) => value !== null && value !== undefined && String(value).trim()));
  if (filled.length < 2 || filled.length > 100) throw new Error("The sheet must contain a header and 1–50 question rows.");
  const headers = filled[0].map((value) => String(value ?? "").replace(/^\uFEFF/, "").trim().toLowerCase());
  if (new Set(headers).size !== headers.length || headers.some((value) => !HEADERS.includes(value))) throw new Error("Unknown or duplicate columns. Use the template headers without renaming them.");
  if (!headers.includes("question")) throw new Error('The file needs a "question" column.');
  const questions: Record<string, unknown>[] = [], cards: { title: string; detail: string }[] = [];
  for (const [index, row] of filled.slice(1).entries()) {
    if (row.slice(headers.length).some((value) => value !== null && value !== undefined && String(value).trim())) throw new Error(`Row ${index + 2} contains more cells than the header.`);
    const data = Object.fromEntries(headers.map((key, i) => {
      const value = row[i];
      if (value !== null && value !== undefined && typeof value !== "string" && typeof value !== "number") throw new Error(`Row ${index + 2}: use plain text or numbers, not dates or objects.`);
      return [key, String(value ?? "").trim()];
    }));
    const number = (key: string) => {
      if (!data[key] || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(data[key])) throw new Error(`Row ${index + 2}: ${key} must be a number.`);
      return Number(data[key]);
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
      else question.answerIndex = number("correct_option") - 1;
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
      const { readSheet } = await import("read-excel-file/browser");
      content = contentFromRows(await readSheet(new Blob([buffer]), 1), gameSlug);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "The Excel workbook could not be read.");
    }
  } else throw new Error("Supported formats are .xlsx, .csv, and .json. Use the first worksheet for Excel.");
  const result = validateGameContent(content, gameSlug);
  if (!result.ok) throw new Error(result.error);
  return result.content as GameContent;
}

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
  return [HEADERS, ...rows];
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
