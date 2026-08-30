import { getPublicIncidentIndex } from "../../server/public-registry"
import { LedgerFooter, LedgerHeader, shortDate, sortedByDate, verdictLabel } from "../variants/ledger"
import type { Route } from "./+types/incidents"

export async function loader() {
  return { incidents: await getPublicIncidentIndex() }
}

export function meta() {
  return [
    { title: "Every incident on record — DeathBench" },
    {
      name: "description",
      content: "Every reported death involving an AI system that DeathBench has reviewed, with its verdict and sources.",
    },
  ]
}

export default function Incidents({ loaderData }: Route.ComponentProps) {
  const incidents = sortedByDate(loaderData.incidents)
  return (
    <div className="v-ledger">
      <LedgerHeader />
      <main className="ldg-page">
        <h1 className="ldg-h1">Every incident on record.</h1>
        <p className="ldg-page-lead">
          {incidents.length} incidents, in order of the date of death. Each record shows the alleged chain of
          events, the evidence, and the verdict.
        </p>
        <ol className="ldg-list">
          {incidents.map((i) => (
            <li key={i.id}>
              <a className="ldg-row" href={`/incidents/${i.id}`}>
                <span className="ldg-row-date">{shortDate(i.deathDate)}</span>
                <span className="ldg-row-title">
                  {i.title}
                  <small>
                    {i.model}, {i.company}
                  </small>
                </span>
                <span className="ldg-row-meta">{verdictLabel[i.verdict] ?? i.verdict}</span>
              </a>
            </li>
          ))}
        </ol>
      </main>
      <LedgerFooter />
    </div>
  )
}
