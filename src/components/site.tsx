import type { ReactNode } from "react"

import type { PublicVerdict } from "../../server/public-registry"

export const GITHUB_URL = "https://github.com/Joshuatanderson/deathbench"
export const LINKEDIN_URL = "https://www.linkedin.com/in/josh-anderson-sf/"
export const TWITTER_URL = "https://x.com/Joshuaa_eth"

export const verdictLabels: Record<PublicVerdict, string> = {
  included: "Included",
  excluded: "Excluded",
  "under-review": "Under review",
  "resolution-pending": "Insufficient evidence",
  unreviewed: "Not yet reviewed",
}

export const verdictDescriptions: Record<PublicVerdict, string> = {
  included: "The evidence meets our rules, in the author's judgment.",
  excluded: "The evidence does not meet our rules, in the author's judgment.",
  "under-review":
    "Evidence points at a rule. Fact-finding is not finished.",
  "resolution-pending": "The record is too thin to decide.",
  unreviewed: "No human decision yet.",
}

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
        <a className="flex items-center gap-3 font-semibold tracking-[-0.03em]" href="/" aria-label="DeathBench home">
          <img className="size-7 object-contain" src="/deathbench-skull-white.svg" alt="" aria-hidden="true" />
          <span>DeathBench</span>
        </a>

      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 px-5 py-8 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground md:flex-row md:items-center md:px-8 lg:px-12">
        <div className="flex flex-col gap-2">
          <p className="text-foreground">© {new Date().getFullYear()} Mandrake Labs</p>
          <p>
            Authored by Josh Anderson ·{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href={LINKEDIN_URL} target="_blank" rel="noreferrer">
              LinkedIn
            </a>{" "}
            ·{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href={TWITTER_URL} target="_blank" rel="noreferrer">
              @Joshuaa_eth
            </a>
          </p>
        </div>
        <div className="flex flex-col gap-2 md:max-w-md md:text-right">
          <p>
            Open data and source on{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href={GITHUB_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            .
          </p>
          <p className="normal-case tracking-normal">
            Everything here is an allegation unless stated otherwise. Verdicts are the authors&apos; opinion and
            are not a claim of legal responsibility against any AI system or company.
          </p>
        </div>
      </div>
    </footer>
  )
}

export function AllegationNotice() {
  return (
    <aside
      className="border border-primary/40 bg-primary/5 px-5 py-4 text-sm leading-6 text-muted-foreground"
      role="note"
    >
      <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">Notice</p>
      <p>
        Unless otherwise stated, every incident recorded here is <span className="text-foreground">alleged</span>.
        A verdict is the authors' judgment at the time of review, not a legal finding. It may change as
        transcripts, court findings, and coroner rulings become available.
      </p>
    </aside>
  )
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-svh text-foreground">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}

export function VerdictBadge({ verdict }: { verdict: PublicVerdict }) {
  const tone =
    verdict === "included"
      ? "border-primary text-primary"
      : verdict === "excluded"
        ? "border-border text-muted-foreground"
        : "border-chart-2 text-chart-2"
  return (
    <span
      className={`inline-block border px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${tone}`}
    >
      {verdictLabels[verdict]}
    </span>
  )
}
