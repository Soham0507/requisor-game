import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import type { QuizQuestion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// The six results an answer can lead to (the quiz's fixed outcome models).
const RESULTS = ["ES", "NX", "RZ", "RX", "TX", "TZ"] as const;
type Result = (typeof RESULTS)[number];

const MAX_QUESTIONS = 10;
const MAX_ANSWERS = 4;

type Scores = QuizQuestion["options"][number]["scores"];

function scoresFor(result: Result): Scores {
  return { ES: 0, NX: 0, RX: 0, RZ: 0, TX: 0, TZ: 0, [result]: 3 };
}

function topResult(scores: Scores): Result {
  let best: Result = "ES";
  for (const r of RESULTS) if ((scores[r] ?? 0) > (scores[best] ?? 0)) best = r;
  return best;
}

// The game's built-in questions, so the editor opens on what players see today.
const DEFAULT_QUIZ: QuizQuestion[] = [
  { text: "How far does the road usually take you?", options: [
    { text: "A quick trip around town — under 25 miles", scores: { ES: 3, NX: 0, RZ: 0, RX: 1, TX: 0, TZ: 1 } },
    { text: "An easy daily commute — 25–50 miles", scores: { ES: 0, NX: 3, RZ: 1, RX: 0, TX: 0, TZ: 0 } },
    { text: "However far it takes — 100+ miles", scores: { ES: 0, NX: 0, RZ: 0, RX: 3, TX: 0, TZ: 0 } },
  ] },
  { text: "Who's usually along for the drive?", options: [
    { text: "Just me, no compromises", scores: { ES: 1, NX: 3, RZ: 0, RX: 0, TX: 0, TZ: 0 } },
    { text: "A tight crew — 2–4 people", scores: { ES: 0, NX: 0, RZ: 3, RX: 0, TX: 0, TZ: 1 } },
    { text: "Everyone's coming — 5–6 people", scores: { ES: 0, NX: 0, RZ: 1, RX: 3, TX: 1, TZ: 0 } },
  ] },
  { text: "Describe your everyday drive.", options: [
    { text: "City streets, sharp turns, tight spots", scores: { ES: 1, NX: 2, RZ: 1, RX: 1, TX: 0, TZ: 0 } },
    { text: "Highway miles, cruise control earned", scores: { ES: 0, NX: 0, RZ: 2, RX: 0, TX: 0, TZ: 3 } },
    { text: "Long hauls that reward a good ride", scores: { ES: 0, NX: 0, RZ: 0, RX: 0, TX: 3, TZ: 0 } },
  ] },
  { text: "What should it be ready for?", options: [
    { text: "Getting you there, exactly on time", scores: { ES: 1, NX: 0, RZ: 1, RX: 0, TX: 0, TZ: 3 } },
    { text: "Family first — every seat matters", scores: { ES: 2, NX: 0, RZ: 0, RX: 2, TX: 1, TZ: 0 } },
    { text: "People and gear, no trade-offs", scores: { ES: 0, NX: 2, RZ: 0, RX: 0, TX: 2, TZ: 0 } },
  ] },
  { text: "Plans change. Where does the day take you?", options: [
    { text: "Somewhere close, decided on a whim", scores: { ES: 3, NX: 0, RZ: 0, RX: 0, TX: 0, TZ: 1 } },
    { text: "Worth the drive — 100+ miles out", scores: { ES: 1, NX: 2, RZ: 0, RX: 0, TX: 2, TZ: 0 } },
    { text: "A weekend worth chasing", scores: { ES: 0, NX: 0, RZ: 3, RX: 0, TX: 0, TZ: 1 } },
  ] },
];

interface DAnswer { id: number; text: string; result: Result }
interface DQuestion { id: number; text: string; answers: DAnswer[] }

let uid = 1;

function fromQuiz(quiz: QuizQuestion[]): DQuestion[] {
  return quiz.map((q) => ({
    id: uid++,
    text: q.text,
    answers: q.options.map((o) => ({ id: uid++, text: o.text, result: topResult(o.scores) })),
  }));
}

function toQuiz(d: DQuestion[]): QuizQuestion[] {
  return d.map((q) => ({
    text: q.text.trim(),
    options: q.answers.map((a) => ({ text: a.text.trim(), scores: scoresFor(a.result) })),
  }));
}

const serialize = (d: DQuestion[]) => JSON.stringify(toQuiz(d));

function validate(d: DQuestion[]): string | null {
  if (d.length < 1) return "Add at least one question.";
  for (let i = 0; i < d.length; i++) {
    const q = d[i];
    if (!q.text.trim()) return `Question ${i + 1} needs some text.`;
    if (q.answers.length < 2) return `Question ${i + 1} needs at least two answers.`;
    if (q.answers.some((a) => !a.text.trim())) return `Question ${i + 1} has an empty answer.`;
  }
  return null;
}

interface Props {
  quiz: QuizQuestion[] | null;
  onApply: (quiz: QuizQuestion[] | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Energy Quiz question editor: a short list of collapsible questions, each
 * with a few answers. For every answer you pick which result it points
 * toward; the game tallies those to pick the player's result.
 */
export function EnergyQuizEditor({ quiz, onApply, onDirtyChange }: Props) {
  const [questions, setQuestions] = useState<DQuestion[]>(() => fromQuiz(quiz ?? DEFAULT_QUIZ));
  const [baseline, setBaseline] = useState(() => serialize(questions));
  const [openId, setOpenId] = useState<number | null>(() => questions[0]?.id ?? null);
  const [applied, setApplied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const dirty = useMemo(() => serialize(questions) !== baseline, [questions, baseline]);
  const error = useMemo(() => validate(questions), [questions]);

  const dirtyRef = useRef(onDirtyChange);
  dirtyRef.current = onDirtyChange;
  useEffect(() => { dirtyRef.current?.(dirty); }, [dirty]);

  const edit = (fn: (q: DQuestion[]) => DQuestion[]) => {
    setQuestions((q) => fn(q));
    setApplied(false);
  };
  const setQuestion = (id: number, patch: Partial<DQuestion>) =>
    edit((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const setAnswer = (qid: number, aid: number, patch: Partial<DAnswer>) =>
    edit((qs) => qs.map((q) => (q.id === qid ? { ...q, answers: q.answers.map((a) => (a.id === aid ? { ...a, ...patch } : a)) } : q)));

  const addQuestion = () => {
    const id = uid++;
    edit((qs) => qs.length >= MAX_QUESTIONS ? qs : [
      ...qs,
      { id, text: "", answers: [{ id: uid++, text: "", result: "ES" }, { id: uid++, text: "", result: "NX" }] },
    ]);
    setOpenId(id);
  };

  const apply = () => {
    if (error) return;
    const next = toQuiz(questions);
    setBaseline(serialize(questions));
    setApplied(true);
    onApply(next);
  };

  const restore = () => {
    const d = fromQuiz(DEFAULT_QUIZ);
    setQuestions(d);
    setBaseline(serialize(d));
    setOpenId(d[0]?.id ?? null);
    setConfirmReset(false);
    setApplied(true);
    onApply(null);
  };

  return (
    <section className="space-y-3 border-t border-border pt-6" aria-labelledby="eq-title" data-testid="energy-quiz-editor">
      <div>
        <h2 id="eq-title" className="text-base font-semibold">Quiz questions</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Write your own questions and answers. For each answer, choose the result it points toward.
        </p>
      </div>

      <ol className="space-y-2">
        {questions.map((q, qi) => {
          const open = openId === q.id;
          return (
            <li key={q.id} className="rounded-md border border-border" data-testid={`quiz-question-${qi}`}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex min-h-[44px] flex-1 items-center gap-2 px-3 text-left text-sm"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : q.id)}
                >
                  <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
                  <span className="font-medium shrink-0">{qi + 1}.</span>
                  <span className={`truncate ${q.text.trim() ? "" : "text-muted-foreground italic"}`}>
                    {q.text.trim() || "New question"}
                  </span>
                </button>
                <Button
                  type="button" variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]"
                  disabled={questions.length <= 1}
                  aria-label={`Delete question ${qi + 1}`}
                  onClick={() => edit((qs) => qs.filter((x) => x.id !== q.id))}
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              {open && (
                <div className="space-y-3 border-t border-border p-3">
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={q.text}
                    placeholder="Question"
                    aria-label={`Question ${qi + 1} text`}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(e) => setQuestion(q.id, { text: e.target.value })}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Answers</span>
                      <span>Leads to</span>
                    </div>
                    {q.answers.map((a, ai) => (
                      <div key={a.id} className="grid grid-cols-[1fr_4.5rem_auto] items-center gap-2">
                        <Input
                          maxLength={120}
                          value={a.text}
                          placeholder={`Answer ${ai + 1}`}
                          aria-label={`Question ${qi + 1} answer ${ai + 1}`}
                          onChange={(e) => setAnswer(q.id, a.id, { text: e.target.value })}
                        />
                        <select
                          value={a.result}
                          aria-label={`Result for answer ${ai + 1}`}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          onChange={(e) => setAnswer(q.id, a.id, { result: e.target.value as Result })}
                        >
                          {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <Button
                          type="button" variant="ghost" size="sm" className="h-9 w-9 p-0"
                          disabled={q.answers.length <= 2}
                          aria-label={`Remove answer ${ai + 1}`}
                          onClick={() => setQuestion(q.id, { answers: q.answers.filter((x) => x.id !== a.id) })}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                    {q.answers.length < MAX_ANSWERS && (
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => setQuestion(q.id, { answers: [...q.answers, { id: uid++, text: "", result: "ES" }] })}
                      >
                        <Plus size={14} /> Add answer
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <Button type="button" variant="outline" disabled={questions.length >= MAX_QUESTIONS} onClick={addQuestion}>
        <Plus size={14} /> Add question ({questions.length}/{MAX_QUESTIONS})
      </Button>

      {error && dirty && (
        <p role="alert" className="flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {applied && !dirty && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 size={14} /> Applied to the preview.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button type="button" onClick={apply} disabled={!dirty || !!error} data-testid="button-apply-quiz">
          Apply questions
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unapplied changes</span>}
        <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setConfirmReset(true)}>
          <RotateCcw size={14} /> Restore defaults
        </Button>
      </div>

      {confirmReset && (
        <div role="alertdialog" className="space-y-2 rounded-md border border-destructive p-3">
          <p className="text-sm">Replace your questions with the built-in ones? Your edits will be lost.</p>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" size="sm" onClick={restore}>Restore defaults</Button>
            <Button type="button" variant="outline" size="sm" autoFocus onClick={() => setConfirmReset(false)}>Keep my questions</Button>
          </div>
        </div>
      )}
    </section>
  );
}
