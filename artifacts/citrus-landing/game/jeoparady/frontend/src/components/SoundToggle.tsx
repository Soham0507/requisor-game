import { useState } from 'react'
import { isSoundMuted, toggleSoundMuted } from '../lib/sound'

export default function SoundToggle() {
  const [muted, setMuted] = useState(isSoundMuted)

  function handleClick() {
    setMuted(toggleSoundMuted())
  }

  return (
    <button
      onClick={handleClick}
      aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
      title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-400 text-brand-900 transition hover:-translate-y-0.5 hover:brightness-110"
    >
      {muted ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M4 9v6h4l5 5V4L8 9H4Z" fill="currentColor" />
          <path d="M17 8.5l4.5 7M21.5 8.5 17 15.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M4 9v6h4l5 5V4L8 9H4Z" fill="currentColor" />
          <path
            d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}
