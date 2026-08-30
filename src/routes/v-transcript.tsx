import { loadVariantData } from "../variants/data"
import Variant from "../variants/transcript"
import type { Route } from "./+types/v-transcript"

export async function loader() {
  return loadVariantData()
}

export function meta() {
  return [{ title: "DeathBench — transcript variant" }, { name: "robots", content: "noindex" }]
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return <Variant data={loaderData} />
}
