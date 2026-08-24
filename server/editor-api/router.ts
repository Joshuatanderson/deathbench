import type { EditorDatabase } from "./database"
import { HttpError, jsonResponse, notFoundResponse, unauthorizedResponse } from "./http"
import {
  handleIncidentCollectionRequest,
  handleIncidentItemRequest,
} from "./incidents"
import { handleLabsRequest, handleModelsRequest } from "./reference-data"
import { handleSessionRequest, isAuthenticated } from "./session"

const API_PREFIX = "/api/editor"
const INCIDENT_ITEM_PATH = /^\/incidents\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

export type EditorApiDependencies = {
  database: EditorDatabase
  passwordHash: string
}

export async function routeEditorRequest(
  request: Request,
  { database, passwordHash }: EditorApiDependencies
) {
  const pathname = new URL(request.url).pathname
  if (!pathname.startsWith(`${API_PREFIX}/`)) return notFoundResponse()
  const resourcePath = pathname.slice(API_PREFIX.length)

  try {
    if (resourcePath === "/session") {
      return await handleSessionRequest(request, passwordHash)
    }

    const incidentMatch = resourcePath.match(INCIDENT_ITEM_PATH)
    const isProtectedResource =
      resourcePath === "/labs" ||
      resourcePath === "/models" ||
      resourcePath === "/incidents" ||
      Boolean(incidentMatch)

    if (!isProtectedResource) return notFoundResponse()
    if (!isAuthenticated(request, passwordHash)) return unauthorizedResponse()

    if (resourcePath === "/labs") return await handleLabsRequest(request, database)
    if (resourcePath === "/models") return await handleModelsRequest(request, database)
    if (resourcePath === "/incidents") {
      return await handleIncidentCollectionRequest(request, database)
    }
    if (incidentMatch) {
      return await handleIncidentItemRequest(request, database, incidentMatch[1])
    }

    return notFoundResponse()
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message })
    }
    console.error("Editor API request failed", error)
    return jsonResponse(500, { error: "Unable to complete editor request" })
  }
}
