import { useState, type FormEvent } from 'react'
import { PHOTOS } from '../lib/photos'
import PhotoTile from './PhotoTile'

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>
  onRegister: (username: string, password: string) => Promise<void>
}

type Mode = 'login' | 'signup'

const USERNAME_PATTERN = /^[A-Za-z0-9_ ]{2,20}$/

export default function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setConfirmPassword('')
  }

  // TESTING ONLY - remove before shipping to the booth. Bypasses the form to
  // log straight in as the admin account created for this build.
  async function handleQuickAdminLogin() {
    setError(null)
    setIsSubmitting(true)
    try {
      await onLogin('admin', 'Jeopardy2026!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedUsername = username.trim()

    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setError('Use 2-20 letters, numbers, spaces, or underscores.')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await onLogin(trimmedUsername, password)
      } else {
        await onRegister(trimmedUsername, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }


  const inputClass =
    'h-[3.25rem] w-full rounded-2xl border-2 border-cream-300 bg-cream-50 px-4 text-lg font-semibold text-brand-900 outline-none transition placeholder:font-normal placeholder:text-ink-900/45 focus:border-brand-400 focus:ring-4 focus:ring-brand-400/30 dark:border-brand-700 dark:bg-brand-950 dark:text-cream-100 dark:placeholder:text-cream-100/40'
  const labelClass = 'text-[0.8rem] font-bold uppercase tracking-[0.08em] text-brand-900 dark:text-cream-100'

  function tabClass(active: boolean) {
    return `headline h-11 flex-1 rounded-full text-xl font-black transition ${
      active
        ? 'bg-brand-900 text-cream-100 dark:bg-gold-500 dark:text-brand-900'
        : 'text-brand-900 hover:bg-cream-200 dark:text-cream-100 dark:hover:bg-brand-800'
    }`
  }

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2">
      <div className="flex flex-col gap-6 bg-brand-900 px-6 pb-24 pt-8 sm:px-10 lg:justify-between lg:px-16 lg:py-14">
        <div className="grid grid-cols-1 items-end gap-6 sm:grid-cols-[1fr_15rem] lg:grid-cols-1 lg:gap-8">
          <div className="flex flex-col gap-3">
            <p className="headline m-0 text-[1.4rem] font-extrabold leading-none text-brand-400 lg:text-[1.75rem]">
              Welcome to Milwaukee
            </p>
            <h1 className="headline m-0 text-[3.5rem] font-black leading-[0.86] text-cream-100 sm:text-[5rem] lg:text-[6.5rem]">
              Don&apos;t <span className="text-gold-500">Jeopardize</span> This!
            </h1>
          </div>
          <PhotoTile photo={PHOTOS.hoanBridge} className="hidden h-48 sm:block lg:h-[clamp(12rem,32vh,19rem)]" />
        </div>
      </div>

      <div className="flex flex-1 justify-center px-4 pb-8 sm:px-10 lg:items-center lg:px-14 lg:py-14">
        <div className="-mt-16 flex w-full max-w-xl flex-col gap-5 self-start rounded-[1.75rem] bg-white px-6 pb-7 pt-8 shadow-[0_16px_40px_rgba(0,41,68,0.16)] sm:px-9 lg:mt-0 lg:max-w-[30rem] lg:self-center lg:px-11 lg:pt-11 dark:bg-brand-900">
          <div className="flex flex-col gap-1.5">
            <h2 className="headline m-0 text-[2.75rem] font-black leading-[0.95] text-brand-900 dark:text-cream-100">
              {mode === 'login' ? 'Log in to play' : 'Create an account'}
            </h2>
            <p className="m-0 text-base text-ink-900/75 dark:text-cream-100/75">
              {mode === 'login' ? 'Log in to track your games and scores.' : 'Create an account to get started.'}
            </p>
          </div>

          <div className="flex w-full gap-1 rounded-full bg-cream-100 p-1 dark:bg-brand-950">
            <button type="button" onClick={() => switchMode('login')} className={tabClass(mode === 'login')}>
              Log In
            </button>
            <button type="button" onClick={() => switchMode('signup')} className={tabClass(mode === 'signup')}>
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex w-full flex-col items-stretch gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="2–20 letters or numbers"
                maxLength={20}
                autoFocus
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 4 characters"
                type="password"
                maxLength={72}
                className={inputClass}
              />
            </label>
            {mode === 'signup' && (
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Confirm password</span>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Type it again"
                  type="password"
                  maxLength={72}
                  className={inputClass}
                />
              </label>
            )}
            {error && <p className="m-0 text-sm font-semibold text-crimson-600 dark:text-crimson-400">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex h-[3.75rem] w-full items-center justify-between rounded-full bg-crimson-600 pl-7 pr-2 text-white shadow-[0_5px_0_#8a3118] transition hover:-translate-y-0.5 hover:bg-crimson-700 active:translate-y-0.5 active:shadow-[0_2px_0_#8a3118] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="headline text-[1.65rem] font-black leading-none">
                {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
              </span>
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
          </form>

          <button
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={isSubmitting}
            className="h-11 w-full rounded-full border-2 border-dashed border-crimson-600 bg-transparent text-xs font-bold uppercase tracking-[0.06em] text-crimson-700 transition hover:bg-crimson-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-crimson-400 dark:text-crimson-300 dark:hover:bg-crimson-950/40"
          >
            Testing only: quick admin login
          </button>
        </div>
      </div>
    </div>
  )
}
