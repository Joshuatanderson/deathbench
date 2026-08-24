import { handleEditorRequest } from "../../server/editor-api/index"

import type { Route } from "./+types/editor-api"

export function loader({ request }: Route.LoaderArgs) {
  return handleEditorRequest(request)
}

export function action({ request }: Route.ActionArgs) {
  return handleEditorRequest(request)
}
