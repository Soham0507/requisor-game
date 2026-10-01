import { useRef, useState } from 'react'
import { resolveImageUrl } from '../../lib/api'
import type { AdminCategoryDetail } from '../../types/game'
import QuestionEditor from './QuestionEditor'

interface CategoryCardProps {
  category: AdminCategoryDetail
  onSaveTitle: (title: string) => Promise<void>
  onSaveImageUrl: (imageUrl: string) => Promise<void>
  onUploadImage: (file: File) => Promise<void>
  onDelete: () => Promise<void>
  onSaveQuestion: (
    questionId: string,
    patch: { prefix: string; prompt: string; options: string[]; correct_answer: string },
  ) => Promise<void>
}

export default function CategoryCard({
  category,
  onSaveTitle,
  onSaveImageUrl,
  onUploadImage,
  onDelete,
  onSaveQuestion,
}: CategoryCardProps) {
  const [title, setTitle] = useState(category.title)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQuestions, setShowQuestions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function runAction(action: () => Promise<void>) {
    setIsBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-brand-300 bg-white/70 p-4 shadow-sm dark:border-brand-700 dark:bg-brand-950/40">
      <div className="flex gap-3">
        <div
          className="h-20 w-28 shrink-0 rounded-lg bg-brand-100 bg-cover bg-center dark:bg-brand-900/60"
          style={category.image_url ? { backgroundImage: `url(${resolveImageUrl(category.image_url)})` } : undefined}
        />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-md border border-brand-200 bg-white px-2 py-1 text-sm font-bold text-brand-950 outline-none focus:border-brand-500 dark:border-brand-700 dark:bg-brand-900/40 dark:text-white"
            />
            <button
              type="button"
              disabled={isBusy || title.trim() === category.title}
              onClick={() => runAction(() => onSaveTitle(title.trim()))}
              className="shrink-0 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold uppercase text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => runAction(onDelete)}
              className="shrink-0 rounded-full bg-crimson-600 px-3 py-1 text-xs font-bold uppercase text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-bold uppercase text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-600 dark:bg-brand-900/60 dark:text-brand-300"
            >
              Upload image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void runAction(() => onUploadImage(file))
              }}
            />
            <span className="text-xs text-brand-500 dark:text-brand-400">or</span>
            <input
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Paste image URL"
              className="min-w-0 flex-1 rounded-md border border-brand-200 bg-white px-2 py-1 text-xs text-brand-950 outline-none focus:border-brand-500 dark:border-brand-700 dark:bg-brand-900/40 dark:text-white"
            />
            <button
              type="button"
              disabled={isBusy || !imageUrlInput.trim()}
              onClick={() => runAction(() => onSaveImageUrl(imageUrlInput.trim()).then(() => setImageUrlInput('')))}
              className="shrink-0 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-bold uppercase text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-600 dark:bg-brand-900/60 dark:text-brand-300"
            >
              Use URL
            </button>
          </div>
          <p className="text-[11px] text-brand-500 dark:text-brand-400">
            Paste a direct image link (ends in .jpg, .png, .webp) — not a webpage link. Right-click an image
            anywhere and choose &quot;Copy image address&quot; to get one.
          </p>

          {error && <p className="text-xs font-semibold text-crimson-500 dark:text-crimson-400">{error}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowQuestions((v) => !v)}
        className="self-start rounded-full border border-brand-300 bg-brand-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-brand-600 dark:bg-brand-900/60 dark:text-brand-300"
      >
        {showQuestions ? 'Hide questions' : `Edit ${category.questions.length} questions`}
      </button>

      {showQuestions && (
        <div className="flex flex-col gap-2">
          {category.questions.map((question) => (
            <QuestionEditor
              key={question.id}
              question={question}
              onSave={(patch) => onSaveQuestion(question.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
