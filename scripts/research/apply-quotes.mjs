// Apply verbatim-quote research (research/quotes/*.json) to the sources and quotes tables.
// Idempotent: sources are keyed on (incident_id, url), quotes on (source_id, text).
// Usage: node --env-file=.env scripts/research/apply-quotes.mjs research/quotes/*.json
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const sql = neon(process.env.DATABASE_URL);
const KINDS = new Set(['court-filing', 'press', 'police', 'coroner', 'regulator', 'official', 'other']);
const files = process.argv.slice(2);
if (files.length === 0) throw new Error('pass quote JSON files');

const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
let sourcesUpserted = 0;
let quotesUpserted = 0;

for (const file of files) {
  const records = JSON.parse(readFileSync(file, 'utf8'));
  for (const r of records) {
    const [incident] = await sql`select id, title from incidents where id = ${r.incident_id}`;
    if (!incident) { console.warn(`skip ${r.incident_id}: incident not found`); continue; }

    const sourceIds = new Map();
    for (const s of r.sources ?? []) {
      if (!s?.key || !/^https?:\/\//.test(s.url ?? '')) { console.warn(`skip source ${s?.key} in ${incident.title}: bad url`); continue; }
      const kind = KINDS.has(s.kind) ? s.kind : 'other';
      const [row] = await sql`
        insert into sources (incident_id, kind, title, publisher, url, published_on)
        values (${incident.id}, ${kind}, ${s.title ?? s.url}, ${s.publisher ?? ''}, ${s.url}, ${date(s.published_on)})
        on conflict (incident_id, url) do update
          set kind = excluded.kind, title = excluded.title, publisher = excluded.publisher, published_on = excluded.published_on
        returning id`;
      sourceIds.set(s.key, row.id);
      sourcesUpserted += 1;
    }

    let order = 0;
    for (const q of r.quotes ?? []) {
      const sourceId = sourceIds.get(q.source);
      const text = String(q.text ?? '').trim();
      if (!sourceId || !text || !['ai', 'user'].includes(q.speaker)) { console.warn(`skip quote in ${incident.title}: ${text.slice(0, 40)}`); continue; }
      await sql`
        insert into quotes (incident_id, source_id, speaker, text, context, locator, said_on, featured, sort_order)
        values (${incident.id}, ${sourceId}, ${q.speaker}, ${text}, ${q.context ?? ''}, ${q.locator ?? ''}, ${date(q.said_on)}, ${q.featured === true && q.speaker === 'ai'}, ${order})
        on conflict (source_id, text) do update
          set speaker = excluded.speaker, context = excluded.context, locator = excluded.locator,
              said_on = excluded.said_on, featured = excluded.featured, sort_order = excluded.sort_order, updated_at = now()`;
      order += 1;
      quotesUpserted += 1;
    }
    console.log(`${incident.title}: ${sourceIds.size} sources, ${order} quotes`);
  }
}
console.log(`upserted ${sourcesUpserted} sources, ${quotesUpserted} quotes`);
