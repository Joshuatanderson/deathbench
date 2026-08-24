import { connectEditorDatabase } from "./database"
import { jsonResponse } from "./http"
import { routeEditorRequest } from "./router"

export async function handleEditorRequest(request: Request) {
  const databaseUrl = process.env.DATABASE_URL
  const passwordHash = process.env.EDITOR_PASSWORD_HASH
  if (!databaseUrl || !passwordHash) {
    console.error("Editor API requires DATABASE_URL and EDITOR_PASSWORD_HASH")
    return jsonResponse(500, { error: "Editor API is not configured" })
  }

  return routeEditorRequest(request, {
    database: connectEditorDatabase(databaseUrl),
    passwordHash,
  })
}
