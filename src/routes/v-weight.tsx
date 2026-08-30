import { loadVariantData } from "../variants/data"
import Variant from "../variants/weight"
import type { Route } from "./+types/v-weight"

export async function loader() {
  return loadVariantData()
}

export function meta() {
  return [{ title: "DeathBench — weight variant" }, { name: "robots", content: "noindex" }]
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return <Variant data={loaderData} />
}
