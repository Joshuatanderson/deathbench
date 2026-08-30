import { loadVariantData } from "../variants/data"
import Variant from "../variants/folio"
import type { Route } from "./+types/v-folio"

export async function loader() {
  return loadVariantData()
}

export function meta() {
  return [{ title: "DeathBench — folio variant" }, { name: "robots", content: "noindex" }]
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return <Variant data={loaderData} />
}
