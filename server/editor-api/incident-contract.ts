import { HttpError } from "./http"

const INCIDENT_VERDICTS = ["excluded", "included", "resolution-pending"] as const
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
  verdict: unknown
  evidence_class: unknown
  pathway: unknown
  transcript_status: unknown
  transcript_link: unknown
  reasoning: unknown
  created_at: unknown
  updated_at: unknown
}

export function incidentResource(row: IncidentRow) {
  return {
    id: String(row.id),
    title: String(row.title),
    link: String(row.link),
    labId: String(row.lab_id),
    modelId: String(row.model_id),
    victimCount: Number(row.victim_count),
    verdict: String(row.verdict),
    evidenceClass: String(row.evidence_class),
    pathway: row.pathway === null ? "" : String(row.pathway),
    transcriptStatus: String(row.transcript_status),
    transcriptLink: row.transcript_link === null ? "" : String(row.transcript_link),
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
  const verdict = typeof body.verdict === "string" ? body.verdict : ""
  const evidenceClass = typeof body.evidenceClass === "string" ? body.evidenceClass : ""
  const pathway = typeof body.pathway === "string" ? body.pathway : ""
  const transcriptStatus = typeof body.transcriptStatus === "string" ? body.transcriptStatus : ""
  const transcriptLink = typeof body.transcriptLink === "string" ? body.transcriptLink.trim() : ""
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
  if (reasoning.length > 4_000) {
    throw new HttpError(400, "Reasoning must be 4,000 characters or fewer")
  }

  return {
    title,
    link,
    labId,
    modelId,
    victimCount,
    verdict,
    evidenceClass,
    pathway: pathway || null,
    transcriptStatus,
    transcriptLink: transcriptLink || null,
    reasoning,
  }
}

export type IncidentInput = ReturnType<typeof parseIncident>
