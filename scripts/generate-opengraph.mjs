import { spawn } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { createServer } from "node:net"
import { fileURLToPath } from "node:url"

import { chromium } from "playwright"

const root = fileURLToPath(new URL("../", import.meta.url))
const output = fileURLToPath(new URL("../public/opengraph.png", import.meta.url))

async function findOpenPort() {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Unable to allocate a local port")
  await new Promise((resolve) => server.close(resolve))
  return address.port
}

async function waitForServer(url, process, logs) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`The preview server exited before it was ready.\n${logs.join("")}`)
    }

    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for ${url}`)
}

async function stopProcess(child) {
  if (child.exitCode !== null) return

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL")
      resolve()
    }, 5_000)

    child.once("exit", () => {
      clearTimeout(timeout)
      resolve()
    })
    child.kill("SIGTERM")
  })
}

const port = await findOpenPort()
const url = `http://127.0.0.1:${port}/`
const logs = []
const preview = spawn(
  process.execPath,
  [
    "--env-file-if-exists=.env",
    "./node_modules/@react-router/serve/bin.cjs",
    "./build/server/index.js",
  ],
  {
    cwd: root,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  }
)

preview.stdout.on("data", (chunk) => logs.push(chunk.toString()))
preview.stderr.on("data", (chunk) => logs.push(chunk.toString()))

let browser
try {
  await waitForServer(url, preview, logs)
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    colorScheme: "dark",
    deviceScaleFactor: 1,
    locale: "en-US",
    reducedMotion: "reduce",
    timezoneId: "UTC",
    viewport: { width: 1200, height: 630 },
  })
  const page = await context.newPage()
  const browserErrors = []

  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`)
  })
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`))
  page.on("requestfailed", (request) => {
    browserErrors.push(`request: ${request.url()} (${request.failure()?.errorText ?? "failed"})`)
  })

  const response = await page.goto(url, { waitUntil: "networkidle" })
  if (!response?.ok()) throw new Error(`Homepage returned HTTP ${response?.status() ?? "unknown"}`)
  await page.evaluate(() => document.fonts.ready)

  if (browserErrors.length) {
    throw new Error(`Homepage emitted browser errors:\n${browserErrors.join("\n")}`)
  }

  await mkdir(new URL("../public/", import.meta.url), { recursive: true })
  await page.screenshot({
    animations: "disabled",
    path: output,
    type: "png",
  })
  console.log(`Generated ${output} from ${url}`)
} finally {
  await browser?.close()
  await stopProcess(preview)
}
