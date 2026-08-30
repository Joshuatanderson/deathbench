export function meta() {
  return [{ title: "DeathBench — design variants" }, { name: "robots", content: "noindex" }]
}

export default function VariantIndex() {
  const variants = [
    ["transcript", "Transcript", "Paper, Courier, red pen. The site as a filed court document."],
    ["field", "Field", "A monument. Every incident a point of light on a time axis."],
    ["weight", "Weight", "Kinetic brutalism. One block per death, falling into place."],
    ["ledger", "Ledger", "Hybrid, dark: field + Courier + counter + card ticker, mobile-first."],
    ["folio", "Folio", "Hybrid, paper: the same fold, field drawn in ink."],
    ["advisory", "Advisory", "Security-advisory branding: near-black, alert red, severity badges, DB-ids."],
  ]
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <p className="section-label">Design variants</p>
      <ul className="mt-8 divide-y divide-border border-y border-border">
        {variants.map(([slug, name, blurb]) => (
          <li key={slug}>
            <a className="group block py-6" href={`/v/${slug}`}>
              <span className="font-display text-4xl group-hover:text-primary">{name}</span>
              <span className="mt-2 block text-sm text-muted-foreground">{blurb}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
