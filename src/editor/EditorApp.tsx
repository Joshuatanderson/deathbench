import {
  ExternalLink,
  FilePlus2,
  Link2,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"
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
import { ReviewQueue, type ReviewFilter } from "./ReviewQueue"
import type { EditorData, Incident, IncidentInput, SourceLink } from "./types"

const emptyData: EditorData = { incidents: [], labs: [], models: [] }
const selectClassName =
  "h-10 w-full rounded-none border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
const textareaClassName =
  "min-h-32 w-full resize-y rounded-none border border-input bg-transparent px-3 py-3 text-base leading-7 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"

const verdictOptions: Array<{
  value: IncidentInput["verdict"]
  label: string
  description: string
}> = [
  {
    value: "resolution-pending",
    label: "Keep pending",
    description: "Evidence remains unresolved. Excluded from the public company count.",
  },
  {
    value: "included",
    label: "Include",
    description: "Meets the published bar. Counted publicly only after human review is complete.",
  },
  {
    value: "excluded",
    label: "Exclude",
    description: "Fails scope, evidence, or causal standards. Preserved with the reason.",
  },
]

const reviewStateOptions: Array<{
  value: IncidentInput["reviewState"]
  label: string
  description: string
}> = [
  {
    value: "unreviewed",
    label: "Unreviewed",
    description: "A lead exists, but neither an agent nor a human has completed the evidence review.",
  },
  {
    value: "agent-recommended",
    label: "Agent recommended",
    description: "An agent assembled and assessed the record. This is not a human decision.",
  },
  {
    value: "human-reviewed",
    label: "Human reviewed",
    description: "A human checked the dossier and owns the saved verdict and reasoning.",
  },
]

function createEmptyDraft(): IncidentInput {
  return {
    title: "",
    link: "",
    labId: "",
    modelId: "",
    victimCount: 1,
    minorVictimCount: 0,
    deathDate: "",
    location: "",
    caseReference: "",
    reviewState: "unreviewed",
    verdict: "resolution-pending",
    evidenceClass: "C",
    pathway: "",
    transcriptStatus: "none",
    transcriptLink: "",
    sourceLinks: [],
    claimSummary: "",
    evidenceSummary: "",
    counterevidence: "",
    reasoning: "",
  }
}

function draftFromIncident(incident: Incident): IncidentInput {
  return {
    title: incident.title,
    link: incident.link,
    labId: String(incident.labId),
    modelId: String(incident.modelId),
    victimCount: incident.victimCount,
    minorVictimCount: incident.minorVictimCount,
    deathDate: incident.deathDate,
    location: incident.location,
    caseReference: incident.caseReference,
    reviewState: incident.reviewState,
    verdict: incident.verdict,
    evidenceClass: incident.evidenceClass,
    pathway: incident.pathway,
    transcriptStatus: incident.transcriptStatus,
    transcriptLink: incident.transcriptLink,
    sourceLinks: incident.sourceLinks.map((source) => ({ ...source })),
    claimSummary: incident.claimSummary,
    evidenceSummary: incident.evidenceSummary,
    counterevidence: incident.counterevidence,
    reasoning: incident.reasoning,
  }
}

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
        <h1 className="mt-4 font-display text-5xl tracking-[-0.05em]">Human review</h1>
        <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
          Authenticate to assess evidence and decide whether a candidate belongs in the public registry.
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
          <Button className="h-11 rounded-none" disabled={submitting} type="submit">
            {submitting ? "Checking…" : "Enter review desk"}
          </Button>
        </form>
      </section>
    </main>
  )
}

function NarrativeField({
  id,
  label,
  description,
  value,
  maxLength,
  required = false,
  onChange,
}: {
  id: string
  label: string
  description: string
  value: string
  maxLength: number
  required?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-xs leading-5 text-muted-foreground" id={`${id}-description`}>{description}</p>
      <textarea
        id={id}
        className={textareaClassName}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-description`}
        required={required}
      />
    </div>
  )
}

export default function EditorApp() {
  const [data, setData] = useState<EditorData>(emptyData)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<ReviewFilter>("agent-recommended")
  const [draft, setDraft] = useState<IncidentInput>(createEmptyDraft)
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

  useEffect(() => {
    if (creating || !data.incidents.length || selectedId) return
    const firstRecommendation = data.incidents.find(
      (incident) => incident.reviewState === "agent-recommended"
    )
    const selected = firstRecommendation ?? data.incidents[0]
    setSelectedId(selected.id)
    setDraft(draftFromIncident(selected))
  }, [creating, data.incidents, selectedId])

  const availableModels = useMemo(
    () => data.models.filter((model) => String(model.labId) === String(draft.labId)),
    [data.models, draft.labId]
  )
  const queueIncidents = useMemo(() => {
    if (filter === "all") return data.incidents
    return data.incidents.filter((incident) => incident.reviewState === filter)
  }, [data.incidents, filter])
  const stats = useMemo(() => {
    const agentRecommended = data.incidents.filter(
      (incident) => incident.reviewState === "agent-recommended"
    )
    return {
      agentRecommended: agentRecommended.length,
      deaths: agentRecommended.reduce((total, incident) => total + incident.victimCount, 0),
      unreviewed: data.incidents.filter((incident) => incident.reviewState === "unreviewed").length,
      humanReviewed: data.incidents.filter((incident) => incident.reviewState === "human-reviewed").length,
      publicInclusions: data.incidents.filter(
        (incident) => incident.reviewState === "human-reviewed" && incident.verdict === "included"
      ).length,
    }
  }, [data.incidents])

  function selectIncident(incident: Incident) {
    setCreating(false)
    setSelectedId(incident.id)
    setDraft(draftFromIncident(incident))
    setError("")
    setMessage("")
    if (window.innerWidth < 1024) {
      requestAnimationFrame(() => document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth" }))
    }
  }

  function startCandidate() {
    setCreating(true)
    setSelectedId(null)
    setDraft(createEmptyDraft())
    setError("")
    setMessage("")
    requestAnimationFrame(() => document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth" }))
  }

  function discardChanges() {
    if (creating) {
      setCreating(false)
      const firstRecommendation = data.incidents.find(
        (incident) => incident.reviewState === "agent-recommended"
      )
      const selected = firstRecommendation ?? data.incidents[0]
      if (selected) selectIncident(selected)
      return
    }
    const selected = data.incidents.find((incident) => incident.id === selectedId)
    if (selected) setDraft(draftFromIncident(selected))
    setError("")
    setMessage("")
  }

  function updateSourceLink(index: number, update: Partial<SourceLink>) {
    setDraft({
      ...draft,
      sourceLinks: draft.sourceLinks.map((source, sourceIndex) =>
        sourceIndex === index ? { ...source, ...update } : source
      ),
    })
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const saved = creating
        ? await createIncident(draft)
        : await updateIncident(selectedId as string, draft)
      setData(await getEditorData())
      setCreating(false)
      setSelectedId(saved.id)
      setDraft(draftFromIncident(saved))
      setFilter(saved.reviewState)
      setMessage(creating ? "Candidate added to review." : "Review saved.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save review")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!selectedId || !window.confirm("Delete this dossier? This cannot be undone.")) return
    setSaving(true)
    setError("")
    try {
      await deleteIncident(selectedId)
      setSelectedId(null)
      setDraft(createEmptyDraft())
      setData(await getEditorData())
      setMessage("Dossier deleted.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete dossier")
    } finally {
      setSaving(false)
    }
  }

  if (authenticated === null) {
    return (
      <main className="grid min-h-svh place-items-center px-5 py-16">
        <p className="section-label" role="status">Loading review desk…</p>
      </main>
    )
  }
  if (!authenticated) return <Login onSuccess={load} />

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <a className="flex items-center gap-3 font-semibold tracking-[-0.03em]" href="/">
            <img className="size-7 object-contain" src="/deathbench-skull-white.svg" alt="" aria-hidden="true" />
            DeathBench <span className="hidden font-normal text-muted-foreground sm:inline">/ Human review</span>
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
        <section className="grid gap-10 border-b border-border pb-12 lg:grid-cols-[1fr_1.35fr] lg:items-end">
          <div>
            <p className="section-label">Review desk</p>
            <h1 className="mt-3 max-w-[11ch] font-display text-5xl leading-none tracking-[-0.05em] md:text-6xl">
              Evidence before inclusion.
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">
              Agent recommendations are research leads, not public findings. Review the alleged chain,
              primary records, missing context, and counterevidence before owning a decision.
            </p>
          </div>
          <dl className="grid grid-cols-2 border-y border-border md:grid-cols-5">
            {[
              ["Unreviewed", stats.unreviewed],
              ["Agent dossiers", stats.agentRecommended],
              ["Deaths to review", stats.deaths],
              ["Human reviewed", stats.humanReviewed],
              ["Public inclusions", stats.publicInclusions],
            ].map(([label, value]) => (
              <div className="border-b border-border p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0" key={label}>
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
                <dd className="mt-3 font-display text-4xl tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(18rem,0.62fr)_minmax(0,1.38fr)] lg:items-start lg:gap-16">
          <aside className="lg:sticky lg:top-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="section-label">Candidate queue</p>
                <h2 className="mt-2 font-display text-4xl tracking-[-0.04em]">Dossiers</h2>
              </div>
              <Button className="h-10 rounded-none" variant="outline" onClick={startCandidate} type="button">
                <Plus aria-hidden="true" />
                New
              </Button>
            </div>
            <ReviewQueue
              incidents={queueIncidents}
              labs={data.labs}
              models={data.models}
              selectedId={selectedId}
              filter={filter}
              onFilterChange={setFilter}
              onSelect={selectIncident}
            />
          </aside>

          <form id="review-form" className="min-w-0 scroll-mt-6 border-t border-border pt-6" onSubmit={save}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-label">{creating ? "New candidate" : "Selected dossier"}</p>
                <h2 className="mt-2 font-display text-4xl tracking-[-0.04em]">
                  {creating ? "Build the record" : draft.title || "Untitled incident"}
                </h2>
              </div>
              <Button type="button" variant="ghost" onClick={discardChanges}>
                {creating ? <X aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
                {creating ? "Cancel" : "Discard changes"}
              </Button>
            </div>

            <div className="mt-6 border border-primary/40 bg-primary/10 px-4 py-3 text-sm leading-6">
              <strong>Agent recommendation ≠ human approval.</strong>{" "}
              The homepage counts a dossier only when its review state is “Human reviewed” and its verdict is “Include.”
            </div>

            <fieldset className="mt-10">
              <legend className="section-label">01 · Incident</legend>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="title">Incident title</Label>
                  <Input id="title" maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="death-date">Death date</Label>
                  <Input id="death-date" maxLength={100} placeholder="2025-07-25 or circa Aug 2025" value={draft.deathDate} onChange={(event) => setDraft({ ...draft, deathDate: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" maxLength={200} placeholder="City, state / country" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="victim-count">Deaths represented</Label>
                  <Input id="victim-count" type="number" min={1} max={100} step={1} value={draft.victimCount} onChange={(event) => setDraft({ ...draft, victimCount: Number(event.target.value) })} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minor-count">Minor deaths</Label>
                  <Input id="minor-count" type="number" min={0} max={draft.victimCount} step={1} value={draft.minorVictimCount} onChange={(event) => setDraft({ ...draft, minorVictimCount: Number(event.target.value) })} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lab">Company</Label>
                  <select id="lab" className={selectClassName} value={draft.labId} onChange={(event) => setDraft({ ...draft, labId: event.target.value, modelId: "" })} required>
                    <option value="">Select a company</option>
                    {data.labs.map((lab) => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">System / model</Label>
                  <select id="model" className={selectClassName} value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} disabled={!draft.labId} required>
                    <option value="">Select a model</option>
                    {availableModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pathway">Candidate pathway</Label>
                  <select id="pathway" className={selectClassName} value={draft.pathway} onChange={(event) => setDraft({ ...draft, pathway: event.target.value as IncidentInput["pathway"] })}>
                    <option value="">Not established</option>
                    <option value="direct-operation">01 · Direct operation</option>
                    <option value="enabled-harm">02 · Enabled harm</option>
                    <option value="systemic-contribution">03 · Systemic contribution</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="case-reference">Court / official record</Label>
                  <Input id="case-reference" maxLength={300} placeholder="Case name, court, docket" value={draft.caseReference} onChange={(event) => setDraft({ ...draft, caseReference: event.target.value })} />
                </div>
              </div>
            </fieldset>

            <fieldset className="mt-12 border-t border-border pt-8">
              <legend className="section-label">02 · Evidence</legend>
              <div className="mt-5 grid gap-8">
                <NarrativeField
                  id="claim-summary"
                  label="Alleged chain of events"
                  description="State what allegedly happened and the proposed system-to-death mechanism. Attribute contested claims."
                  value={draft.claimSummary}
                  maxLength={4000}
                  onChange={(claimSummary) => setDraft({ ...draft, claimSummary })}
                />
                <NarrativeField
                  id="evidence-summary"
                  label="Evidence in the record"
                  description="Identify what is verbatim, authenticated, official, independently reviewed, or merely quoted in a complaint."
                  value={draft.evidenceSummary}
                  maxLength={6000}
                  onChange={(evidenceSummary) => setDraft({ ...draft, evidenceSummary })}
                />
                <NarrativeField
                  id="counterevidence"
                  label="Disputes, confounders, and missing evidence"
                  description="Record defense claims, alternative causes, missing logs, settlement posture, and limits on causal inference."
                  value={draft.counterevidence}
                  maxLength={4000}
                  onChange={(counterevidence) => setDraft({ ...draft, counterevidence })}
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="primary-source">Primary source / filing</Label>
                    <div className="flex gap-2">
                      <Input id="primary-source" type="url" placeholder="https://…" value={draft.link} onChange={(event) => setDraft({ ...draft, link: event.target.value })} required />
                      {draft.link ? (
                        <Button className="size-10 rounded-none" size="icon" variant="outline" nativeButton={false} render={<a href={draft.link} target="_blank" rel="noreferrer" />} aria-label="Open primary source">
                          <ExternalLink aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="transcript-status">Conversation record</Label>
                    <select id="transcript-status" className={selectClassName} value={draft.transcriptStatus} onChange={(event) => setDraft({ ...draft, transcriptStatus: event.target.value as IncidentInput["transcriptStatus"] })} required>
                      <option value="none">No public transcript</option>
                      <option value="excerpts">Selected excerpts</option>
                      <option value="partial">Partial interaction</option>
                      <option value="complete-final">Complete final conversation</option>
                      <option value="sealed">Complete record sealed</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="transcript-link">Transcript / exhibit link</Label>
                    <div className="flex gap-2">
                      <Input id="transcript-link" type="url" placeholder="https://…" value={draft.transcriptLink} onChange={(event) => setDraft({ ...draft, transcriptLink: event.target.value })} />
                      {draft.transcriptLink ? (
                        <Button className="size-10 rounded-none" size="icon" variant="outline" nativeButton={false} render={<a href={draft.transcriptLink} target="_blank" rel="noreferrer" />} aria-label="Open transcript or exhibit">
                          <ExternalLink aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <Label>Additional evidence links</Label>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">Dockets, orders, official findings, defense filings, and independent reporting.</p>
                    </div>
                    <Button
                      className="h-10 rounded-none"
                      type="button"
                      variant="outline"
                      disabled={draft.sourceLinks.length >= 12}
                      onClick={() => setDraft({ ...draft, sourceLinks: [...draft.sourceLinks, { label: "", url: "" }] })}
                    >
                      <Plus aria-hidden="true" />
                      Add link
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {draft.sourceLinks.length ? draft.sourceLinks.map((source, index) => (
                      <div className="grid gap-2 border-t border-border pt-3 md:grid-cols-[0.7fr_1.3fr_2.5rem_2.5rem]" key={`${index}-${source.url}`}>
                        <Input aria-label={`Evidence link ${index + 1} label`} maxLength={100} placeholder="Label" value={source.label} onChange={(event) => updateSourceLink(index, { label: event.target.value })} required />
                        <Input aria-label={`Evidence link ${index + 1} URL`} type="url" placeholder="https://…" value={source.url} onChange={(event) => updateSourceLink(index, { url: event.target.value })} required />
                        {source.url ? (
                          <Button className="size-10 rounded-none" size="icon" variant="outline" nativeButton={false} render={<a href={source.url} target="_blank" rel="noreferrer" />} aria-label={`Open evidence link ${index + 1}`}>
                            <ExternalLink aria-hidden="true" />
                          </Button>
                        ) : <span className="hidden size-10 md:block" aria-hidden="true" />}
                        <Button className="size-10 rounded-none" type="button" size="icon" variant="ghost" aria-label={`Remove evidence link ${index + 1}`} onClick={() => setDraft({ ...draft, sourceLinks: draft.sourceLinks.filter((_, sourceIndex) => sourceIndex !== index) })}>
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    )) : (
                      <div className="flex items-center gap-3 border-t border-border py-5 text-sm text-muted-foreground">
                        <Link2 className="size-4" aria-hidden="true" />
                        No additional evidence links recorded.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="mt-12 border-t border-border pt-8">
              <legend className="section-label">03 · Human decision</legend>
              <div className="mt-5 grid gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em]">Review state</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {reviewStateOptions.map((option) => {
                      const selected = draft.reviewState === option.value
                      return (
                        <label className={`cursor-pointer border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring/50 ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/35"}`} key={option.value}>
                          <input className="sr-only" type="radio" name="review-state" value={option.value} checked={selected} onChange={() => setDraft({ ...draft, reviewState: option.value })} />
                          <span className="block font-semibold">{option.label}</span>
                          <span className="mt-2 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                          {selected ? <span className="mt-3 block text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-primary">Selected</span> : null}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-2 md:max-w-sm">
                  <Label htmlFor="evidence-class">Evidence class</Label>
                  <select id="evidence-class" className={selectClassName} value={draft.evidenceClass} onChange={(event) => setDraft({ ...draft, evidenceClass: event.target.value as IncidentInput["evidenceClass"] })} required>
                    <option value="A">A — authenticated / adjudicated</option>
                    <option value="B">B — substantiated allegation</option>
                    <option value="C">C — provisional watchlist</option>
                    <option value="X">X — excluded</option>
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em]">Verdict</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {verdictOptions.map((option) => {
                      const selected = draft.verdict === option.value
                      return (
                        <label className={`cursor-pointer border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring/50 ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/35"}`} key={option.value}>
                          <input className="sr-only" type="radio" name="verdict" value={option.value} checked={selected} onChange={() => setDraft({ ...draft, verdict: option.value })} />
                          <span className="block font-semibold">{option.label}</span>
                          <span className="mt-2 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                          {selected ? <span className="mt-3 block text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-primary">Selected</span> : null}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <NarrativeField
                  id="reasoning"
                  label={draft.reviewState === "agent-recommended" ? "Agent recommendation reasoning" : draft.verdict === "resolution-pending" ? "Review notes" : "Decision reasoning"}
                  description={draft.reviewState === "agent-recommended" ? "Preserve the agent’s recommendation, open questions, and next evidence trigger. A human may accept, reject, or defer it." : draft.verdict === "resolution-pending" ? "Record the evidence still needed and the next review trigger." : "Explain how the evidence satisfies or fails the published standard."}
                  value={draft.reasoning}
                  maxLength={4000}
                  required={draft.reviewState === "human-reviewed"}
                  onChange={(reasoning) => setDraft({ ...draft, reasoning })}
                />
              </div>
            </fieldset>

            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <Button className="h-11 rounded-none px-5" type="submit" disabled={saving || (!creating && !selectedId)}>
                {creating ? <FilePlus2 aria-hidden="true" /> : <Save aria-hidden="true" />}
                {saving ? "Saving…" : creating ? "Add to review" : "Save review"}
              </Button>
              {!creating && selectedId ? (
                <Button type="button" variant="destructive" className="h-11 rounded-none" onClick={remove} disabled={saving}>
                  <Trash2 aria-hidden="true" />
                  Delete dossier
                </Button>
              ) : null}
              {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
