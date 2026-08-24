import { connectEditorDatabase } from "./editor-api/database"

export type CompanyDeathCount = {
  company: string
  deaths: number
  incidents: number
}

export type PublicRegistrySummary = {
  available: boolean
  companies: CompanyDeathCount[]
}

export async function getPublicRegistrySummary(): Promise<PublicRegistrySummary> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return { available: false, companies: [] }

  try {
    const database = connectEditorDatabase(databaseUrl)
    const rows = await database`
      SELECT
        labs.name AS company,
        SUM(incidents.victim_count) AS deaths,
        COUNT(*) AS incidents
      FROM labs
      JOIN incidents ON incidents.lab_id = labs.id
        AND incidents.verdict = 'included'
        AND incidents.review_state = 'human-reviewed'
      GROUP BY labs.id, labs.name
      ORDER BY deaths DESC, labs.name ASC
    `

    return {
      available: true,
      companies: rows.map((row) => ({
        company: String(row.company),
        deaths: Number(row.deaths),
        incidents: Number(row.incidents),
      })),
    }
  } catch (error) {
    console.error("Unable to load public registry summary", error)
    return { available: false, companies: [] }
  }
}
