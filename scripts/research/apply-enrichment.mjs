// Apply agent research output (research/enrichment/*.json) to the incidents table.
// Updates research fields only. Never touches verdict, evidence-class, reasoning, review, or pathway columns.
// Usage: node --env-file=.env scripts/research/apply-enrichment.mjs research/enrichment/*.json
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const sql = neon(process.env.DATABASE_URL);
const TRANSCRIPT = new Set(['none', 'excerpts', 'partial', 'complete-final', 'sealed']);
const files = process.argv.slice(2);
if (files.length === 0) throw new Error('pass enrichment JSON files');

let applied = 0;
for (const file of files) {
  const records = JSON.parse(readFileSync(file, 'utf8'));
  for (const r of records) {
    const [existing] = await sql`select * from incidents where id = ${r.id}`;
    if (!existing) { console.warn(`skip ${r.id}: not found`); continue; }

    const links = new Map();
    for (const l of [...(existing.source_links ?? []), ...(r.source_links ?? [])]) {
      if (!l?.url || !/^https?:\/\//.test(l.url)) continue;
      const label = l.type && !String(l.label ?? '').includes(`[${l.type}]`) ? `[${l.type}] ${l.label ?? ''}`.trim() : String(l.label ?? l.url);
      links.set(l.url, { label, url: l.url });
    }
    const sourceLinks = [...links.values()];

    const notes = [
      r.official_findings ? `Official findings: ${r.official_findings}` : '',
      r.model_note ? `Model: ${r.model_note}` : '',
      r.research_notes ? `Research notes (${new Date().toISOString().slice(0, 10)}): ${r.research_notes}` : '',
    ].filter(Boolean).join('\n\n');

    const evidenceSummary = [r.evidence_summary || existing.evidence_summary, notes].filter(Boolean).join('\n\n');
    const transcriptStatus = TRANSCRIPT.has(r.transcript_status) ? r.transcript_status : existing.transcript_status;
    const transcriptLink = r.transcript_link && /^https?:\/\//.test(r.transcript_link) ? r.transcript_link : existing.transcript_link;
    const victimCount = Number.isInteger(r.victim_count) && r.victim_count > 0 ? r.victim_count : existing.victim_count;
    let minor = Number.isInteger(r.minor_victim_count) ? r.minor_victim_count : existing.minor_victim_count;
    minor = Math.max(0, Math.min(minor, victimCount));

    await sql`update incidents set
      death_date = ${r.death_date || existing.death_date},
      location = ${r.location || existing.location},
      case_reference = ${r.case_reference || existing.case_reference},
      victim_count = ${victimCount},
      minor_victim_count = ${minor},
      transcript_status = ${transcriptStatus},
      transcript_link = ${transcriptLink},
      source_links = ${JSON.stringify(sourceLinks)}::jsonb,
      claim_summary = ${r.claim_summary || existing.claim_summary},
      evidence_summary = ${evidenceSummary},
      counterevidence = ${r.counterevidence || existing.counterevidence},
      updated_at = now()
      where id = ${r.id}`;
    applied += 1;
    console.log(`updated ${existing.title} (${sourceLinks.length} links)`);
  }
}
console.log(`applied ${applied} records`);
