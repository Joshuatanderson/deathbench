// Apply agent adjudication output (research/adjudication/*.json) to the agent_* columns of incidents.
// Never touches human_verdict, human_reasoning, or research fields.
// Usage: node --env-file=.env scripts/research/apply-adjudication.mjs research/adjudication/*.json
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const sql = neon(process.env.DATABASE_URL);
const VERDICTS = new Set(['excluded', 'included', 'resolution-pending', 'under-review']);
const CLASSES = new Set(['A', 'B', 'C', 'X']);
const files = process.argv.slice(2);
if (files.length === 0) throw new Error('pass adjudication JSON files');

const list = (label, items) => (items?.length ? `${label}:\n${items.map((x) => `- ${x}`).join('\n')}` : '');

let applied = 0;
for (const file of files) {
  for (const r of JSON.parse(readFileSync(file, 'utf8'))) {
    if (!VERDICTS.has(r.verdict) || !CLASSES.has(r.evidence_class)) throw new Error(`bad verdict/class for ${r.id}`);
    const [existing] = await sql`select id, title from incidents where id = ${r.id}`;
    if (!existing) { console.warn(`skip ${r.id}: not found`); continue; }
    const reasoning = [
      `Agent recommendation (${file.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? 'undated'}, standard rules): ${r.verdict}.`,
      r.reasoning,
      list('Rules met', r.rules_met),
      list('Rules violated', r.rules_violated),
      list('Exclusions checked and not triggered', r.rules_checked_clean),
      r.human_review_note ? `For human review: ${r.human_review_note}` : '',
    ].filter(Boolean).join('\n\n');
    await sql`update incidents set
      agent_verdict = ${r.verdict},
      agent_evidence_class = ${r.evidence_class},
      agent_reasoning = ${reasoning},
      updated_at = now()
      where id = ${r.id}`;
    applied += 1;
    console.log(`${r.verdict.padEnd(18)} ${r.evidence_class}  ${existing.title}`);
  }
}
console.log(`applied ${applied} records`);
