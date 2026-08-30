import { loadVariantData } from "../variants/data"
import Ledger from "../variants/ledger"
import type { Route } from "./+types/home"

export async function loader() {
  return loadVariantData()
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
    { name: "theme-color", content: "#070a12" },
  ]
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Ledger data={loaderData} />
}
