import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import GameBoard from '../components/GameBoard'
import QuestionModal from '../components/QuestionModal'
import SoundToggle from '../components/SoundToggle'
import type { AnswerStatus, PublicCategory, PublicQuestion } from '../types/game'
import { useQuestions } from './useQuestions'
import { useBrand } from './useBrand'
import '../index.css'
import './preview.css'

function CatalogPreview() {
  const { brand, fontError } = useBrand()
  const questions = useQuestions()
  if (questions.loading) return <main className="preview-content" role="status">Loading custom questions…</main>
  if (questions.error) return <main className="preview-content"><p role="alert">{questions.error}</p><button className="preview-button" onClick={() => window.location.reload()}>Retry loading questions</button></main>
  return <PlayablePreview key={questions.revision} brand={brand} fontError={fontError} board={questions.board} custom={questions.custom} />
}

function PlayablePreview({ brand, fontError, board, custom }: {
  brand: ReturnType<typeof useBrand>['brand']; fontError: boolean;
  board: ReturnType<typeof useQuestions>['board']; custom: boolean;
}) {
  const [playing, setPlaying] = useState(false)
  const [score, setScore] = useState(board.starting_balance)
  const [answers, setAnswers] = useState<Record<string, AnswerStatus>>({})
  const [active, setActive] = useState<{ category: PublicCategory; question: PublicQuestion } | null>(null)
  const total = board.categories.reduce((count, category) => count + category.questions.length, 0)
  const complete = Object.keys(answers).length === total
  function reset() { setScore(board.starting_balance); setAnswers({}); setActive(null); setPlaying(false) }
  return (
    <div className="catalog-preview" style={brand.bgUrl ? { backgroundImage: `url("${brand.bgUrl}")`, backgroundSize: 'cover', backgroundAttachment: 'fixed' } : undefined}>
      <header className="preview-header">
        <div className="preview-brand">
          {brand.logoUrl ? <img src={brand.logoUrl} alt={`${brand.brandName} logo`} style={{ height: brand.logoSize }} /> : <span className="preview-mark" aria-hidden="true">?</span>}
        </div>
        <SoundToggle />
      </header>
      <main className="preview-content">
        <p className="preview-demo">Catalog demo · {custom ? 'Custom questions' : 'Sample questions'} · Scores stay in this session only</p>
        {fontError && <p role="alert">The uploaded font could not be loaded. The system font is being used.</p>}
        <h1 className="headline" style={{ fontSize: brand.headingSize, color: brand.headingColor }}>{brand.heading}</h1>
        {brand.tagline && <p className="preview-tagline">{brand.tagline}</p>}
        {!playing ? (
          <section className="preview-intro" aria-label="How to play">
            <p>Start with 2,000 points. Choose from {board.categories.length} {board.categories.length === 1 ? 'category' : 'categories'} and answer each question within 20 seconds.</p>
            <p>Correct answers add the tile value; incorrect answers and timeouts subtract it.</p>
            <button className="preview-button" onClick={() => setPlaying(true)}>Start game</button>
          </section>
        ) : (
          <>
            <div className="preview-scorebar">
              <p aria-live="polite"><strong>{score.toLocaleString()}</strong> points · {Object.keys(answers).length}/{total} answered</p>
              <button className="preview-reset" onClick={reset}>Restart</button>
            </div>
            {complete ? (
              <section className="preview-intro" aria-label="Game result">
                <h2>Round complete!</h2><p>Final score: {score.toLocaleString()} points.</p>
                <button className="preview-button" onClick={reset}>Play again</button>
              </section>
            ) : <GameBoard categories={board.categories} answers={answers} onSelectQuestion={(category, question) => setActive({ category, question })} />}
          </>
        )}
      </main>
      {active && <QuestionModal key={active.question.id} category={active.category} question={active.question} playerId={null} onResolved={(result) => {
        setScore((current) => current + (result.isCorrect ? result.prizeValue : -result.prizeValue))
        setAnswers((current) => ({ ...current, [result.questionId]: result.selectedOption === null ? 'unanswered' : result.isCorrect ? 'correct' : 'incorrect' }))
        setActive(null)
      }} />}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<CatalogPreview />)
