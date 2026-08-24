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
const emptyDraft: IncidentInput = {
  title: "",
  link: "",
  labId: "",
  modelId: "",
  victimCount: 1,
  verdict: "resolution-pending",
  evidenceClass: "C",
  pathway: "",
  transcriptStatus: "none",
  transcriptLink: "",
  reasoning: "",
}
const selectClassName =
  "h-10 w-full rounded-none border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"

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
    setDraft({
      title: incident.title,
      link: incident.link,
      labId: String(incident.labId),
      modelId: String(incident.modelId),
      victimCount: incident.victimCount,
      verdict: incident.verdict,
      evidenceClass: incident.evidenceClass,
      pathway: incident.pathway,
      transcriptStatus: incident.transcriptStatus,
      transcriptLink: incident.transcriptLink,
      reasoning: incident.reasoning,
    })
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
              Track the verdict separately from evidence strength. Cases remain resolution pending until
              stronger records support inclusion or exclusion.
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
                <Label htmlFor="title">Incident title</Label>
                <Input
                  id="title"
                  maxLength={200}
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  required
                />
              </div>
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
                  className={selectClassName}
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
                  className={selectClassName}
                  value={draft.modelId}
                  onChange={(event) => setDraft({ ...draft, modelId: event.target.value })}
                  disabled={!draft.labId}
                  required
                >
                  <option value="">Select a model</option>
                  {availableModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="victim-count">Deaths in this incident</Label>
                <Input
                  id="victim-count"
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={draft.victimCount}
                  onChange={(event) => setDraft({ ...draft, victimCount: Number(event.target.value) })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="verdict">Verdict</Label>
                <select
                  id="verdict"
                  className={selectClassName}
                  value={draft.verdict}
                  onChange={(event) => setDraft({ ...draft, verdict: event.target.value as IncidentInput["verdict"] })}
                  required
                >
                  <option value="excluded">Excluded</option>
                  <option value="included">Included</option>
                  <option value="resolution-pending">Resolution pending</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="evidence-class">Evidence class</Label>
                <select
                  id="evidence-class"
                  className={selectClassName}
                  value={draft.evidenceClass}
                  onChange={(event) => setDraft({ ...draft, evidenceClass: event.target.value as IncidentInput["evidenceClass"] })}
                  required
                >
                  <option value="A">A — authenticated / adjudicated</option>
                  <option value="B">B — substantiated allegation</option>
                  <option value="C">C — provisional watchlist</option>
                  <option value="X">X — excluded</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pathway">Candidate pathway</Label>
                <select
                  id="pathway"
                  className={selectClassName}
                  value={draft.pathway}
                  onChange={(event) => setDraft({ ...draft, pathway: event.target.value as IncidentInput["pathway"] })}
                >
                  <option value="">Not established</option>
                  <option value="direct-operation">Direct operation</option>
                  <option value="enabled-harm">Enabled harm</option>
                  <option value="systemic-contribution">Systemic contribution</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transcript-status">Transcript record</Label>
                <select
                  id="transcript-status"
                  className={selectClassName}
                  value={draft.transcriptStatus}
                  onChange={(event) => setDraft({ ...draft, transcriptStatus: event.target.value as IncidentInput["transcriptStatus"] })}
                  required
                >
                  <option value="none">No public transcript</option>
                  <option value="excerpts">Selected excerpts</option>
                  <option value="partial">Partial interaction</option>
                  <option value="complete-final">Complete final conversation</option>
                  <option value="sealed">Complete record sealed</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="transcript-link">Transcript / exhibit link</Label>
                <Input
                  id="transcript-link"
                  type="url"
                  placeholder="https://…"
                  value={draft.transcriptLink}
                  onChange={(event) => setDraft({ ...draft, transcriptLink: event.target.value })}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="reasoning">Decision reasoning</Label>
                <textarea
                  id="reasoning"
                  className="min-h-32 w-full resize-y rounded-none border border-input bg-transparent px-3 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"
                  maxLength={4000}
                  value={draft.reasoning}
                  onChange={(event) => setDraft({ ...draft, reasoning: event.target.value })}
                />
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
