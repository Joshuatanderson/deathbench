import { createHash, timingSafeEqual } from "node:crypto"

import { neon } from "@neondatabase/serverless"
import { compare } from "bcryptjs"
import { parseCookie, stringifySetCookie } from "cookie"

const API_PREFIX = "/api/editor"
const SESSION_COOKIE = "deathbench_editor"

class RequestError extends Error {}

function sendJson(status: number, body: unknown, headers?: HeadersInit) {
  return Response.json(body, { status, headers })
}

async function readJson(request: Request) {
  const body = await request.text()
  if (body.length > 16_384) throw new RequestError("Request body is too large")
  try {
    return JSON.parse(body || "{}") as Record<string, unknown>
  } catch {
    throw new RequestError("Request body must be valid JSON")
  }
}

function sessionToken(passwordHash: string) {
  return createHash("sha256")
    .update(`deathbench-editor:${passwordHash}`)
    .digest("hex")
}

function isAuthenticated(request: Request, passwordHash: string) {
  const actual = parseCookie(request.headers.get("Cookie") ?? "")[SESSION_COOKIE] ?? ""
  const expected = sessionToken(passwordHash)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
}

function parseIncident(body: Record<string, unknown>) {
  const link = typeof body.link === "string" ? body.link.trim() : ""
  const labId = Number(body.labId)
  const modelId = Number(body.modelId)

  try {
    const url = new URL(link)
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error()
  } catch {
    throw new RequestError("Link must be a valid HTTP or HTTPS URL")
  }

  if (!Number.isInteger(labId) || !Number.isInteger(modelId)) {
    throw new RequestError("Lab and model are required")
  }

  return { link, labId, modelId }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505"
}

export async function handleEditorRequest(request: Request) {
  const databaseUrl = process.env.DATABASE_URL
  const passwordHash = process.env.EDITOR_PASSWORD_HASH
  if (!databaseUrl || !passwordHash) {
    console.error("Editor API requires DATABASE_URL and EDITOR_PASSWORD_HASH")
    return sendJson(500, { error: "Editor API is not configured" })
  }

  const sql = neon(databaseUrl)
  const url = new URL(request.url)

  try {
    if (url.pathname === `${API_PREFIX}/login` && request.method === "POST") {
      const body = await readJson(request)
      const password = typeof body.password === "string" ? body.password : ""
      if (!(await compare(password, passwordHash))) {
        return sendJson(401, { error: "Incorrect password" })
      }

      return sendJson(
        200,
        { ok: true },
        {
          "Set-Cookie": stringifySetCookie({
            name: SESSION_COOKIE,
            value: sessionToken(passwordHash),
            httpOnly: true,
            secure: url.protocol === "https:",
            sameSite: "strict",
            path: API_PREFIX,
            maxAge: 60 * 60 * 12,
          }),
        }
      )
    }

    if (url.pathname === `${API_PREFIX}/session` && request.method === "GET") {
      return sendJson(200, { authenticated: isAuthenticated(request, passwordHash) })
    }

    if (!isAuthenticated(request, passwordHash)) {
      return sendJson(401, { error: "Authentication required" })
    }

    if (url.pathname === `${API_PREFIX}/logout` && request.method === "POST") {
      return sendJson(
        200,
        { ok: true },
        {
          "Set-Cookie": stringifySetCookie({
            name: SESSION_COOKIE,
            value: "",
            httpOnly: true,
            secure: url.protocol === "https:",
            sameSite: "strict",
            path: API_PREFIX,
            maxAge: 0,
          }),
        }
      )
    }

    if (url.pathname === `${API_PREFIX}/data` && request.method === "GET") {
      const [labs, models, incidents] = await Promise.all([
        sql`SELECT id, name, slug FROM labs ORDER BY name`,
        sql`SELECT id, lab_id AS "labId", name, slug FROM models ORDER BY name`,
        sql`SELECT id, link, lab_id AS "labId", model_id AS "modelId",
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM incidents ORDER BY created_at DESC`,
      ])
      return sendJson(200, { labs, models, incidents })
    }

    if (url.pathname === `${API_PREFIX}/incidents` && request.method === "POST") {
      const incident = parseIncident(await readJson(request))
      const model = await sql`SELECT id FROM models WHERE id = ${incident.modelId} AND lab_id = ${incident.labId}`
      if (!model.length) throw new RequestError("The selected model does not belong to that lab")

      const [created] = await sql`
        INSERT INTO incidents (link, lab_id, model_id)
        VALUES (${incident.link}, ${incident.labId}, ${incident.modelId})
        RETURNING id, link, lab_id AS "labId", model_id AS "modelId",
                  created_at AS "createdAt", updated_at AS "updatedAt"
      `
      return sendJson(201, created)
    }

    const match = url.pathname.match(/^\/api\/editor\/incidents\/([0-9a-f-]+)$/)
    if (match && request.method === "PATCH") {
      const incident = parseIncident(await readJson(request))
      const model = await sql`SELECT id FROM models WHERE id = ${incident.modelId} AND lab_id = ${incident.labId}`
      if (!model.length) throw new RequestError("The selected model does not belong to that lab")

      const [updated] = await sql`
        UPDATE incidents
        SET link = ${incident.link}, lab_id = ${incident.labId},
            model_id = ${incident.modelId}, updated_at = now()
        WHERE id = ${match[1]}
        RETURNING id, link, lab_id AS "labId", model_id AS "modelId",
                  created_at AS "createdAt", updated_at AS "updatedAt"
      `
      if (!updated) return sendJson(404, { error: "Incident not found" })
      return sendJson(200, updated)
    }

    if (match && request.method === "DELETE") {
      const deleted = await sql`DELETE FROM incidents WHERE id = ${match[1]} RETURNING id`
      if (!deleted.length) return sendJson(404, { error: "Incident not found" })
      return new Response(null, { status: 204 })
    }

    return sendJson(404, { error: "Not found" })
  } catch (error) {
    if (error instanceof RequestError) return sendJson(400, { error: error.message })
    if (isUniqueViolation(error)) {
      return sendJson(409, { error: "An incident with that link already exists" })
    }
    console.error("Editor API request failed", error)
    return sendJson(500, { error: "Unable to complete editor request" })
  }
}
