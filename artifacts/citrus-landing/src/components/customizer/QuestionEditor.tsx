import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileUp, Loader2, Plus, Trash2, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import type { GameContent, GameContentQuestion } from "@workspace/api-client-react";
import { MATCH_RESULTS, sampleContent, validateGameContent } from "@workspace/game-content";
import { parseQuestionFile, downloadQuestionTemplate } from "@/lib/question-files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SUPPORTED = ["a8-match", "a8-trivia-rush", "a8-the-number", "a8-spin-to-win", "a8-recall", "jeopardy"];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const FILE_EXT = /\.(xlsx|csv|json)$/i;

interface DQ {
  id: number;
  text: string;
  options: string[];
  answerIndex: number;
  outcomes: number[];
  category: string;
  points: string;
  answer: string;
  min: string;
  max: string;
  step: string;
  unit: string;
  explanation: string;
}
interface Draft {
  questions: DQ[];
  cards: { title: string; detail: string }[];
}
type Status = { kind: "idle" | "loading" | "error" | "ok" | "info"; message: string };

let uid = 1;
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

function fromContent(c: GameContent | null, slug: string): Draft {
  const src = (c ?? (sampleContent(slug) as GameContent)) as GameContent;
  return {
    questions: src.questions.map((q: GameContentQuestion) => ({
      id: uid++,
      text: q.text ?? "",
      options: q.options ? q.options.slice() : ["", ""],
      answerIndex: q.answerIndex ?? 0,
      outcomes: q.outcomes ? q.outcomes.slice() : (q.options ?? ["", ""]).map((_, i) => i % 4),
      category: q.category ?? "",
      points: str(q.points),
      answer: str(q.answer),
      min: str(q.min),
      max: str(q.max),
      step: str(q.step),
      unit: q.unit ?? "",
      explanation: q.explanation ?? "",
    })),
    cards:
      slug === "a8-recall"
        ? ((src.cards ?? (sampleContent(slug) as GameContent).cards ?? []) as { title: string; detail: string }[]).map((x) => ({ ...x }))
        : [],
  };
}

const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

function toContent(d: Draft, slug: string): unknown {
  const questions = d.questions.map((q) => {
    const o: Record<string, unknown> = { text: q.text };
    if (q.explanation.trim()) o.explanation = q.explanation;
    if (slug === "a8-the-number") {
      o.answer = num(q.answer);
      o.min = num(q.min);
      o.max = num(q.max);
      o.step = num(q.step);
      if (q.unit.trim()) o.unit = q.unit;
    } else {
      o.options = q.options;
      if (slug === "a8-match") o.outcomes = q.outcomes;
      else o.answerIndex = q.answerIndex;
      if (slug === "jeopardy") {
        o.category = q.category;
        o.points = num(q.points);
      }
    }
    return o;
  });
  const c: Record<string, unknown> = { gameSlug: slug, questions };
  if (slug === "a8-recall") c.cards = d.cards;
  return c;
}

const serialize = (d: Draft | null, slug: string) => (d ? JSON.stringify(toContent(d, slug)) : "");

function blankQuestion(slug: string): DQ {
  return {
    id: uid++, text: "", options: ["", ""], answerIndex: 0, outcomes: [0, 1], category: "", points: "",
    answer: "", min: "", max: "", step: "1", unit: "", explanation: "",
  };
}

const fieldCls =
  "w-full min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface Props {
  gameSlug: string;
  content: GameContent | null;
  onApply: (content: GameContent | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function QuestionEditor({ gameSlug, content, onApply, onDirtyChange }: Props) {
  const supported = SUPPORTED.includes(gameSlug);
  const [draft, setDraft] = useState<Draft | null>(() => (content ? fromContent(content, gameSlug) : null));
  const [baseline, setBaseline] = useState<string>(() => (content ? serialize(fromContent(content, gameSlug), gameSlug) : ""));
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [confirmReset, setConfirmReset] = useState(false);
  const [fromTemplate, setFromTemplate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const syncedKey = useRef(JSON.stringify(content));
  const slugRef = useRef(gameSlug);

  useEffect(() => {
    const key = JSON.stringify(content);
    if (key === syncedKey.current && slugRef.current === gameSlug) return;
    syncedKey.current = key;
    slugRef.current = gameSlug;
    const d = content ? fromContent(content, gameSlug) : null;
    setDraft(d);
    setBaseline(d ? serialize(d, gameSlug) : "");
    setFromTemplate(false);
    setConfirmReset(false);
  }, [content, gameSlug]);

  const dirty = useMemo(() => serialize(draft, gameSlug) !== baseline, [draft, baseline, gameSlug]);
  const liveValidation = useMemo(() => draft ? validateGameContent(toContent(draft, gameSlug), gameSlug) : null, [draft, gameSlug]);
  const dirtyRef = useRef(onDirtyChange);
  dirtyRef.current = onDirtyChange;
  useEffect(() => {
    dirtyRef.current?.(dirty || status.kind === "loading");
  }, [dirty, status.kind]);

  if (!supported) return null;

  const isMatch = gameSlug === "a8-match";
  const isNumber = gameSlug === "a8-the-number";
  const isJeo = gameSlug === "jeopardy";
  const isRecall = gameSlug === "a8-recall";

  const edit = (fn: (d: Draft) => Draft) => {
    setDraft((d) => (d ? fn(d) : d));
    setStatus({ kind: "idle", message: "" });
  };
  const setQ = (id: number, patch: Partial<DQ>) =>
    edit((d) => ({ ...d, questions: d.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));

  const startTemplate = () => {
    const d = fromContent(null, gameSlug);
    setDraft(d);
    setFromTemplate(true);
    setStatus({ kind: "info", message: "Template loaded. Nothing is applied until you press Apply." });
  };

  const apply = () => {
    if (!draft) return;
    const r = validateGameContent(toContent(draft, gameSlug), gameSlug) as { ok: boolean; content?: unknown; error?: string };
    if (!r.ok) {
      setStatus({ kind: "error", message: r.error ?? "Invalid question content." });
      return;
    }
    const cleaned = r.content as GameContent;
    const d = fromContent(cleaned, gameSlug);
    syncedKey.current = JSON.stringify(cleaned);
    setDraft(d);
    setBaseline(serialize(d, gameSlug));
    setFromTemplate(false);
    setStatus({ kind: "ok", message: `Applied ${cleaned.questions.length} question${cleaned.questions.length === 1 ? "" : "s"} to the preview.` });
    onApply(cleaned);
  };

  const doReset = () => {
    const d = fromContent(null, gameSlug);
    syncedKey.current = "null";
    setDraft(d);
    setBaseline(serialize(d, gameSlug));
    setFromTemplate(true);
    setConfirmReset(false);
    setStatus({ kind: "ok", message: "Custom questions removed. Built-in defaults are restored." });
    onApply(null);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!FILE_EXT.test(file.name)) return setStatus({ kind: "error", message: "Choose a .xlsx, .csv, or .json file." });
    if (file.size > MAX_FILE_BYTES) return setStatus({ kind: "error", message: "That file is larger than 2 MB." });
    setStatus({ kind: "loading", message: "Reading file locally..." });
    try {
      const parsed = await parseQuestionFile(file, gameSlug);
      setDraft(fromContent(parsed, gameSlug));
      setFromTemplate(false);
      setStatus({ kind: "info", message: `Imported ${parsed.questions.length} questions. Review and edit them below, then press Apply.` });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Could not read that file." });
    }
  };

  const template = async (format: "csv" | "json" | "xlsx") => {
    try {
      await downloadQuestionTemplate(gameSlug, format);
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Could not create the template." });
    }
  };

  const addQuestion = () => edit((d) => (d.questions.length >= 50 ? d : { ...d, questions: [...d.questions, blankQuestion(gameSlug)] }));

  return (
    <section className="space-y-4 border-t border-border pt-6" aria-labelledby="qe-title" data-testid="question-editor">
      <div>
        <h2 id="qe-title" className="text-base font-semibold">Questions</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Files are read in your browser and are not kept. Applied questions are shown to players, so do not enter private data.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Use the template headers unchanged. Excel imports the first worksheet.
          {!isNumber && (isMatch
            ? " In Excel/CSV, result_1–result_4 use 1 = Aura, 2 = Terra, 3 = Vela, 4 = Nomad. JSON outcomes start at 0."
            : " In Excel/CSV, correct_option starts at 1. JSON answerIndex starts at 0.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => fileRef.current?.click()} data-testid="button-import-questions">
          <FileUp size={14} /> Import file
        </Button>
        {(["xlsx", "csv", "json"] as const).map((f) => (
          <Button key={f} type="button" variant="outline" className="min-h-[44px]" onClick={() => template(f)} data-testid={`button-template-${f}`}>
            <Download size={14} /> .{f} template
          </Button>
        ))}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv,.json"
          className="hidden"
          aria-label="Import question file"
          onChange={onFile}
        />
      </div>

      <div role="status" aria-live="polite" className="min-h-0">
        {status.kind !== "idle" && (
          <p
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
              status.kind === "error" ? "border-destructive text-destructive" : "border-border bg-muted text-foreground"
            }`}
            data-testid={`status-questions-${status.kind}`}
          >
            {status.kind === "loading" && <Loader2 size={14} className="mt-0.5 animate-spin shrink-0" />}
            {status.kind === "error" && <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
            {status.kind === "ok" && <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
            <span>{status.message}</span>
          </p>
        )}
      </div>

      {!draft ? (
        <div className="rounded-md border border-dashed border-border p-4 space-y-3">
          <p className="text-sm">This game is using its built-in questions. They stay as they are until you apply your own.</p>
          <Button type="button" className="min-h-[44px]" onClick={startTemplate} data-testid="button-start-template">
            Start from a sample template
          </Button>
        </div>
      ) : (
        <>
          {fromTemplate && (
            <p className="text-xs rounded-md border border-border bg-muted px-3 py-2">
              This is a sample template, not the game's actual built-in questions. Replace it with your own.
            </p>
          )}
          {isMatch && (
            <p className="text-xs text-muted-foreground">
              Each answer points to one of the four product results ({MATCH_RESULTS.join(", ")}) in the current demo lineup. You can customize the questions and answers, not the results.
            </p>
          )}
          {isJeo && (
            <p className="text-xs text-muted-foreground">
              Up to 6 categories, up to 6 questions per category, and point values must be different within a category.
            </p>
          )}

          {isRecall && (
            <fieldset className="space-y-2 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium">Memory cards (exactly 6)</legend>
              {draft.cards.map((c, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`card-title-${i}`} className="text-xs text-muted-foreground">Card {i + 1} title</Label>
                    <Input id={`card-title-${i}`} data-testid={`input-card-title-${i}`} maxLength={100} value={c.title}
                      onChange={(e) => edit((d) => ({ ...d, cards: d.cards.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`card-detail-${i}`} className="text-xs text-muted-foreground">Card {i + 1} detail</Label>
                    <Input id={`card-detail-${i}`} data-testid={`input-card-detail-${i}`} maxLength={200} value={c.detail}
                      onChange={(e) => edit((d) => ({ ...d, cards: d.cards.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)) }))} />
                  </div>
                </div>
              ))}
            </fieldset>
          )}

          <ol className="space-y-4">
            {draft.questions.map((q, qi) => (
              <li key={q.id} className="rounded-md border border-border p-3 space-y-3" data-testid={`question-${qi}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Question {qi + 1}</span>
                  <Button type="button" variant="ghost" size="sm" className="min-h-[44px]" disabled={draft.questions.length <= 1}
                    aria-label={`Delete question ${qi + 1}`} data-testid={`button-delete-question-${qi}`}
                    onClick={() => edit((d) => ({ ...d, questions: d.questions.filter((x) => x.id !== q.id) }))}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>

                {isJeo && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
                    <div className="space-y-1">
                      <Label htmlFor={`q-cat-${q.id}`} className="text-xs text-muted-foreground">Category</Label>
                      <Input id={`q-cat-${q.id}`} maxLength={60} value={q.category} onChange={(e) => setQ(q.id, { category: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`q-pts-${q.id}`} className="text-xs text-muted-foreground">Points</Label>
                      <Input id={`q-pts-${q.id}`} inputMode="numeric" value={q.points} onChange={(e) => setQ(q.id, { points: e.target.value })} />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor={`q-text-${q.id}`} className="text-xs text-muted-foreground">Question text</Label>
                  <textarea id={`q-text-${q.id}`} rows={2} maxLength={500} className={fieldCls} value={q.text}
                    onChange={(e) => setQ(q.id, { text: e.target.value })} />
                </div>

                {isNumber ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {([["answer", "Correct answer"], ["min", "Minimum"], ["max", "Maximum"], ["step", "Step"], ["unit", "Unit"]] as const).map(([k, label]) => (
                      <div key={k} className="space-y-1">
                        <Label htmlFor={`q-${k}-${q.id}`} className="text-xs text-muted-foreground">{label}</Label>
                        <Input id={`q-${k}-${q.id}`} inputMode={k === "unit" ? "text" : "decimal"} maxLength={k === "unit" ? 40 : undefined}
                          value={q[k]} onChange={(e) => setQ(q.id, { [k]: e.target.value } as Partial<DQ>)} />
                      </div>
                    ))}
                    <p className="col-span-2 sm:col-span-5 text-xs text-muted-foreground">
                      The correct answer and maximum must land exactly on a step from the minimum.
                    </p>
                  </div>
                ) : (
                  <fieldset className="space-y-2">
                    <legend className="text-xs text-muted-foreground mb-1">
                      {isMatch ? "Answers and the product result each one leads to" : "Answers (select the correct one)"}
                    </legend>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex flex-wrap items-center gap-2">
                        {!isMatch && (
                          <label className="flex min-h-[44px] min-w-[44px] items-center justify-center">
                            <input type="radio" name={`correct-${q.id}`} checked={q.answerIndex === oi}
                              aria-label={`Mark answer ${oi + 1} of question ${qi + 1} as correct`}
                              data-testid={`radio-correct-${qi}-${oi}`}
                              onChange={() => setQ(q.id, { answerIndex: oi })} className="h-4 w-4" />
                          </label>
                        )}
                        <Input className="min-w-0 flex-1 basis-40" maxLength={200} value={opt}
                          aria-label={`Question ${qi + 1} answer ${oi + 1}`}
                          onChange={(e) => setQ(q.id, { options: q.options.map((x, j) => (j === oi ? e.target.value : x)) })} />
                        {isMatch && (
                          <select className={`${fieldCls} w-auto`} aria-label={`Product result for answer ${oi + 1} of question ${qi + 1}`}
                            value={q.outcomes[oi] ?? 0}
                            onChange={(e) => setQ(q.id, { outcomes: q.options.map((_, j) => (j === oi ? Number(e.target.value) : q.outcomes[j] ?? 0)) })}>
                            {MATCH_RESULTS.map((r: string, ri: number) => (
                              <option key={r} value={ri}>{r}</option>
                            ))}
                          </select>
                        )}
                        <Button type="button" variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]" disabled={q.options.length <= 2}
                          aria-label={`Remove answer ${oi + 1} of question ${qi + 1}`}
                          onClick={() => setQ(q.id, {
                            options: q.options.filter((_, j) => j !== oi),
                            outcomes: q.outcomes.filter((_, j) => j !== oi),
                            answerIndex: q.answerIndex === oi ? 0 : q.answerIndex > oi ? q.answerIndex - 1 : q.answerIndex,
                          })}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="min-h-[44px]" disabled={q.options.length >= 4}
                      onClick={() => setQ(q.id, { options: [...q.options, ""], outcomes: [...q.outcomes, Math.min(q.options.length, 3)] })}>
                      <Plus size={14} /> Add answer
                    </Button>
                  </fieldset>
                )}

                <div className="space-y-1">
                  <Label htmlFor={`q-exp-${q.id}`} className="text-xs text-muted-foreground">Explanation (optional)</Label>
                  <textarea id={`q-exp-${q.id}`} rows={2} maxLength={1000} className={fieldCls} value={q.explanation}
                    onChange={(e) => setQ(q.id, { explanation: e.target.value })} />
                </div>
              </li>
            ))}
          </ol>

          {liveValidation && !liveValidation.ok && (
            <p id="qe-validation" role="alert" className="text-sm text-destructive">{liveValidation.error}</p>
          )}
          <Button type="button" variant="outline" className="min-h-[44px]" disabled={draft.questions.length >= 50} onClick={addQuestion} data-testid="button-add-question">
            <Plus size={14} /> Add question ({draft.questions.length}/50)
          </Button>

          <div className="sticky bottom-20 -mx-1 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-1 py-3">
            <Button type="button" className="min-h-[44px]" onClick={apply}
              disabled={(!dirty && !fromTemplate) || !liveValidation?.ok || status.kind === "loading"}
              aria-describedby={liveValidation && !liveValidation.ok ? "qe-validation" : undefined}
              data-testid="button-apply-questions">
              Apply questions
            </Button>
            {dirty && <span className="text-xs text-muted-foreground" data-testid="text-unapplied">Unapplied changes</span>}
            <Button type="button" variant="ghost" className="ml-auto min-h-[44px]" onClick={() => setConfirmReset(true)} data-testid="button-reset-questions">
              <RotateCcw size={14} /> Restore defaults
            </Button>
          </div>

          {confirmReset && (
            <div role="alertdialog" aria-labelledby="qe-reset-title" className="space-y-3 rounded-md border border-destructive p-3">
              <p id="qe-reset-title" className="text-sm">
                This deletes all your custom questions, including unapplied edits, and brings back the game's built-in questions. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="destructive" className="min-h-[44px]" onClick={doReset} data-testid="button-confirm-reset">
                  Delete and restore defaults
                </Button>
                <Button type="button" variant="outline" className="min-h-[44px]" autoFocus onClick={() => setConfirmReset(false)}>
                  Keep my questions
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
