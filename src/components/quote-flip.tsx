import { useEffect, useState } from "react"
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
        <blockquote className="quote-flip-text">
          <span aria-hidden="true">“</span>
          {quote.text}
          <span aria-hidden="true">”</span>
        </blockquote>
        <figcaption className="quote-flip-caption">
          <span>
            {quote.model}
            <span className="text-muted-foreground"> · {quote.company}</span>
          </span>
          <a className="quote-flip-victim" href={`/incidents/${quote.incidentId}`}>
            {quote.incidentTitle}
          </a>
          <a
            className="quote-flip-source"
            href={quote.source.url}
            target="_blank"
            rel="noreferrer"
          >
            Source: {hostname(quote.source.url)}
            {quote.locator ? ` — ${quote.locator.split(";")[0]}` : ""}
          </a>
        </figcaption>
      </div>

    </figure>
  )
}
