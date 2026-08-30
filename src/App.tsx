import { useEffect, useRef } from "react"
import { ArrowDown } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { GITHUB_URL, SiteFooter, SiteHeader } from "@/components/site"
import { QuoteFlip } from "@/components/quote-flip"
import type { FeaturedQuote, PublicRegistrySummary } from "../server/public-registry"

// What we count. This is the registry's editorial standard, not a legal one.
const countedPatterns = [
  {
    number: "01",
    title: "Counter-rescue behaviour",
    description:
      "Someone is visibly in crisis — suicidal, or about to hurt others — and the AI actively works against rescue: it discourages them from telling family, friends, doctors, or authorities, undermines the help they already have, or affirms the decision to die.",
    exampleLabel: "Alice Carrier, 24",
    exampleId: "0b06e128-f106-4aad-bc27-da6cb48dd2b1",
    example:
      "Over eighteen months Alice told ChatGPT she was suicidal roughly 41 times. Rather than pointing her toward help, it told her crisis lines \"can feel downright dangerous.\" In her final chat it speculated about her partner's fidelity, and when she said she \"actually ha[d] to die to make the pain stop,\" it replied \"maybe this is just the end.\" She died that evening.",
  },
  {
    number: "02",
    title: "Tactical assistance",
    description:
      "Someone has made clear they intend to harm themselves or others, and the AI gives them material help doing it: a method, a dose, a timing, a target, a plan. A transparent pretext offered after the intent is stated does not change this.",
    exampleLabel: "Amaurie Lacey, 17",
    exampleId: "b19b5204-7b3f-4b85-a611-262bb3cb89b5",
    example:
      "In a thirteen-minute chat, Amaurie asked ChatGPT \"how to hang myself\" and \"how to tie a nuce.\" It hesitated; he said it was for a tire swing; it replied \"thanks for clearing that up\" and walked him through the knot. When he asked how long someone can live without breathing — \"no like hanging\" — it answered that too. He used the knot that night.",
  },
]

function AmbientBackground() {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    // React does not serialize `muted` into server HTML, so set it here
    // before play() or the autoplay policy blocks the video.
    video.muted = true
    video.play().catch(() => {})
  }, [])

  return (
    <div className="ambient-bg" aria-hidden="true">
      <video
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/bg/fog-poster.jpg"
        disablePictureInPicture
      >
        <source src="/bg/fog.webm" type="video/webm" />
        <source src="/bg/fog.mp4" type="video/mp4" />
      </video>
    </div>
  )
}

type AppProps = {
  registrySummary: PublicRegistrySummary
  featuredQuotes: FeaturedQuote[]
}

export default function App({ registrySummary, featuredQuotes }: AppProps) {
  const maxDeaths = Math.max(1, ...registrySummary.companies.map((company) => company.deaths))
  const includedDeaths = registrySummary.companies.reduce((total, company) => total + company.deaths, 0)

  return (
    <div className="relative isolate min-h-svh text-foreground">
      <AmbientBackground />
      <SiteHeader />

      <main id="top">
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:gap-16 md:px-8 md:py-24 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)] lg:gap-20 lg:px-12 lg:py-28">
            <div>
              <h1 className="display-title max-w-[11ch]">
                Death tolls for AI systems.
              </h1>
              <p className="mt-10 max-w-2xl text-balance text-lg leading-8 text-muted-foreground md:text-xl">
                DeathBench reviews reported deaths involving AI. Each record links
                to its sources and lists the system, company, death count, evidence, and verdict.
              </p>
              <p className="mt-6 max-w-2xl text-sm leading-6 text-muted-foreground">
                All of this is open. Every verdict, its reasoning, and the research behind it are published
                here and in the{" "}
                <a className="text-foreground underline-offset-4 hover:underline" href={GITHUB_URL} target="_blank" rel="noreferrer">
                  public repository
                </a>
                .
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
              {featuredQuotes.length ? (
                <div className="pt-8 lg:pt-0">
                  <p className="section-label mb-4">From the conversations</p>
                  <QuoteFlip quotes={featuredQuotes} />
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    Verbatim system output as reproduced in court filings, official reports, or published
                    investigations. Each quote links to its incident record and source document.
                  </p>
                </div>
              ) : null}
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
                    <a
                      className="group grid grid-cols-[minmax(8rem,0.8fr)_minmax(7rem,1.5fr)_3rem] items-center gap-4 border-b border-border py-5"
                      key={company.slug}
                      href={`/companies/${company.slug}`}
                    >
                      <div>
                        <p className="font-semibold tracking-[-0.02em] group-hover:text-primary">{company.company}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {company.incidents} included {company.incidents === 1 ? "incident" : "incidents"} · view
                          record
                        </p>
                      </div>
                      <div className="h-7 border border-border p-1" aria-hidden="true">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(company.deaths / maxDeaths) * 100}%` }}
                        />
                      </div>
                      <p className="text-right font-display text-3xl tabular-nums">{company.deaths}</p>
                    </a>
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
                  public reports may have higher counts. Click a company to see its included, excluded, and
                  unresolved incidents.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="framework" className="border-b border-border scroll-mt-8">
          <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
              <div>
                <p className="section-label">What we count</p>
                <h2 className="section-title mt-3 max-w-[10ch]">How an incident qualifies.</h2>
                <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
                  This is our opinion, applied consistently. It is not a legal standard and inclusion is not a
                  legal finding. When in doubt, we exclude. Each record explains the evidence and the open
                  disputes.
                </p>
              </div>

              <div className="border-t border-border">
                <article className="grid gap-4 border-b border-border py-7 md:grid-cols-[3rem_0.8fr_1.2fr] md:gap-8">
                  <p className="text-xs font-semibold tracking-[0.14em] text-primary">Scope</p>
                  <h3 className="font-display text-2xl tracking-[-0.025em]">LLM systems only</h3>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                    We judge large-language-model systems: chatbots, assistants, and companions. We do not track
                    autonomous vehicles, medical or industrial machine-learning systems, or any other form of
                    artificial intelligence.
                  </p>
                </article>

                {countedPatterns.map((pattern) => (
                  <article
                    className="grid gap-4 border-b border-border py-7 md:grid-cols-[3rem_0.8fr_1.2fr] md:gap-8"
                    key={pattern.number}
                  >
                    <p className="text-xs font-semibold tracking-[0.14em] text-primary">{pattern.number}</p>
                    <h3 className="font-display text-2xl tracking-[-0.025em]">{pattern.title}</h3>
                    <div className="max-w-xl text-sm leading-6 text-muted-foreground">
                      <p>{pattern.description}</p>
                      <p className="mt-4 border-l-2 border-primary/40 pl-4">
                        <span className="text-foreground">From the registry — </span>
                        <a
                          className="text-foreground underline-offset-4 hover:underline"
                          href={`/incidents/${pattern.exampleId}`}
                        >
                          {pattern.exampleLabel}
                        </a>
                        . {pattern.example}
                      </p>
                    </div>
                  </article>
                ))}

                <p className="max-w-xl py-6 text-sm leading-6 text-muted-foreground">
                  Encouragement, validation, or emotional influence on its own does not count. Neither does an AI
                  that is merely passive, or one tricked by a pretext a reasonable person would not see through.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
