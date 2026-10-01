/** Small synthesized sound-effect engine (Web Audio API oscillators) - no
 * external audio files needed. Tones are simple envelopes stacked into short
 * arpeggios/stingers for a lightweight "game show" feel. */

const MUTE_KEY = 'djtt-sound-muted'

let audioCtx: AudioContext | null = null
let muted = typeof window !== 'undefined' && window.localStorage.getItem(MUTE_KEY) === 'true'

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

export function isSoundMuted(): boolean {
  return muted
}

export function setSoundMuted(value: boolean): void {
  muted = value
  window.localStorage.setItem(MUTE_KEY, String(value))
  if (musicElement) {
    musicElement.volume = muted ? 0 : MUSIC_VOLUME
  }
}

export function toggleSoundMuted(): boolean {
  setSoundMuted(!muted)
  return muted
}

interface Tone {
  freq: number
  start: number
  duration: number
  type?: OscillatorType
  gain?: number
}

function playTones(tones: Tone[]): void {
  if (muted) return
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  for (const { freq, start, duration, type = 'sine', gain = 0.2 } of tones) {
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now + start)
    gainNode.gain.setValueAtTime(0, now + start)
    gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    osc.start(now + start)
    osc.stop(now + start + duration + 0.02)
  }
}

/** Plays a one-shot audio file (as opposed to the synthesized tones below).
 * A fresh element per call so overlapping triggers don't cut each other off. */
function playFile(src: string, volume: number): void {
  if (muted || typeof window === 'undefined') return
  const audio = new Audio(src)
  audio.volume = volume
  void audio.play().catch(() => {})
}

export function playClick(): void {
  playTones([{ freq: 700, start: 0, duration: 0.08, type: 'square', gain: 0.1 }])
}

export function playTick(): void {
  playTones([
    { freq: 880, start: 0, duration: 0.09, type: 'square', gain: 0.16 },
    { freq: 1320, start: 0.06, duration: 0.06, type: 'square', gain: 0.12 },
  ])
}

/** Plays when a correct answer credits the tile value to the player's balance. */
export function playCorrect(): void {
  playFile('/money-credit.mp3', 0.5)
}

export function playIncorrect(): void {
  playTones([
    { freq: 220, start: 0, duration: 0.18, type: 'sawtooth', gain: 0.16 },
    { freq: 164.81, start: 0.15, duration: 0.28, type: 'sawtooth', gain: 0.16 },
  ])
}

export function playTimeout(): void {
  playTones([
    { freq: 300, start: 0, duration: 0.15, type: 'sine', gain: 0.14 },
    { freq: 200, start: 0.12, duration: 0.15, type: 'sine', gain: 0.14 },
    { freq: 120, start: 0.24, duration: 0.32, type: 'sine', gain: 0.14 },
  ])
}

export function playStart(): void {
  playTones([
    { freq: 392, start: 0, duration: 0.1, type: 'triangle', gain: 0.16 },
    { freq: 523.25, start: 0.08, duration: 0.1, type: 'triangle', gain: 0.16 },
    { freq: 659.25, start: 0.16, duration: 0.14, type: 'triangle', gain: 0.18 },
    { freq: 880, start: 0.28, duration: 0.24, type: 'triangle', gain: 0.2 },
  ])
}

export function playGameOver(): void {
  playTones([
    { freq: 523.25, start: 0, duration: 0.15, type: 'triangle', gain: 0.2 },
    { freq: 659.25, start: 0.14, duration: 0.15, type: 'triangle', gain: 0.2 },
    { freq: 783.99, start: 0.28, duration: 0.15, type: 'triangle', gain: 0.2 },
    { freq: 1046.5, start: 0.42, duration: 0.4, type: 'triangle', gain: 0.24 },
  ])
}

/** Subtle looping background music track. Deliberately quiet (MUSIC_VOLUME)
 * so it sits behind the SFX rather than competing with them. */
const MUSIC_VOLUME = 0.2

let musicElement: HTMLAudioElement | null = null

export function isMusicPlaying(): boolean {
  return musicElement !== null && !musicElement.paused
}

export function startBackgroundMusic(): void {
  if (typeof window === 'undefined') return
  if (!musicElement) {
    musicElement = new Audio('/bg-music.mp3')
    musicElement.loop = true
  }
  musicElement.volume = muted ? 0 : MUSIC_VOLUME
  void musicElement.play().catch(() => {
    // Autoplay was blocked - it'll retry on the next user gesture.
  })
}

export function stopBackgroundMusic(): void {
  if (!musicElement) return
  musicElement.pause()
}
