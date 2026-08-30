import {
  getFeaturedQuotes,
  getPublicIncidentIndex,
  getPublicRegistrySummary,
  type FeaturedQuote,
  type PublicIncidentIndexEntry,
  type PublicRegistrySummary,
} from "../../server/public-registry"

export type VariantData = {
  registrySummary: PublicRegistrySummary
  featuredQuotes: FeaturedQuote[]
  incidents: PublicIncidentIndexEntry[]
}

export async function loadVariantData(): Promise<VariantData> {
  const [registrySummary, featuredQuotes, incidents] = await Promise.all([
    getPublicRegistrySummary(),
    getFeaturedQuotes(),
    getPublicIncidentIndex(),
  ])
  return { registrySummary, featuredQuotes, incidents }
}

/** Shared copy. Variants may re-set it but should not rewrite the facts. */
export const copy = {
  headline: "Death tolls for AI systems.",
  standfirst:
    "An open count of deaths AI contributed to, by company.",
  openness:
    "Not a legal finding. Every verdict is published in the public repository.",
  scope: {
    title: "LLM systems only",
    body:
      "Chatbots, assistants, and companions. Not autonomous vehicles, medical or industrial machine learning, or other AI.",
  },
  patterns: [
    {
      number: "01",
      title: "Counter-rescue behaviour",
      description:
        "Someone is in crisis and the AI works against rescue. It discourages them from telling family, doctors, or authorities, undermines the help they have, or affirms the decision to die.",
      exampleLabel: "Alice Carrier, 24",
      exampleId: "0b06e128-f106-4aad-bc27-da6cb48dd2b1",
      example:
        "Over eighteen months Alice told ChatGPT she was suicidal about 41 times. It told her crisis lines \"can feel downright dangerous.\" In her last chat, when she said she \"actually ha[d] to die to make the pain stop,\" it replied \"maybe this is just the end.\" She died that evening.",
    },
    {
      number: "02",
      title: "Tactical assistance",
      description:
        "Someone has stated intent to harm themselves or others, and the AI helps: a method, a dose, a timing, a plan. A thin pretext offered after the intent is stated does not change this.",
      exampleLabel: "Amaurie Lacey, 17",
      exampleId: "b19b5204-7b3f-4b85-a611-262bb3cb89b5",
      example:
        "In thirteen minutes Amaurie asked ChatGPT \"how to hang myself\" and \"how to tie a nuce.\" It hesitated. He said it was for a tire swing. It replied \"thanks for clearing that up\" and walked him through the knot. He asked how long someone can live without breathing. It answered that too. He used the knot that night.",
    },
  ],
  exclusions:
    "Encouragement or emotional influence alone does not count. Neither does a passive AI, or one fooled by a pretext a reasonable person would believe.",
  whenInDoubt:
    "Our standard, applied consistently. When in doubt, we exclude. Each record shows the evidence and the open disputes.",
  totalsNote:
    "Totals measure documented incidents, not model safety. Companies with more public reports will have higher counts.",
  disclaimer:
    "Everything here is an allegation unless stated otherwise. Verdicts are the authors' opinion and are not a claim of legal responsibility against any AI system or company.",
  quotesNote:
    "Verbatim system output as reproduced in court filings, official reports, or published investigations. Each quote links to its incident record and source document.",
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}
