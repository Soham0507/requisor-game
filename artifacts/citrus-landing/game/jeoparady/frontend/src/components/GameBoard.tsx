import { resolveImageUrl } from '../lib/api'
import { playClick } from '../lib/sound'
import type { AnswerStatus, PublicCategory, PublicQuestion } from '../types/game'

interface GameBoardProps {
  categories: PublicCategory[]
  answers: Record<string, AnswerStatus>
  onSelectQuestion: (category: PublicCategory, question: PublicQuestion) => void
}

function ResultIcon({ status }: { status: AnswerStatus }) {
  if (status === 'correct') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (status === 'incorrect') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path d="M6 12h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const TILE_CLASSES: Record<AnswerStatus, string> = {
  correct: 'cursor-not-allowed bg-pine-600 text-cream-100',
  incorrect: 'cursor-not-allowed bg-crimson-600 text-white',
  unanswered: 'cursor-not-allowed bg-[#8a8474] text-white',
}

function HeaderImage({ imageUrl }: { imageUrl: string | null }) {
  if (imageUrl) {
    return <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${resolveImageUrl(imageUrl)})` }} />
  }
  return null
}

// Tailwind needs static class names (no dynamic `grid-cols-${n}` strings), and
// MAX_CATEGORIES caps this at 5, so a small lookup covers every case — this
// keeps the board filling its container evenly instead of always reserving
// 5 columns' worth of width even when fewer categories exist.
const GRID_COLS_CLASS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
}

export default function GameBoard({ categories, answers, onSelectQuestion }: GameBoardProps) {
  const colsClass = GRID_COLS_CLASS[categories.length] ?? 'sm:grid-cols-5'
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-1">
          <p className="headline m-0 text-lg font-extrabold leading-none text-pine-600 lg:text-2xl dark:text-pine-500">
            Round one · Milwaukee edition
          </p>
          <h1 className="headline m-0 text-[3.25rem] font-black leading-[0.88] text-brand-900 lg:text-[4.5rem] dark:text-cream-100">
            Pick your tile.
          </h1>
        </div>
        <div className="flex max-w-[22rem] items-center gap-3 rounded-2xl bg-white py-2.5 pl-2.5 pr-4 lg:max-w-[32rem] lg:rounded-[1.25rem] lg:py-3.5 dark:bg-brand-900">
          <span className="headline flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-2xl font-black text-brand-900 lg:h-12 lg:w-12 lg:text-[1.75rem]">
            $
          </span>
          <p className="m-0 text-[0.8rem] leading-snug text-ink-900 lg:text-[0.95rem] dark:text-cream-100">
            <b>Tip:</b> don&apos;t play it safe. Aim for the $1000 tiles, that&apos;s where the real bankroll is won.
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-3 lg:gap-5 ${colsClass}`}>
        {categories.map((category) => (
          <div key={category.id} className="flex flex-col gap-2.5 lg:gap-3">
            <div className="board-header relative flex items-end overflow-hidden rounded-2xl p-2.5 lg:rounded-[1.25rem] lg:p-4">
              <HeaderImage imageUrl={category.image_url} />
              <div className="absolute inset-0 bg-brand-900/65" />
              <span className="headline relative z-10 text-xl font-black leading-[0.95] text-cream-100 lg:text-[1.75rem]">
                {category.title}
              </span>
            </div>
            {category.questions.map((question) => {
              const status = answers[question.id]
              const answered = status !== undefined
              const isTopTier = question.value === 1000
              return (
                <button
                  key={question.id}
                  disabled={answered}
                  aria-label={answered ? `$${question.value}, ${status}` : `$${question.value}`}
                  onClick={() => {
                    playClick()
                    onSelectQuestion(category, question)
                  }}
                  className={`board-tile headline flex items-center justify-center rounded-[0.875rem] text-[2.4rem] font-black leading-none transition lg:rounded-2xl lg:text-[2.9rem] ${
                    answered
                      ? TILE_CLASSES[status]
                      : isTopTier
                        ? 'bg-gold-500 text-brand-900 shadow-[0_5px_0_#a8902a] hover:-translate-y-0.5 hover:bg-gold-400 active:translate-y-0.5 active:shadow-[0_2px_0_#a8902a]'
                        : 'bg-brand-900 text-gold-500 shadow-[0_5px_0_#001824] hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-0.5 active:shadow-[0_2px_0_#001824] dark:bg-brand-800 dark:hover:bg-brand-700'
                  }`}
                >
                  {answered ? <ResultIcon status={status} /> : `$${question.value}`}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
