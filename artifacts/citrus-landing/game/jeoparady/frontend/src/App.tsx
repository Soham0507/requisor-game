import { useEffect, useState } from 'react'
import AdminDashboard from './components/AdminDashboard'
import GameBoard from './components/GameBoard'
import LandingPage from './components/LandingPage'
import Leaderboard from './components/Leaderboard'
import QuestionModal from './components/QuestionModal'
import LoginPage from './components/LoginPage'
import PixelGridOverlay from './components/PixelGridOverlay'
import SoundToggle from './components/SoundToggle'
import ThemeToggle from './components/ThemeToggle'
import { usePlayer } from './hooks/usePlayer'
import { useTheme } from './hooks/useTheme'
import { fetchGameBoard, loginPlayer, recordGameResult, registerPlayer } from './lib/api'
import { playGameOver, startBackgroundMusic } from './lib/sound'
import type { AnswerStatus, GameBoardResponse, PublicCategory, PublicQuestion } from './types/game'

type View = 'login' | 'landing' | 'game' | 'admin'

interface ActiveSelection {
  category: PublicCategory
  question: PublicQuestion
}

interface ScorePopup {
  id: number
  delta: number
}

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { player, setPlayer } = usePlayer()
  const [view, setView] = useState<View>(player ? 'landing' : 'login')
  const [board, setBoard] = useState<GameBoardResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [score, setScore] = useState(2000)
  const [answers, setAnswers] = useState<Record<string, AnswerStatus>>({})
  const [active, setActive] = useState<ActiveSelection | null>(null)
  const [popup, setPopup] = useState<ScorePopup | null>(null)
  const [resultRecorded, setResultRecorded] = useState(false)
  const [gameOverSoundPlayed, setGameOverSoundPlayed] = useState(false)

  useEffect(() => {
    function handleFirstInteraction() {
      startBackgroundMusic()
      window.removeEventListener('pointerdown', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
    window.addEventListener('pointerdown', handleFirstInteraction)
    window.addEventListener('keydown', handleFirstInteraction)
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [])

  useEffect(() => {
    fetchGameBoard()
      .then((data) => {
        setBoard(data)
        setScore(data.starting_balance)
      })
      .catch(() => setLoadError('Could not reach the game server. Is the backend running on port 8000?'))
  }, [])

  function handleSelectQuestion(category: PublicCategory, question: PublicQuestion) {
    setActive({ category, question })
  }

  function handleResolved(result: {
    questionId: string
    isCorrect: boolean
    prizeValue: number
    selectedOption: string | null
  }) {
    const delta = result.isCorrect ? result.prizeValue : -result.prizeValue
    const popupId = Date.now()
    const status: AnswerStatus =
      result.selectedOption === null ? 'unanswered' : result.isCorrect ? 'correct' : 'incorrect'
    setScore((s) => s + delta)
    setAnswers((prev) => ({ ...prev, [result.questionId]: status }))
    setPopup({ id: popupId, delta })
    setActive(null)
    window.setTimeout(() => setPopup((p) => (p?.id === popupId ? null : p)), 1500)
  }

  const allAnswered = board
    ? Object.keys(answers).length === board.categories.flatMap((c) => c.questions).length
    : false

  useEffect(() => {
    if (allAnswered && player && !resultRecorded) {
      setResultRecorded(true)
      recordGameResult(player.id, score).catch(() => {})
    }
  }, [allAnswered, player, score, resultRecorded])

  useEffect(() => {
    if (allAnswered && !gameOverSoundPlayed) {
      setGameOverSoundPlayed(true)
      playGameOver()
    }
  }, [allAnswered, gameOverSoundPlayed])

  function resetGameState() {
    setAnswers({})
    setScore(board?.starting_balance ?? 2000)
    setActive(null)
    setPopup(null)
    setResultRecorded(false)
    setGameOverSoundPlayed(false)
  }

  async function handleLogin(username: string, password: string) {
    const loggedIn = await loginPlayer(username, password)
    resetGameState()
    setPlayer(loggedIn)
    setView('landing')
  }

  async function handleRegister(username: string, password: string) {
    const created = await registerPlayer(username, password)
    resetGameState()
    setPlayer(created)
    setView('landing')
  }

  function handleSwitchUser() {
    resetGameState()
    setPlayer(null)
    setView('login')
  }

  function handleStart() {
    setView('game')
  }

  function handleOpenAdmin() {
    setView('admin')
  }

  function handlePlayAgain() {
    resetGameState()
    setView('landing')
  }

  const showPlayerControls = player !== null && view !== 'login'
  const isAdmin = player?.role === 'admin' && view !== 'login'

  return (
    <div className="flex min-h-full flex-col bg-cream-100 text-ink-900 dark:bg-brand-950 dark:text-cream-100">
      <PixelGridOverlay />
      <header className="app-header flex h-[4.5rem] shrink-0 items-center bg-brand-900 px-4 sm:px-6 lg:h-[5.5rem] lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 xl:max-w-7xl 2xl:max-w-[1600px]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 lg:h-11 lg:w-11">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                <path
                  d="M9 9a3 3 0 1 1 4.2 2.75c-.75.33-1.2 1.07-1.2 1.9V14M12 18h.01"
                  stroke="#002944"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              className={`headline truncate text-2xl font-black leading-none text-cream-100 lg:text-3xl ${
                view === 'game' ? 'hidden xl:inline' : 'hidden sm:inline'
              }`}
            >
              Don&apos;t Jeopardize This!
            </span>
            {view === 'game' && (
              <div className="relative flex h-12 shrink-0 items-center gap-2.5 rounded-full bg-gold-500 px-5 xl:ml-4 lg:h-[3.25rem]">
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-brand-900">Balance</span>
                <span className="headline text-3xl font-black leading-none text-brand-900 lg:text-[2.1rem]">
                  ${score.toLocaleString()}
                </span>
                {popup && (
                  <span
                    key={popup.id}
                    className={`animate-bounce rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${
                      popup.delta >= 0 ? 'bg-pine-600' : 'bg-crimson-600'
                    }`}
                  >
                    {popup.delta >= 0 ? `+$${popup.delta}` : `-$${Math.abs(popup.delta)}`}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            {isAdmin && view !== 'admin' && (
              <button
                onClick={handleOpenAdmin}
                title="Admin Dashboard"
                aria-label="Admin Dashboard"
                className="flex h-11 min-w-11 items-center justify-center rounded-full border-2 border-cream-100/70 px-2.5 text-cream-100 transition hover:border-gold-500 hover:text-gold-500 xl:border-0 xl:px-2"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 xl:hidden" aria-hidden="true">
                  <path
                    d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="headline hidden text-[1.35rem] font-extrabold xl:inline">Admin Dashboard</span>
              </button>
            )}
            {isAdmin && (
              <a
                href="/leaderboard.html"
                target="_blank"
                rel="noopener noreferrer"
                title="Open the leaderboard on its own page, for a second screen"
                aria-label="Pop out leaderboard"
                className="flex h-11 min-w-11 items-center justify-center rounded-full border-2 border-cream-100/70 px-2.5 text-cream-100 transition hover:border-gold-500 hover:text-gold-500 xl:mr-2 xl:border-0 xl:px-2"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 xl:hidden" aria-hidden="true">
                  <path
                    d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="headline hidden text-[1.35rem] font-extrabold xl:inline">Pop-out Leaderboard</span>
              </a>
            )}
            {showPlayerControls && player && (
              <div className="flex h-11 items-center gap-2 rounded-full bg-cream-100 py-1 pl-4 pr-1">
                <span className="max-w-[8rem] truncate text-sm font-bold text-brand-900">{player.username}</span>
                <button
                  onClick={handleSwitchUser}
                  title="Log out"
                  aria-label="Log out"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-cream-100 transition hover:bg-crimson-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M15 17l5-5-5-5M20 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
            <SoundToggle />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {board && (view === 'game' || view === 'landing') && <Leaderboard refreshOn={allAnswered} />}

      <main
        className={`mx-auto flex w-full flex-1 flex-col ${
          view === 'login' ? '' : 'max-w-6xl px-4 py-5 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-[1600px]'
        }`}
      >
        {view === 'login' && <LoginPage onLogin={handleLogin} onRegister={handleRegister} />}

        {view === 'admin' && player && (
          <AdminDashboard adminId={player.id} onBack={() => setView(board ? 'landing' : 'login')} />
        )}

        {view !== 'login' && view !== 'admin' && loadError && (
          <div className="rounded-2xl border-2 border-crimson-600 bg-crimson-50 px-5 py-4 font-semibold text-crimson-700 dark:bg-crimson-950/40 dark:text-crimson-200">
            {loadError}
          </div>
        )}

        {view !== 'login' && view !== 'admin' && !loadError && !board && (
          <div className="headline flex justify-center py-24 text-3xl font-extrabold text-brand-900 dark:text-cream-100">
            Loading the board...
          </div>
        )}

        {board && view === 'landing' && (
          <LandingPage
            categoryTitles={board.categories.map((c) => c.title)}
            startingBalance={board.starting_balance}
            onStart={handleStart}
          />
        )}

        {board && view === 'game' && (
          <>
            <GameBoard categories={board.categories} answers={answers} onSelectQuestion={handleSelectQuestion} />
            {allAnswered && (
              <div className="mt-5 flex flex-col items-center gap-3 rounded-[1.75rem] bg-ink-900 px-6 py-6 text-center">
                <p className="headline text-4xl font-black leading-none text-gold-500">Game over!</p>
                <p className="text-cream-400">
                  Final balance:{' '}
                  <span className="headline text-3xl font-black text-cream-100">${score.toLocaleString()}</span>
                </p>
                <button
                  onClick={handlePlayAgain}
                  className="flex h-14 items-center gap-3 rounded-full bg-crimson-600 pl-7 pr-1.5 text-white transition hover:-translate-y-0.5 hover:bg-crimson-700"
                >
                  <span className="headline text-2xl font-black">Play again</span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-crimson-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {active && (
        <QuestionModal
          category={active.category}
          question={active.question}
          playerId={player?.id ?? null}
          onResolved={handleResolved}
        />
      )}
    </div>
  )
}
