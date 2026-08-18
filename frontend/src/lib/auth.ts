/**
 * auth.ts — JWT token storage + helpers
 *
 * The token is kept in localStorage under the key `cp_token`.
 * Every authenticated request reads from here.
 */

const TOKEN_KEY = 'cp_token'
const USER_KEY  = 'cp_user'

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function saveUser(user: object): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

/** Returns { Authorization: "Bearer <token>" } or {} */
export function authHeader(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
