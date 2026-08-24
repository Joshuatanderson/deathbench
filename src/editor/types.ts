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

export type IncidentVerdict = "excluded" | "included" | "resolution-pending"
export type EvidenceClass = "A" | "B" | "C" | "X"
export type QualificationPathway = "" | "direct-operation" | "enabled-harm" | "systemic-contribution"
export type TranscriptStatus = "none" | "excerpts" | "partial" | "complete-final" | "sealed"

export type Incident = {
  id: string
  title: string
  link: string
  labId: string
  modelId: string
  victimCount: number
  verdict: IncidentVerdict
  evidenceClass: EvidenceClass
  pathway: QualificationPathway
  transcriptStatus: TranscriptStatus
  transcriptLink: string
  reasoning: string
  createdAt: string
  updatedAt: string
}

export type EditorData = {
  labs: Lab[]
  models: Model[]
  incidents: Incident[]
}

export type IncidentInput = Pick<
  Incident,
  | "title"
  | "link"
  | "labId"
  | "modelId"
  | "victimCount"
  | "verdict"
  | "evidenceClass"
  | "pathway"
  | "transcriptStatus"
  | "transcriptLink"
  | "reasoning"
>
