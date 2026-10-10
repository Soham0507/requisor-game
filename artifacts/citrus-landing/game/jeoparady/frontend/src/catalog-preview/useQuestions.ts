import { useEffect, useState } from 'react'
import { validateGameContent } from '@workspace/game-content'
import { board, setCustomQuestions } from './api'

export function useQuestions() {
  const id = new URLSearchParams(window.location.search).get('contentId')
  const [state, setState] = useState({ board, custom: false, loading: !!id, error: '', revision: 0 })
  useEffect(() => {
    let live = true
    let controller: AbortController | null = null
    const apply = (input: unknown) => {
      if (input === null) {
        setState((old) => ({ board: setCustomQuestions(null), custom: false, loading: false, error: '', revision: old.revision + 1 }))
        return
      }
      const result = validateGameContent(input, 'jeopardy')
      if (!result.ok) throw new Error(result.error)
      setState((old) => ({ board: setCustomQuestions(result.content), custom: true, loading: false, error: '', revision: old.revision + 1 }))
    }
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== 'CDH_BRAND_UPDATE') return
      if (!Object.prototype.hasOwnProperty.call(event.data.theme || {}, 'gameContent')) return
      try { apply(event.data.theme.gameContent) } catch {
        setState((old) => ({ ...old, error: 'Custom questions are invalid. Update them in the question editor.' }))
      }
    }
    window.addEventListener('message', receive)
    const load = async () => {
      if (!id) return
      controller = new AbortController()
      try {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid link')
        const response = await fetch(`/api/branding-drafts/${encodeURIComponent(id)}/content`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Load failed')
        const saved = await response.json()
        if (saved.gameSlug !== 'jeopardy' || !saved.gameContent) throw new Error('Wrong game')
        if (live) apply(saved.gameContent)
      } catch {
        if (live) setState((old) => ({ ...old, loading: false, error: 'Custom questions could not be loaded. No sample questions have been substituted. Reload to retry.' }))
      }
    }
    void load()
    // Register the question listener before asking the host for its latest content.
    if (window.parent !== window) window.parent.postMessage({ type: 'CDH_BRAND_READY' }, window.location.origin)
    return () => { live = false; controller?.abort(); window.removeEventListener('message', receive) }
  }, [id])
  return state
}
