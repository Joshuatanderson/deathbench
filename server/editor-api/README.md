# Editor API

All endpoints are under `/api/editor`. The session endpoint is public; every other resource requires the editor session cookie.

| Resource | Methods | Purpose |
| --- | --- | --- |
| `/session` | `GET`, `PUT`, `DELETE` | Read, create, or end the current editor session |
| `/labs` | `GET` | List labs |
| `/models` | `GET` | List models |
| `/incidents` | `GET`, `POST` | List or create incidents |
| `/incidents/:id` | `GET`, `PUT`, `DELETE` | Read, fully replace, or delete one incident |

`PUT` replaces the complete editable incident representation. Unsupported methods return `405` with an `Allow` header. Successful creates return `201` with a `Location` header.

Incident resources keep review provenance separate from the case outcome:

- `reviewState` is `unreviewed`, `agent-recommended`, or `human-reviewed`.
- `verdict` is `excluded`, `included`, or `resolution-pending`.
- `reasoning` records the recommendation or decision rationale. A `human-reviewed` dossier must include it.

Only incidents with both `reviewState: "human-reviewed"` and `verdict: "included"` enter public aggregates. An agent recommendation never changes the public company count.

The evidence representation also includes incident metadata, `claimSummary`, `evidenceSummary`, `counterevidence`, a primary `link`, additional `sourceLinks`, and the status/link for the available chatbot conversation record. A court complaint remains an allegation; the summaries should explicitly distinguish pleadings, authenticated records, official findings, and unavailable or sealed transcripts.

## File ownership

- `index.ts` reads runtime configuration and creates the database client.
- `router.ts` maps resource paths and enforces authentication.
- `session.ts` owns password verification and the session cookie.
- `reference-data.ts` serves the read-only lab and model collections.
- `incidents.ts` translates incident HTTP requests into repository operations.
- `incident-contract.ts` validates request bodies and maps database rows to API resources.
- `incident-repository.ts` owns incident SQL.
- `http.ts` owns shared HTTP responses and JSON parsing.
- `database.ts` owns the Neon client type and construction.
