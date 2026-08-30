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
