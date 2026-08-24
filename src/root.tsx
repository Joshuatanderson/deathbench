import type { ReactNode } from "react"
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router"

import type { Route } from "./+types/root"
import "./index.css"

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <meta property="og:image" content="https://deathbench.com/opengraph.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="The DeathBench homepage" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://deathbench.com/opengraph.png" />
        <meta name="twitter:image:alt" content="The DeathBench homepage" />
        <Links />
        <link rel="icon" type="image/svg+xml" href="/deathbench-skull.svg" />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const message = notFound ? "Page not found." : "Something went wrong."
  const details =
    !notFound && import.meta.env.DEV && error instanceof Error
      ? error.message
      : notFound
        ? "The page you requested does not exist."
        : "Please try again later."

  return (
    <main className="grid min-h-svh place-items-center bg-background px-5 text-foreground">
      <div className="max-w-lg border-t border-border py-8">
        <p className="section-label">{notFound ? "404" : "Error"}</p>
        <h1 className="section-title mt-3">{message}</h1>
        <p className="mt-6 text-muted-foreground">{details}</p>
        <a
          className="mt-8 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
          href="/"
        >
          Return to DeathBench
        </a>
      </div>
    </main>
  )
}
