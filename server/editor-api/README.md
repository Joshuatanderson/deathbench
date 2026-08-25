# Editor API

All endpoints are under `/api/editor`. The session endpoint is public; every other resource requires the editor session cookie.

| Resource | Methods | Purpose |
| --- | --- | --- |
| `/session` | `GET`, `PUT`, `DELETE` | Read, create, or end the current editor session |
| `/labs` | `GET` | List labs |
| `/models` | `GET` | List models |
| `/incidents` | `GET`, `POST` | List or create incidents |
| `/incidents/:id` | `GET`, `PUT`, `DELETE` | Read, fully replace, or delete one case |
| `/incidents/:id/review` | `PUT`, `DELETE` | Save or remove the human decision on one case |

`PUT /incidents/:id` replaces the complete agent-authored case. Agents create cases with `POST`. The review UI never calls `PUT /incidents/:id`; it only reads cases and writes the human decision through `/review`. Unsupported methods return `405` with an `Allow` header. Successful creates return `201` with a `Location` header.

A case keeps the agent recommendation and the human decision in separate columns:

- `agent` is `{ verdict, evidenceClass, reasoning }`. Agents write it. The review UI only displays it. `verdict` and `evidenceClass` can be `null`.
- `review` is `{ verdict, reasoning, reviewedAt }` or `null`. Only `PUT /incidents/:id/review` writes it. `DELETE /incidents/:id/review` sets it back to `null`. A decision must include `reasoning`.
- `verdict` values are `excluded`, `included`, `resolution-pending` (insufficient evidence for a clear in or out), or `under-review` (concrete evidence points at a rule, but no independent factfinder has ruled yet).

Only cases with `review.verdict = "included"` enter public aggregates. An agent recommendation never changes the public company count.

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
