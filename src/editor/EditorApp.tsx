import { ExternalLink, Link2, LogOut, RotateCcw, Save, ShieldCheck, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { deleteIncident, getEditorData, getSession, login, logout, updateIncident } from "./api"
import { ReviewQueue, type ReviewFilter } from "./ReviewQueue"
import type { EditorData, Incident, IncidentInput } from "./types"

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

const pathwayLabels: Record<IncidentInput["pathway"], string> = {
  "": "Not established",
  "direct-operation": "01 · Direct operation",
  "enabled-harm": "02 · Enabled harm",
  "systemic-contribution": "03 · Systemic contribution",
}

const transcriptStatusLabels: Record<IncidentInput["transcriptStatus"], string> = {
  none: "No public transcript",
  excerpts: "Selected excerpts",
  partial: "Partial interaction",
  "complete-final": "Complete final conversation",
  sealed: "Complete record sealed",
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-6">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

function LinkFact({ label, href }: { label: string; href: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-6">
        {href ? (
          <a className="inline-flex items-center gap-1.5 break-all underline underline-offset-4 hover:text-primary" href={href} target="_blank" rel="noreferrer">
            {href}
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
          </a>
        ) : <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  )
}

function Narrative({ label, description, value }: { label: string; description: string; value: string }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      {value ? (
        <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-base leading-7 md:text-sm">{value}</p>
      ) : (
        <p className="border-l-2 border-border pl-4 text-sm text-muted-foreground">Not recorded by the agent.</p>
      )}
    </div>
  )
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
  const [filter, setFilter] = useState<ReviewFilter>("agent-recommended")
  const [draft, setDraft] = useState<IncidentInput | null>(null)
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
    if (!data.incidents.length || selectedId) return
    const firstRecommendation = data.incidents.find(
      (incident) => incident.reviewState === "agent-recommended"
    )
    const selected = firstRecommendation ?? data.incidents[0]
    setSelectedId(selected.id)
    setDraft(draftFromIncident(selected))
  }, [data.incidents, selectedId])

  const selected = useMemo(
    () => data.incidents.find((incident) => incident.id === selectedId) ?? null,
    [data.incidents, selectedId]
  )
  const labName = data.labs.find((lab) => String(lab.id) === String(selected?.labId))?.name ?? "Unknown company"
  const modelName = data.models.find((model) => String(model.id) === String(selected?.modelId))?.name ?? "Unknown model"
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
    setSelectedId(incident.id)
    setDraft(draftFromIncident(incident))
    setError("")
    setMessage("")
    if (window.innerWidth < 1024) {
      requestAnimationFrame(() => document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth" }))
    }
  }

  function discardChanges() {
    if (selected) setDraft(draftFromIncident(selected))
    setError("")
    setMessage("")
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || !draft) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const saved = await updateIncident(selectedId, draft)
      setData(await getEditorData())
      setSelectedId(saved.id)
      setDraft(draftFromIncident(saved))
      setFilter(saved.reviewState)
      setMessage("Review saved.")
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
      setDraft(null)
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
            <div className="mb-5">
              <p className="section-label">Candidate queue</p>
              <h2 className="mt-2 font-display text-4xl tracking-[-0.04em]">Dossiers</h2>
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

          {selected && draft ? (
          <form id="review-form" className="min-w-0 scroll-mt-6 border-t border-border pt-6" onSubmit={save}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-label">Selected dossier</p>
                <h2 className="mt-2 font-display text-4xl tracking-[-0.04em]">{selected.title || "Untitled incident"}</h2>
              </div>
              <Button type="button" variant="ghost" onClick={discardChanges}>
                <RotateCcw aria-hidden="true" />
                Discard changes
              </Button>
            </div>

            <div className="mt-6 border border-primary/40 bg-primary/10 px-4 py-3 text-sm leading-6">
              <strong>Agent recommendation ≠ human approval.</strong>{" "}
              The homepage counts a dossier only when its review state is “Human reviewed” and its verdict is “Include.”
              Sections 01 and 02 are agent-authored and read-only here.
            </div>

            <section className="mt-10">
              <p className="section-label">01 · Incident</p>
              <dl className="mt-5 grid gap-5 md:grid-cols-2">
                <Fact label="Company" value={labName} />
                <Fact label="System / model" value={modelName} />
                <Fact label="Death date" value={selected.deathDate} />
                <Fact label="Location" value={selected.location} />
                <Fact label="Deaths represented" value={String(selected.victimCount)} />
                <Fact label="Minor deaths" value={String(selected.minorVictimCount)} />
                <Fact label="Candidate pathway" value={pathwayLabels[selected.pathway]} />
                <Fact label="Court / official record" value={selected.caseReference} />
              </dl>
            </section>

            <section className="mt-12 border-t border-border pt-8">
              <p className="section-label">02 · Evidence</p>
              <div className="mt-5 grid gap-8">
                <Narrative
                  label="Alleged chain of events"
                  description="What allegedly happened and the proposed system-to-death mechanism."
                  value={selected.claimSummary}
                />
                <Narrative
                  label="Evidence in the record"
                  description="What is verbatim, authenticated, official, independently reviewed, or merely quoted in a complaint."
                  value={selected.evidenceSummary}
                />
                <Narrative
                  label="Disputes, confounders, and missing evidence"
                  description="Defense claims, alternative causes, missing logs, settlement posture, and limits on causal inference."
                  value={selected.counterevidence}
                />
                <dl className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2"><LinkFact label="Primary source / filing" href={selected.link} /></div>
                  <Fact label="Conversation record" value={transcriptStatusLabels[selected.transcriptStatus]} />
                  <LinkFact label="Transcript / exhibit link" href={selected.transcriptLink} />
                </dl>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Additional evidence links</p>
                  <ul className="mt-3 grid gap-2">
                    {selected.sourceLinks.length ? selected.sourceLinks.map((source, index) => (
                      <li className="border-t border-border pt-2 text-sm leading-6" key={`${index}-${source.url}`}>
                        <a className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-primary" href={source.url} target="_blank" rel="noreferrer">
                          {source.label}
                          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                        </a>
                        <span className="ml-2 break-all text-xs text-muted-foreground">{source.url}</span>
                      </li>
                    )) : (
                      <li className="flex items-center gap-3 border-t border-border py-5 text-sm text-muted-foreground">
                        <Link2 className="size-4" aria-hidden="true" />
                        No additional evidence links recorded.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </section>

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
              <Button className="h-11 rounded-none px-5" type="submit" disabled={saving}>
                <Save aria-hidden="true" />
                {saving ? "Saving…" : "Save review"}
              </Button>
              <Button type="button" variant="destructive" className="h-11 rounded-none" onClick={remove} disabled={saving}>
                <Trash2 aria-hidden="true" />
                Delete dossier
              </Button>
              {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            </div>
          </form>
          ) : (
            <div id="review-form" className="min-w-0 border-t border-border pt-6">
              <p className="section-label">Selected dossier</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                No dossier selected. Agents add candidates through the editor API; pick one from the queue to review it.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
