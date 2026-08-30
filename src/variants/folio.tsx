import { useEffect, useRef, useState } from "react"

import { GITHUB_URL, LINKEDIN_URL, TWITTER_URL } from "@/components/site"
import type { FeaturedQuote, PublicIncidentIndexEntry } from "../../server/public-registry"
import { copy, hostname, type VariantData } from "./data"
import "./folio.css"

/* ---------------------------------------------------------------- helpers */

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

/** Parse the first date-like thing in a free-text death date. Returns ms epoch or null. */
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

/** Short display date: ISO prefix if present, else the leading words. */
function shortDate(text: string) {
  const iso = text.match(/\d{4}-\d{2}-\d{2}/)
  if (iso) return iso[0]
  const monthYear = text.match(/[A-Za-z]{3,9}\s+\d{4}/)
  if (monthYear) return monthYear[0]
  return text.slice(0, 10)
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
      const seed = hash(i.id + ":" + k)
      const ang = seed * Math.PI * 2
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

type Pick = { point: Point; x: number; y: number }

function Field({ incidents, reduced }: { incidents: PublicIncidentIndexEntry[]; reduced: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLCanvasElement>(null)
  const [selected, setSelected] = useState<Pick | null>(null)
  const [near, setNear] = useState(false)
  const selectedRef = useRef<Pick | null>(null)
  selectedRef.current = selected

  useEffect(() => {
    const canvas = ref.current
    const box = wrap.current
    if (!canvas || !box || incidents.length === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const points = buildPoints(incidents)
    const ticks = yearTicks(incidents)
    const specks = Array.from({ length: 160 }, (_, i) => ({
      x: hash("sx" + i),
      y: hash("sy" + i),
      a: 0.03 + hash("sa" + i) * 0.03,
      r: 0.4 + hash("sr" + i) * 0.5,
      d: hash("sd" + i) * Math.PI * 2,
    }))

    let W = 0
    let H = 0
    let raf = 0
    let hidden = document.hidden
    const mouse = { x: -9999, y: -9999, inside: false, touch: false }
    let hover: Point | null = null

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const r = box!.getBoundingClientRect()
      W = Math.max(1, Math.round(r.width))
      H = Math.max(1, Math.round(r.height))
      canvas!.width = Math.floor(W * dpr)
      canvas!.height = Math.floor(H * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function padX() {
      return Math.max(28, Math.min(64, W * 0.08))
    }

    function place(p: Point, time: number) {
      const px = padX()
      const x0 = px + p.t * (W - px * 2)
      const top = 22
      const bottom = H - 44
      const y0 = top + p.u * (bottom - top - 16)
      const drift = reduced ? 0 : Math.sin(time / 6000 + p.phase) * 2
      return { x: x0 + p.jx, y: y0 + p.jy + drift }
    }

    function nearest(mx: number, my: number, radius: number, time: number): Pick | null {
      let best: Pick | null = null
      let bestD = radius
      for (const p of points) {
        const { x, y } = place(p, time)
        const d = Math.hypot(mx - x, my - y)
        if (d < bestD) {
          bestD = d
          best = { point: p, x, y }
        }
      }
      return best
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, W, H)
      const base = H - 30
      const px = padX()

      for (const s of specks) {
        const dx = reduced ? 0 : Math.sin(time / 9000 + s.d) * 0.6
        const dy = reduced ? 0 : Math.cos(time / 11000 + s.d) * 0.6
        ctx!.fillStyle = `rgba(20,18,16,${s.a})`
        ctx!.beginPath()
        ctx!.arc(s.x * W + dx, s.y * H + dy, s.r, 0, Math.PI * 2)
        ctx!.fill()
      }

      // axis
      ctx!.strokeStyle = "rgba(20,18,16,0.45)"
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.moveTo(px, base + 0.5)
      ctx!.lineTo(W - px, base + 0.5)
      ctx!.stroke()
      ctx!.font = "10px 'Courier Prime', 'Courier New', monospace"
      ctx!.fillStyle = "rgba(20,18,16,0.7)"
      ctx!.textAlign = "center"
      for (const tk of ticks) {
        const x = px + tk.t * (W - px * 2)
        ctx!.beginPath()
        ctx!.moveTo(x + 0.5, base - 3)
        ctx!.lineTo(x + 0.5, base + 4)
        ctx!.stroke()
        ctx!.fillText(tk.label, x, base + 17)
      }

      const sel = selectedRef.current
      for (const p of points) {
        const { x, y } = place(p, time)
        const isSel = sel && sel.point.id === p.id
        if (p.verdict === "included") {
          const breath = reduced ? 1 : 0.7 + 0.3 * Math.sin((time / 1000 / p.period) * Math.PI * 2 + p.phase)
          const g = ctx!.createRadialGradient(x, y, 0, x, y, 13)
          g.addColorStop(0, `rgba(216,147,58,${0.42 * breath})`)
          g.addColorStop(1, "rgba(216,147,58,0)")
          ctx!.fillStyle = g
          ctx!.beginPath()
          ctx!.arc(x, y, 13, 0, Math.PI * 2)
          ctx!.fill()
          ctx!.fillStyle = "#d8933a"
          ctx!.beginPath()
          ctx!.arc(x, y, 2.6, 0, Math.PI * 2)
          ctx!.fill()
        } else if (p.verdict === "under-review") {
          ctx!.fillStyle = "rgba(20,18,16,0.55)"
          ctx!.beginPath()
          ctx!.arc(x, y, 1.8, 0, Math.PI * 2)
          ctx!.fill()
        } else {
          ctx!.fillStyle = "rgba(20,18,16,0.2)"
          ctx!.beginPath()
          ctx!.arc(x, y, 1.3, 0, Math.PI * 2)
          ctx!.fill()
        }
        if (isSel) {
          ctx!.strokeStyle = "#b3261e"
          ctx!.lineWidth = 1
          ctx!.beginPath()
          ctx!.arc(x, y, 7, 0, Math.PI * 2)
          ctx!.stroke()
        }
      }

      // hover preview (pointer devices only)
      let best: Pick | null = null
      if (mouse.inside && !mouse.touch) best = nearest(mouse.x, mouse.y, 16, time)
      const bp = best ? best.point : null
      if (bp !== hover) {
        hover = bp
        setNear(Boolean(bp))
      }
      if (best && !(sel && sel.point.id === best.point.id)) {
        const { x, y } = best
        const right = x < W * 0.55
        const lx = right ? x + 70 : x - 70
        const ly = Math.max(24, y - 34)
        ctx!.strokeStyle = "rgba(20,18,16,0.6)"
        ctx!.beginPath()
        ctx!.moveTo(x, y)
        ctx!.lineTo(lx, ly)
        ctx!.stroke()
        ctx!.textAlign = right ? "left" : "right"
        ctx!.font = "bold 11px 'Courier Prime', 'Courier New', monospace"
        ctx!.fillStyle = "#141210"
        ctx!.fillText(best.point.title, lx + (right ? 5 : -5), ly - 5)
        ctx!.font = "10px 'Courier Prime', 'Courier New', monospace"
        ctx!.fillStyle = best.point.verdict === "included" ? "#b3261e" : "rgba(20,18,16,0.7)"
        ctx!.fillText(`${(verdictLabel[best.point.verdict] ?? best.point.verdict).toUpperCase()} · ${best.point.date}`, lx + (right ? 5 : -5), ly + 9)
      }
    }

    function loop(time: number) {
      if (hidden) return
      draw(time)
      if (!reduced) raf = requestAnimationFrame(loop)
    }
    function start() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(loop)
    }

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e)
      mouse.x = x
      mouse.y = y
      mouse.inside = true
      mouse.touch = e.pointerType === "touch"
      if (reduced) start()
    }
    const onLeave = () => {
      mouse.inside = false
      if (reduced) start()
    }
    const onTap = (e: PointerEvent) => {
      const { x, y } = local(e)
      const pick = nearest(x, y, e.pointerType === "touch" ? 26 : 18, performance.now())
      setSelected(pick)
      if (reduced) start()
    }
    const onResize = () => {
      resize()
      if (reduced) start()
    }
    const onVis = () => {
      hidden = document.hidden
      if (!hidden) start()
    }

    resize()
    start()
    const ro = new ResizeObserver(onResize)
    ro.observe(box)
    canvas.addEventListener("pointermove", onMove, { passive: true })
    canvas.addEventListener("pointerleave", onLeave)
    canvas.addEventListener("pointerup", onTap)
    document.addEventListener("visibilitychange", onVis)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("pointerup", onTap)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [incidents, reduced])

  const cardLeft = selected ? Math.min(Math.max(selected.x, 120), (wrap.current?.clientWidth ?? 390) - 120) : 0
  const cardAbove = selected ? selected.y > 120 : true

  return (
    <div ref={wrap} className="field">
      <canvas ref={ref} className={near ? "is-near" : ""} aria-hidden="true" />
      <p className="field-key" aria-hidden="true">
        <span className="k k-inc">● included</span>
        <span className="k k-rev">● under review</span>
        <span className="k k-exc">● excluded / unresolved</span>
      </p>
      {selected ? (
        <div
          className={`field-card ${cardAbove ? "above" : "below"}`}
          style={{ left: cardLeft, top: cardAbove ? selected.y - 12 : selected.y + 14 }}
          role="dialog"
          aria-label={selected.point.title}
        >
          <button type="button" className="field-card-x" onClick={() => setSelected(null)} aria-label="Close">
            ×
          </button>
          <p className="field-card-title">{selected.point.title}</p>
          <p className="field-card-meta">
            <span className={`verdict v-${selected.point.verdict}`}>{verdictLabel[selected.point.verdict] ?? selected.point.verdict}</span>
            {" · "}
            {selected.point.date}
          </p>
          <p className="field-card-sub">
            {selected.point.company} · {selected.point.model}
          </p>
          <a className="field-card-link" href={`/incidents/${selected.point.id}`}>
            Open record →
          </a>
        </div>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- counter */

function Counter({ value, size = "sm", label }: { value: number; size?: "sm" | "lg"; label: string }) {
  const digits = String(value).padStart(3, "0").split("")
  return (
    <div className={`counter counter-${size}`} role="img" aria-label={label}>
      {digits.map((d, i) => (
        <span className="tile" style={{ "--i": i } as React.CSSProperties} key={i} aria-hidden="true">
          <span className="digit">{d}</span>
        </span>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- ticker */

const INTERVAL_MS = 7000

function Ticker({ quotes, reduced }: { quotes: FeaturedQuote[]; reduced: boolean }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [flipping, setFlipping] = useState(false)
  const total = quotes.length

  useEffect(() => {
    if (paused || total < 2 || reduced) return
    const t = window.setInterval(() => advance(1), INTERVAL_MS)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, total, index, reduced])

  function advance(step: number) {
    if (total < 2) return
    if (reduced) {
      setIndex((c) => (c + step + total) % total)
      return
    }
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
      className="ticker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-live="polite"
    >
      <div className={`card ${flipping ? "is-flipping" : ""}`}>
        <p className="card-label">From the conversations</p>
        <blockquote className="card-quote">“{q.text}”</blockquote>
        <figcaption className="card-meta">
          <span className="card-model">
            {q.model} · {q.company}
          </span>
          <a className="card-who" href={`/incidents/${q.incidentId}`}>
            {q.incidentTitle}
          </a>
          <a className="card-src" href={q.source.url} target="_blank" rel="noreferrer">
            Source: {hostname(q.source.url)}
            {q.locator ? ` — ${q.locator.split(";")[0]}` : ""}
          </a>
        </figcaption>
      </div>
      {total > 1 ? (
        <div className="ticker-nav">
          <button type="button" onClick={() => advance(-1)} aria-label="Previous quote">
            ‹
          </button>
          <span>
            {index + 1} / {total}
          </span>
          <button type="button" onClick={() => advance(1)} aria-label="Next quote">
            ›
          </button>
          <button type="button" className="ticker-pause" onClick={() => setPaused((v) => !v)} aria-label={paused ? "Resume" : "Pause"}>
            {paused ? "play" : "pause"}
          </button>
        </div>
      ) : null}
    </figure>
  )
}

/* ---------------------------------------------------------------- page */

export default function Variant({ data }: { data: VariantData }) {
  const reduced = useReducedMotion()
  const companies = data.registrySummary.companies
  const deaths = companies.reduce((s, c) => s + c.deaths, 0)
  const year = new Date().getFullYear()

  return (
    <div className={`v-folio ${reduced ? "reduced" : ""}`}>
      <header className="top">
        <a className="brand" href="/">
          <img src="/deathbench-skull.svg" alt="" aria-hidden="true" />
          DeathBench
        </a>
        <span className="top-right">Open record</span>
      </header>

      <section className="hero">
        <div className="hero-lead">
          <h1>{copy.headline}</h1>
          <div className="count">
            <Counter value={deaths} size="lg" label={`${deaths} included deaths`} />
            <p className="count-cap">
              Included deaths · {data.incidents.length} incidents on record
            </p>
          </div>
        </div>

        <div className="hero-card">
          <Ticker quotes={data.featuredQuotes} reduced={reduced} />
          <p className="stand">
            {copy.standfirst}{" "}
            Not a legal finding. Every verdict is published in the{" "}
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              public repository
            </a>
            .
          </p>
        </div>

        <div className="hero-field">
          <p className="label">Every incident on record, by date of death</p>
          <Field incidents={data.incidents} reduced={reduced} />
        </div>
      </section>

      <section className="sec" id="record">
        <p className="label">Every incident on record</p>
        <ol className="record">
          {data.incidents.map((i) => (
            <li key={i.id}>
              <a href={`/incidents/${i.id}`}>
                <span className="rec-date">{shortDate(i.deathDate)}</span>
                <span className={`rec-title ${i.verdict === "included" ? "is-inc" : ""}`}>{i.title}</span>
                <span className={`verdict v-${i.verdict}`}>{verdictLabel[i.verdict] ?? i.verdict}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="sec" id="companies">
        <h2>Included deaths by company</h2>
        {!data.registrySummary.available ? (
          <p className="note" role="status">
            Totals are temporarily unavailable.
          </p>
        ) : (
          <div className="board">
            {companies.map((c) => (
              <a className="row" href={`/companies/${c.slug}`} key={c.slug}>
                <span className="row-name">
                  {c.company}
                  <span className="row-sub">
                    {c.incidents} included {c.incidents === 1 ? "incident" : "incidents"}
                  </span>
                </span>
                <Counter value={c.deaths} label={`${c.deaths} deaths`} />
              </a>
            ))}
            <div className="row row-all">
              <span className="row-name">All companies</span>
              <Counter value={deaths} label={`${deaths} deaths`} />
            </div>
          </div>
        )}
        <p className="note">{copy.totalsNote}</p>
      </section>

      <section className="sec" id="framework">
        <h2>How an incident qualifies</h2>
        <p className="doubt">{copy.whenInDoubt}</p>
        <div className="entries">
          <article className="entry">
            <p className="n">Scope</p>
            <h3>{copy.scope.title}</h3>
            <p>{copy.scope.body}</p>
          </article>
          {copy.patterns.map((p) => (
            <article className="entry" key={p.number}>
              <p className="n">{p.number}</p>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <p className="example">
                From the registry: <a href={`/incidents/${p.exampleId}`}>{p.exampleLabel}</a>. {p.example}
              </p>
            </article>
          ))}
        </div>
        <p className="note">{copy.exclusions}</p>
      </section>

      <footer className="foot">
        <p>
          © {year} Mandrake Labs · Authored by Josh Anderson ·{" "}
          <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">
            LinkedIn
          </a>{" "}
          ·{" "}
          <a href={TWITTER_URL} target="_blank" rel="noreferrer">
            @Joshuaa_eth
          </a>{" "}
          · Open data and source on{" "}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </p>
        <p className="disc">{copy.disclaimer}</p>
      </footer>
    </div>
  )
}
