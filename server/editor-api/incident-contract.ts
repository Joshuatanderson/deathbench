import { HttpError } from "./http"

const INCIDENT_VERDICTS = ["excluded", "included", "resolution-pending"] as const
const REVIEW_STATES = ["unreviewed", "agent-recommended", "human-reviewed"] as const
const EVIDENCE_CLASSES = ["A", "B", "C", "X"] as const
const PATHWAYS = ["direct-operation", "enabled-harm", "systemic-contribution"] as const
const TRANSCRIPT_STATUSES = ["none", "excerpts", "partial", "complete-final", "sealed"] as const

export type IncidentRow = {
  id: unknown
  title: unknown
  link: unknown
  lab_id: unknown
  model_id: unknown
  victim_count: unknown
  minor_victim_count: unknown
  death_date: unknown
  location: unknown
  case_reference: unknown
  review_state: unknown
  verdict: unknown
  evidence_class: unknown
  pathway: unknown
  transcript_status: unknown
  transcript_link: unknown
  source_links: unknown
  claim_summary: unknown
  evidence_summary: unknown
  counterevidence: unknown
  reasoning: unknown
  created_at: unknown
  updated_at: unknown
}

type SourceLink = { label: string; url: string }

function sourceLinkResources(value: unknown): SourceLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    return typeof record.label === "string" && typeof record.url === "string"
      ? [{ label: record.label, url: record.url }]
      : []
  })
}

export function incidentResource(row: IncidentRow) {
  return {
    id: String(row.id),
    title: String(row.title),
    link: String(row.link),
    labId: String(row.lab_id),
    modelId: String(row.model_id),
    victimCount: Number(row.victim_count),
    minorVictimCount: Number(row.minor_victim_count),
    deathDate: String(row.death_date),
    location: String(row.location),
    caseReference: String(row.case_reference),
    reviewState: String(row.review_state),
    verdict: String(row.verdict),
    evidenceClass: String(row.evidence_class),
    pathway: row.pathway === null ? "" : String(row.pathway),
    transcriptStatus: String(row.transcript_status),
    transcriptLink: row.transcript_link === null ? "" : String(row.transcript_link),
    sourceLinks: sourceLinkResources(row.source_links),
    claimSummary: String(row.claim_summary),
    evidenceSummary: String(row.evidence_summary),
    counterevidence: String(row.counterevidence),
    reasoning: String(row.reasoning),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

export function parseIncident(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const link = typeof body.link === "string" ? body.link.trim() : ""
  const labId = Number(body.labId)
  const modelId = Number(body.modelId)
  const victimCount = Number(body.victimCount)
  const minorVictimCount = Number(body.minorVictimCount)
  const deathDate = typeof body.deathDate === "string" ? body.deathDate.trim() : ""
  const location = typeof body.location === "string" ? body.location.trim() : ""
  const caseReference = typeof body.caseReference === "string" ? body.caseReference.trim() : ""
  const reviewState = typeof body.reviewState === "string" ? body.reviewState : ""
  const verdict = typeof body.verdict === "string" ? body.verdict : ""
  const evidenceClass = typeof body.evidenceClass === "string" ? body.evidenceClass : ""
  const pathway = typeof body.pathway === "string" ? body.pathway : ""
  const transcriptStatus = typeof body.transcriptStatus === "string" ? body.transcriptStatus : ""
  const transcriptLink = typeof body.transcriptLink === "string" ? body.transcriptLink.trim() : ""
  const sourceLinks = Array.isArray(body.sourceLinks) ? body.sourceLinks : []
  const claimSummary = typeof body.claimSummary === "string" ? body.claimSummary.trim() : ""
  const evidenceSummary = typeof body.evidenceSummary === "string" ? body.evidenceSummary.trim() : ""
  const counterevidence = typeof body.counterevidence === "string" ? body.counterevidence.trim() : ""
  const reasoning = typeof body.reasoning === "string" ? body.reasoning.trim() : ""

  if (!title || title.length > 200) {
    throw new HttpError(400, "Title is required and must be 200 characters or fewer")
  }

  for (const [value, label] of [[link, "Source link"], [transcriptLink, "Transcript link"]] as const) {
    if (!value && label === "Transcript link") continue
    try {
      const url = new URL(value)
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error()
    } catch {
      throw new HttpError(400, `${label} must be a valid HTTP or HTTPS URL`)
    }
  }

  if (!Number.isInteger(labId) || !Number.isInteger(modelId)) {
    throw new HttpError(400, "Lab and model are required")
  }
  if (!Number.isInteger(victimCount) || victimCount < 1 || victimCount > 100) {
    throw new HttpError(400, "Victim count must be a whole number from 1 to 100")
  }
  if (!Number.isInteger(minorVictimCount) || minorVictimCount < 0 || minorVictimCount > victimCount) {
    throw new HttpError(400, "Minor victim count must be between zero and the total death count")
  }
  if (deathDate.length > 100 || location.length > 200 || caseReference.length > 300) {
    throw new HttpError(400, "Case metadata is too long")
  }
  if (!REVIEW_STATES.includes(reviewState as (typeof REVIEW_STATES)[number])) {
    throw new HttpError(400, "Select a valid review state")
  }
  if (!INCIDENT_VERDICTS.includes(verdict as (typeof INCIDENT_VERDICTS)[number])) {
    throw new HttpError(400, "Select a valid verdict")
  }
  if (!EVIDENCE_CLASSES.includes(evidenceClass as (typeof EVIDENCE_CLASSES)[number])) {
    throw new HttpError(400, "Select a valid evidence class")
  }
  if (pathway && !PATHWAYS.includes(pathway as (typeof PATHWAYS)[number])) {
    throw new HttpError(400, "Select a valid qualification pathway")
  }
  if (!TRANSCRIPT_STATUSES.includes(transcriptStatus as (typeof TRANSCRIPT_STATUSES)[number])) {
    throw new HttpError(400, "Select a valid transcript status")
  }
  if (sourceLinks.length > 12) {
    throw new HttpError(400, "Add no more than 12 evidence links")
  }
  const parsedSourceLinks = sourceLinks.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new HttpError(400, `Evidence link ${index + 1} is invalid`)
    }
    const record = item as Record<string, unknown>
    const label = typeof record.label === "string" ? record.label.trim() : ""
    const url = typeof record.url === "string" ? record.url.trim() : ""
    if (!label || label.length > 100) {
      throw new HttpError(400, `Evidence link ${index + 1} needs a short label`)
    }
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new Error()
    } catch {
      throw new HttpError(400, `Evidence link ${index + 1} must use HTTP or HTTPS`)
    }
    return { label, url }
  })
  if (claimSummary.length > 4_000 || evidenceSummary.length > 6_000 || counterevidence.length > 4_000) {
    throw new HttpError(400, "Evidence narrative is too long")
  }
  if (reasoning.length > 4_000) {
    throw new HttpError(400, "Reasoning must be 4,000 characters or fewer")
  }
  if (reviewState === "human-reviewed" && !reasoning) {
    throw new HttpError(400, "Human-reviewed dossiers require decision reasoning")
  }

  return {
    title,
    link,
    labId,
    modelId,
    victimCount,
    minorVictimCount,
    deathDate,
    location,
    caseReference,
    reviewState,
    verdict,
    evidenceClass,
    pathway: pathway || null,
    transcriptStatus,
    transcriptLink: transcriptLink || null,
    sourceLinks: parsedSourceLinks,
    claimSummary,
    evidenceSummary,
    counterevidence,
    reasoning,
  }
}

export type IncidentInput = ReturnType<typeof parseIncident>
