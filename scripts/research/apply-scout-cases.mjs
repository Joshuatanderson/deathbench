// Insert new cases found by the weekly deathbench-scout loop (~/dev/loops/loops/deathbench-scout).
// Each file holds one case. Inserts only: an existing link is never overwritten, and human
// verdict columns stay NULL, so every case lands as "unreviewed" until a human decides.
// Usage: node --env-file=.env scripts/research/apply-scout-cases.mjs <case.json>...
// Prints one line per file: "added <title>", "exists <title>", or "skip <file>: <reason>".
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const sql = neon(process.env.DATABASE_URL);
const VERDICTS = new Set(['excluded', 'included', 'resolution-pending', 'under-review']);
const CLASSES = new Set(['A', 'B', 'C', 'X']);
const PATHWAYS = new Set(['direct-operation', 'enabled-harm', 'systemic-contribution']);
const TRANSCRIPT = new Set(['none', 'excerpts', 'partial', 'complete-final', 'sealed']);
const SOURCE_KINDS = new Set(['court-filing', 'press', 'police', 'coroner', 'regulator', 'official', 'other']);
const PRECISION = new Set(['city', 'region', 'country']);
const isUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v);
const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const text = (v) => (typeof v === 'string' ? v.trim() : '');

async function resolveModel(r) {
  const [lab] = await sql`select id from labs where slug = ${r.lab_slug}`;
  if (!lab) throw new Error(`unknown lab_slug ${r.lab_slug}`);
  const [model] = await sql`select id from models where slug = ${r.model_slug} and lab_id = ${lab.id}`;
  if (model) return { labId: lab.id, modelId: model.id };
  if (!text(r.model_name)) throw new Error(`unknown model_slug ${r.model_slug} and no model_name to create it`);
  const [created] = await sql`
    insert into models (lab_id, name, slug) values (${lab.id}, ${text(r.model_name)}, ${r.model_slug})
    on conflict (slug) do update set slug = excluded.slug
    returning id`;
  return { labId: lab.id, modelId: created.id };
}

function validate(r) {
  if (!text(r.title)) throw new Error('missing title');
  if (!isUrl(r.link)) throw new Error('link must be a URL');
  if (!VERDICTS.has(r.agent_verdict)) throw new Error(`bad agent_verdict ${r.agent_verdict}`);
  if (!CLASSES.has(r.agent_evidence_class)) throw new Error(`bad agent_evidence_class ${r.agent_evidence_class}`);
  if (r.pathway != null && !PATHWAYS.has(r.pathway)) throw new Error(`bad pathway ${r.pathway}`);
  if (!TRANSCRIPT.has(r.transcript_status ?? 'none')) throw new Error(`bad transcript_status ${r.transcript_status}`);
  if (!text(r.claim_summary) || !text(r.agent_reasoning)) throw new Error('claim_summary and agent_reasoning are required');
  if (r.geo && !PRECISION.has(r.geo.geo_precision)) throw new Error(`bad geo_precision ${r.geo.geo_precision}`);
}

for (const file of process.argv.slice(2)) {
  try {
    const r = JSON.parse(readFileSync(file, 'utf8'));
    validate(r);
    const [existing] = await sql`select title from incidents where link = ${r.link}`;
    if (existing) { console.log(`exists ${existing.title}`); continue; }

    const { labId, modelId } = await resolveModel(r);
    const victims = Number.isInteger(r.victim_count) && r.victim_count > 0 ? r.victim_count : 1;
    const minors = Math.max(0, Math.min(Number.isInteger(r.minor_victim_count) ? r.minor_victim_count : 0, victims));
    const links = (r.source_links ?? []).filter((l) => isUrl(l?.url)).map((l) => ({ label: text(l.label) || l.url, url: l.url }));
    const geo = r.geo ?? {};

    const [incident] = await sql`
      insert into incidents (
        title, link, lab_id, model_id, victim_count, minor_victim_count, death_date, location,
        case_reference, agent_verdict, agent_evidence_class, pathway, transcript_status, transcript_link,
        source_links, claim_summary, evidence_summary, counterevidence, agent_reasoning,
        place, country_code, latitude, longitude, geo_precision
      ) values (
        ${text(r.title)}, ${r.link}, ${labId}, ${modelId}, ${victims}, ${minors}, ${text(r.death_date)}, ${text(r.location)},
        ${text(r.case_reference)}, ${r.agent_verdict}::incident_verdict, ${r.agent_evidence_class}, ${r.pathway ?? null},
        ${r.transcript_status ?? 'none'}, ${isUrl(r.transcript_link) ? r.transcript_link : null},
        ${JSON.stringify(links)}::jsonb, ${text(r.claim_summary)}, ${text(r.evidence_summary)}, ${text(r.counterevidence)},
        ${text(r.agent_reasoning)},
        ${text(geo.place)}, ${geo.country_code ?? null}, ${geo.latitude ?? null}, ${geo.longitude ?? null}, ${geo.geo_precision ?? null}
      )
      on conflict (link) do nothing
      returning id`;
    if (!incident) { console.log(`exists ${r.title}`); continue; }

    const sourceIds = new Map();
    for (const s of r.sources ?? []) {
      if (!s?.key || !isUrl(s.url)) continue;
      const [row] = await sql`
        insert into sources (incident_id, kind, title, publisher, url, published_on)
        values (${incident.id}, ${SOURCE_KINDS.has(s.kind) ? s.kind : 'other'}, ${text(s.title) || s.url}, ${text(s.publisher)}, ${s.url}, ${date(s.published_on)})
        on conflict (incident_id, url) do nothing
        returning id`;
      if (row) sourceIds.set(s.key, row.id);
    }
    let order = 0;
    for (const q of r.quotes ?? []) {
      const sourceId = sourceIds.get(q.source);
      if (!sourceId || !text(q.text) || !['ai', 'user'].includes(q.speaker)) continue;
      await sql`
        insert into quotes (incident_id, source_id, speaker, text, context, locator, said_on, featured, sort_order)
        values (${incident.id}, ${sourceId}, ${q.speaker}, ${text(q.text)}, ${text(q.context)}, ${text(q.locator)}, ${date(q.said_on)}, false, ${order})
        on conflict (source_id, text) do nothing`;
      order += 1;
    }
    console.log(`added ${r.title} (${order} quotes) https://deathbench.com/incidents/${incident.id}`);
  } catch (error) {
    console.log(`skip ${file}: ${error.message}`);
  }
}
