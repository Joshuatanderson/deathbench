import type { EditorData, Incident, IncidentInput, Lab, Model } from "./types"

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
  return request<{ authenticated: true }>("/session", {
    method: "PUT",
    body: JSON.stringify({ password }),
  })
}

export function logout() {
  return request<void>("/session", { method: "DELETE" })
}

export function getSession() {
  return request<{ authenticated: boolean }>("/session")
}

export function getLabs() {
  return request<Lab[]>("/labs")
}

export function getModels() {
  return request<Model[]>("/models")
}

export function getIncidents() {
  return request<Incident[]>("/incidents")
}

export async function getEditorData(): Promise<EditorData> {
  const [labs, models, incidents] = await Promise.all([
    getLabs(),
    getModels(),
    getIncidents(),
  ])
  return { labs, models, incidents }
}

export function createIncident(input: IncidentInput) {
  return request<Incident>("/incidents", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateIncident(id: string, input: IncidentInput) {
  return request<Incident>(`/incidents/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export function deleteIncident(id: string) {
  return request<void>(`/incidents/${id}`, { method: "DELETE" })
}
