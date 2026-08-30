import { useEffect, useRef, useState } from "react"

import { GITHUB_URL, LINKEDIN_URL, TWITTER_URL } from "@/components/site"
import type { FeaturedQuote, PublicIncidentIndexEntry } from "../../server/public-registry"
import { copy, hostname, type VariantData } from "./data"
import "./advisory.css"

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

function Severity({ verdict, className = "" }: { verdict: string; className?: string }) {
  return <span className={`adv-sev v-${verdict} ${className}`}>{verdictLabel[verdict] ?? verdict}</span>
}

function dbId(n: number) {
  return `DB-${String(n).padStart(3, "0")}`
}

function displayIds(incidents: PublicIncidentIndexEntry[]) {
  const sorted = [...incidents].sort((a, b) => (parseDate(a.deathDate) ?? 0) - (parseDate(b.deathDate) ?? 0))
  const map = new Map<string, string>()
  sorted.forEach((i, n) => map.set(i.id, dbId(n + 1)))
  return { sorted, map }
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
  ref: string
  t: number
  u: number
  phase: number
  period: number
  jx: number
  jy: number
}

function buildPoints(incidents: PublicIncidentIndexEntry[]): Point[] {
  const { map: ids } = displayIds(incidents)
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
        ref: ids.get(i.id) ?? "",
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
        ctx!.fillStyle = `rgba(230,230,227,${s.a})`
        ctx!.beginPath()
        ctx!.arc(s.x * W + dx, s.y * H + dy, s.r, 0, Math.PI * 2)
        ctx!.fill()
      }

      const { x0, x1, base } = axis()
      ctx!.strokeStyle = "rgba(154,160,166,0.28)"
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.moveTo(x0, base + 0.5)
      ctx!.lineTo(x1, base + 0.5)
      ctx!.stroke()
      ctx!.font = "10px 'Courier Prime', 'Courier New', monospace"
      ctx!.fillStyle = "rgba(167,173,179,0.8)"
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
          const halo = 12 + 6 * breath
          const g = ctx!.createRadialGradient(x, y, 0, x, y, halo)
          g.addColorStop(0, `rgba(229,56,59,${0.55 * breath})`)
          g.addColorStop(1, "rgba(229,56,59,0)")
          ctx!.fillStyle = g
          ctx!.beginPath()
          ctx!.arc(x, y, halo, 0, Math.PI * 2)
          ctx!.fill()
          ctx!.fillStyle = `rgba(255,90,93,${0.85 + 0.15 * breath})`
          ctx!.beginPath()
          ctx!.arc(x, y, active ? 3 : 2.3, 0, Math.PI * 2)
          ctx!.fill()
        } else if (p.verdict === "under-review") {
          ctx!.fillStyle = "rgba(184,134,27,0.95)"
          ctx!.beginPath()
          ctx!.arc(x, y, active ? 2.8 : 2, 0, Math.PI * 2)
          ctx!.fill()
        } else {
          ctx!.fillStyle = "rgba(154,160,166,0.25)"
          ctx!.beginPath()
          ctx!.arc(x, y, active ? 2.2 : 1.3, 0, Math.PI * 2)
          ctx!.fill()
        }
        if (active) {
          ctx!.strokeStyle = p.verdict === "included" ? "rgba(255,90,93,0.9)" : "rgba(167,173,179,0.7)"
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
      <canvas
        ref={ref}
        className={`adv-canvas ${near ? "is-near" : ""}`}
        role="img"
        aria-label={`Timeline of ${incidents.length} incidents on record. Included incidents are marked in red. Use the incident record list below to open each record.`}
      />
      {picked ? (
        <div
          className={`adv-pick ${flipLeft ? "is-left" : ""} ${flipUp ? "is-up" : ""}`}
          style={{ left: picked.x, top: picked.y }}
          role="dialog"
          aria-label={`${picked.p.ref} ${picked.p.title}`}
          tabIndex={-1}
        >
          <p className="adv-pick-head">
            <span className="adv-pick-ref">{picked.p.ref}</span>
            <Severity verdict={picked.p.verdict} />
          </p>
          <p className="adv-pick-title">{picked.p.title}</p>
          <p className="adv-pick-meta">
            {picked.p.date} · {picked.p.company} · {picked.p.model}
          </p>
          <a className="adv-pick-link" href={`/incidents/${picked.p.id}`}>
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
    <div className={`adv-counter adv-counter-${size}`} role="img" aria-label={label}>
      {digits.map((d, i) => (
        <span className="adv-digit" style={{ "--i": i } as React.CSSProperties} key={i} aria-hidden="true">
          <span className="adv-digit-glyph">{d}</span>
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
      className="adv-ticker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      aria-live="polite"
    >
      <div className={`adv-card ${flipping ? "is-flipping" : ""}`}>
        <p className="adv-card-meta">
          {q.model} · {q.company}
        </p>
        <blockquote className="adv-card-quote">“{q.text}”</blockquote>
        <figcaption className="adv-card-foot">
          <a className="adv-card-name" href={`/incidents/${q.incidentId}`}>
            {q.incidentTitle}
          </a>
          <a className="adv-card-src" href={q.source.url} target="_blank" rel="noreferrer">
            Source: {hostname(q.source.url)}
            {q.locator ? ` — ${q.locator.split(";")[0]}` : ""}
          </a>
        </figcaption>
      </div>
      {total > 1 ? (
        <div className="adv-ticker-nav">
          <button type="button" onClick={() => advance(-1)} aria-label="Previous quote">
            ‹
          </button>
          <span>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => advance(1)} aria-label="Next quote">
            ›
          </button>
          <button type="button" className="adv-ticker-pause" onClick={() => setPaused((v) => !v)} aria-label={paused ? "Resume" : "Pause"}>
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
  const heroRef = useRef<HTMLElement>(null)
  const bandRef = useRef<HTMLDivElement>(null)

  const companies = data.registrySummary.companies
  const deaths = companies.reduce((s, c) => s + c.deaths, 0)
  const year = new Date().getFullYear()
  const { sorted, map: ids } = displayIds(data.incidents)
  const underReview = data.incidents.filter((i) => i.verdict === "under-review").length
  const lastUpdated = sorted.reduce((best, i) => {
    const d = i.deathDate.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ""
    return d > best ? d : best
  }, "")
  const maxDeaths = Math.max(1, ...companies.map((c) => c.deaths))

  return (
    <div className="v-advisory">
      <header className="adv-top">
        <a className="adv-brand" href="/">
          <img src="/deathbench-skull-white.svg" alt="" aria-hidden="true" />
          <span>DeathBench</span>
        </a>
        <span className="adv-top-right">Public advisory</span>
      </header>
      <div className="adv-status" role="status" aria-label="Record status">
        <span className="adv-live">
          <span className="adv-live-dot" aria-hidden="true" />
          Live record
        </span>
        <span className="adv-status-item">Last updated {lastUpdated}</span>
        <span className="adv-status-item adv-status-scale">
          Severity scale:{" "}
          <Severity verdict="included" className="adv-sev-mini" />{" "}
          <Severity verdict="under-review" className="adv-sev-mini" />{" "}
          <Severity verdict="excluded" className="adv-sev-mini" />
        </span>
      </div>
      <main>

      <section className="adv-hero" ref={heroRef}>
        <Field incidents={data.incidents} reduced={reduced} hostRef={heroRef} bandRef={bandRef} />
        <div className="adv-hero-grid">
          <div className="adv-band" ref={bandRef} aria-hidden="true" />
          <h1 className="adv-h1">{copy.headline}</h1>
          <div className="adv-count">
            <Counter value={deaths} size="lg" label={`${deaths} included deaths`} />
            <p className="adv-count-cap">
              Included deaths · {data.incidents.length} incidents on record · {underReview} under review
            </p>
          </div>
          <div className="adv-ticker-wrap">
            <p className="adv-sec">01 — From the conversations</p>
            <QuoteTicker quotes={data.featuredQuotes} />
          </div>
          <p className="adv-quotes-note">{copy.quotesNote}</p>
          <div className="adv-stand">
            <p>{copy.standfirst}</p>
            <p>
              Not a legal finding. Every verdict is published in the{" "}
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                public repository
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="adv-block" id="record">
        <p className="adv-sec">02 — Incident record</p>
        <h2 className="adv-h2">Every incident on record</h2>
        <ol className="adv-list">
          {sorted.map((i) => (
            <li key={i.id}>
              <a className={`adv-row v-${i.verdict}`} href={`/incidents/${i.id}`}>
                <span className="adv-row-ref">{ids.get(i.id)}</span>
                <span className="adv-row-date">{shortDate(i.deathDate)}</span>
                <span className="adv-row-title">{i.title}</span>
                <Severity verdict={i.verdict} className="adv-row-verdict" />
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="adv-block" id="companies">
        <p className="adv-sec">03 — Totals by company</p>
        <h2 className="adv-h2">Included deaths by company</h2>
        {!data.registrySummary.available ? (
          <p className="adv-muted" role="status">
            Totals are temporarily unavailable.
          </p>
        ) : (
          <div className="adv-companies">
            {companies.map((c) => (
              <a className="adv-company" href={`/companies/${c.slug}`} key={c.slug}>
                <span className="adv-company-name">{c.company}</span>
                <span className="adv-company-sub">
                  {c.incidents} included {c.incidents === 1 ? "incident" : "incidents"}
                </span>
                <span className="adv-company-bar" aria-hidden="true">
                  <span style={{ width: `${(c.deaths / maxDeaths) * 100}%` }} />
                </span>
                <Counter value={c.deaths} label={`${c.deaths} deaths`} />
              </a>
            ))}
            <div className="adv-company adv-company-all">
              <span className="adv-company-name">All companies</span>
              <span className="adv-company-sub">{data.incidents.filter((i) => i.verdict === "included").length} included incidents</span>
              <Counter value={deaths} label={`${deaths} deaths`} />
            </div>
          </div>
        )}
        <p className="adv-muted">{copy.totalsNote}</p>
      </section>

      <section className="adv-block" id="framework">
        <p className="adv-sec">04 — Inclusion standard</p>
        <h2 className="adv-h2">How an incident qualifies</h2>
        <p className="adv-doubt">{copy.whenInDoubt}</p>
        <div className="adv-entries">
          <article className="adv-entry">
            <p className="adv-n">Scope</p>
            <h3>{copy.scope.title}</h3>
            <p>{copy.scope.body}</p>
          </article>
          {copy.patterns.map((p) => (
            <article className="adv-entry" key={p.number}>
              <p className="adv-n">{p.number}</p>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <p className="adv-example">
                <span className="adv-example-label">From the registry: </span>
                <a className="adv-name" href={`/incidents/${p.exampleId}`}>
                  {p.exampleLabel}
                </a>
                . {p.example}
              </p>
            </article>
          ))}
        </div>
        <p className="adv-muted">{copy.exclusions}</p>
      </section>

      </main>
      <footer className="adv-foot">
        <div className="adv-advisory">
          <p className="adv-sec">Advisory</p>
          <p className="adv-disc">{copy.disclaimer}</p>
        </div>
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
      </footer>
    </div>
  )
}
