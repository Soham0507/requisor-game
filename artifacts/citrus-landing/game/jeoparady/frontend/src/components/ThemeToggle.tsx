import type { Theme } from '../hooks/useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-cream-100 text-brand-900 transition hover:-translate-y-0.5 hover:bg-white"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M12 2.5v2.25" />
            <path d="M12 19.25v2.25" />
            <path d="M4.22 4.22l1.6 1.6" />
            <path d="M18.18 18.18l1.6 1.6" />
            <path d="M2.5 12h2.25" />
            <path d="M19.25 12h2.25" />
            <path d="M4.22 19.78l1.6-1.6" />
            <path d="M18.18 5.82l1.6-1.6" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a.75.75 0 0 0-.98-.98A10 10 0 1 0 21.48 15.48a.75.75 0 0 0-.98-.98Z" />
        </svg>
      )}
    </button>
  )
}
