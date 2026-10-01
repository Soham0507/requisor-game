import { useState } from 'react'
import type { Player } from '../types/game'

const STORAGE_KEY = 'djtt-player'

function getStoredPlayer(): Player | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.id === 'number' && typeof parsed?.username === 'string') {
      return parsed
    }
  } catch {
    // ignore malformed storage
  }
  return null
}

export function usePlayer() {
  const [player, setPlayerState] = useState<Player | null>(getStoredPlayer)

  function setPlayer(next: Player | null) {
    setPlayerState(next)
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  return { player, setPlayer }
}
