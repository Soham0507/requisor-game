import { useEffect, useMemo, useRef, useState } from 'react'
import { playTick } from '../lib/sound'

interface DynamicHostAvatarProps {
  durationSeconds: number
  isRunning: boolean
  onTimeout: () => void
  resetKey: string | number
}

type ExpressionPhase = 'calm' | 'smirk' | 'wide' | 'shocked' | 'panic'

function getPhase(fraction: number): ExpressionPhase {
  if (fraction > 0.8) return 'calm'
  if (fraction > 0.6) return 'smirk'
  if (fraction > 0.4) return 'wide'
  if (fraction > 0.2) return 'shocked'
  return 'panic'
}

// Ring, border and badge colour per phase: teal while calm, gold, then
// coral as time runs out.
const PHASE_COLOR: Record<ExpressionPhase, string> = {
  calm: '#4eb6c3',
  smirk: '#4eb6c3',
  wide: '#e4c642',
  shocked: '#ea6a47',
  panic: '#ea6a47',
}

const PHASE_LABEL: Record<ExpressionPhase, string> = {
  calm: 'Take your time...',
  smirk: 'Tick tock!',
  wide: 'Better hurry!',
  shocked: "Time's almost up!",
  panic: 'PANIC MODE!',
}

export default function DynamicHostAvatar({
  durationSeconds,
  isRunning,
  onTimeout,
  resetKey,
}: DynamicHostAvatarProps) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setRemaining(durationSeconds)
    const video = videoRef.current
    if (video) {
      video.currentTime = 0
      void video.play().catch(() => {})
    }
  }, [resetKey, durationSeconds])

  useEffect(() => {
    if (!isRunning) return
    if (remaining <= 0) {
      onTimeoutRef.current()
      return
    }
    const id = window.setTimeout(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => window.clearTimeout(id)
  }, [isRunning, remaining])

  useEffect(() => {
    if (isRunning && remaining > 0 && remaining <= 5) {
      playTick()
    }
  }, [isRunning, remaining])

  const fraction = Math.max(0, remaining / durationSeconds)
  const phase = useMemo(() => getPhase(fraction), [fraction])
  const isPanic = phase === 'panic'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isRunning) {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isRunning])

  const circumference = 2 * Math.PI * 46
  const dashOffset = circumference * (1 - fraction)
  const color = PHASE_COLOR[phase]

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative h-28 w-28 rounded-full sm:h-36 sm:w-36 ${isPanic ? 'animate-[shake_0.25s_ease-in-out_infinite]' : ''}`}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#4eb6c3" strokeWidth="4" opacity="0.3" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            stroke={color}
            className="transition-[stroke] duration-300"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div
          className="absolute inset-[7%] overflow-hidden rounded-full bg-brand-950 transition-shadow duration-300"
          style={{ boxShadow: `0 0 0 3px ${color}` }}
        >
          <video
            ref={videoRef}
            src="/host-video.mp4"
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
          />
        </div>
        <div
          className="headline absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-brand-900 px-3 py-0.5 text-lg font-black leading-tight text-brand-900 transition-colors duration-300 sm:text-xl"
          style={{ backgroundColor: color }}
        >
          {remaining}s
        </div>
      </div>
      <span
        className={`headline mt-3 whitespace-nowrap text-base font-extrabold sm:text-lg ${
          isPanic ? 'text-crimson-400' : 'text-cream-100'
        }`}
      >
        {PHASE_LABEL[phase]}
      </span>
    </div>
  )
}
