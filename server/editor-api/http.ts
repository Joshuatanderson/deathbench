const MAX_JSON_BODY_SIZE = 16_384

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "HttpError"
    this.status = status
  }
}

export function jsonResponse(status: number, body: unknown, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers)
  responseHeaders.set("Cache-Control", "no-store")
  return Response.json(body, { status, headers: responseHeaders })
}

export function noContentResponse(headers?: HeadersInit) {
  const responseHeaders = new Headers(headers)
  responseHeaders.set("Cache-Control", "no-store")
  return new Response(null, { status: 204, headers: responseHeaders })
}

export function methodNotAllowedResponse(allowedMethods: string[]) {
  return jsonResponse(
    405,
    { error: "Method not allowed" },
    { Allow: allowedMethods.join(", ") }
  )
}

export function notFoundResponse() {
  return jsonResponse(404, { error: "Not found" })
}

export function unauthorizedResponse() {
  return jsonResponse(401, { error: "Authentication required" })
}

export async function readJsonObject(request: Request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json")
  }

  const body = await request.text()
  if (body.length > MAX_JSON_BODY_SIZE) {
    throw new HttpError(413, "Request body is too large")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(body || "{}")
  } catch {
    throw new HttpError(400, "Request body must be valid JSON")
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new HttpError(400, "Request body must be a JSON object")
  }

  return parsed as Record<string, unknown>
}
