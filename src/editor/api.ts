import type { EditorData, Incident, IncidentInput } from "./types"

const API = "/api/editor"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? "Request failed")
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

export function login(password: string) {
  return request<{ ok: true }>("/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  })
}

export function logout() {
  return request<{ ok: true }>("/logout", { method: "POST" })
}

export function getSession() {
  return request<{ authenticated: boolean }>("/session")
}

export function getEditorData() {
  return request<EditorData>("/data")
}

export function createIncident(input: IncidentInput) {
  return request<Incident>("/incidents", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateIncident(id: string, input: IncidentInput) {
  return request<Incident>(`/incidents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export function deleteIncident(id: string) {
  return request<void>(`/incidents/${id}`, { method: "DELETE" })
}
