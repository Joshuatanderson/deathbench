import type { EditorDatabase } from "./database"
import { parseIncident } from "./incident-contract"
import {
  findIncident,
  insertIncident,
  listIncidents,
  modelBelongsToLab,
  removeIncident,
  updateIncident,
} from "./incident-repository"
import {
  HttpError,
  jsonResponse,
  methodNotAllowedResponse,
  noContentResponse,
  readJsonObject,
} from "./http"

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505"
}

async function readIncident(request: Request, database: EditorDatabase) {
  const incident = parseIncident(await readJsonObject(request))
  if (!(await modelBelongsToLab(database, incident.modelId, incident.labId))) {
    throw new HttpError(400, "The selected model does not belong to that lab")
  }
  return incident
}

async function createIncident(request: Request, database: EditorDatabase) {
  const incident = await readIncident(request, database)
  try {
    const created = await insertIncident(database, incident)
    return jsonResponse(201, created, { Location: `/api/editor/incidents/${created.id}` })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "An incident with that link already exists")
    }
    throw error
  }
}

async function replaceIncident(request: Request, database: EditorDatabase, incidentId: string) {
  const incident = await readIncident(request, database)
  try {
    const updated = await updateIncident(database, incidentId, incident)
    if (!updated) throw new HttpError(404, "Incident not found")
    return jsonResponse(200, updated)
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "An incident with that link already exists")
    }
    throw error
  }
}

export async function handleIncidentCollectionRequest(
  request: Request,
  database: EditorDatabase
) {
  if (request.method === "GET") return jsonResponse(200, await listIncidents(database))
  if (request.method === "POST") return createIncident(request, database)
  return methodNotAllowedResponse(["GET", "POST"])
}

export async function handleIncidentItemRequest(
  request: Request,
  database: EditorDatabase,
  incidentId: string
) {
  if (request.method === "GET") {
    const incident = await findIncident(database, incidentId)
    if (!incident) throw new HttpError(404, "Incident not found")
    return jsonResponse(200, incident)
  }
  if (request.method === "PUT") return replaceIncident(request, database, incidentId)
  if (request.method === "DELETE") {
    if (!(await removeIncident(database, incidentId))) {
      throw new HttpError(404, "Incident not found")
    }
    return noContentResponse()
  }
  return methodNotAllowedResponse(["GET", "PUT", "DELETE"])
}
