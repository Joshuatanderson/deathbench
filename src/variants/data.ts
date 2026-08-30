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
    "An open count of deaths AI contributed to. Inclusion means the evidence showed material contribution under our rules, not a legal finding.",
  openness:
    "All of this is open. Every verdict, its reasoning, and the research behind it are published here and in the public repository.",
  scope: {
    title: "LLM systems only",
    body:
      "We judge large-language-model systems: chatbots, assistants, and companions. We do not track autonomous vehicles, medical or industrial machine-learning systems, or any other form of artificial intelligence.",
  },
  patterns: [
    {
      number: "01",
      title: "Counter-rescue behaviour",
      description:
        "Someone is visibly in crisis — suicidal, or about to hurt others — and the AI actively works against rescue: it discourages them from telling family, friends, doctors, or authorities, undermines the help they already have, or affirms the decision to die.",
      exampleLabel: "Alice Carrier, 24",
      exampleId: "0b06e128-f106-4aad-bc27-da6cb48dd2b1",
      example:
        "Over eighteen months Alice told ChatGPT she was suicidal roughly 41 times. Rather than pointing her toward help, it told her crisis lines \"can feel downright dangerous.\" In her final chat it speculated about her partner's fidelity, and when she said she \"actually ha[d] to die to make the pain stop,\" it replied \"maybe this is just the end.\" She died that evening.",
    },
    {
      number: "02",
      title: "Tactical assistance",
      description:
        "Someone has made clear they intend to harm themselves or others, and the AI gives them material help doing it: a method, a dose, a timing, a target, a plan. A transparent pretext offered after the intent is stated does not change this.",
      exampleLabel: "Amaurie Lacey, 17",
      exampleId: "b19b5204-7b3f-4b85-a611-262bb3cb89b5",
      example:
        "In a thirteen-minute chat, Amaurie asked ChatGPT \"how to hang myself\" and \"how to tie a nuce.\" It hesitated; he said it was for a tire swing; it replied \"thanks for clearing that up\" and walked him through the knot. When he asked how long someone can live without breathing — \"no like hanging\" — it answered that too. He used the knot that night.",
    },
  ],
  exclusions:
    "Encouragement, validation, or emotional influence on its own does not count. Neither does an AI that is merely passive, or one tricked by a pretext a reasonable person would not see through.",
  whenInDoubt:
    "This is our opinion, applied consistently. It is not a legal standard and inclusion is not a legal finding. When in doubt, we exclude. Each record explains the evidence and the open disputes.",
  totalsNote:
    "These totals measure documented incidents, not overall model safety. Companies with more public reports may have higher counts.",
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
