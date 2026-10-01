import type {
  AdminCategoryDetail,
  AdminOverview,
  GameBoardResponse,
  LeaderboardEntry,
  Player,
  PlayerAnswerDetail,
  PlayerSummary,
  QuestionPatch,
  VerifyRequest,
  VerifyResponse,
} from '../types/game'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

/** A category's image_url may be a backend upload path (needs API_BASE
 * prepended), or an already-absolute frontend-public / external URL. */
export function resolveImageUrl(url: string): string {
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url
}

export async function fetchGameBoard(): Promise<GameBoardResponse> {
  const res = await fetch(`${API_BASE}/api/v1/game/board`)
  if (!res.ok) {
    throw new Error(`Failed to load game board: ${res.status}`)
  }
  return res.json()
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/api/v1/game/leaderboard`)
  if (!res.ok) {
    throw new Error(`Failed to load leaderboard: ${res.status}`)
  }
  return res.json()
}

export async function verifyAnswer(payload: VerifyRequest): Promise<VerifyResponse> {
  const res = await fetch(`${API_BASE}/api/v1/game/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to verify answer: ${res.status}`)
  }
  return res.json()
}

async function authRequest(path: 'register' | 'login', username: string, password: string): Promise<Player> {
  const res = await fetch(`${API_BASE}/api/v1/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

export function registerPlayer(username: string, password: string): Promise<Player> {
  return authRequest('register', username, password)
}

export function loginPlayer(username: string, password: string): Promise<Player> {
  return authRequest('login', username, password)
}

export async function recordGameResult(playerId: number, finalBalance: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/players/${playerId}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ final_balance: finalBalance }),
  })
  if (!res.ok) {
    throw new Error(`Failed to record game result: ${res.status}`)
  }
}

async function adminGet<T>(path: string, adminId: number, params?: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ admin_id: String(adminId), ...params })
  const res = await fetch(`${API_BASE}/api/v1/admin/${path}?${qs.toString()}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

async function adminRequest<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  adminId: number,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1/admin/${path}?admin_id=${adminId}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    throw new Error(errorBody?.detail ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function fetchAdminOverview(adminId: number): Promise<AdminOverview> {
  return adminGet<AdminOverview>('overview', adminId)
}

export function fetchAdminPlayers(adminId: number): Promise<PlayerSummary[]> {
  return adminGet<PlayerSummary[]>('players', adminId)
}

export function fetchPlayerAnswers(
  adminId: number,
  playerId: number,
  filters?: { start?: string; end?: string },
): Promise<PlayerAnswerDetail[]> {
  const params: Record<string, string> = {}
  if (filters?.start) params.start = filters.start
  if (filters?.end) params.end = filters.end
  return adminGet<PlayerAnswerDetail[]>(`players/${playerId}/answers`, adminId, params)
}

export function fetchAdminCategories(adminId: number): Promise<AdminCategoryDetail[]> {
  return adminGet<AdminCategoryDetail[]>('categories', adminId)
}

export function createAdminCategory(adminId: number, title: string): Promise<AdminCategoryDetail> {
  return adminRequest<AdminCategoryDetail>('POST', 'categories', adminId, { title })
}

export function updateAdminCategory(
  adminId: number,
  categoryId: string,
  patch: { title?: string; image_url?: string },
): Promise<AdminCategoryDetail> {
  return adminRequest<AdminCategoryDetail>('PATCH', `categories/${categoryId}`, adminId, patch)
}

export function deleteAdminCategory(adminId: number, categoryId: string): Promise<void> {
  return adminRequest<void>('DELETE', `categories/${categoryId}`, adminId)
}

export function updateAdminQuestion(
  adminId: number,
  categoryId: string,
  questionId: string,
  patch: QuestionPatch,
): Promise<AdminCategoryDetail> {
  return adminRequest<AdminCategoryDetail>('PATCH', `categories/${categoryId}/questions/${questionId}`, adminId, patch)
}

export async function uploadAdminCategoryImage(
  adminId: number,
  categoryId: string,
  file: File,
): Promise<AdminCategoryDetail> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/api/v1/admin/categories/${categoryId}/image?admin_id=${adminId}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    throw new Error(errorBody?.detail ?? `Request failed: ${res.status}`)
  }
  return res.json()
}
