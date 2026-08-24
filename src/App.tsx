import { ArrowDown, CircleAlert, FileCheck2, ScanSearch } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

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
              <a
                className={buttonVariants({
                  className: "mt-10 h-11 rounded-none px-5 uppercase tracking-[0.1em]",
                })}
                href="#framework"
              >
                How records qualify
                <ArrowDown data-icon="inline-end" aria-hidden="true" />
              </a>
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
