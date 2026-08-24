import { ArrowDown, CircleAlert, FileCheck2, ScanSearch } from "lucide-react"

import { Button } from "@/components/ui/button"

const standards = [
  {
    number: "01",
    title: "Direct operation",
    description:
      "An AI system takes, recommends, or executes an action that directly results in a death.",
  },
  {
    number: "02",
    title: "Enabled harm",
    description:
      "A system materially expands a person or organization’s ability to cause fatal harm.",
  },
  {
    number: "03",
    title: "Systemic contribution",
    description:
      "Deployment, automation, or failed oversight contributes to a fatal outcome in a documented chain of events.",
  },
]

function scrollToFramework() {
  document.querySelector("#framework")?.scrollIntoView({ behavior: "smooth" })
}

export default function App() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <a
            className="flex items-center gap-3 font-semibold tracking-[-0.03em]"
            href="#top"
            aria-label="DeathBench home"
          >
            <span className="grid size-7 place-items-center bg-primary text-xs font-black text-primary-foreground">
              DB
            </span>
            <span>DeathBench</span>
          </a>

          <div className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="hidden sm:inline">Dataset in review</span>
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
                Independent public-interest research
              </p>
              <h1 className="display-title max-w-[11ch]">
                Independent accounting of AI’s human cost.
              </h1>
              <p className="mt-10 max-w-2xl text-balance text-lg leading-8 text-muted-foreground md:text-xl">
                DeathBench is a source-linked public record of deaths caused or
                enabled by artificial intelligence—built to separate evidence
                from speculation and accountability from hype.
              </p>
              <Button
                className="mt-10 h-11 rounded-none px-5 uppercase tracking-[0.1em]"
                onClick={scrollToFramework}
              >
                How records qualify
                <ArrowDown data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>

            <aside className="self-end border-t border-border lg:border-t-0">
              <div className="grid grid-cols-[2rem_1fr] gap-4 border-b border-border py-6">
                <ScanSearch className="mt-1 size-4 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                    Registry
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Incident-level evidence with sources, dates, systems, and
                    attribution status.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[2rem_1fr] gap-4 border-b border-border py-6">
                <FileCheck2 className="mt-1 size-4 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                    Standard
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Explicit causal categories, confidence levels, and a public
                    correction trail.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-b border-border" aria-labelledby="index-title">
          <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-12 lg:py-24">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="section-label">Index preview</p>
                <h2 id="index-title" className="section-title mt-3">
                  No number before the evidence.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Public totals remain withheld until the first methodology and
                source review is complete.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
              <article className="instrument-panel">
                <div className="flex items-start justify-between gap-4">
                  <p className="instrument-label">Verified fatalities</p>
                  <span className="signal-square" aria-hidden="true" />
                </div>
                <p className="instrument-value" aria-label="Not yet published">
                  —
                </p>
                <p className="instrument-note">Publication pending review</p>
              </article>

              <article className="instrument-panel">
                <div className="flex items-start justify-between gap-4">
                  <p className="instrument-label">Case review</p>
                  <span className="signal-square signal-square-muted" aria-hidden="true" />
                </div>
                <p className="instrument-value instrument-value-word">Active</p>
                <p className="instrument-note">Cross-source verification</p>
              </article>

              <article className="instrument-panel">
                <div className="flex items-start justify-between gap-4">
                  <p className="instrument-label">Geographic scope</p>
                  <span className="signal-square signal-square-dim" aria-hidden="true" />
                </div>
                <p className="instrument-value instrument-value-word">Global</p>
                <p className="instrument-note">All model-mediated domains</p>
              </article>
            </div>

            <div className="mt-px border border-border bg-card">
              <div className="flex flex-col justify-between gap-4 border-b border-border p-5 md:flex-row md:items-center md:p-6">
                <div>
                  <p className="instrument-label">Cumulative verified fatalities</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Source-linked records over time
                  </p>
                </div>
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-primary">
                  Series locked
                </p>
              </div>
              <div className="chart-field grid min-h-72 place-items-center px-6 text-center">
                <div className="max-w-md bg-card px-6 py-5">
                  <p className="font-display text-2xl tracking-[-0.025em] text-foreground">
                    The record opens when the evidence is ready.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    No estimates, projections, or unsourced totals will appear
                    in the public index.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="framework" className="border-b border-border scroll-mt-8">
          <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
              <div>
                <p className="section-label">Attribution framework</p>
                <h2 className="section-title mt-3 max-w-[10ch]">What will count.</h2>
                <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
                  Inclusion does not imply legal liability or intent. Each record
                  states what is known, what is disputed, and why the case meets
                  its published threshold.
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
          <p>Measuring machine-made mortality.</p>
        </div>
      </footer>
    </div>
  )
}
