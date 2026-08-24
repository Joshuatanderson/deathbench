import type { EditorDatabase } from "./database"
import {
  incidentResource,
  type IncidentInput,
  type IncidentRow,
  type ReviewInput,
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
      death_date, location, case_reference, pathway,
      transcript_status, transcript_link, source_links, claim_summary,
      evidence_summary, counterevidence,
      agent_verdict, agent_evidence_class, agent_reasoning
    )
    VALUES (
      ${incident.title}, ${incident.link}, ${incident.labId}, ${incident.modelId},
      ${incident.victimCount}, ${incident.minorVictimCount}, ${incident.deathDate},
      ${incident.location}, ${incident.caseReference},
      ${incident.pathway}, ${incident.transcriptStatus},
      ${incident.transcriptLink}, ${JSON.stringify(incident.sourceLinks)}::jsonb,
      ${incident.claimSummary}, ${incident.evidenceSummary}, ${incident.counterevidence},
      ${incident.agentVerdict}, ${incident.agentEvidenceClass}, ${incident.agentReasoning}
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
        pathway = ${incident.pathway}, transcript_status = ${incident.transcriptStatus},
        transcript_link = ${incident.transcriptLink},
        source_links = ${JSON.stringify(incident.sourceLinks)}::jsonb,
        claim_summary = ${incident.claimSummary}, evidence_summary = ${incident.evidenceSummary},
        counterevidence = ${incident.counterevidence},
        agent_verdict = ${incident.agentVerdict},
        agent_evidence_class = ${incident.agentEvidenceClass},
        agent_reasoning = ${incident.agentReasoning},
        updated_at = now()
    WHERE id = ${incidentId}
    RETURNING *
  `
  return updated ? incidentResource(updated as IncidentRow) : null
}

/** Human decision only. Never touches the agent columns. */
export async function saveReview(database: EditorDatabase, incidentId: string, review: ReviewInput) {
  const [updated] = await database`
    UPDATE incidents
    SET human_verdict = ${review.verdict}, human_reasoning = ${review.reasoning},
        human_reviewed_at = now(), updated_at = now()
    WHERE id = ${incidentId}
    RETURNING *
  `
  return updated ? incidentResource(updated as IncidentRow) : null
}

export async function clearReview(database: EditorDatabase, incidentId: string) {
  const [updated] = await database`
    UPDATE incidents
    SET human_verdict = NULL, human_reasoning = '', human_reviewed_at = NULL, updated_at = now()
    WHERE id = ${incidentId}
    RETURNING *
  `
  return updated ? incidentResource(updated as IncidentRow) : null
}

export async function removeIncident(database: EditorDatabase, incidentId: string) {
  const deleted = await database`DELETE FROM incidents WHERE id = ${incidentId} RETURNING id`
  return deleted.length > 0
}
