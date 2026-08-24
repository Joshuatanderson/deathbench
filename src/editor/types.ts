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

export type Incident = {
  id: string
  link: string
  labId: string
  modelId: string
  createdAt: string
  updatedAt: string
}

export type EditorData = {
  labs: Lab[]
  models: Model[]
  incidents: Incident[]
}

export type IncidentInput = Pick<Incident, "link" | "labId" | "modelId">
