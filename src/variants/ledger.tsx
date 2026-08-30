import { useEffect, useRef, useState } from "react"

import { GITHUB_URL, LINKEDIN_URL, TWITTER_URL } from "@/components/site"
import type { FeaturedQuote, PublicIncidentIndexEntry } from "../../server/public-registry"
import { copy, hostname, type VariantData } from "./data"
import "./ledger.css"

/* ---------------------------------------------------------------- helpers */

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

function parseDate(text: string): number | null {
  const iso = text.match(/(\d{4})-(\d{2})(?:-(\d{2}))?/)
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, iso[3] ? +iso[3] : 15)
  const monthYear = text.match(/([A-Za-z]{3,9})\s+(\d{4})/)
  if (monthYear) {
    const m = MONTHS.indexOf(monthYear[1].slice(0, 3).toLowerCase())
    if (m >= 0) return Date.UTC(+monthYear[2], m, 15)
  }
  const year = text.match(/(\d{4})/)
  if (year) return Date.UTC(+year[1], 6, 1)
  return null
}

function shortDate(text: string) {
  const iso = text.match(/\d{4}-\d{2}-\d{2}/)
  if (iso) return iso[0]
  const my = text.match(/[A-Za-z]{3,9}\s+\d{4}/)
  return my ? my[0] : text.slice(0, 10)
}

const verdictLabel: Record<string, string> = {
  included: "Included",
  excluded: "Excluded",
  "under-review": "Under review",
  "resolution-pending": "Insufficient evidence",
  unreviewed: "Not yet reviewed",
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return reduced
}

/* ---------------------------------------------------------------- field */

type Point = {
  id: string
  title: string
  verdict: string
  date: string
  company: string
  model: string
  t: number
  u: number
  phase: number
  period: number
  jx: number
  jy: number
}

function buildPoints(incidents: PublicIncidentIndexEntry[]): Point[] {
  const parsed = incidents.map((i) => ({ i, ms: parseDate(i.deathDate) }))
  const known = parsed.filter((p) => p.ms !== null).map((p) => p.ms as number)
  const min = Math.min(...known)
  const max = Math.max(...known)
  const span = Math.max(1, max - min)
  const points: Point[] = []
  for (const { i, ms } of parsed) {
    const t = ms === null ? 1 : (ms - min) / span
    const n = Math.max(1, i.victimCount)
    for (let k = 0; k < n; k++) {
      const ang = hash(i.id + ":" + k) * Math.PI * 2
      const r = n === 1 ? 0 : 3 + hash(i.id + "r" + k) * 3 * Math.sqrt(n)
      points.push({
        id: i.id,
        title: i.title,
        verdict: i.verdict,
        date: shortDate(i.deathDate),
        company: i.company,
        model: i.model,
        t,
        u: hash(i.id),
        phase: hash(i.id + "p") * Math.PI * 2,
        period: 4 + hash(i.id + "q") * 3,
        jx: Math.cos(ang) * r,
        jy: Math.sin(ang) * r,
      })
    }
  }
  return points
}

function yearTicks(incidents: PublicIncidentIndexEntry[]) {
  const ms = incidents.map((i) => parseDate(i.deathDate)).filter((m): m is number => m !== null)
  const min = Math.min(...ms)
  const max = Math.max(...ms)
  const span = Math.max(1, max - min)
  const ticks: { t: number; label: string }[] = []
  for (let y = new Date(min).getUTCFullYear(); y <= new Date(max).getUTCFullYear(); y++) {
    const at = Date.UTC(y, 0, 1)
    if (at >= min && at <= max) ticks.push({ t: (at - min) / span, label: String(y) })
  }
  return ticks
}

type Picked = { p: Point; x: number; y: number }

/**
 * The field lives inside the hero. Points are laid out inside the rect of
 * `bandRef` (a placeholder element in the layout), so on mobile they sit in
 * their own band above the card and never hide behind it.
 */
function Field({
  incidents,
  reduced,
  hostRef,
  bandRef,
}: {
  incidents: PublicIncidentIndexEntry[]
  reduced: boolean
  hostRef: React.RefObject<HTMLElement | null>
  bandRef: React.RefObject<HTMLDivElement | null>
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    const host = hostRef.current
    const band = bandRef.current
    if (!canvas || !host || !band || incidents.length === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const points = buildPoints(incidents)
    const ticks = yearTicks(incidents)
    const specks = Array.from({ length: 220 }, (_, i) => ({
      x: hash("sx" + i),
      y: hash("sy" + i),
      a: 0.04 + hash("sa" + i) * 0.05,
      r: 0.4 + hash("sr" + i) * 0.5,
      d: hash("sd" + i) * Math.PI * 2,
    }))

    let W = 0
    let H = 0
    let region = { x: 0, y: 0, w: 1, h: 1 }
    let raf = 0
    let hidden = document.hidden
    const mouse = { x: -9999, y: -9999, lx: -9999, ly: -9999, inside: false }
    let hover: Point | null = null
    let selected: Point | null = null
    const coarse = window.matchMedia("(pointer: coarse)").matches

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const hr = host!.getBoundingClientRect()
      const br = band!.getBoundingClientRect()
      W = hr.width
      H = hr.height
      region = { x: br.left - hr.left, y: br.top - hr.top, w: br.width, h: br.height }
      canvas!.width = Math.floor(W * dpr)
      canvas!.height = Math.floor(H * dpr)
      canvas!.style.width = W + "px"
      canvas!.style.height = H + "px"
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function axis() {
      const padX = Math.min(48, region.w * 0.08)
      return { x0: region.x + padX, x1: region.x + region.w - padX, base: region.y + region.h - 22 }
    }

    function place(p: Point, time: number) {
      const { x0, x1, base } = axis()
      const top = region.y + 18
      const x0p = x0 + p.t * (x1 - x0)
      const y0 = top + p.u * Math.max(20, base - 26 - top)
      const drift = reduced ? 0 : Math.sin(time / 6000 + p.phase) * 2.5
      let x = x0p + p.jx
      let y = y0 + p.jy + drift
      if (!reduced && mouse.inside && !coarse) {
        const dx = mouse.lx - x
        const dy = mouse.ly - y
        const dist = Math.hypot(dx, dy)
        const pull = Math.max(0, 1 - dist / 220) * 4
        if (dist > 0) {
          x += (dx / dist) * pull
          y += (dy / dist) * pull
        }
      }
      return { x, y }
    }

    function nearest(mx: number, my: number, radius: number) {
      let best: Point | null = null
      let bestD = radius
      const time = performance.now()
      for (const p of points) {
        const { x, y } = place(p, time)
        const d = Math.hypot(mx - x, my - y)
        if (d < bestD) {
          bestD = d
          best = p
        }
      }
      return best
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, W, H)

      for (const s of specks) {
        const dx = reduced ? 0 : Math.sin(time / 9000 + s.d) * 0.8
        const dy = reduced ? 0 : Math.cos(time / 11000 + s.d) * 0.8
        ctx!.fillStyle = `rgba(233,228,216,${s.a})`
        ctx!.beginPath()
        ctx!.arc(s.x * W + dx, s.y * H + dy, s.r, 0, Math.PI * 2)
        ctx!.fill()
      }

      const { x0, x1, base } = axis()
      ctx!.strokeStyle = "rgba(233,228,216,0.14)"
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.moveTo(x0, base + 0.5)
      ctx!.lineTo(x1, base + 0.5)
      ctx!.stroke()
      ctx!.font = "10px 'Courier Prime', 'Courier New', monospace"
      ctx!.fillStyle = "rgba(233,228,216,0.45)"
      ctx!.textAlign = "center"
      for (const tk of ticks) {
        const x = x0 + tk.t * (x1 - x0)
        ctx!.beginPath()
        ctx!.moveTo(x + 0.5, base - 4)
        ctx!.lineTo(x + 0.5, base + 4)
        ctx!.stroke()
        ctx!.fillText(tk.label, x, base + 16)
      }

      let best: Point | null = null
      let bestD = 16
      for (const p of points) {
        const { x, y } = place(p, time)
        if (mouse.inside && !coarse) {
          const d = Math.hypot(mouse.x - x, mouse.y - y)
          if (d < bestD) {
            bestD = d
            best = p
          }
        }
        const active = p === selected || p === hover
        if (p.verdict === "included") {
          const breath = reduced ? 1 : 0.7 + 0.3 * Math.sin((time / 1000 / p.period) * Math.PI * 2 + p.phase)
          const g = ctx!.createRadialGradient(x, y, 0, x, y, 14)
          g.addColorStop(0, `rgba(216,147,58,${0.6 * breath})`)
          g.addColorStop(1, "rgba(216,147,58,0)")
          ctx!.fillStyle = g
          ctx!.beginPath()
          ctx!.arc(x, y, 14, 0, Math.PI * 2)
          ctx!.fill()
          ctx!.fillStyle = `rgba(236,176,96,${0.8 + 0.2 * breath})`
          ctx!.beginPath()
          ctx!.arc(x, y, active ? 3 : 2.3, 0, Math.PI * 2)
          ctx!.fill()
        } else {
          ctx!.fillStyle = "rgba(233,228,216,0.38)"
          ctx!.beginPath()
          ctx!.arc(x, y, active ? 2.4 : 1.6, 0, Math.PI * 2)
          ctx!.fill()
        }
        if (active) {
          ctx!.strokeStyle = p.verdict === "included" ? "rgba(216,147,58,0.8)" : "rgba(233,228,216,0.6)"
          ctx!.beginPath()
          ctx!.arc(x, y, 8, 0, Math.PI * 2)
          ctx!.stroke()
        }
      }

      if (best !== hover) {
        hover = best
        setNear(Boolean(best))
        if (!selected) {
          if (best) {
            const { x, y } = place(best, time)
            setPicked({ p: best, x, y })
          } else setPicked(null)
        }
      }
    }

    function loop(time: number) {
      if (hidden) return
      mouse.lx += (mouse.x - mouse.lx) * 0.06
      mouse.ly += (mouse.y - mouse.ly) * 0.06
      draw(time)
      if (!reduced) raf = requestAnimationFrame(loop)
    }
    function start() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(loop)
    }

    const local = (e: PointerEvent) => {
      const r = host!.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e)
      mouse.x = x
      mouse.y = y
      if (!mouse.inside) {
        mouse.lx = x
        mouse.ly = y
      }
      mouse.inside = true
      if (reduced) start()
    }
    const onLeave = () => {
      mouse.inside = false
      if (reduced) start()
    }
    const onTap = (e: PointerEvent) => {
      const { x, y } = local(e)
      const hit = nearest(x, y, coarse ? 26 : 16)
      selected = hit
      if (hit) {
        const pos = place(hit, performance.now())
        setPicked({ p: hit, x: pos.x, y: pos.y })
      } else setPicked(null)
      if (reduced) start()
    }
    const ro = new ResizeObserver(() => {
      resize()
      if (reduced) start()
    })
    const onVis = () => {
      hidden = document.hidden
      if (!hidden) start()
    }

    resize()
    start()
    ro.observe(host)
    ro.observe(band)
    canvas.addEventListener("pointermove", onMove, { passive: true })
    canvas.addEventListener("pointerleave", onLeave)
    canvas.addEventListener("pointerdown", onTap)
    document.addEventListener("visibilitychange", onVis)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("pointerdown", onTap)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [incidents, reduced, hostRef, bandRef])

  const flipLeft = picked ? picked.x > (hostRef.current?.clientWidth ?? 0) * 0.55 : false
  const flipUp = picked ? picked.y > (bandRef.current?.getBoundingClientRect().height ?? 0) * 0.5 : false

  return (
    <>
      <canvas ref={ref} className={`ldg-canvas ${near ? "is-near" : ""}`} aria-hidden="true" />
      {picked ? (
        <div
          className={`ldg-pick ${flipLeft ? "is-left" : ""} ${flipUp ? "is-up" : ""}`}
          style={{ left: picked.x, top: picked.y }}
          role="dialog"
          aria-label={picked.p.title}
        >
          <p className="ldg-pick-title">{picked.p.title}</p>
          <p className="ldg-pick-meta">
            {picked.p.date} · {picked.p.company} · {picked.p.model}
          </p>
          <a className="ldg-pick-link" href={`/incidents/${picked.p.id}`}>
            Open record →
          </a>
        </div>
      ) : null}
    </>
  )
}

/* ---------------------------------------------------------------- counter */

function Counter({ value, size = "sm", label }: { value: number; size?: "sm" | "lg"; label: string }) {
  const digits = String(value).padStart(3, "0").split("")
  return (
    <div className={`ldg-counter ldg-counter-${size}`} role="img" aria-label={label}>
      {digits.map((d, i) => (
        <span className="ldg-digit" style={{ "--i": i } as React.CSSProperties} key={i} aria-hidden="true">
          <span className="ldg-digit-glyph">{d}</span>
        </span>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- ticker */

const INTERVAL_MS = 7000

function QuoteTicker({ quotes }: { quotes: FeaturedQuote[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [flipping, setFlipping] = useState(false)
  const total = quotes.length

  useEffect(() => {
    if (paused || total < 2) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => advance(1), INTERVAL_MS)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, total, index])

  function advance(step: number) {
    if (total < 2) return
    setFlipping(true)
    window.setTimeout(() => {
      setIndex((c) => (c + step + total) % total)
      setFlipping(false)
    }, 260)
  }

  if (total === 0) return null
  const q = quotes[index]
  return (
    <figure
      className="ldg-ticker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <div className={`ldg-card ${flipping ? "is-flipping" : ""}`}>
        <span className="ldg-card-mark" aria-hidden="true">
          “
        </span>
        <blockquote className="ldg-card-quote">{q.text}</blockquote>
        <figcaption className="ldg-card-foot">
          <p className="ldg-card-who">
            <a className="ldg-card-name" href={`/incidents/${q.incidentId}`}>
              {q.incidentTitle}
            </a>
            <span className="ldg-card-sys">
              {q.model}, {q.company}
            </span>
          </p>
          <a className="ldg-card-src" href={q.source.url} target="_blank" rel="noreferrer">
            {hostname(q.source.url)}
            {q.locator ? `, ${q.locator.split(";")[0]}` : ""}
          </a>
        </figcaption>
      </div>
      {total > 1 ? (
        <div className="ldg-ticker-nav">
          <button type="button" onClick={() => advance(-1)} aria-label="Previous quote">
            ‹
          </button>
          <span>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => advance(1)} aria-label="Next quote">
            ›
          </button>
        </div>
      ) : null}
    </figure>
  )
}

/* ---------------------------------------------------------------- page */

export function LedgerHeader() {
  return (
    <header className="ldg-top">
      <a className="ldg-brand" href="/">
        <img src="/deathbench-skull-white.svg" alt="" aria-hidden="true" />
        <span>DeathBench</span>
      </a>
    </header>
  )
}

export function LedgerFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="ldg-foot">
      <p>
        © {year} Mandrake Labs · Authored by Josh Anderson ·{" "}
        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">
          LinkedIn
        </a>{" "}
        ·{" "}
        <a href={TWITTER_URL} target="_blank" rel="noreferrer">
          @Joshuaa_eth
        </a>{" "}
        ·{" "}
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
      <p className="ldg-disc">{copy.disclaimer}</p>
    </footer>
  )
}

export function sortedByDate(incidents: PublicIncidentIndexEntry[]) {
  return [...incidents].sort((a, b) => (parseDate(a.deathDate) ?? 0) - (parseDate(b.deathDate) ?? 0))
}

export { shortDate, verdictLabel }

export default function Variant({ data }: { data: VariantData }) {
  const reduced = useReducedMotion()
  const fieldRef = useRef<HTMLElement>(null)
  const bandRef = useRef<HTMLDivElement>(null)

  const companies = data.registrySummary.companies
  const deaths = companies.reduce((s, c) => s + c.deaths, 0)
  const includedIncidents = data.incidents.filter((i) => i.verdict === "included").length

  return (
    <div className="v-ledger">
      <LedgerHeader />
      <main>
        <section className="ldg-hero">
          <div className="ldg-hero-grid">
            <h1 className="ldg-h1">{copy.headline}</h1>
            <div className="ldg-count">
              <Counter value={deaths} size="lg" label={`${deaths} deaths so far`} />
              <span className="ldg-sofar" aria-hidden="true">
                so far
              </span>
            </div>
            <div className="ldg-ticker-wrap">
              <QuoteTicker quotes={data.featuredQuotes} />
            </div>
            <div className="ldg-stand">
              <p>{copy.standfirst}</p>
              <p>
                Not a legal finding. Every verdict is published in the{" "}
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  public repository
                </a>
                .
              </p>
              <p className="ldg-quotes-note">{copy.quotesNote}</p>
            </div>
          </div>
        </section>

        <section className="ldg-field" ref={fieldRef} aria-label="Every incident on record, by date of death">
          <Field incidents={data.incidents} reduced={reduced} hostRef={fieldRef} bandRef={bandRef} />
          <div className="ldg-field-grid">
            <div className="ldg-band" ref={bandRef} aria-hidden="true" />
            <a className="ldg-index-card" href="/incidents">
              <span className="ldg-index-n">{data.incidents.length}</span>
              <span className="ldg-index-txt">
                incidents on record, each with its evidence, sources, and verdict.
              </span>
              <span className="ldg-index-cta">View the incidents →</span>
            </a>
          </div>
          <ul className="sr-only">
            {sortedByDate(data.incidents).map((i) => (
              <li key={i.id}>
                <a href={`/incidents/${i.id}`}>
                  {i.title}, {shortDate(i.deathDate)}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="ldg-block" id="companies">
          <h2 className="ldg-h2">Included deaths by company</h2>
          {!data.registrySummary.available ? (
            <p className="ldg-muted" role="status">
              Totals are temporarily unavailable.
            </p>
          ) : (
            <div className="ldg-companies">
              {companies.map((c) => (
                <a className="ldg-company" href={`/companies/${c.slug}`} key={c.slug}>
                  <span className="ldg-company-name">{c.company}</span>
                  <span className="ldg-company-sub">
                    {c.incidents} included {c.incidents === 1 ? "incident" : "incidents"}
                  </span>
                  <Counter value={c.deaths} label={`${c.deaths} deaths`} />
                </a>
              ))}
              <div className="ldg-company ldg-company-all">
                <span className="ldg-company-name">All companies</span>
                <span className="ldg-company-sub">{includedIncidents} included incidents</span>
                <Counter value={deaths} label={`${deaths} deaths`} />
              </div>
            </div>
          )}
          <p className="ldg-muted">{copy.totalsNote}</p>
        </section>

        <section className="ldg-block" id="framework">
          <h2 className="ldg-h2">How an incident qualifies</h2>
          <p className="ldg-doubt">{copy.whenInDoubt}</p>
          <div className="ldg-entries">
            <article className="ldg-entry">
              <h3>{copy.scope.title}</h3>
              <p>{copy.scope.body}</p>
            </article>
            {copy.patterns.map((p) => (
              <article className="ldg-entry" key={p.number}>
                <h3>
                  <span className="ldg-n" aria-hidden="true">
                    {p.number}
                  </span>
                  {p.title}
                </h3>
                <p>{p.description}</p>
                <p className="ldg-example">
                  <a className="ldg-name" href={`/incidents/${p.exampleId}`}>
                    {p.exampleLabel}
                  </a>
                  . {p.example}
                </p>
              </article>
            ))}
          </div>
          <p className="ldg-muted">{copy.exclusions}</p>
        </section>
      </main>
      <LedgerFooter />
    </div>
  )
}
