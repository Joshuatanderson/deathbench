import { data } from "react-router"

import { getPublicCompany, type PublicIncident, type PublicVerdict } from "../../server/public-registry"
import { AllegationNotice, PageShell, VerdictBadge, verdictDescriptions, verdictLabels } from "@/components/site"
import type { Route } from "./+types/company"

export async function loader({ params }: Route.LoaderArgs) {
  const company = await getPublicCompany(params.slug)
  if (!company) throw data("Company not found", { status: 404 })
  return company
}

export function meta({ loaderData: company }: Route.MetaArgs) {
  const name = company?.company ?? "Company"
  return [
    { title: `${name} — DeathBench` },
    {
      name: "description",
      content: `Included, excluded, and unresolved incidents involving ${name} systems, with sources and the author's verdict on each.`,
    },
  ]
}

const sections: Array<{ verdict: PublicVerdict; title: string }> = [
  { verdict: "included", title: "Included incidents" },
  { verdict: "excluded", title: "Excluded incidents" },
  { verdict: "under-review", title: "Under review" },
  { verdict: "resolution-pending", title: "Insufficient evidence" },
  { verdict: "unreviewed", title: "Not yet reviewed" },
]

function IncidentRow({ incident }: { incident: PublicIncident }) {
  return (
    <li className="border-b border-border py-5">
      <a className="group grid gap-3 md:grid-cols-[1fr_auto] md:gap-8" href={`/incidents/${incident.id}`}>
        <div>
          <p className="font-semibold tracking-[-0.02em] group-hover:text-primary">{incident.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[incident.model, incident.deathDate, incident.location].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {incident.claimSummary}
          </p>
        </div>
        <div className="flex items-start gap-4 md:flex-col md:items-end">
          <p className="font-display text-3xl tabular-nums">
            {incident.victimCount}
            <span className="ml-1 font-sans text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {incident.victimCount === 1 ? "death" : "deaths"}
            </span>
          </p>
          <VerdictBadge verdict={incident.verdict} />
        </div>
      </a>
    </li>
  )
}

export default function Company({ loaderData: company }: Route.ComponentProps) {
  const included = company.incidents.filter((incident) => incident.verdict === "included")
  const includedDeaths = included.reduce((total, incident) => total + incident.victimCount, 0)

  return (
    <PageShell>
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-20 lg:px-12">
          <a className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground" href="/#companies">
            ← All companies
          </a>
          <p className="section-label mt-8">Company record</p>
          <h1 className="section-title mt-3">{company.company}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
            <span className="font-semibold text-foreground">{includedDeaths}</span> included{" "}
            {includedDeaths === 1 ? "death" : "deaths"} across{" "}
            <span className="font-semibold text-foreground">{included.length}</span> included{" "}
            {included.length === 1 ? "incident" : "incidents"}. {company.incidents.length} incidents reviewed in total.
          </p>
          <div className="mt-8 max-w-3xl">
            <AllegationNotice />
          </div>
        </div>
      </section>

      {sections.map(({ verdict, title }) => {
        const incidents = company.incidents.filter((incident) => incident.verdict === verdict)
        if (!incidents.length && verdict !== "included" && verdict !== "excluded") return null
        return (
          <section className="border-b border-border" key={verdict} id={verdict}>
            <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-8 lg:px-12">
              <div className="grid gap-8 lg:grid-cols-[0.58fr_1.42fr] lg:gap-24">
                <div>
                  <p className="section-label">{verdictLabels[verdict]}</p>
                  <h2 className="mt-3 font-display text-3xl tracking-[-0.03em]">{title}</h2>
                  <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                    {verdictDescriptions[verdict]}
                  </p>
                </div>
                {incidents.length ? (
                  <ul className="border-t border-border">
                    {incidents.map((incident) => (
                      <IncidentRow incident={incident} key={incident.id} />
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-border py-8 text-sm text-muted-foreground">
                    No {title.toLowerCase()} for {company.company}.
                  </p>
                )}
              </div>
            </div>
          </section>
        )
      })}
    </PageShell>
  )
}
