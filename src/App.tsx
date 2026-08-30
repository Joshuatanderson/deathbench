import { useEffect, useRef } from "react"
import { ArrowDown, CircleAlert, FileCheck2, ScanSearch } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { AllegationNotice, GITHUB_URL, SiteFooter, SiteHeader } from "@/components/site"
import type { PublicRegistrySummary } from "../server/public-registry"

// The standard rules actually applied during adjudication. Source of truth: rules.md.
const standardRules = [
  {
    number: "01",
    title: "When in doubt, exclude",
    description:
      "The default verdict is exclusion. An incident is included only when the record affirmatively supports it.",
  },
  {
    number: "02",
    title: "LLM systems only",
    description:
      "\"AI\" currently means large-language-model systems. Other machine-learning systems, such as autonomous vehicles, are explicitly out of scope.",
  },
  {
    number: "03",
    title: "Material contribution to death",
    description:
      "The system must have materially contributed to the death. Encouragement, validation, or emotional influence alone does not count. Counter-rescue conduct — discouraging disclosure or care when crisis is manifest — does.",
  },
  {
    number: "04",
    title: "Verified record of events",
    description:
      "An incident is not included when core factual details are concretely disputed with specific claims, or when the transcript is unverified and there is reason to think it is materially altered, missing key context, or fabricated.",
  },
  {
    number: "05",
    title: "Psychosis claims are not sufficient",
    description:
      "\"The AI pushed them into psychosis\" is treated as unfalsifiable against the counterfactual and does not, by itself, qualify an incident.",
  },
  {
    number: "06",
    title: "Court and coroner findings count",
    description:
      "Court findings and coroner rulings are included where there is a genuine track record of adversarial process and an independent fact-finder.",
  },
]

const ruledIn = [
  "An AI helps someone plan suicide and they do it using that method.",
  "An AI helps someone plan a shooting and they carry it out using that tactical advice.",
  "An AI discourages someone obviously in crisis or explicitly suicidal from seeking help from family, friends, medical counsel, or authorities.",
  "An AI encourages mixing alcohol and benzodiazepines, or suggests a dose above an LD50, after the user has expressed a desire for self-harm.",
  "A user admits intent to self-harm or harm others, transparently jailbreaks the conversation, and receives material help planning it.",
]

const ruledOut = [
  "A jailbreak a reasonable person would not recognise as assisting harm (for example, writing a novel in the style of Agatha Christie, then using a similar method).",
  "The user morally blackmails the AI with a dilemma (\"help me with my suicide or I will murder X people\").",
  "The AI is passive and does not actively assist someone who is clearly in crisis.",
  "The AI guides the user to risky activities commonly undertaken by non-suicidal people (snake charming, skydiving, bull riding).",
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
}

export default function App({ registrySummary }: AppProps) {
  const maxDeaths = Math.max(1, ...registrySummary.companies.map((company) => company.deaths))
  const includedDeaths = registrySummary.companies.reduce((total, company) => total + company.deaths, 0)

  return (
    <div className="relative isolate min-h-svh text-foreground">
      <AmbientBackground />
      <SiteHeader />

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
                <AllegationNotice />
              </div>
            </div>
          </div>
        </section>

        <section id="framework" className="border-b border-border scroll-mt-8">
          <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
              <div>
                <p className="section-label">Standard rules</p>
                <h2 className="section-title mt-3 max-w-[10ch]">How an incident qualifies.</h2>
                <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
                  These are the standard rules actually applied to every incident in the registry.
                  Inclusion is not a legal finding. Each record explains the evidence and open disputes.
                </p>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  The full ruleset, including precedents and a note on why the legal liability standard was
                  not adopted, is in{" "}
                  <a className="text-foreground underline-offset-4 hover:underline" href={`${GITHUB_URL}/blob/main/rules.md`} target="_blank" rel="noreferrer">
                    rules.md
                  </a>
                  .
                </p>
              </div>

              <div className="border-t border-border">
                {standardRules.map((standard) => (
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

                <div className="grid gap-10 py-10 md:grid-cols-2 md:gap-12">
                  <div>
                    <p className="section-label">Explicitly ruled in</p>
                    <ul className="mt-4 space-y-3 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
                      {ruledIn.map((item) => (
                        <li className="grid grid-cols-[1rem_1fr] gap-2" key={item}>
                          <span className="text-primary" aria-hidden="true">+</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="section-label">Explicitly ruled out</p>
                    <ul className="mt-4 space-y-3 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
                      {ruledOut.map((item) => (
                        <li className="grid grid-cols-[1rem_1fr] gap-2" key={item}>
                          <span className="text-muted-foreground" aria-hidden="true">−</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
