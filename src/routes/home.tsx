import { getPublicRegistrySummary } from "../../server/public-registry"
import App from "../App"
import type { Route } from "./+types/home"

export async function loader() {
  return getPublicRegistrySummary()
}

export function meta() {
  return [
    { title: "DeathBench — Deaths linked to AI systems" },
    {
      name: "description",
      content:
        "Reported deaths involving AI systems. Every record lists its sources, evidence, and verdict.",
    },
    { property: "og:title", content: "DeathBench" },
    {
      property: "og:description",
      content: "Reported deaths involving AI systems, with sources and a verdict for every record.",
    },
    { property: "og:type", content: "website" },
    { name: "theme-color", content: "#0b0a0a" },
  ]
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <App registrySummary={loaderData} />
}
