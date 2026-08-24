import { ArrowDown, CircleAlert, FileCheck2, ScanSearch } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import type { PublicRegistrySummary } from "../server/public-registry"

const standards = [
  {
    number: "01",
    title: "Direct operation",
    description:
      "An AI system performs an action, or gives instructions, that directly causes a death.",
  },
  {
    number: "02",
    title: "Enabled harm",
    description:
      "An AI system provides information or tools that substantially increase the ability to cause a death.",
  },
  {
    number: "03",
    title: "Systemic contribution",
    description:
      "An AI system contributes to a death through its deployment, automated decisions, or inadequate human oversight. The evidence must show the chain of events.",
  },
]

type AppProps = {
  registrySummary: PublicRegistrySummary
}

export default function App({ registrySummary }: AppProps) {
  const maxDeaths = Math.max(1, ...registrySummary.companies.map((company) => company.deaths))
  const includedDeaths = registrySummary.companies.reduce((total, company) => total + company.deaths, 0)

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <a
            className="flex items-center gap-3 font-semibold tracking-[-0.03em]"
            href="#top"
            aria-label="DeathBench home"
          >
            <img
              className="size-7 object-contain"
              src="/deathbench-skull-white.svg"
              alt=""
              aria-hidden="true"
            />
            <span>DeathBench</span>
          </a>

          <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="hidden sm:inline">Data under review</span>
            <span className="sm:hidden">In review</span>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:gap-16 md:px-8 md:py-24 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.55fr)] lg:gap-20 lg:px-12 lg:py-28">
            <div>
              <p className="mb-8 flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
                <CircleAlert className="size-4" aria-hidden="true" />
                Independent research project
              </p>
              <h1 className="display-title max-w-[11ch]">
                Deaths linked to AI systems.
              </h1>
              <p className="mt-10 max-w-2xl text-balance text-lg leading-8 text-muted-foreground md:text-xl">
                DeathBench reviews reported deaths involving AI. Each record links
                to its sources and lists the system, company, death count, evidence, and verdict.
              </p>
              <a
                className={buttonVariants({
                  className: "mt-10 h-11 rounded-none px-5 uppercase tracking-[0.1em]",
                })}
                href="#framework"
              >
                See inclusion rules
                <ArrowDown data-icon="inline-end" aria-hidden="true" />
              </a>
            </div>

            <aside className="self-end border-t border-border lg:border-t-0">
              <div className="grid grid-cols-[2rem_1fr] gap-4 border-b border-border py-6">
                <ScanSearch className="mt-1 size-4 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                    Incident records
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Each record includes sources, the AI system, the company,
                    the number of deaths, and the current verdict.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[2rem_1fr] gap-4 border-b border-border py-6">
                <FileCheck2 className="mt-1 size-4 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                    Review rules
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    The same inclusion rules and evidence classes apply to every
                    incident.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="companies" className="border-b border-border scroll-mt-8">
          <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.58fr_1.42fr] lg:gap-24">
              <div>
                <p className="section-label">Company totals</p>
                <h2 className="section-title mt-3 max-w-[11ch]">Included deaths by company.</h2>
                <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
                  A company total changes only when a reviewer marks an incident as included. Excluded and
                  unresolved incidents do not affect the total.
                </p>
                <p className="mt-8 text-sm leading-6 text-muted-foreground">
                  <span className="font-semibold text-foreground">{includedDeaths}</span> deaths across all
                  included incidents.
                </p>
              </div>

              <div className="border-t border-border" aria-label="Included deaths by company">
                <div className="grid grid-cols-[minmax(8rem,0.8fr)_minmax(7rem,1.5fr)_3rem] gap-4 border-b border-border py-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Company</span>
                  <span>Included deaths</span>
                  <span className="text-right">Count</span>
                </div>

                {!registrySummary.available ? (
                  <p className="border-b border-border py-10 text-sm leading-6 text-muted-foreground" role="status">
                    Company totals are temporarily unavailable.
                  </p>
                ) : registrySummary.companies.length ? (
                  registrySummary.companies.map((company) => (
                    <div
                      className="grid grid-cols-[minmax(8rem,0.8fr)_minmax(7rem,1.5fr)_3rem] items-center gap-4 border-b border-border py-5"
                      key={company.company}
                    >
                      <div>
                        <p className="font-semibold tracking-[-0.02em]">{company.company}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {company.incidents} included {company.incidents === 1 ? "incident" : "incidents"}
                        </p>
                      </div>
                      <div className="h-7 border border-border p-1" aria-hidden="true">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(company.deaths / maxDeaths) * 100}%` }}
                        />
                      </div>
                      <p className="text-right font-display text-3xl tabular-nums">{company.deaths}</p>
                    </div>
                  ))
                ) : (
                  <div className="border-b border-border py-10">
                    <p className="font-semibold">No included incidents yet.</p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      Unresolved and excluded incidents do not appear in this chart.
                    </p>
                  </div>
                )}

                <p className="py-4 text-xs leading-5 text-muted-foreground">
                  These totals measure documented incidents, not overall model safety. Companies with more
                  public reports may have higher counts.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="framework" className="border-b border-border scroll-mt-8">
          <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
              <div>
                <p className="section-label">Inclusion rules</p>
                <h2 className="section-title mt-3 max-w-[10ch]">How an incident qualifies.</h2>
                <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
                  We include an incident when the evidence supports one of the
                  three links below. Inclusion is not a legal finding. Each
                  record explains the evidence and open disputes.
                </p>
              </div>

              <div className="border-t border-border">
                {standards.map((standard) => (
                  <article
                    className="grid gap-4 border-b border-border py-7 md:grid-cols-[3rem_0.8fr_1.2fr] md:gap-8"
                    key={standard.number}
                  >
                    <p className="text-xs font-semibold tracking-[0.14em] text-primary">
                      {standard.number}
                    </p>
                    <h3 className="font-display text-2xl tracking-[-0.025em]">
                      {standard.title}
                    </h3>
                    <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                      {standard.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 px-5 py-8 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground md:flex-row md:items-center md:px-8 lg:px-12">
          <p className="text-foreground">DeathBench · Est. 2026</p>
          <p>Public data on reported deaths involving AI.</p>
        </div>
      </footer>
    </div>
  )
}
