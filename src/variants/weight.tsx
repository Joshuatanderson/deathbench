import { useEffect, useMemo, useRef, useState } from "react"

import { GITHUB_URL, LINKEDIN_URL, TWITTER_URL } from "@/components/site"
import { copy, hostname, type VariantData } from "./data"
import "./weight.css"

type Block = { key: string; incidentId: string; label: string }
type Column = { company: string; slug: string; deaths: number; blocks: Block[] }

function shortTitle(title: string) {
  // "Robert Morales and Tiru Chabba — Florida State University shooting" → keep it readable on a 44px block.
  return title.split(" — ")[0]
}

function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (!("IntersectionObserver" in window)) {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen, threshold])
  return [ref, seen] as const
}

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

const FALL_MS = 700
const STAGGER_MS = 140

function StackColumn({ column, armed, reduced }: { column: Column; armed: boolean; reduced: boolean }) {
  const [count, setCount] = useState(reduced || !armed ? column.deaths : 0)
  const [punch, setPunch] = useState(false)

  useEffect(() => {
    if (reduced) {
      setCount(column.deaths)
      return
    }
    if (!armed) return
    const timers = column.blocks.map((_, i) =>
      window.setTimeout(() => {
        setCount(i + 1)
        setPunch(true)
        window.setTimeout(() => setPunch(false), 160)
      }, FALL_MS + i * STAGGER_MS)
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [armed, reduced, column])

  return (
    <div className="w-col">
      <p className={`w-col-total ${punch ? "is-punch" : ""}`} aria-label={`${column.deaths} deaths`}>
        {count}
      </p>
      <ol className={`w-stack ${armed ? "is-armed" : ""} ${reduced ? "is-static" : ""}`}>
        {column.blocks.map((block, i) => (
          <li
            key={block.key}
            className="w-block"
            style={{ ["--i" as string]: i }}
          >
            <a href={`/incidents/${block.incidentId}`}>{block.label}</a>
          </li>
        ))}
      </ol>
      <a className="w-col-name" href={`/companies/${column.slug}`}>
        {column.company}
      </a>
    </div>
  )
}

function Stack({ data }: { data: VariantData }) {
  const reduced = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(0.3)

  const columns = useMemo<Column[]>(() => {
    const included = data.incidents.filter((i) => i.verdict === "included")
    return data.registrySummary.companies
      .filter((c) => c.deaths > 0)
      .map((c) => {
        const blocks: Block[] = []
        for (const inc of included.filter((i) => i.companySlug === c.slug)) {
          const n = Math.max(1, inc.victimCount)
          for (let k = 1; k <= n; k++) {
            blocks.push({
              key: `${inc.id}-${k}`,
              incidentId: inc.id,
              label: n > 1 ? `${shortTitle(inc.title)} · ${k}/${n}` : shortTitle(inc.title),
            })
          }
        }
        // Bottom block falls first: order list bottom-up (flex column-reverse).
        return { company: c.company, slug: c.slug, deaths: c.deaths, blocks }
      })
  }, [data])

  const counted = new Set(columns.map((c) => c.slug))
  const empties = Array.from(
    new Map(
      data.incidents.filter((i) => !counted.has(i.companySlug)).map((i) => [i.companySlug, i.company])
    )
  ).map(([slug, company]) => ({ slug, company }))
  const mismatch = columns.find((c) => c.blocks.length !== c.deaths)

  return (
    <section className="w-section w-stack-section" id="stack">
      <h2 className="w-h2">
        Included deaths
        <br />
        by company
      </h2>
      <div className="w-stack-area" ref={ref}>
        {columns.length ? (
          columns.map((column) => <StackColumn key={column.slug} column={column} armed={seen} reduced={reduced} />)
        ) : (
          <p className="w-muted">No included incidents yet.</p>
        )}
      </div>
      <div className="w-floor" aria-hidden="true" />
      {mismatch ? (
        <p className="w-muted">
          Note: block count for {mismatch.company} differs from the company total ({mismatch.deaths}).
        </p>
      ) : null}
      {empties.length ? (
        <p className="w-empties">
          <span>No included incidents —</span>{" "}
          {empties.map((c, i) => (
            <span key={c.slug}>
              <a href={`/companies/${c.slug}`}>{c.company}</a>
              {i < empties.length - 1 ? " / " : ""}
            </span>
          ))}
        </p>
      ) : null}
      <p className="w-muted w-totals-note">{copy.totalsNote}</p>
    </section>
  )
}

function Ring({ data }: { data: VariantData }) {
  const reduced = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const quotes = data.featuredQuotes
  if (!quotes.length) return null

  const item = (q: VariantData["featuredQuotes"][number]) => (
    <li className="w-ring-item" key={q.id}>
      <p className="w-ring-quote">“{q.text}”</p>
      <p className="w-ring-meta">
        <a href={`/incidents/${q.incidentId}`}>
          — {q.model}, {q.incidentTitle}
        </a>
        <a href={q.source.url} target="_blank" rel="noreferrer">
          Source: {hostname(q.source.url)}
        </a>
      </p>
      <span className="w-ring-sep" aria-hidden="true">
        ◆
      </span>
    </li>
  )
  const rowA = quotes.filter((_, i) => i % 2 === 0)
  const rowB = quotes.filter((_, i) => i % 2 === 1)
  const items = quotes.map(item)

  return (
    <section className="w-section w-ring-section">
      <p className="w-label">From the conversations — verbatim system output</p>
      {reduced ? (
        <ul className="w-ring-static">{items}</ul>
      ) : (
        <div className="w-ring-band">
          {[rowA, rowB].map((row, r) => (
            <div
              key={r}
              className={`w-ring-track ${r === 1 ? "is-reverse" : ""} ${paused ? "is-paused" : ""}`}
              style={{ ["--n" as string]: row.length }}
            >
              <ul className="w-ring-list">{row.map(item)}</ul>
              <ul className="w-ring-list" aria-hidden="true">
                {row.map(item)}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="w-ring-foot">
        <p className="w-muted">{copy.quotesNote}</p>
        {!reduced ? (
          <button type="button" className="w-toggle" onClick={() => setPaused((p) => !p)}>
            {paused ? "Play" : "Pause"}
          </button>
        ) : null}
      </div>
    </section>
  )
}

function RuleRow({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  const [ref, seen] = useInView<HTMLElement>(0.05)
  return (
    <article ref={ref} className={`w-rule-row ${seen ? "is-in" : ""}`}>
      <p className="w-rule-num">{number}</p>
      <h3 className="w-rule-title">{title}</h3>
      <div className="w-rule-body">{children}</div>
    </article>
  )
}

export default function Variant({ data }: { data: VariantData }) {
  const incidents = data.incidents.length
  const deaths = data.registrySummary.companies.reduce((t, c) => t + c.deaths, 0)
  const years = Array.from(
    new Set(data.incidents.map((i) => i.deathDate.match(/20\d\d/)?.[0]).filter(Boolean))
  ).sort() as string[]

  return (
    <div className="v-weight">
      <header className="w-mast">
        <a className="w-mast-brand" href="/">
          <img src="/deathbench-skull-white.svg" alt="" aria-hidden="true" />
          <span>DeathBench</span>
        </a>
        <p className="w-label">
          Open record · {incidents} incidents · {deaths} deaths counted
        </p>
      </header>

      <section className="w-hero">
        <h1 className="w-h1" aria-label={copy.headline}>
          <span className="w-h1-line">
            <span>Death</span>
          </span>
          <span className="w-h1-line">
            <span>Tolls for</span>
          </span>
          <span className="w-h1-line">
            <span className="w-orange">AI systems.</span>
          </span>
        </h1>
        <div className="w-hero-side">
          <p className="w-stand">{copy.standfirst}</p>
          <p className="w-body">
            All of this is open. Every verdict, its reasoning, and the research behind it are published here
            and in the{" "}
            <a className="w-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
              public repository
            </a>
            .
          </p>
          <a className="w-btn" href="#rules">
            See the rules ↓
          </a>
        </div>
        <div className="w-hazard" aria-hidden="true">
          {years.map((y) => (
            <span key={y}>{y}</span>
          ))}
        </div>
      </section>

      <Ring data={data} />
      <Stack data={data} />

      <section className="w-section w-rules" id="rules">
        <h2 className="w-h2">
          How an incident
          <br />
          qualifies
        </h2>
        <p className="w-stand w-rules-intro">{copy.whenInDoubt}</p>
        <div className="w-rule-grid">
          <RuleRow number="Scope" title={copy.scope.title}>
            <p>{copy.scope.body}</p>
          </RuleRow>
          {copy.patterns.map((p) => (
            <RuleRow key={p.number} number={p.number} title={p.title}>
              <p>{p.description}</p>
              <p className="w-example">
                <a className="w-link" href={`/incidents/${p.exampleId}`}>
                  {p.exampleLabel}
                </a>
                . {p.example}
              </p>
            </RuleRow>
          ))}
        </div>
        <p className="w-muted w-exclusions">{copy.exclusions}</p>
      </section>

      <footer className="w-footer">
        <div className="w-footer-grid">
          <div className="w-label">
            <p>© {new Date().getFullYear()} Mandrake Labs</p>
            <p>
              Authored by Josh Anderson ·{" "}
              <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">
                LinkedIn
              </a>{" "}
              ·{" "}
              <a href={TWITTER_URL} target="_blank" rel="noreferrer">
                @Joshuaa_eth
              </a>
            </p>
          </div>
          <div>
            <p className="w-label">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                Open data and source on GitHub
              </a>
            </p>
            <p className="w-muted">{copy.disclaimer}</p>
          </div>
        </div>
        <div className="w-crop" aria-hidden="true">
          <span>DeathBench</span>
        </div>
      </footer>
    </div>
  )
}
