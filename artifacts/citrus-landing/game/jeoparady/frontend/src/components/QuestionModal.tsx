import { useEffect, useRef, useState } from 'react'
import type { PublicCategory, PublicQuestion } from '../types/game'
import { verifyAnswer } from '../lib/api'
import { playCorrect, playIncorrect, playTimeout } from '../lib/sound'
import DynamicHostAvatar from './DynamicHostAvatar'

interface QuestionModalProps {
  category: PublicCategory
  question: PublicQuestion
  playerId: number | null
  onResolved: (result: {
    questionId: string
    isCorrect: boolean
    prizeValue: number
    selectedOption: string | null
  }) => void
}

const TIMER_SECONDS = 20
const FEEDBACK_DELAY_MS = 1400

export default function QuestionModal({ category, question, playerId, onResolved }: QuestionModalProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const startedAtRef = useRef(Date.now())
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
      const first = buttons[0], last = buttons.at(-1)
      if (!first || !last) { event.preventDefault(); dialogRef.current?.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', trapFocus)
    return () => { document.removeEventListener('keydown', trapFocus); previous?.focus() }
  }, [question.id])

  useEffect(() => {
    startedAtRef.current = Date.now()
  }, [question.id])

  const resolved = correctAnswer !== null

  async function submit(option: string | null) {
    if (isSubmitting || resolved) return
    setIsSubmitting(true)
    setSelected(option)
    const timeTakenSeconds = Math.min(TIMER_SECONDS, Math.round((Date.now() - startedAtRef.current) / 1000))
    try {
      const result = await verifyAnswer({
        question_id: question.id,
        selected_option: option,
        player_id: playerId,
        time_taken_seconds: timeTakenSeconds,
      })
      setCorrectAnswer(result.correct_answer)
      setIsCorrect(result.is_correct)
      if (result.is_correct) {
        playCorrect()
      } else if (option === null) {
        playTimeout()
      } else {
        playIncorrect()
      }
      window.setTimeout(() => {
        onResolved({
          questionId: question.id,
          isCorrect: result.is_correct,
          prizeValue: result.prize_value,
          selectedOption: option,
        })
      }, FEEDBACK_DELAY_MS)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleTimeout() {
    if (resolved) return
    setIsTimedOut(true)
    void submit(null)
  }

  function optionClasses(option: string) {
    const base =
      'dashed-outline headline flex min-h-[4.75rem] items-center justify-center rounded-full border-2 px-6 py-3 text-center text-[1.65rem] font-black leading-none transition sm:min-h-[5.25rem] sm:text-[1.85rem]'
    if (!resolved) {
      return `${base} border-brand-900 bg-brand-900 text-cream-100 shadow-[0_4px_0_#001824] hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-0.5 active:shadow-[0_1px_0_#001824]`
    }
    if (option === correctAnswer) {
      return `${base} border-pine-600 text-white shadow-[0_4px_0_#1d4a41] animate-[flash-correct_0.5s_ease-in-out_2] bg-pine-600`
    }
    if (option === selected && !isCorrect) {
      return `${base} border-crimson-600 text-white shadow-[0_4px_0_#8a3118] animate-[flash-incorrect_0.5s_ease-in-out_2] bg-crimson-600`
    }
    return `${base} border-cream-200 bg-white text-brand-900 opacity-45 dark:border-brand-800 dark:bg-brand-900 dark:text-cream-100`
  }

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={question.prompt} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/90 p-4 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-[45rem] overflow-hidden rounded-[1.75rem] bg-cream-100 shadow-[0_30px_80px_rgba(0,0,0,0.45)] lg:max-w-[55rem] dark:bg-brand-950">
        <div className="flex items-center justify-between gap-4 bg-brand-900 px-5 pb-5 pt-5 sm:px-8 sm:pt-6">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="headline m-0 text-lg font-extrabold leading-none text-brand-400 sm:text-[1.35rem]">
              {category.title}
            </p>
            <p className="headline m-0 text-[3.25rem] font-black leading-[0.85] text-gold-500 sm:text-[4.25rem]">
              ${question.value}
            </p>
          </div>
          <div className="flex justify-end">
            <DynamicHostAvatar
              durationSeconds={TIMER_SECONDS}
              isRunning={!resolved}
              onTimeout={handleTimeout}
              resetKey={question.id}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-5 px-5 pb-8 pt-7 sm:px-10 sm:pb-10">
          <span className="headline rounded-full bg-crimson-600 px-5 py-1.5 text-[1.35rem] font-black leading-none text-white">
            {question.prefix}
          </span>
          <p className="m-0 max-w-[40rem] text-center text-2xl font-semibold leading-snug text-brand-900 sm:text-[1.75rem] dark:text-cream-100">
            {question.prompt}
          </p>

          {isTimedOut && !isCorrect && resolved && (
            <p className="headline m-0 text-[1.75rem] font-black text-crimson-600 dark:text-crimson-400">Time&apos;s up!</p>
          )}

          <div className="mt-1 grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2">
            {question.options.map((option) => (
              <button
                key={option}
                disabled={resolved || isSubmitting}
                onClick={() => void submit(option)}
                className={optionClasses(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
