import { useState } from 'react'
import { playStart } from '../lib/sound'

interface StartGameButtonProps {
  onStart: () => void
}

// A short beat between the click and the board appearing, so the start
// sound and the "Get ready" label register before the view switches.
const START_DELAY_MS = 900

export default function StartGameButton({ onStart }: StartGameButtonProps) {
  const [isBusy, setIsBusy] = useState(false)

  function handleClick() {
    if (isBusy) return
    setIsBusy(true)
    playStart()
    window.setTimeout(onStart, START_DELAY_MS)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      className="group flex h-16 items-center gap-4 rounded-full bg-crimson-600 pl-8 pr-2.5 text-white shadow-[0_5px_0_#8a3118] transition hover:-translate-y-0.5 hover:bg-crimson-700 active:translate-y-0.5 active:shadow-[0_2px_0_#8a3118] disabled:cursor-default"
    >
      <span className="headline text-[1.75rem] font-black leading-none">{isBusy ? 'Get ready...' : 'Start game'}</span>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-crimson-600 transition group-hover:translate-x-0.5">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  )
}
