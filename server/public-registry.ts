import { connectEditorDatabase } from "./editor-api/database"

export type CompanyDeathCount = {
  company: string
  slug: string
  deaths: number
  incidents: number
}

export type PublicRegistrySummary = {
  available: boolean
  companies: CompanyDeathCount[]
}

export type PublicVerdict = "included" | "excluded" | "under-review" | "resolution-pending" | "unreviewed"

export type PublicSourceLink = { label: string; url: string }

export type PublicIncident = {
  id: string
  title: string
  company: string
  companySlug: string
  model: string
  victimCount: number
  minorVictimCount: number
  deathDate: string
  location: string
  caseReference: string
  pathway: string
  transcriptStatus: string
  transcriptLink: string
  primarySource: string
  sourceLinks: PublicSourceLink[]
  claimSummary: string
  evidenceSummary: string
  counterevidence: string
  verdict: PublicVerdict
  verdictReasoning: string
  reviewedAt: string
  updatedAt: string
}

export type PublicCompany = {
  company: string
  slug: string
  incidents: PublicIncident[]
}

function database() {
  const databaseUrl = process.env.DATABASE_URL
  return databaseUrl ? connectEditorDatabase(databaseUrl) : null
}

function sourceLinks(value: unknown): PublicSourceLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return []
    const record = item as Record<string, unknown>
    return typeof record.label === "string" && typeof record.url === "string"
      ? [{ label: record.label, url: record.url }]
      : []
  })
}

function timestamp(value: unknown) {
  if (value === null || value === undefined) return ""
  return value instanceof Date ? value.toISOString() : String(value)
}

function publicIncident(row: Record<string, unknown>): PublicIncident {
  return {
    id: String(row.id),
    title: String(row.title),
    company: String(row.company),
    companySlug: String(row.company_slug),
    model: String(row.model),
    victimCount: Number(row.victim_count),
    minorVictimCount: Number(row.minor_victim_count),
    deathDate: String(row.death_date ?? ""),
    location: String(row.location ?? ""),
    caseReference: String(row.case_reference ?? ""),
    pathway: row.pathway === null ? "" : String(row.pathway),
    transcriptStatus: String(row.transcript_status ?? "none"),
    transcriptLink: row.transcript_link === null ? "" : String(row.transcript_link),
    primarySource: String(row.link),
    sourceLinks: sourceLinks(row.source_links),
    claimSummary: String(row.claim_summary ?? ""),
    evidenceSummary: String(row.evidence_summary ?? ""),
    counterevidence: String(row.counterevidence ?? ""),
    verdict: row.human_verdict === null ? "unreviewed" : (String(row.human_verdict) as PublicVerdict),
    verdictReasoning: String(row.human_reasoning ?? ""),
    reviewedAt: timestamp(row.human_reviewed_at),
    updatedAt: timestamp(row.updated_at),
  }
}

const incidentColumns = `
  incidents.id, incidents.title, incidents.link, incidents.victim_count, incidents.minor_victim_count,
  incidents.death_date, incidents.location, incidents.case_reference, incidents.pathway,
  incidents.transcript_status, incidents.transcript_link, incidents.source_links,
  incidents.claim_summary, incidents.evidence_summary, incidents.counterevidence,
  incidents.human_verdict, incidents.human_reasoning, incidents.human_reviewed_at, incidents.updated_at,
  labs.name AS company, labs.slug AS company_slug, models.name AS model
`

export async function getPublicRegistrySummary(): Promise<PublicRegistrySummary> {
  const sql = database()
  if (!sql) return { available: false, companies: [] }

  try {
    const rows = await sql`
      SELECT
        labs.name AS company,
        labs.slug AS slug,
        SUM(incidents.victim_count) AS deaths,
        COUNT(*) AS incidents
      FROM labs
      JOIN incidents ON incidents.lab_id = labs.id
        AND incidents.human_verdict = 'included'
      GROUP BY labs.id, labs.name, labs.slug
      ORDER BY deaths DESC, labs.name ASC
    `

    return {
      available: true,
      companies: rows.map((row) => ({
        company: String(row.company),
        slug: String(row.slug),
        deaths: Number(row.deaths),
        incidents: Number(row.incidents),
      })),
    }
  } catch (error) {
    console.error("Unable to load public registry summary", error)
    return { available: false, companies: [] }
  }
}

export async function getPublicCompany(slug: string): Promise<PublicCompany | null> {
  const sql = database()
  if (!sql) return null

  const [lab] = await sql`SELECT name, slug FROM labs WHERE slug = ${slug}`
  if (!lab) return null

  const rows = await sql.query(
    `SELECT ${incidentColumns}
     FROM incidents
     JOIN labs ON labs.id = incidents.lab_id
     JOIN models ON models.id = incidents.model_id
     WHERE labs.slug = $1
     ORDER BY incidents.death_date DESC, incidents.title ASC`,
    [slug]
  )

  return {
    company: String(lab.name),
    slug: String(lab.slug),
    incidents: (rows as Record<string, unknown>[]).map(publicIncident),
  }
}

export async function getPublicIncident(id: string): Promise<PublicIncident | null> {
  const sql = database()
  if (!sql) return null
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null

  const rows = await sql.query(
    `SELECT ${incidentColumns}
     FROM incidents
     JOIN labs ON labs.id = incidents.lab_id
     JOIN models ON models.id = incidents.model_id
     WHERE incidents.id = $1`,
    [id]
  )
  const [row] = rows as Record<string, unknown>[]
  return row ? publicIncident(row) : null
}

export type PublicQuoteSpeaker = "ai" | "user"

export type PublicQuote = {
  id: string
  incidentId: string
  speaker: PublicQuoteSpeaker
  text: string
  context: string
  locator: string
  saidOn: string
  featured: boolean
  source: {
    id: string
    kind: string
    title: string
    publisher: string
    url: string
  }
}

/** A featured AI quote joined with the incident it belongs to, for the home page. */
export type FeaturedQuote = PublicQuote & {
  incidentTitle: string
  company: string
  companySlug: string
  model: string
  victimCount: number
  verdict: PublicVerdict
}

function publicQuote(row: Record<string, unknown>): PublicQuote {
  return {
    id: String(row.id),
    incidentId: String(row.incident_id),
    speaker: row.speaker === "user" ? "user" : "ai",
    text: String(row.text),
    context: String(row.context ?? ""),
    locator: String(row.locator ?? ""),
    saidOn: row.said_on ? String(row.said_on).slice(0, 10) : "",
    featured: Boolean(row.featured),
    source: {
      id: String(row.source_id),
      kind: String(row.source_kind ?? "other"),
      title: String(row.source_title ?? ""),
      publisher: String(row.source_publisher ?? ""),
      url: String(row.source_url ?? ""),
    },
  }
}

const quoteColumns = `
  quotes.id, quotes.incident_id, quotes.speaker, quotes.text, quotes.context, quotes.locator,
  quotes.said_on, quotes.featured, quotes.source_id,
  sources.kind AS source_kind, sources.title AS source_title, sources.publisher AS source_publisher,
  sources.url AS source_url
`

export async function getIncidentQuotes(incidentId: string): Promise<PublicQuote[]> {
  const sql = database()
  if (!sql) return []
  if (!/^[0-9a-f-]{36}$/i.test(incidentId)) return []
  try {
    const rows = await sql.query(
      `SELECT ${quoteColumns}
       FROM quotes
       JOIN sources ON sources.id = quotes.source_id
       WHERE quotes.incident_id = $1
       ORDER BY quotes.sort_order ASC, quotes.created_at ASC`,
      [incidentId]
    )
    return (rows as Record<string, unknown>[]).map(publicQuote)
  } catch (error) {
    console.error("Unable to load incident quotes", error)
    return []
  }
}

/** Featured AI-speaker quotes from incidents that are included or under review. */
export async function getFeaturedQuotes(): Promise<FeaturedQuote[]> {
  const sql = database()
  if (!sql) return []
  try {
    const rows = await sql.query(
      `SELECT ${quoteColumns},
         incidents.title AS incident_title, incidents.victim_count, incidents.human_verdict,
         labs.name AS company, labs.slug AS company_slug, models.name AS model
       FROM quotes
       JOIN sources ON sources.id = quotes.source_id
       JOIN incidents ON incidents.id = quotes.incident_id
       JOIN labs ON labs.id = incidents.lab_id
       JOIN models ON models.id = incidents.model_id
       WHERE quotes.featured AND quotes.speaker = 'ai'
         AND incidents.human_verdict IN ('included', 'under-review')
       ORDER BY incidents.human_verdict = 'included' DESC, incidents.death_date DESC, quotes.sort_order ASC`
    )
    return (rows as Record<string, unknown>[]).map((row) => ({
      ...publicQuote(row),
      incidentTitle: String(row.incident_title),
      company: String(row.company),
      companySlug: String(row.company_slug),
      model: String(row.model),
      victimCount: Number(row.victim_count),
      verdict: String(row.human_verdict) as PublicVerdict,
    }))
  } catch (error) {
    console.error("Unable to load featured quotes", error)
    return []
  }
}
