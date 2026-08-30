import { loadVariantData } from "../variants/data"
import Variant from "../variants/advisory"
import type { Route } from "./+types/v-advisory"

export async function loader() {
  return loadVariantData()
}

export function meta() {
  return [{ title: "DeathBench — advisory variant" }, { name: "robots", content: "noindex" }]
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return <Variant data={loaderData} />
}
