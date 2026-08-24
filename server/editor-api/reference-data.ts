import type { EditorDatabase } from "./database"
import { jsonResponse, methodNotAllowedResponse } from "./http"

export async function handleLabsRequest(request: Request, database: EditorDatabase) {
  if (request.method !== "GET") return methodNotAllowedResponse(["GET"])

  const labs = await database`SELECT id, name, slug FROM labs ORDER BY name`
  return jsonResponse(200, labs)
}

export async function handleModelsRequest(request: Request, database: EditorDatabase) {
  if (request.method !== "GET") return methodNotAllowedResponse(["GET"])

  const models = await database`
    SELECT id, lab_id AS "labId", name, slug
    FROM models
    ORDER BY name
  `
  return jsonResponse(200, models)
}
