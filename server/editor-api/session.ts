import { createHash, timingSafeEqual } from "node:crypto"

import { compare } from "bcryptjs"
import { parseCookie, stringifySetCookie } from "cookie"

import {
  jsonResponse,
  methodNotAllowedResponse,
  noContentResponse,
  readJsonObject,
} from "./http"

const API_PREFIX = "/api/editor"
const SESSION_COOKIE = "deathbench_editor"
const SESSION_DURATION_SECONDS = 60 * 60 * 12

function sessionToken(passwordHash: string) {
  return createHash("sha256")
    .update(`deathbench-editor:${passwordHash}`)
    .digest("hex")
}

export function isAuthenticated(request: Request, passwordHash: string) {
  const actual = parseCookie(request.headers.get("Cookie") ?? "")[SESSION_COOKIE] ?? ""
  const expected = sessionToken(passwordHash)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
}

function sessionCookie(request: Request, passwordHash: string) {
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value: sessionToken(passwordHash),
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "strict",
    path: API_PREFIX,
    maxAge: SESSION_DURATION_SECONDS,
  })
}

function expiredSessionCookie(request: Request) {
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "strict",
    path: API_PREFIX,
    maxAge: 0,
  })
}

export async function handleSessionRequest(request: Request, passwordHash: string) {
  if (request.method === "GET") {
    return jsonResponse(200, { authenticated: isAuthenticated(request, passwordHash) })
  }

  if (request.method === "PUT") {
    const body = await readJsonObject(request)
    const password = typeof body.password === "string" ? body.password : ""
    if (!(await compare(password, passwordHash))) {
      return jsonResponse(401, { error: "Incorrect password" })
    }

    return jsonResponse(
      200,
      { authenticated: true },
      { "Set-Cookie": sessionCookie(request, passwordHash) }
    )
  }

  if (request.method === "DELETE") {
    return noContentResponse({ "Set-Cookie": expiredSessionCookie(request) })
  }

  return methodNotAllowedResponse(["GET", "PUT", "DELETE"])
}
