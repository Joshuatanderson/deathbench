// Add newly researched incidents (research/incidents/*.json) to the incidents table, so they enter the review queue.
// Idempotent by link: an existing row gets its research, agent, and geo fields refreshed. Human columns are never touched.
// Usage: node --env-file=.env scripts/research/apply-incidents.mjs research/incidents/*.json
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const sql = neon(process.env.DATABASE_URL);
const PATHWAY = new Set(['direct-operation', 'enabled-harm', 'systemic-contribution']);
const TRANSCRIPT = new Set(['none', 'excerpts', 'partial', 'complete-final', 'sealed']);
const VERDICT = new Set(['under-review', 'resolution-pending', 'included', 'excluded']);
const CLASS = new Set(['A', 'B', 'C', 'X']);
const files = process.argv.slice(2);
if (files.length === 0) throw new Error('pass incident JSON files');

let applied = 0;
for (const file of files) {
  for (const r of JSON.parse(readFileSync(file, 'utf8'))) {
    if (!/^https?:\/\//.test(r.link ?? '')) throw new Error(`${r.title}: bad link`);
    if (r.pathway && !PATHWAY.has(r.pathway)) throw new Error(`${r.title}: bad pathway ${r.pathway}`);
    if (!TRANSCRIPT.has(r.transcript_status)) throw new Error(`${r.title}: bad transcript_status ${r.transcript_status}`);
    if (!VERDICT.has(r.agent_verdict)) throw new Error(`${r.title}: bad agent_verdict ${r.agent_verdict}`);
    if (!CLASS.has(r.agent_evidence_class)) throw new Error(`${r.title}: bad agent_evidence_class ${r.agent_evidence_class}`);

    const [model] = await sql`select id, lab_id from models where slug = ${r.model_slug}`;
    if (!model) throw new Error(`${r.title}: unknown model ${r.model_slug}`);

    const sourceLinks = (r.source_links ?? []).filter((l) => /^https?:\/\//.test(l?.url ?? '')).map((l) => ({ label: l.label ?? l.url, url: l.url }));
    const geo = r.geo ?? {};

    const [row] = await sql`
      insert into incidents (
        title, link, lab_id, model_id, victim_count, minor_victim_count, death_date, location, case_reference,
        pathway, transcript_status, transcript_link, source_links, claim_summary, evidence_summary, counterevidence,
        agent_verdict, agent_evidence_class, agent_reasoning,
        place, country_code, latitude, longitude, geo_precision
      ) values (
        ${r.title}, ${r.link}, ${model.lab_id}, ${model.id}, ${r.victim_count}, ${r.minor_victim_count ?? 0},
        ${r.death_date ?? ''}, ${r.location ?? ''}, ${r.case_reference ?? ''},
        ${r.pathway ?? null}, ${r.transcript_status}, ${r.transcript_link ?? null}, ${JSON.stringify(sourceLinks)}::jsonb,
        ${r.claim_summary ?? ''}, ${r.evidence_summary ?? ''}, ${r.counterevidence ?? ''},
        ${r.agent_verdict}, ${r.agent_evidence_class}, ${r.agent_reasoning ?? ''},
        ${geo.place ?? ''}, ${geo.country_code ?? null}, ${geo.latitude ?? null}, ${geo.longitude ?? null}, ${geo.geo_precision ?? null}
      )
      on conflict (link) do update set
        title = excluded.title, lab_id = excluded.lab_id, model_id = excluded.model_id,
        victim_count = excluded.victim_count, minor_victim_count = excluded.minor_victim_count,
        death_date = excluded.death_date, location = excluded.location, case_reference = excluded.case_reference,
        pathway = excluded.pathway, transcript_status = excluded.transcript_status, transcript_link = excluded.transcript_link,
        source_links = excluded.source_links, claim_summary = excluded.claim_summary,
        evidence_summary = excluded.evidence_summary, counterevidence = excluded.counterevidence,
        agent_verdict = excluded.agent_verdict, agent_evidence_class = excluded.agent_evidence_class,
        agent_reasoning = excluded.agent_reasoning,
        place = excluded.place, country_code = excluded.country_code, latitude = excluded.latitude,
        longitude = excluded.longitude, geo_precision = excluded.geo_precision, updated_at = now()
      returning id, (xmax = 0) as inserted`;
    applied += 1;
    console.log(`${row.inserted ? 'inserted' : 'updated'} ${r.title} (${row.id}, ${sourceLinks.length} links)`);
  }
}
console.log(`applied ${applied} records`);
