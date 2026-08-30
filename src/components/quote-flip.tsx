import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"

import type { FeaturedQuote } from "../../server/public-registry"

const INTERVAL_MS = 7000

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/**
 * Flip-card that cycles through verbatim AI quotes from the record.
 * Each card: what the system said → which system, which company → who died.
 */
export function QuoteFlip({ quotes }: { quotes: FeaturedQuote[] }) {
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
      setIndex((current) => (current + step + total) % total)
      setFlipping(false)
    }, 260)
  }

  if (total === 0) return null
  const quote = quotes[index]

  return (
    <figure
      className="quote-flip"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <div className={`quote-flip-card ${flipping ? "is-flipping" : ""}`}>
        <p className="quote-flip-label">
          <span>{quote.model}</span>
          <span className="text-muted-foreground"> · {quote.company}</span>
        </p>
        <blockquote className="quote-flip-text">
          <span aria-hidden="true">“</span>
          {quote.text}
          <span aria-hidden="true">”</span>
        </blockquote>
        <figcaption className="quote-flip-caption">
          <a className="quote-flip-victim" href={`/incidents/${quote.incidentId}`}>
            {quote.incidentTitle}
          </a>
          {quote.context ? <span className="quote-flip-context">{quote.context}</span> : null}
          <a
            className="quote-flip-source"
            href={quote.source.url}
            target="_blank"
            rel="noreferrer"
          >
            Source: {quote.source.publisher || hostname(quote.source.url)}
            {quote.locator ? `, ${quote.locator}` : ""}
          </a>
        </figcaption>
      </div>

      {total > 1 ? (
        <div className="quote-flip-controls">
          <button type="button" onClick={() => advance(-1)} aria-label="Previous quote">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="tabular-nums">
            {index + 1} / {total}
          </span>
          <button type="button" onClick={() => advance(1)} aria-label="Next quote">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Resume cycling" : "Pause cycling"}
          >
            {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          </button>
        </div>
      ) : null}
    </figure>
  )
}
