import { useState } from 'react'
import type { AdminQuestionDetail } from '../../types/game'

interface QuestionEditorProps {
  question: AdminQuestionDetail
  onSave: (patch: {
    prefix: string
    prompt: string
    options: string[]
    correct_answer: string
  }) => Promise<void>
}

export default function QuestionEditor({ question, onSave }: QuestionEditorProps) {
  const [prefix, setPrefix] = useState(question.prefix)
  const [prompt, setPrompt] = useState(question.prompt)
  const [options, setOptions] = useState(question.options)
  const [correctAnswer, setCorrectAnswer] = useState(question.correct_answer)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateOption(index: number, value: string) {
    setOptions((prev) => {
      const next = [...prev]
      const previousValue = next[index]
      next[index] = value
      if (correctAnswer === previousValue) {
        setCorrectAnswer(value)
      }
      return next
    })
  }

  async function handleSave() {
    setIsSaving(true)
    setSaved(false)
    setError(null)
    try {
      await onSave({ prefix, prompt, options, correct_answer: correctAnswer })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save question.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-brand-200 bg-white/60 p-3 dark:border-brand-800/60 dark:bg-brand-950/30">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wide text-brand-700 dark:text-brand-300">
          ${question.value} tier
        </span>
        {saved && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Saved</span>}
      </div>

      <div className="flex flex-col gap-2">
        <input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="Prefix (e.g. WHAT IS)"
          className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs text-brand-950 outline-none focus:border-brand-500 dark:border-brand-700 dark:bg-brand-900/40 dark:text-white"
        />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Prompt"
          rows={2}
          className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs text-brand-950 outline-none focus:border-brand-500 dark:border-brand-700 dark:bg-brand-900/40 dark:text-white"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((option, index) => (
            <label key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={correctAnswer === option}
                onChange={() => setCorrectAnswer(option)}
                title="Mark as correct answer"
              />
              <input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                className="flex-1 rounded-md border border-brand-200 bg-white px-2 py-1 text-xs text-brand-950 outline-none focus:border-brand-500 dark:border-brand-700 dark:bg-brand-900/40 dark:text-white"
              />
            </label>
          ))}
        </div>
        <p className="text-[11px] text-brand-600 dark:text-brand-400">Select the radio button next to the correct answer.</p>
        {error && <p className="text-xs font-semibold text-crimson-500 dark:text-crimson-400">{error}</p>}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="self-start rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save question'}
        </button>
      </div>
    </div>
  )
}
