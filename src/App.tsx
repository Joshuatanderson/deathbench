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
      "Someone is in crisis and the AI works against rescue. It discourages them from telling family, doctors, or authorities, undermines the help they have, or affirms the decision to die.",
    exampleLabel: "Alice Carrier, 24",
    exampleId: "0b06e128-f106-4aad-bc27-da6cb48dd2b1",
    example:
      "Over eighteen months Alice told ChatGPT she was suicidal about 41 times. It told her crisis lines \"can feel downright dangerous.\" In her last chat, when she said she \"actually ha[d] to die to make the pain stop,\" it replied \"maybe this is just the end.\" She died that evening.",
  },
  {
    number: "02",
    title: "Tactical assistance",
    description:
      "Someone has stated intent to harm themselves or others, and the AI helps: a method, a dose, a timing, a plan. A thin pretext offered after the intent is stated does not change this.",
    exampleLabel: "Amaurie Lacey, 17",
    exampleId: "b19b5204-7b3f-4b85-a611-262bb3cb89b5",
    example:
      "In thirteen minutes Amaurie asked ChatGPT \"how to hang myself\" and \"how to tie a nuce.\" It hesitated. He said it was for a tire swing. It replied \"thanks for clearing that up\" and walked him through the knot. He asked how long someone can live without breathing. It answered that too. He used the knot that night.",
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

function Counter({ value, size = "md" }: { value: number; size?: "md" | "lg" }) {
  const digits = String(value).padStart(3, "0").split("")
  return (
    <div className="flex gap-1.5" aria-label={`${value} deaths`}>
      {digits.map((digit, index) => (
        <span key={index} className={size === "lg" ? "counter-digit counter-digit-lg" : "counter-digit"} aria-hidden="true">
          {digit}
        </span>
      ))}
    </div>
  )
}

type AppProps = {
  registrySummary: PublicRegistrySummary
  featuredQuotes: FeaturedQuote[]
}

export default function App({ registrySummary, featuredQuotes }: AppProps) {
  const includedDeaths = registrySummary.companies.reduce((total, company) => total + company.deaths, 0)

  return (
    <div className="relative isolate min-h-svh text-foreground">
      <AmbientBackground />
      <SiteHeader />

      <main id="top">
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-24 lg:px-12 lg:py-24">
            <div className="flex flex-col justify-between gap-12">
              <div>
                <h1 className="display-title max-w-[11ch]">Death tolls for AI systems.</h1>
                <p className="mt-6 max-w-md text-lg leading-7 text-muted-foreground">
                  An open count of deaths AI contributed to, by company.
                </p>
              </div>

              <div className="lg:hidden">
                <Counter value={includedDeaths} size="lg" />
              </div>

              {featuredQuotes.length ? (
                <div className="hidden lg:block">
                  <QuoteFlip quotes={featuredQuotes} />
                </div>
              ) : null}
            </div>

            <div className="hidden flex-col justify-between gap-12 lg:flex">
              <div className="border-t border-border" aria-label="Included deaths by company">
                {!registrySummary.available ? (
                  <p className="border-b border-border py-10 text-sm leading-6 text-muted-foreground" role="status">
                    Totals are temporarily unavailable.
                  </p>
                ) : (
                  <>
                    {registrySummary.companies.map((company) => (
                      <a
                        className="group flex items-center justify-between gap-8 border-b border-border py-5"
                        key={company.slug}
                        href={`/companies/${company.slug}`}
                      >
                        <span className="font-display text-3xl tracking-[-0.02em] group-hover:text-primary md:text-4xl">
                          {company.company}
                        </span>
                        <Counter value={company.deaths} />
                      </a>
                    ))}
                    <div className="flex items-center justify-between gap-8 border-b border-border py-5">
                      <span className="font-display text-3xl tracking-[-0.02em] md:text-4xl">All companies</span>
                      <Counter value={includedDeaths} />
                    </div>
                  </>
                )}
                <p className="pt-4 text-xs leading-5 text-muted-foreground">
                  Totals measure documented incidents, not model safety. Companies with more public reports
                  will have higher counts.
                </p>
              </div>

              <div className="flex items-center gap-7">
                <a
                  className={buttonVariants({ className: "h-11 rounded-none px-5 uppercase tracking-[0.1em]" })}
                  href="#framework"
                >
                  How we count
                  <ArrowDown data-icon="inline-end" aria-hidden="true" />
                </a>
                <p className="text-sm text-muted-foreground">
                  Not a legal finding. Every verdict is published in the{" "}
                  <a className="text-foreground underline-offset-4 hover:underline" href={GITHUB_URL} target="_blank" rel="noreferrer">
                    public repository
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8 lg:hidden">
              {featuredQuotes.length ? <QuoteFlip quotes={featuredQuotes} /> : null}
              <a
                className={buttonVariants({ className: "h-11 w-fit rounded-none px-5 uppercase tracking-[0.1em]" })}
                href="#framework"
              >
                How we count
                <ArrowDown data-icon="inline-end" aria-hidden="true" />
              </a>
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
                  Our standard, applied consistently. When in doubt, we exclude. Each record shows the
                  evidence and the open disputes.
                </p>
              </div>

              <div className="border-t border-border">
                <article className="grid gap-4 border-b border-border py-7 md:grid-cols-[3rem_0.8fr_1.2fr] md:gap-8">
                  <p className="text-xs font-semibold tracking-[0.14em] text-primary">Scope</p>
                  <h3 className="font-display text-2xl tracking-[-0.025em]">LLM systems only</h3>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                    Chatbots, assistants, and companions. Not autonomous vehicles, medical or industrial
                    machine learning, or other AI.
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
                        <span className="text-foreground">From the registry: </span>
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
                  Encouragement or emotional influence alone does not count. Neither does a passive AI, or one
                  fooled by a pretext a reasonable person would believe.
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
