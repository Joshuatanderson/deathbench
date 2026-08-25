import { ExternalLink, Link2, LogOut, RotateCcw, Save, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { clearReview, deleteIncident, getEditorData, getSession, login, logout, saveReview } from "./api"
import { ReviewQueue, type ReviewFilter } from "./ReviewQueue"
import type { EditorData, EvidenceClass, Incident, IncidentInput, IncidentVerdict, ReviewInput } from "./types"

const emptyData: EditorData = { incidents: [], labs: [], models: [] }
const textareaClassName =
  "min-h-32 w-full resize-y rounded-none border border-input bg-transparent px-3 py-3 text-base leading-7 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"

const verdictOptions: Array<{
  value: IncidentVerdict
  label: string
  description: string
}> = [
  {
    value: "included",
    label: "Include",
    description: "Counted publicly.",
  },
  {
    value: "excluded",
    label: "Exclude",
    description: "Fails the inclusion rules. Kept with the reason.",
  },
  {
    value: "under-review",
    label: "Under review",
    description: "Concrete evidence points at a rule, but no independent factfinder has ruled yet. Not counted publicly.",
  },
  {
    value: "resolution-pending",
    label: "Insufficient evidence",
    description: "No evidence yet for a clear in or out. Not counted publicly.",
  },
]

const verdictLabels: Record<IncidentVerdict, string> = {
  included: "Include",
  excluded: "Exclude",
  "under-review": "Under review",
  "resolution-pending": "Insufficient evidence",
}

const evidenceLabels: Record<EvidenceClass, string> = {
  A: "A · Authenticated",
  B: "B · Substantiated",
  C: "C · Unconfirmed",
  X: "X · Excluded",
}

type ReviewDraft = {
  verdict: IncidentVerdict | null
  reasoning: string
}

function draftFromIncident(incident: Incident): ReviewDraft {
  return {
    verdict: incident.review?.verdict ?? null,
    reasoning: incident.review?.reasoning ?? "",
  }
}

const pathwayLabels: Record<IncidentInput["pathway"], string> = {
  "": "Not established",
  "direct-operation": "01 · Direct operation",
  "enabled-harm": "02 · Enabled harm",
  "systemic-contribution": "03 · Systemic contribution",
}

const transcriptStatusLabels: Record<IncidentInput["transcriptStatus"], string> = {
  none: "No transcript",
  excerpts: "Excerpts",
  partial: "Partial",
  "complete-final": "Final conversation",
  sealed: "Sealed",
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

function Narrative({ label, description, value }: { label: string; description?: string; value: string }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">{label}</p>
      {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      {value ? (
        <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-base leading-7 md:text-sm">{value}</p>
      ) : (
        <p className="border-l-2 border-border pl-4 text-sm text-muted-foreground">Not recorded.</p>
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
        <h1 className="font-display text-5xl tracking-[-0.05em]">Human review</h1>
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
            {submitting ? "Checking…" : "Sign in"}
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
  const [filter, setFilter] = useState<ReviewFilter>("to-review")
  const [draft, setDraft] = useState<ReviewDraft | null>(null)
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
    const selected = data.incidents.find((incident) => !incident.review) ?? data.incidents[0]
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
    return data.incidents.filter((incident) => (filter === "reviewed" ? incident.review : !incident.review))
  }, [data.incidents, filter])
  const stats = useMemo(() => {
    const toReview = data.incidents.filter((incident) => !incident.review)
    return {
      toReview: toReview.length,
      deaths: toReview.reduce((total, incident) => total + incident.victimCount, 0),
      reviewed: data.incidents.length - toReview.length,
      publicInclusions: data.incidents.filter((incident) => incident.review?.verdict === "included").length,
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
    if (!selectedId || !draft?.verdict) return
    const review: ReviewInput = { verdict: draft.verdict, reasoning: draft.reasoning }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const saved = await saveReview(selectedId, review)
      setData(await getEditorData())
      setDraft(draftFromIncident(saved))
      setMessage("Decision saved.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save decision")
    } finally {
      setSaving(false)
    }
  }

  async function clear() {
    if (!selectedId || !window.confirm("Remove your decision on this case?")) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const saved = await clearReview(selectedId)
      setData(await getEditorData())
      setDraft(draftFromIncident(saved))
      setMessage("Decision removed.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove decision")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!selectedId || !window.confirm("Delete this case? This cannot be undone.")) return
    setSaving(true)
    setError("")
    try {
      await deleteIncident(selectedId)
      setSelectedId(null)
      setDraft(null)
      setData(await getEditorData())
      setMessage("Case deleted.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete case")
    } finally {
      setSaving(false)
    }
  }

  if (authenticated === null) {
    return (
      <main className="grid min-h-svh place-items-center px-5 py-16">
        <p className="section-label" role="status">Loading…</p>
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
            <h1 className="max-w-[11ch] font-display text-5xl leading-none tracking-[-0.05em] md:text-6xl">
              Evidence before inclusion.
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">
              Agent recommendations are leads, not findings.
            </p>
          </div>
          <dl className="grid grid-cols-2 border-y border-border md:grid-cols-4">
            {[
              ["To review", stats.toReview],
              ["Deaths to review", stats.deaths],
              ["Reviewed", stats.reviewed],
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
              <h2 className="font-display text-4xl tracking-[-0.04em]">Cases</h2>
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
                <h2 className="font-display text-4xl tracking-[-0.04em]">{selected.title || "Untitled case"}</h2>
              </div>
              <Button type="button" variant="ghost" onClick={discardChanges}>
                <RotateCcw aria-hidden="true" />
                Discard changes
              </Button>
            </div>

            <div className="mt-6 border border-primary/40 bg-primary/10 px-4 py-3 text-sm leading-6">
              The homepage counts a case only when you include it. Sections 01–03 are
              agent-authored and read-only.
            </div>

            <section className="mt-10">
              <p className="section-label">01 · Facts</p>
              <dl className="mt-5 grid gap-5 md:grid-cols-2">
                <Fact label="Company" value={labName} />
                <Fact label="System" value={modelName} />
                <Fact label="Date" value={selected.deathDate} />
                <Fact label="Location" value={selected.location} />
                <Fact label="Deaths" value={String(selected.victimCount)} />
                <Fact label="Minor deaths" value={String(selected.minorVictimCount)} />
                <Fact label="Pathway" value={pathwayLabels[selected.pathway]} />
                <Fact label="Case reference" value={selected.caseReference} />
              </dl>
            </section>

            <section className="mt-12 border-t border-border pt-8">
              <p className="section-label">02 · Evidence</p>
              <div className="mt-5 grid gap-8">
                <Narrative
                  label="Alleged chain of events"
                  value={selected.claimSummary}
                />
                <Narrative
                  label="Evidence in the record"
                  description="What is verbatim, authenticated, official, independently reviewed, or only alleged."
                  value={selected.evidenceSummary}
                />
                <Narrative
                  label="Disputes and gaps"
                  description="Defense claims, alternative causes, missing logs, and limits on causal inference."
                  value={selected.counterevidence}
                />
                <dl className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2"><LinkFact label="Primary source" href={selected.link} /></div>
                  <Fact label="Transcript" value={transcriptStatusLabels[selected.transcriptStatus]} />
                  <LinkFact label="Transcript link" href={selected.transcriptLink} />
                </dl>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Other sources</p>
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
                        None recorded.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </section>

            <section className="mt-12 border-t border-border pt-8">
              <p className="section-label">03 · Agent recommendation</p>
              <dl className="mt-5 grid gap-5 md:grid-cols-2">
                <Fact label="Verdict" value={selected.agent.verdict ? verdictLabels[selected.agent.verdict] : ""} />
                <Fact label="Evidence strength" value={selected.agent.evidenceClass ? evidenceLabels[selected.agent.evidenceClass] : ""} />
              </dl>
              <div className="mt-5">
                <Narrative label="Agent reasoning" value={selected.agent.reasoning} />
              </div>
            </section>

            <fieldset className="mt-12 border-t border-border pt-8">
              <legend className="section-label">04 · Your decision</legend>
              <div className="mt-5 grid gap-6">
                <div className="grid gap-3 md:grid-cols-3">
                  {verdictOptions.map((option) => {
                    const chosen = draft.verdict === option.value
                    return (
                      <label className={`cursor-pointer border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring/50 ${chosen ? "border-primary bg-primary/10" : "border-border hover:bg-muted/35"}`} key={option.value}>
                        <input className="sr-only" type="radio" name="verdict" value={option.value} checked={chosen} onChange={() => setDraft({ ...draft, verdict: option.value })} required />
                        <span className="block font-semibold">{option.label}</span>
                        <span className="mt-2 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                      </label>
                    )
                  })}
                </div>

                <NarrativeField
                  id="reasoning"
                  label="Your reasoning"
                  description="Why the evidence meets or fails the inclusion rules."
                  value={draft.reasoning}
                  maxLength={4000}
                  required
                  onChange={(reasoning) => setDraft({ ...draft, reasoning })}
                />
                {selected.review ? (
                  <p className="text-xs text-muted-foreground">
                    Decided {new Date(selected.review.reviewedAt).toLocaleString()}.
                  </p>
                ) : null}
              </div>
            </fieldset>

            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <Button className="h-11 rounded-none px-5" type="submit" disabled={saving || !draft.verdict}>
                <Save aria-hidden="true" />
                {saving ? "Saving…" : "Save decision"}
              </Button>
              {selected.review ? (
                <Button type="button" variant="ghost" className="h-11 rounded-none" onClick={clear} disabled={saving}>
                  Remove decision
                </Button>
              ) : null}
              <Button type="button" variant="destructive" className="h-11 rounded-none" onClick={remove} disabled={saving}>
                <Trash2 aria-hidden="true" />
                Delete case
              </Button>
              {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            </div>
          </form>
          ) : (
            <div id="review-form" className="min-w-0 border-t border-border pt-6">
              <p className="text-sm leading-6 text-muted-foreground">
                Pick a case from the queue.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
