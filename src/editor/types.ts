export type Lab = {
  id: string
  name: string
  slug: string
}

export type Model = {
  id: string
  labId: string
  name: string
  slug: string
}

export type IncidentVerdict = "excluded" | "included" | "resolution-pending" | "under-review"
export type EvidenceClass = "A" | "B" | "C" | "X"
export type QualificationPathway = "" | "direct-operation" | "enabled-harm" | "systemic-contribution"
export type TranscriptStatus = "none" | "excerpts" | "partial" | "complete-final" | "sealed"

export type SourceLink = {
  label: string
  url: string
}

export type Incident = {
  id: string
  title: string
  link: string
  labId: string
  modelId: string
  victimCount: number
  minorVictimCount: number
  deathDate: string
  location: string
  caseReference: string
  pathway: QualificationPathway
  transcriptStatus: TranscriptStatus
  transcriptLink: string
  sourceLinks: SourceLink[]
  claimSummary: string
  evidenceSummary: string
  counterevidence: string
  /** Agent recommendation. Display only. */
  agent: {
    verdict: IncidentVerdict | null
    evidenceClass: EvidenceClass | null
    reasoning: string
  }
  /** Human decision. Null until a human decides. */
  review: {
    verdict: IncidentVerdict
    reasoning: string
    reviewedAt: string
  } | null
  createdAt: string
  updatedAt: string
}

export type EditorData = {
  labs: Lab[]
  models: Model[]
  incidents: Incident[]
}

export type ReviewInput = {
  verdict: IncidentVerdict
  reasoning: string
}

export type IncidentInput = Pick<
  Incident,
  | "title"
  | "link"
  | "labId"
  | "modelId"
  | "victimCount"
  | "minorVictimCount"
  | "deathDate"
  | "location"
  | "caseReference"
  | "pathway"
  | "transcriptStatus"
  | "transcriptLink"
  | "sourceLinks"
  | "claimSummary"
  | "evidenceSummary"
  | "counterevidence"
  | "agent"
>
