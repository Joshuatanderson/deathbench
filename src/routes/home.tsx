import { getFeaturedQuotes, getPublicRegistrySummary } from "../../server/public-registry"
import App from "../App"
import type { Route } from "./+types/home"

export async function loader() {
  const [registrySummary, featuredQuotes] = await Promise.all([getPublicRegistrySummary(), getFeaturedQuotes()])
  return { registrySummary, featuredQuotes }
}

export function meta() {
  return [
    { title: "DeathBench: Death tolls for AI systems" },
    {
      name: "description",
      content:
        "DeathBench reviews reported deaths involving AI systems and explains the evidence behind each verdict.",
    },
    { property: "og:title", content: "DeathBench" },
    {
      property: "og:description",
      content: "A source-linked public record of reported deaths involving AI systems.",
    },
    { property: "og:type", content: "website" },
    { name: "theme-color", content: "#0b0a0a" },
  ]
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <App registrySummary={loaderData.registrySummary} featuredQuotes={loaderData.featuredQuotes} />
}
