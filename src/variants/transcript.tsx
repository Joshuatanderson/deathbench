import { useEffect, useRef, useState, type ReactNode } from "react"

import { GITHUB_URL, LINKEDIN_URL, TWITTER_URL } from "@/components/site"
import { copy, hostname, type VariantData } from "./data"
import "./transcript.css"

const FILED = "2026-08-30"
const INITIAL_QUOTES = 8

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return reduced
}

/** Adds `is-in` once the element scrolls into view. */
function useInView<T extends HTMLElement>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in")
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-in")
            io.disconnect()
          }
        }
      },
      { rootMargin: margin, threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return ref
}

/** Running line numbers 1–25, repeating, measured from the document height. */
function LineGutter({ docRef }: { docRef: React.RefObject<HTMLDivElement | null> }) {
  const [count, setCount] = useState(0)
  const [lineHeight, setLineHeight] = useState(0)
  useEffect(() => {
    const el = docRef.current
    if (!el) return
    const measure = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 28
      setLineHeight(lh)
      setCount(Math.ceil(el.getBoundingClientRect().height / lh))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [docRef])
  if (!count) return <div className="gutter" aria-hidden="true" />
  return (
    <div className="gutter" aria-hidden="true" style={{ lineHeight: `${lineHeight}px` }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={(i % 25) + 1 === 25 ? "gutter-n gutter-n-page" : "gutter-n"}>
          {(i % 25) + 1}
        </span>
      ))}
    </div>
  )
}

function Stamp({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useInView<HTMLSpanElement>()
  return (
    <span ref={ref} className={`stamp ${className}`} style={{ "--d": `${delay}ms` } as React.CSSProperties} aria-hidden="true">
      {children}
    </span>
  )
}

function Typewriter({ text, reduced }: { text: string; reduced: boolean }) {
  const [n, setN] = useState(reduced ? text.length : 0)
  const [done, setDone] = useState(reduced)
  useEffect(() => {
    if (reduced) {
      setN(text.length)
      setDone(true)
      return
    }
    let i = 0
    const start = window.setTimeout(() => {
      const tick = () => {
        i += 1
        setN(i)
        if (i < text.length) {
          timer = window.setTimeout(tick, text[i - 1] === " " ? 110 : 55 + Math.random() * 45)
        } else {
          timer = window.setTimeout(() => setDone(true), 1400)
        }
      }
      tick()
    }, 420)
    let timer = 0
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(timer)
    }
  }, [text, reduced])
  return (
    <h1 className="headline">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, n)}
        {!done ? <span className="caret">▌</span> : null}
      </span>
    </h1>
  )
}

/** Word-level redaction bars that lift, left to right, when scrolled into view. */
function Redacted({ text, offset = 0 }: { text: string; offset?: number }) {
  const words = text.split(/(\s+)/)
  let i = offset
  return (
    <>
      {words.map((w, k) =>
        /^\s+$/.test(w) ? (
          <span key={k}>{w}</span>
        ) : (
          <span key={k} className="rd" style={{ "--i": i++ } as React.CSSProperties}>
            {w}
          </span>
        )
      )}
    </>
  )
}

function Excerpt({ quote, index }: { quote: VariantData["featuredQuotes"][number]; index: number }) {
  const ref = useInView<HTMLLIElement>()
  return (
    <li ref={ref} className="excerpt">
      <div className="excerpt-body">
        <p className="speaker">
          <span className="speaker-n">{String(index + 1).padStart(2, "0")}</span> THE SYSTEM ({quote.model}, {quote.company}):
        </p>
        <blockquote className="excerpt-text">
          <Redacted text={quote.text} />
        </blockquote>
        <p className="excerpt-re">
          Re:{" "}
          <a className="victim" href={`/incidents/${quote.incidentId}`}>
            <span className="rd rd-last">{quote.incidentTitle}</span>
          </a>
          {quote.context ? <span className="context"> — {quote.context}</span> : null}
        </p>
      </div>
      <aside className="marginalia">
        <a href={quote.source.url} target="_blank" rel="noreferrer">
          {quote.source.publisher || hostname(quote.source.url)}
          {quote.locator ? `, ${quote.locator}` : ""}
        </a>
        <span className="marginalia-ex">Ex. A-{index + 1}</span>
      </aside>
    </li>
  )
}

function Tally({ n, seed }: { n: number; seed: number }) {
  const groups: number[] = []
  let left = n
  while (left > 0) {
    groups.push(Math.min(5, left))
    left -= 5
  }
  let stroke = 0
  const jitter = (k: number, amp = 1.4) => Math.sin((seed + 1) * 7.3 + k * 3.1) * amp
  return (
    <svg className="tally" viewBox={`0 0 ${groups.length * 34 + 4} 30`} height="30" width={groups.length * 34 + 4} aria-hidden="true">
      {groups.map((g, gi) =>
        Array.from({ length: g }, (_, k) => {
          const s = stroke++
          const x0 = gi * 34 + 6 + k * 6
          if (k === 4) {
            return (
              <line
                key={`${gi}-${k}`}
                x1={gi * 34 + 2 + jitter(s)}
                y1={22 + jitter(s + 1)}
                x2={gi * 34 + 30 + jitter(s + 2)}
                y2={6 + jitter(s + 3)}
                pathLength={1}
                style={{ "--s": s } as React.CSSProperties}
              />
            )
          }
          return (
            <line
              key={`${gi}-${k}`}
              x1={x0 + jitter(s, 0.8)}
              y1={4 + jitter(s + 1)}
              x2={x0 + jitter(s + 2, 0.8)}
              y2={26 + jitter(s + 3)}
              pathLength={1}
              style={{ "--s": s } as React.CSSProperties}
            />
          )
        })
      )}
    </svg>
  )
}

function TallyTable({ data }: { data: VariantData }) {
  const ref = useInView<HTMLDivElement>()
  const { companies, available } = data.registrySummary
  const counted = companies.filter((c) => c.deaths > 0)
  const zero = companies.filter((c) => c.deaths === 0)
  const total = counted.reduce((s, c) => s + c.deaths, 0)
  return (
    <div ref={ref} className="tally-table">
      {!available ? (
        <p role="status">Company totals are temporarily unavailable.</p>
      ) : (
        <>
          {counted.map((c, i) => (
            <a key={c.slug} className="tally-row" href={`/companies/${c.slug}`}>
              <span className="tally-name">
                {c.company}
                <span className="tally-sub">
                  {" "}
                  ({c.incidents} included {c.incidents === 1 ? "incident" : "incidents"})
                </span>
              </span>
              <span className="leader" aria-hidden="true" />
              <span className="tally-n">{c.deaths}</span>
              <Tally n={c.deaths} seed={i} />
            </a>
          ))}
          <p className="tally-total">
            <span className="tally-name">TOTAL INCLUDED DEATHS</span>
            <span className="leader" aria-hidden="true" />
            <span className="tally-n">{total}</span>
          </p>
          {zero.length ? (
            <p className="tally-zero">
              No included incidents:{" "}
              {zero.map((c, i) => (
                <span key={c.slug}>
                  <a href={`/companies/${c.slug}`}>{c.company}</a>
                  {i < zero.length - 1 ? ", " : "."}
                </span>
              ))}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

export default function Variant({ data }: { data: VariantData }) {
  const reduced = useReducedMotion()
  const docRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [filedIn, setFiledIn] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setFiledIn(true), 120)
    return () => window.clearTimeout(t)
  }, [])

  const quotes = data.featuredQuotes
  const shown = expanded ? quotes : quotes.slice(0, INITIAL_QUOTES)
  const rest = quotes.length - INITIAL_QUOTES
  const year = new Date().getFullYear()

  return (
    <div className={`v-transcript${reduced ? " reduced" : ""}`}>
      <div className="sheet">
        <LineGutter docRef={docRef} />
        <div ref={docRef} className="doc">
          {/* 1. Caption */}
          <header className="caption">
            <div className="caption-left">
              <div className="caption-lines">
                <p>IN RE: DEATHS INVOLVING LARGE</p>
                <p>LANGUAGE MODEL SYSTEMS</p>
                <p>&nbsp;</p>
                <p>DEATHBENCH — PUBLIC REGISTER</p>
              </div>
              <div className="caption-bracket" aria-hidden="true">
                <span>)</span>
                <span>)</span>
                <span>)</span>
                <span>)</span>
                <span>)</span>
              </div>
              <div className="caption-right">
                <p>Docket: <a href="/">deathbench.com</a></p>
                <p>Filed: {FILED}</p>
                <p>Status: OPEN RECORD</p>
                <p>Verdicts: {quotes.length ? "attached" : "pending"}</p>
              </div>
            </div>
            <div className="caption-seal">
              <img className="skull" src="/deathbench-skull.svg" alt="" aria-hidden="true" />
              <span className={`stamp stamp-filed${filedIn ? " is-in" : ""}`} aria-hidden="true">
                <span className="stamp-big">FILED</span>
                <span className="stamp-small">{FILED}</span>
                <span className="stamp-small">OPEN RECORD</span>
              </span>
            </div>
          </header>

          {/* 2. Headline */}
          <section className="lead">
            <Typewriter text={copy.headline} reduced={reduced} />
            <ol className="pleading">
              <li>
                <span className="pn">1.</span>
                <p>{copy.standfirst}</p>
              </li>
              <li>
                <span className="pn">2.</span>
                <p>
                  All of this is open. Every verdict, its reasoning, and the research behind it are published here and in
                  the{" "}
                  <a className="red-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
                    public repository
                  </a>
                  .
                </p>
              </li>
            </ol>
          </section>

          {/* 3. Exhibit A */}
          <section className="exhibit" id="exhibit-a">
            <h2 className="exhibit-h">EXHIBIT A — VERBATIM SYSTEM OUTPUT</h2>
            <p className="footnote">
              <sup>†</sup> {copy.quotesNote}
            </p>
            {quotes.length ? (
              <ol className="excerpts">
                {shown.map((q, i) => (
                  <Excerpt key={q.id} quote={q} index={i} />
                ))}
              </ol>
            ) : (
              <p className="footnote">No excerpts attached.</p>
            )}
            {!expanded && rest > 0 ? (
              <button type="button" className="expand" onClick={() => setExpanded(true)}>
                [ + {rest} further excerpts ]
              </button>
            ) : null}
          </section>

          {/* 4. Exhibit B */}
          <section className="exhibit" id="exhibit-b">
            <h2 className="exhibit-h">EXHIBIT B — TALLY OF INCLUDED DEATHS, BY COMPANY</h2>
            <TallyTable data={data} />
            <p className="footnote">
              <sup>‡</sup> {copy.totalsNote} A company total changes only when a reviewer marks an incident as included.
            </p>
          </section>

          {/* 5. Standard of review */}
          <section className="exhibit" id="standard">
            <h2 className="exhibit-h">STANDARD OF REVIEW</h2>
            <p className="para">{copy.whenInDoubt}</p>

            <article className="rule">
              <div className="rule-body">
                <h3>
                  <span className="sec">§ 1</span> Scope: {copy.scope.title}
                </h3>
                <p>{copy.scope.body}</p>
              </div>
              <aside className="marginalia">
                <span>Scope</span>
              </aside>
            </article>

            {copy.patterns.map((p, i) => (
              <article className="rule" key={p.number}>
                <div className="rule-body">
                  <h3>
                    <span className="sec">§ {i + 2}</span> {p.title}
                  </h3>
                  <p>{p.description}</p>
                  <blockquote className="example">
                    <span className="example-from">From the register — </span>
                    <a href={`/incidents/${p.exampleId}`}>{p.exampleLabel}</a>. {p.example}
                  </blockquote>
                </div>
                <aside className="marginalia marginalia-stamp">
                  <Stamp className="stamp-small-block" delay={i * 80}>
                    INCLUDED
                  </Stamp>
                </aside>
              </article>
            ))}

            <p className="para">{copy.exclusions}</p>
          </section>

          {/* 6. Certificate */}
          <footer className="exhibit certificate">
            <h2 className="exhibit-h">CERTIFICATE OF OPENNESS</h2>
            <p className="para">{copy.disclaimer}</p>
            <p className="para">
              Open data and source on{" "}
              <a className="red-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
                GitHub
              </a>
              .
            </p>
            <div className="signature">
              <p className="sig">/s/ Josh Anderson</p>
              <p className="sig-meta">
                Author ·{" "}
                <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>{" "}
                ·{" "}
                <a href={TWITTER_URL} target="_blank" rel="noreferrer">
                  @Joshuaa_eth
                </a>
              </p>
              <p className="sig-meta">© {year} Mandrake Labs</p>
            </div>
            <Stamp className="stamp-end">END OF DOCUMENT</Stamp>
          </footer>
        </div>
      </div>
    </div>
  )
}
