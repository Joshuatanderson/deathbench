import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("editor", "routes/editor.tsx"),
  route("api/editor/*", "routes/editor-api.ts"),
] satisfies RouteConfig
