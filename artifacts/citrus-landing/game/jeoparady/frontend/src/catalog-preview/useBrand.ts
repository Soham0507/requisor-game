import { useEffect, useState } from 'react'

type Brand = {
  brandName: string; heading: string; tagline: string; logoUrl: string;
  bgUrl: string; fontUrl: string; logoSize: number;
  primaryColor: string; secondaryColor: string; accentColor: string;
  headingSize: number; headingColor: string; brandNameSize: number; brandNameColor: string;
}
const defaults: Brand = {
  brandName: 'Your Brand', heading: 'Jeopardy', tagline: 'Pick a category, beat the clock, and build your score.',
  logoUrl: '', bgUrl: '', fontUrl: '', logoSize: 48,
  primaryColor: '#00384f', secondaryColor: '#f0cf3a', accentColor: '#4aa7bd',
  headingSize: 48, headingColor: '#00384f', brandNameSize: 16, brandNameColor: '#ffffff',
}
declare global { interface Window { __BRAND__?: Brand } }

function safeUrl(value: unknown): string | undefined {
  if (value === '' || value === null) return ''
  if (typeof value !== 'string' || value.length > 15_000_000 || /["'<>\\\s]/.test(value)) return undefined
  if (/^data:(image\/(?:png|jpe?g|webp|gif|svg\+xml)|font\/[\w.-]+|application\/(?:font-woff|x-font-ttf|x-font-opentype|octet-stream));base64,[a-z0-9+/=]+$/i.test(value)) return value
  try {
    const url = new URL(value, window.location.origin)
    return /^https?:$/.test(url.protocol) ? url.href : undefined
  } catch { return undefined }
}

function merge(current: Brand, input: unknown): Brand {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return current
  const data = input as Record<string, unknown>, next = { ...current }
  for (const field of ['brandName', 'heading', 'tagline'] as const) {
    if (typeof data[field] === 'string') next[field] = data[field].trim().slice(0, field === 'tagline' ? 500 : 160) || defaults[field]
  }
  for (const field of ['primaryColor', 'secondaryColor', 'accentColor', 'headingColor', 'brandNameColor'] as const) {
    if (typeof data[field] === 'string' && /^#[0-9a-f]{6}$/i.test(data[field])) next[field] = data[field]
  }
  for (const field of ['logoUrl', 'bgUrl', 'fontUrl'] as const) {
    const url = safeUrl(data[field])
    if (url !== undefined) next[field] = url
  }
  for (const field of ['logoSize', 'headingSize', 'brandNameSize'] as const) {
    const size = typeof data[field] === 'number' || typeof data[field] === 'string' ? Number(data[field]) : NaN
    if (Number.isFinite(size) && size > 0) next[field] = Math.max(field === 'logoSize' ? 20 : 8, Math.min(100, size))
  }
  return next
}

export function useBrand() {
  const [brand, setBrand] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const initial = Object.fromEntries(params)
    initial.logoUrl = params.get('logo') || ''
    initial.bgUrl = params.get('bgUrl') || ''
    return merge(defaults, initial)
  })
  const [fontError, setFontError] = useState(false)
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== 'CDH_BRAND_UPDATE') return
      setBrand((current) => merge(current, event.data.theme))
    }
    window.addEventListener('message', receive)
    if (window.parent !== window) window.parent.postMessage({ type: 'CDH_BRAND_READY' }, window.location.origin)
    return () => window.removeEventListener('message', receive)
  }, [])
  useEffect(() => {
    window.__BRAND__ = brand
    document.title = `${brand.heading} — ${brand.brandName}`
    const style = document.documentElement.style
    style.setProperty('--color-brand-900', brand.primaryColor)
    style.setProperty('--color-brand-950', brand.primaryColor)
    style.setProperty('--color-crimson-600', brand.primaryColor)
    style.setProperty('--color-gold-500', brand.secondaryColor)
    style.setProperty('--color-brand-500', brand.accentColor)
  }, [brand])
  useEffect(() => {
    let live = true
    const style = document.documentElement.style
    style.removeProperty('--font-sans'); style.removeProperty('--font-display')
    setFontError(false)
    if (brand.fontUrl && typeof FontFace !== 'undefined') {
      const face = new FontFace('JeopardyCustom', `url("${brand.fontUrl}")`)
      face.load().then((loaded) => {
        if (!live) return
        document.fonts.add(loaded)
        style.setProperty('--font-sans', 'JeopardyCustom, system-ui, sans-serif')
        style.setProperty('--font-display', 'JeopardyCustom, system-ui, sans-serif')
      }).catch(() => { if (live) setFontError(true) })
      return () => { live = false; document.fonts.delete(face) }
    }
    return () => { live = false }
  }, [brand.fontUrl])
  return { brand, fontError }
}
