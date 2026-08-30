import { data } from "react-router"

import { getPublicIncident } from "../../server/public-registry"
import { AllegationNotice, PageShell, VerdictBadge, verdictDescriptions } from "@/components/site"
import type { Route } from "./+types/incident"

export async function loader({ params }: Route.LoaderArgs) {
  const incident = await getPublicIncident(params.id)
  if (!incident) throw data("Incident not found", { status: 404 })
  return incident
}

export function meta({ loaderData: incident }: Route.MetaArgs) {
  return [
    { title: `${incident?.title ?? "Incident"} — DeathBench` },
    {
      name: "description",
      content: incident
        ? `${incident.company} · ${incident.model}. The alleged chain of events, sources, and the author's verdict.`
        : "DeathBench incident record.",
    },
  ]
}

const pathwayLabels: Record<string, string> = {
  "direct-operation": "Direct operation",
  "enabled-harm": "Enabled harm",
  "systemic-contribution": "Systemic contribution",
}

const transcriptLabels: Record<string, string> = {
  none: "No conversation record available",
  excerpts: "Excerpts only",
  partial: "Partial record",
  "complete-final": "Complete record",
  sealed: "Sealed",
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function Block({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.58fr_1.42fr] lg:gap-24">
          <div>
            <p className="section-label">{label}</p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.03em]">{title}</h2>
          </div>
          <div className="max-w-3xl">{children}</div>
        </div>
      </div>
    </section>
  )
}

function Prose({ text, empty }: { text: string; empty: string }) {
  if (!text.trim()) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="space-y-4 text-base leading-7 text-foreground/90">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

export default function Incident({ loaderData: incident }: Route.ComponentProps) {
  const facts: Array<[string, string]> = [
    ["Company", incident.company],
    ["System", incident.model],
    ["Deaths", String(incident.victimCount)],
    ["Minors", String(incident.minorVictimCount)],
    ["Date of death", incident.deathDate || "Unknown"],
    ["Location", incident.location || "Unknown"],
    ["Case reference", incident.caseReference || "—"],
    ["Pathway", incident.pathway ? pathwayLabels[incident.pathway] ?? incident.pathway : "—"],
    ["Conversation record", transcriptLabels[incident.transcriptStatus] ?? incident.transcriptStatus],
  ]

  return (
    <PageShell>
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-20 lg:px-12">
          <a
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            href={`/companies/${incident.companySlug}`}
          >
            ← {incident.company}
          </a>
          <p className="section-label mt-8">Incident record</p>
          <h1 className="section-title mt-3 max-w-[18ch]">{incident.title}</h1>
          <div className="mt-8 max-w-3xl">
            <AllegationNotice />
          </div>

          <dl className="mt-10 grid max-w-4xl gap-x-8 gap-y-5 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 text-sm leading-6">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Block label="Verdict" title="The author's verdict.">
        <div className="flex flex-wrap items-center gap-4">
          <VerdictBadge verdict={incident.verdict} />
          <p className="text-sm text-muted-foreground">{verdictDescriptions[incident.verdict]}</p>
        </div>
        {incident.reviewedAt ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Reviewed {incident.reviewedAt.slice(0, 10)} under the standard rules.
          </p>
        ) : null}
        <div className="mt-6">
          <Prose text={incident.verdictReasoning} empty="No reasoning has been recorded yet." />
        </div>
      </Block>

      <Block label="Allegation" title="The alleged chain of events.">
        <Prose text={incident.claimSummary} empty="No summary recorded." />
      </Block>

      {incident.evidenceSummary.trim() ? (
        <Block label="Evidence" title="What the record shows.">
          <Prose text={incident.evidenceSummary} empty="" />
        </Block>
      ) : null}

      {incident.counterevidence.trim() ? (
        <Block label="Counterevidence" title="What cuts the other way.">
          <Prose text={incident.counterevidence} empty="" />
        </Block>
      ) : null}

      <Block label="Sources" title="Primary source and other sources.">
        <div className="border-t border-border">
          <div className="border-b border-border py-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">Primary source</p>
            <a
              className="mt-1 block break-all text-sm font-semibold underline-offset-4 hover:underline"
              href={incident.primarySource}
              target="_blank"
              rel="noreferrer"
            >
              {hostname(incident.primarySource)}
              <span className="ml-2 font-normal text-muted-foreground">{incident.primarySource}</span>
            </a>
          </div>
          {incident.transcriptLink ? (
            <div className="border-b border-border py-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Conversation record
              </p>
              <a
                className="mt-1 block break-all text-sm underline-offset-4 hover:underline"
                href={incident.transcriptLink}
                target="_blank"
                rel="noreferrer"
              >
                {incident.transcriptLink}
              </a>
            </div>
          ) : null}
          {incident.sourceLinks.length ? (
            <ul>
              {incident.sourceLinks.map((source) => (
                <li className="border-b border-border py-4" key={source.url}>
                  <a
                    className="block text-sm underline-offset-4 hover:underline"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="font-semibold">{source.label}</span>
                    <span className="ml-2 break-all text-muted-foreground">{hostname(source.url)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">No additional sources recorded.</p>
          )}
        </div>
      </Block>
    </PageShell>
  )
}
