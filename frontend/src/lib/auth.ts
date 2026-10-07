/**
 * auth.ts — JWT token storage + helpers
 * Re-exports canonical auth helpers from @/lib/data for backward compatibility and clean architecture.
 */

import { getToken, setToken, clearToken, getSavedUser } from "./data";

export { getToken, clearToken };

export function saveToken(token: string): void {
  setToken(token);
}

export function saveUser(user: object): void {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("cp_user", JSON.stringify(user));
  }
}

export function getUser<T = any>(): T | null {
  return getSavedUser() as T | null;
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/** Returns { Authorization: "Bearer <token>" } or {} */
export function authHeader(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
