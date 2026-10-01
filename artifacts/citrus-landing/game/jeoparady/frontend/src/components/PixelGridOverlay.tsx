import { useEffect, useState } from 'react'

const CELL_SIZE = 8

/** Dev/design aid: press Ctrl+G (or Cmd+G on Mac) to toggle a pixel grid
 * overlay across the whole page, for checking alignment/spacing by eye. */
export default function PixelGridOverlay() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(255,0,120,0.35) 1px, transparent 1px), ' +
          'linear-gradient(to bottom, rgba(255,0,120,0.35) 1px, transparent 1px), ' +
          'linear-gradient(to right, rgba(255,0,120,0.12) 1px, transparent 1px), ' +
          'linear-gradient(to bottom, rgba(255,0,120,0.12) 1px, transparent 1px)',
        backgroundSize: `${CELL_SIZE * 10}px ${CELL_SIZE * 10}px, ${CELL_SIZE * 10}px ${CELL_SIZE * 10}px, ${CELL_SIZE}px ${CELL_SIZE}px, ${CELL_SIZE}px ${CELL_SIZE}px`,
      }}
    >
      <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
        Grid: {CELL_SIZE}px (Ctrl+G to hide)
      </span>
    </div>
  )
}
