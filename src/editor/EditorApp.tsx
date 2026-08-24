import { FilePlus2, LogOut, Save, ShieldCheck, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  createIncident,
  deleteIncident,
  getEditorData,
  getSession,
  login,
  logout,
  updateIncident,
} from "./api"
import { IncidentTable } from "./IncidentTable"
import type { EditorData, Incident, IncidentInput } from "./types"

const emptyData: EditorData = { incidents: [], labs: [], models: [] }
const emptyDraft: IncidentInput = { link: "", labId: "", modelId: "" }

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await login(password)
      onSuccess()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center px-5 py-16">
      <section className="w-full max-w-md border-t border-border pt-8">
        <p className="section-label flex items-center gap-2">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Restricted access
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-[-0.05em]">Registry editor</h1>
        <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
          Authenticate to edit the private working dataset. Credentials are checked by the server.
        </p>
        <form className="mt-10 grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <Button className="h-10 rounded-none" disabled={submitting} type="submit">
            {submitting ? "Checking…" : "Enter editor"}
          </Button>
        </form>
      </section>
    </main>
  )
}

export default function EditorApp() {
  const [data, setData] = useState<EditorData>(emptyData)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<IncidentInput>(emptyDraft)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const session = await getSession()
      if (!session.authenticated) {
        setAuthenticated(false)
        return
      }
      setData(await getEditorData())
      setAuthenticated(true)
    } catch {
      setAuthenticated(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const availableModels = useMemo(
    () => data.models.filter((model) => String(model.labId) === String(draft.labId)),
    [data.models, draft.labId]
  )

  function startEdit(incident: Incident) {
    setEditingId(incident.id)
    setDraft({ link: incident.link, labId: String(incident.labId), modelId: String(incident.modelId) })
    setError("")
    setMessage("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function resetForm() {
    setEditingId(null)
    setDraft(emptyDraft)
    setError("")
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")
    try {
      if (editingId) {
        await updateIncident(editingId, draft)
        setMessage("Incident updated.")
      } else {
        await createIncident(draft)
        setMessage("Incident added.")
      }
      resetForm()
      setData(await getEditorData())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save incident")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!editingId || !window.confirm("Delete this incident? This cannot be undone.")) return
    setSaving(true)
    setError("")
    try {
      await deleteIncident(editingId)
      resetForm()
      setData(await getEditorData())
      setMessage("Incident deleted.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete incident")
    } finally {
      setSaving(false)
    }
  }

  if (authenticated === null) {
    return (
      <main className="grid min-h-svh place-items-center px-5 py-16">
        <p className="section-label" role="status">
          Loading registry editor…
        </p>
      </main>
    )
  }
  if (!authenticated) return <Login onSuccess={load} />

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <a className="flex items-center gap-3 font-semibold tracking-[-0.03em]" href="/">
            <img
              className="size-7 object-contain"
              src="/deathbench-skull-white.svg"
              alt=""
              aria-hidden="true"
            />
            DeathBench <span className="font-normal text-muted-foreground">/ Editor</span>
          </a>
          <Button
            variant="ghost"
            onClick={async () => {
              await logout()
              setAuthenticated(false)
            }}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-12 md:px-8 lg:px-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(18rem,0.55fr)_minmax(0,1.45fr)] lg:gap-16">
          <section>
            <p className="section-label">Working dataset</p>
            <h1 className="mt-3 font-display text-5xl tracking-[-0.05em] md:text-6xl">Incident editor</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
              Every record requires a source, responsible lab, and model. Changes write directly to Neon.
            </p>
          </section>

          <form className="border-t border-border pt-6" onSubmit={save}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-3xl tracking-[-0.035em]">
                {editingId ? "Edit incident" : "Add incident"}
              </h2>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  <X aria-hidden="true" />
                  Cancel
                </Button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="link">Source link</Label>
                <Input
                  id="link"
                  type="url"
                  placeholder="https://…"
                  value={draft.link}
                  onChange={(event) => setDraft({ ...draft, link: event.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lab">Lab</Label>
                <select
                  id="lab"
                  className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={draft.labId}
                  onChange={(event) => setDraft({ ...draft, labId: event.target.value, modelId: "" })}
                  required
                >
                  <option value="">Select a lab</option>
                  {data.labs.map((lab) => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <select
                  id="model"
                  className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                  value={draft.modelId}
                  onChange={(event) => setDraft({ ...draft, modelId: event.target.value })}
                  disabled={!draft.labId}
                  required
                >
                  <option value="">Select a model</option>
                  {availableModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button className="h-10 rounded-none px-4" type="submit" disabled={saving}>
                {editingId ? <Save aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
                {saving ? "Saving…" : editingId ? "Save changes" : "Add incident"}
              </Button>
              {editingId ? (
                <Button type="button" variant="destructive" className="h-10 rounded-none" onClick={remove} disabled={saving}>
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              ) : null}
              {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            </div>
          </form>
        </div>

        <section className="mt-16 lg:mt-20">
          <div className="mb-5 flex items-end justify-between gap-6">
            <div>
              <p className="section-label">Registry</p>
              <h2 className="mt-2 font-display text-4xl tracking-[-0.04em]">Incidents</h2>
            </div>
            <p className="text-sm text-muted-foreground">{data.incidents.length} total</p>
          </div>
          <IncidentTable incidents={data.incidents} labs={data.labs} models={data.models} onEdit={startEdit} />
        </section>
      </main>
    </div>
  )
}
