import type { EditorDatabase } from "./database"
import {
  incidentResource,
  type IncidentInput,
  type IncidentRow,
} from "./incident-contract"

export async function modelBelongsToLab(
  database: EditorDatabase,
  modelId: number,
  labId: number
) {
  const model = await database`SELECT id FROM models WHERE id = ${modelId} AND lab_id = ${labId}`
  return model.length > 0
}

export async function listIncidents(database: EditorDatabase) {
  const rows = await database`SELECT * FROM incidents ORDER BY created_at DESC`
  return rows.map((row) => incidentResource(row as IncidentRow))
}

export async function findIncident(database: EditorDatabase, incidentId: string) {
  const [row] = await database`SELECT * FROM incidents WHERE id = ${incidentId}`
  return row ? incidentResource(row as IncidentRow) : null
}

export async function insertIncident(database: EditorDatabase, incident: IncidentInput) {
  const [created] = await database`
    INSERT INTO incidents (
      title, link, lab_id, model_id, victim_count, minor_victim_count,
      death_date, location, case_reference, review_state, verdict, evidence_class, pathway,
      transcript_status, transcript_link, source_links, claim_summary,
      evidence_summary, counterevidence, reasoning
    )
    VALUES (
      ${incident.title}, ${incident.link}, ${incident.labId}, ${incident.modelId},
      ${incident.victimCount}, ${incident.minorVictimCount}, ${incident.deathDate},
      ${incident.location}, ${incident.caseReference}, ${incident.reviewState},
      ${incident.verdict}, ${incident.evidenceClass}, ${incident.pathway}, ${incident.transcriptStatus},
      ${incident.transcriptLink}, ${JSON.stringify(incident.sourceLinks)}::jsonb,
      ${incident.claimSummary}, ${incident.evidenceSummary}, ${incident.counterevidence},
      ${incident.reasoning}
    )
    RETURNING *
  `
  return incidentResource(created as IncidentRow)
}

export async function updateIncident(
  database: EditorDatabase,
  incidentId: string,
  incident: IncidentInput
) {
  const [updated] = await database`
    UPDATE incidents
    SET title = ${incident.title}, link = ${incident.link}, lab_id = ${incident.labId},
        model_id = ${incident.modelId}, victim_count = ${incident.victimCount},
        minor_victim_count = ${incident.minorVictimCount}, death_date = ${incident.deathDate},
        location = ${incident.location}, case_reference = ${incident.caseReference},
        review_state = ${incident.reviewState}, verdict = ${incident.verdict},
        evidence_class = ${incident.evidenceClass},
        pathway = ${incident.pathway}, transcript_status = ${incident.transcriptStatus},
        transcript_link = ${incident.transcriptLink},
        source_links = ${JSON.stringify(incident.sourceLinks)}::jsonb,
        claim_summary = ${incident.claimSummary}, evidence_summary = ${incident.evidenceSummary},
        counterevidence = ${incident.counterevidence}, reasoning = ${incident.reasoning},
        updated_at = now()
    WHERE id = ${incidentId}
    RETURNING *
  `
  return updated ? incidentResource(updated as IncidentRow) : null
}

export async function removeIncident(database: EditorDatabase, incidentId: string) {
  const deleted = await database`DELETE FROM incidents WHERE id = ${incidentId} RETURNING id`
  return deleted.length > 0
}
