import { useMemo } from "react"

import type { EvidenceClass, Incident, IncidentVerdict, Lab, Model } from "./types"

export type ReviewFilter = "to-review" | "reviewed" | "all"

type ReviewQueueProps = {
  incidents: Incident[]
  labs: Lab[]
  models: Model[]
  selectedId: string | null
  filter: ReviewFilter
  onFilterChange: (filter: ReviewFilter) => void
  onSelect: (incident: Incident) => void
}

const transcriptLabels: Record<Incident["transcriptStatus"], string> = {
  none: "No transcript",
  excerpts: "Excerpts",
  partial: "Partial",
  "complete-final": "Final conversation",
  sealed: "Sealed",
}

const evidenceLabels: Record<EvidenceClass, string> = {
  A: "Authenticated",
  B: "Substantiated",
  C: "Unconfirmed",
  X: "Excluded",
}

const verdictLabels: Record<IncidentVerdict, string> = {
  "resolution-pending": "Pending",
  included: "Included",
  excluded: "Excluded",
}

const filterLabels: Array<{ value: ReviewFilter; label: string }> = [
  { value: "to-review", label: "To review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "all", label: "All" },
]

export function ReviewQueue({
  incidents,
  labs,
  models,
  selectedId,
  filter,
  onFilterChange,
  onSelect,
}: ReviewQueueProps) {
  const labNames = useMemo(() => new Map(labs.map((lab) => [String(lab.id), lab.name])), [labs])
  const modelNames = useMemo(
    () => new Map(models.map((model) => [String(model.id), model.name])),
    [models]
  )

  return (
    <div className="border border-border">
      <div className="grid grid-cols-3 gap-1 border-b border-border p-2" aria-label="Filter review queue">
        {filterLabels.map((option) => (
          <button
            className={`min-h-10 px-3 text-xs font-semibold uppercase tracking-[0.1em] transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 ${
              filter === option.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            type="button"
            aria-pressed={filter === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="max-h-[44rem] overflow-y-auto">
        {incidents.length ? incidents.map((incident) => {
          const selected = incident.id === selectedId
          return (
            <button
              className={`block w-full border-b border-border px-4 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 ${
                selected ? "bg-secondary" : "hover:bg-muted/35"
              }`}
              key={incident.id}
              onClick={() => onSelect(incident)}
              type="button"
              aria-pressed={selected}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-semibold leading-6 tracking-[-0.02em]">{incident.title}</p>
                {incident.agent.evidenceClass ? (
                  <span className="shrink-0 text-xs font-semibold text-primary">{evidenceLabels[incident.agent.evidenceClass]}</span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {labNames.get(String(incident.labId)) ?? "Unknown company"} · {modelNames.get(String(incident.modelId)) ?? "Unknown model"}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <span>{incident.victimCount} {incident.victimCount === 1 ? "death" : "deaths"}</span>
                <span>{transcriptLabels[incident.transcriptStatus]}</span>
                {incident.agent.verdict ? (
                  <span className="text-primary">Agent: {verdictLabels[incident.agent.verdict]}</span>
                ) : null}
                <span className="text-foreground">
                  {incident.review ? `You: ${verdictLabels[incident.review.verdict]}` : "Not reviewed"}
                </span>
              </div>
            </button>
          )
        }) : (
          <div className="px-4 py-10">
            <p className="font-semibold">No records here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
