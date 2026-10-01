import { useEffect, useState, type CSSProperties } from 'react'
import { fetchLeaderboard } from '../lib/api'
import type { LeaderboardEntry } from '../types/game'

interface LeaderboardProps {
  /** Change this value (e.g. when the current game finishes) to re-fetch. */
  refreshOn?: unknown
}

export default function Leaderboard({ refreshOn }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)

  useEffect(() => {
    fetchLeaderboard()
      .then(setEntries)
      .catch(() => setEntries([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshOn])

  if (!entries || entries.length === 0) return null

  // Duplicated back-to-back so the CSS animation can loop seamlessly; the
  // highest balance (already first from the API) is what's visible first.
  const track = [...entries, ...entries]

  return (
    <div className="relative flex h-11 shrink-0 items-center overflow-hidden bg-ink-900 lg:h-[3.25rem]">
      <div className="absolute inset-y-0 left-0 z-10 flex items-center bg-ink-900 pl-4 pr-3 sm:pl-6 lg:pl-10">
        <span className="headline rounded-full bg-gold-500 px-3.5 py-1 text-lg font-black leading-none text-ink-900 lg:text-xl">
          Leaderboard
        </span>
      </div>
      <div
        className="leaderboard-track flex w-max items-center gap-7 pl-4"
        style={{ '--leaderboard-duration': `${Math.max(entries.length * 4, 10)}s` } as CSSProperties}
      >
        {track.map((entry, i) => {
          const rank = i % entries.length
          return (
            <div key={i} className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold lg:text-[0.95rem]">
              <span className="font-black text-gold-500">{rank + 1}</span>
              <span className="text-cream-100">{entry.username}</span>
              <span className="text-cream-400">${entry.balance.toLocaleString()}</span>
              <span className="ml-5 h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden="true" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
