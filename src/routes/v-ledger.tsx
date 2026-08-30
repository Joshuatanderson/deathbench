import { loadVariantData } from "../variants/data"
import Variant from "../variants/ledger"
import type { Route } from "./+types/v-ledger"

export async function loader() {
  return loadVariantData()
}

export function meta() {
  return [{ title: "DeathBench — ledger variant" }, { name: "robots", content: "noindex" }]
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return <Variant data={loaderData} />
}
