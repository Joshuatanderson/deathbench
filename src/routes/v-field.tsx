import { loadVariantData } from "../variants/data"
import Variant from "../variants/field"
import type { Route } from "./+types/v-field"

export async function loader() {
  return loadVariantData()
}

export function meta() {
  return [{ title: "DeathBench — field variant" }, { name: "robots", content: "noindex" }]
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return <Variant data={loaderData} />
}
