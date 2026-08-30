import { useEffect, useRef, useState } from "react"

import { GITHUB_URL, LINKEDIN_URL, TWITTER_URL } from "@/components/site"
import type { PublicIncidentIndexEntry } from "../../server/public-registry"
import { copy, hostname, type VariantData } from "./data"
import "./field.css"

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

function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
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
  }, [threshold])
  return [ref, seen] as const
}

/* ---------------------------------------------------------------- canvas */

type Point = {
  id: string
  title: string
  verdict: string
  date: string
  t: number // 0..1 along time axis
  u: number // 0..1 vertical seed
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
        date: i.deathDate.slice(0, 10),
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

function FieldCanvas({ incidents, reduced }: { incidents: PublicIncidentIndexEntry[]; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || incidents.length === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const points = buildPoints(incidents)
    const ticks = yearTicks(incidents)
    const specks = Array.from({ length: 300 }, (_, i) => ({
      x: hash("sx" + i),
      y: hash("sy" + i),
      a: 0.04 + hash("sa" + i) * 0.04,
      r: 0.4 + hash("sr" + i) * 0.5,
      d: hash("sd" + i) * Math.PI * 2,
    }))

    let W = 0
    let H = 0
    let dpr = 1
    let raf = 0
    let hidden = document.hidden
    let scrollY = window.scrollY
    const mouse = { x: -9999, y: -9999, lx: -9999, ly: -9999, inside: false }
    let hover: Point | null = null

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      canvas!.width = Math.floor(W * dpr)
      canvas!.height = Math.floor(H * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function place(p: Point, time: number) {
      const padX = Math.max(40, W * 0.1)
      const x0 = padX + p.t * (W - padX * 2)
      const y0 = H * 0.12 + p.u * H * 0.48
      const drift = reduced ? 0 : Math.sin(time / 6000 + p.phase) * 3
      let x = x0 + p.jx
      let y = y0 + p.jy + drift
      if (!reduced && mouse.inside) {
        const dx = mouse.lx - x
        const dy = mouse.ly - y
        const dist = Math.hypot(dx, dy)
        const pull = Math.max(0, 1 - dist / 260) * 5
        if (dist > 0) {
          x += (dx / dist) * pull
          y += (dy / dist) * pull
        }
      }
      return { x, y: y - scrollY * 0.08 }
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, W, H)
      const base = H * 0.66 - scrollY * 0.08

      // ambient specks
      for (const s of specks) {
        const dx = reduced ? 0 : Math.sin(time / 9000 + s.d) * 0.8
        const dy = reduced ? 0 : Math.cos(time / 11000 + s.d) * 0.8
        ctx!.fillStyle = `rgba(233,228,216,${s.a})`
        ctx!.beginPath()
        ctx!.arc(s.x * W + dx, s.y * H + dy - scrollY * 0.03, s.r, 0, Math.PI * 2)
        ctx!.fill()
      }

      // baseline + ticks
      ctx!.strokeStyle = "rgba(233,228,216,0.10)"
      ctx!.lineWidth = 1
      const padX = Math.max(40, W * 0.1)
      ctx!.beginPath()
      ctx!.moveTo(padX, base + 0.5)
      ctx!.lineTo(W - padX, base + 0.5)
      ctx!.stroke()
      ctx!.font = "10px 'Geist Variable', system-ui, sans-serif"
      ctx!.fillStyle = "rgba(233,228,216,0.35)"
      ctx!.textAlign = "center"
      for (const tk of ticks) {
        const x = padX + tk.t * (W - padX * 2)
        ctx!.beginPath()
        ctx!.moveTo(x + 0.5, base - 4)
        ctx!.lineTo(x + 0.5, base + 4)
        ctx!.stroke()
        ctx!.fillText(tk.label, x, base + 18)
      }

      // points
      let best: Point | null = null
      let bestD = 14
      for (const p of points) {
        const { x, y } = place(p, time)
        if (mouse.inside) {
          const d = Math.hypot(mouse.x - x, mouse.y - y)
          if (d < bestD) {
            bestD = d
            best = p
          }
        }
        if (p.verdict === "included") {
          const breath = reduced ? 1 : 0.7 + 0.3 * Math.sin((time / 1000 / p.period) * Math.PI * 2 + p.phase)
          const g = ctx!.createRadialGradient(x, y, 0, x, y, 14)
          g.addColorStop(0, `rgba(216,147,58,${0.55 * breath})`)
          g.addColorStop(1, "rgba(216,147,58,0)")
          ctx!.fillStyle = g
          ctx!.beginPath()
          ctx!.arc(x, y, 14, 0, Math.PI * 2)
          ctx!.fill()
          ctx!.fillStyle = `rgba(232,170,90,${0.75 + 0.25 * breath})`
          ctx!.beginPath()
          ctx!.arc(x, y, 2.2, 0, Math.PI * 2)
          ctx!.fill()
        } else if (p.verdict === "under-review") {
          ctx!.fillStyle = "rgba(233,228,216,0.6)"
          ctx!.beginPath()
          ctx!.arc(x, y, 1.6, 0, Math.PI * 2)
          ctx!.fill()
        } else {
          ctx!.fillStyle = "rgba(233,228,216,0.18)"
          ctx!.beginPath()
          ctx!.arc(x, y, 1.1, 0, Math.PI * 2)
          ctx!.fill()
        }
      }

      if (best !== hover) {
        hover = best
        setNear(Boolean(best))
      }
      if (hover) {
        const { x, y } = place(hover, time)
        const right = x < W * 0.6
        const lx = right ? x + 90 : x - 90
        const ly = y - 46
        ctx!.strokeStyle = "rgba(233,228,216,0.5)"
        ctx!.beginPath()
        ctx!.moveTo(x, y)
        ctx!.lineTo(lx, ly)
        ctx!.stroke()
        ctx!.textAlign = right ? "left" : "right"
        ctx!.font = "12px 'Geist Variable', system-ui, sans-serif"
        ctx!.fillStyle = "rgba(233,228,216,0.95)"
        ctx!.fillText(hover.title, lx + (right ? 6 : -6), ly - 6)
        ctx!.font = "10px 'Geist Variable', system-ui, sans-serif"
        ctx!.fillStyle = hover.verdict === "included" ? "#d8933a" : "rgba(233,228,216,0.6)"
        ctx!.fillText(`${(verdictLabel[hover.verdict] ?? hover.verdict).toUpperCase()}  ·  ${hover.date}`, lx + (right ? 6 : -6), ly + 10)
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

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      if (!mouse.inside) {
        mouse.lx = e.clientX
        mouse.ly = e.clientY
      }
      mouse.inside = true
      if (reduced) start()
    }
    const onLeave = () => {
      mouse.inside = false
      if (reduced) start()
    }
    const onClick = () => {
      if (hover) window.location.href = `/incidents/${hover.id}`
    }
    const onScroll = () => {
      scrollY = window.scrollY
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
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerdown", onMove, { passive: true })
    canvas.addEventListener("click", onClick)
    document.addEventListener("pointerleave", onLeave)
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onResize)
    document.addEventListener("visibilitychange", onVis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onMove)
      canvas.removeEventListener("click", onClick)
      document.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [incidents, reduced])

  return <canvas ref={ref} className={`field-canvas ${near ? "is-near" : ""}`} aria-hidden="true" />
}

/* ---------------------------------------------------------------- pieces */

function CountUp({ to, reduced }: { to: number; reduced: boolean }) {
  const [v, setV] = useState(reduced ? to : 0)
  useEffect(() => {
    if (reduced) {
      setV(to)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 2000)
      const e = 1 - Math.pow(1 - k, 3)
      setV(Math.round(to * e))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, reduced])
  return <strong>{v}</strong>
}

function Quotes({ data }: { data: VariantData }) {
  const quotes = data.featuredQuotes
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = quotes.length
  useEffect(() => {
    if (paused || n < 2) return
    const t = window.setInterval(() => setI((c) => (c + 1) % n), 9000)
    return () => window.clearInterval(t)
  }, [paused, n])
  if (n === 0) return null
  const go = (d: number) => setI((c) => (c + d + n) % n)
  return (
    <section className="block quotes" id="conversations" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <p className="label">From the conversations</p>
      <div className="quote-stage" onClick={() => go(1)} aria-live="polite">
        {quotes.map((q, k) => (
          <figure className={`quote-item ${k === i ? "is-on" : ""}`} key={q.id} aria-hidden={k !== i}>
            <blockquote>“{q.text}”</blockquote>
            <figcaption className="quote-meta">
              <span>
                {q.model} · {q.company}
              </span>
              <span>
                — <a className="who" href={`/incidents/${q.incidentId}`} onClick={(e) => e.stopPropagation()}>{q.incidentTitle}</a>
              </span>
              <a className="src" href={q.source.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                Source: {q.source.publisher || hostname(q.source.url)}
                {q.locator ? `, ${q.locator}` : ""}
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="quote-nav">
        <button type="button" onClick={() => go(-1)} aria-label="Previous quote">‹</button>
        <span>
          {i + 1} / {n}
        </span>
        <button type="button" onClick={() => go(1)} aria-label="Next quote">›</button>
      </div>
      <p className="quotes-note">{copy.quotesNote}</p>
    </section>
  )
}

function Company({ c }: { c: VariantData["registrySummary"]["companies"][number] }) {
  const [ref, seen] = useInView<HTMLAnchorElement>(0.4)
  return (
    <a ref={ref} className={`company ${seen ? "in-view" : ""}`} href={`/companies/${c.slug}`}>
      <span className="company-name">{c.company}</span>
      <span className="company-sub">
        {c.incidents} included {c.incidents === 1 ? "incident" : "incidents"}
      </span>
      <span className="marks" aria-label={`${c.deaths} deaths`}>
        {Array.from({ length: c.deaths }, (_, k) => (
          <span className={`mark ${k === c.deaths - 1 ? "is-last" : ""}`} style={{ "--i": k } as React.CSSProperties} key={k} />
        ))}
        <span className="num">{c.deaths}</span>
      </span>
    </a>
  )
}

function Entry({ n, title, body, example }: { n: string; title: string; body: string; example?: React.ReactNode }) {
  const [ref, seen] = useInView<HTMLElement>(0.3)
  return (
    <article ref={ref} className={`entry ${seen ? "in-view" : ""}`}>
      <p className="n">{n}</p>
      <h3>{title}</h3>
      <p>{body}</p>
      {example ? <p className="example">{example}</p> : null}
    </article>
  )
}

/* ---------------------------------------------------------------- page */

export default function Variant({ data }: { data: VariantData }) {
  const reduced = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])

  const companies = data.registrySummary.companies
  const counted = companies.filter((c) => c.deaths > 0)
  const none = companies.filter((c) => c.deaths === 0)
  const deaths = counted.reduce((s, c) => s + c.deaths, 0)
  const includedIncidents = data.incidents.filter((i) => i.verdict === "included").length
  const year = new Date().getFullYear()
  const [first, second, third] = copy.headline.split(" ").length >= 4 ? ["Death tolls", "for AI", "systems."] : [copy.headline, "", ""]

  return (
    <div className="v-field">
      <FieldCanvas incidents={data.incidents} reduced={reduced} />
      <ul className="sr-only" aria-label="Every incident on record">
        {data.incidents.map((i) => (
          <li key={i.id}>
            <a href={`/incidents/${i.id}`}>
              {i.title} — {verdictLabel[i.verdict] ?? i.verdict}
            </a>
          </li>
        ))}
      </ul>

      <div className="content">
        <header className="hero">
          <div className="hero-top">
            <a className="brand" href="/">
              <img src="/deathbench-skull-white.svg" alt="" aria-hidden="true" />
              DeathBench
            </a>
            <p className="label tally">
              <CountUp to={data.incidents.length} reduced={reduced} /> incidents on record · <CountUp to={includedIncidents} reduced={reduced} /> included ·{" "}
              <CountUp to={deaths} reduced={reduced} /> deaths counted
            </p>
          </div>
          <div className="hero-bottom">
            <h1>
              <span className="w">{first}</span>
              <span className="w">{second}</span>
              <span className="w">
                <em>{third}</em>
              </span>
            </h1>
            <div className="stand">
              <p>{copy.standfirst}</p>
              <p>
                All of this is open. Every verdict, its reasoning, and the research behind it are published here and in the{" "}
                <a className="ember-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
                  public repository
                </a>
                .
              </p>
            </div>
          </div>
          <span className={`down ${scrolled ? "is-gone" : ""}`} aria-hidden="true">
            ↓
          </span>
        </header>

        <Quotes data={data} />

        <section className="block counted" id="companies">
          <span className="grand" aria-hidden="true">
            {deaths}
          </span>
          <p className="label">Included deaths by company</p>
          {!data.registrySummary.available ? (
            <p className="none" role="status">Company totals are temporarily unavailable.</p>
          ) : (
            counted.map((c) => <Company c={c} key={c.slug} />)
          )}
          {none.length ? (
            <p className="none">
              No included incidents:{" "}
              {none.map((c, k) => (
                <span key={c.slug}>
                  <a href={`/companies/${c.slug}`}>{c.company}</a>
                  {k < none.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          ) : null}
          <p className="caption">
            <strong>{deaths}</strong> deaths across all included incidents.
          </p>
          <p className="totals-note">{copy.totalsNote}</p>
        </section>

        <section className="block" id="framework">
          <p className="label">What we count</p>
          <p className="doubt">{copy.whenInDoubt}</p>
          <div className="entries">
            <Entry n="Scope" title={copy.scope.title} body={copy.scope.body} />
            {copy.patterns.map((p) => (
              <Entry
                key={p.number}
                n={p.number}
                title={p.title}
                body={p.description}
                example={
                  <>
                    From the registry —{" "}
                    <a className="ember-link" href={`/incidents/${p.exampleId}`}>
                      {p.exampleLabel}
                    </a>
                    . {p.example}
                  </>
                }
              />
            ))}
          </div>
          <p className="exclusions">{copy.exclusions}</p>
        </section>

        <footer>
          <p className="line">
            <span>© {year} Mandrake Labs</span>
            <span>·</span>
            <span>Authored by Josh Anderson</span>
            <span>·</span>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">LinkedIn</a>
            <span>·</span>
            <a href={TWITTER_URL} target="_blank" rel="noreferrer">@Joshuaa_eth</a>
            <span>·</span>
            <span>
              Open data and source on{" "}
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
            </span>
          </p>
          <p className="disc">{copy.disclaimer}</p>
        </footer>
      </div>
    </div>
  )
}
