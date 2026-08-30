import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("companies/:slug", "routes/company.tsx"),
  route("incidents/:id", "routes/incident.tsx"),
  route("v", "routes/v-index.tsx"),
  route("v/transcript", "routes/v-transcript.tsx"),
  route("v/field", "routes/v-field.tsx"),
  route("v/weight", "routes/v-weight.tsx"),
  route("editor", "routes/editor.tsx"),
  route("api/editor/*", "routes/editor-api.ts"),
] satisfies RouteConfig
