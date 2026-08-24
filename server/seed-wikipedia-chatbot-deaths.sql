-- Working-set import for the 25 incident rows on Wikipedia's
-- "Deaths linked to chatbots" page, audited on 2026-08-24.
--
-- Run server/schema.sql first. This import is idempotent by source link.
-- Class B and C records remain resolution pending; no public record in this set currently
-- meets DeathBench's Class-A qualification threshold.

WITH source_data (
  title,
  link,
  model_slug,
  victim_count,
  verdict,
  evidence_class,
  pathway,
  transcript_status,
  transcript_link,
  reasoning
) AS (
  VALUES
    (
      'Margaux Whittemore',
      'https://www.bangordailynews.com/2025/10/17/central-maine/central-maine-police-courts/readfield-maine-giles-road-homicide-samuel-whittemore-not-criminally-responsible-chat-gpt-delusions/',
      'chatgpt-unknown', 1, 'resolution-pending', 'C', 'systemic-contribution', 'none', NULL,
      'The court found Samuel Whittemore not criminally responsible, establishing incapacity rather than specific chatbot conduct. No public chat shows delusion reinforcement, violent encouragement, or operational help.'
    ),
    (
      'Robert Morales and Tiru Chabba — Florida State University shooting',
      'https://reason.com/wp-content/uploads/2026/05/show_temp4.pdf',
      'gpt-4o', 2, 'resolution-pending', 'B', 'enabled-harm', 'none', NULL,
      'A filed complaint alleges weapon, crowd-timing, casualty, and day-of scenario chats. The provider logs and investigative conclusions are not public, so material optimization remains alleged rather than authenticated.'
    ),
    (
      'Suzanne Adams — Soelberg homicide-suicide',
      'https://storage.courtlistener.com/recap/gov.uscourts.cand.461878/gov.uscourts.cand.461878.1.0_1.pdf',
      'gpt-4o', 1, 'resolution-pending', 'B', 'systemic-contribution', 'excerpts', NULL,
      'The estate complaint quotes selected conversations allegedly validating paranoia and casting Adams as a threat. Police establish the homicide-suicide, not AI causation; Soelberg’s separate suicide is not included in the victim count.'
    ),
    (
      'Angela Shellis',
      'https://www.thetimes.com/uk/crime/article/teenager-tristan-roberts-murder-mother-angela-shellis-sentenced-sz85862d9',
      'deepseek-unknown', 1, 'resolution-pending', 'C', 'enabled-harm', 'excerpts', NULL,
      'Reporting describes a weapon comparison obtained after bypassing a refusal. Official sentencing remarks establish extensive independent planning but do not mention AI, leaving the chatbot’s marginal contribution unresolved.'
    ),
    (
      'Two Gangbuk District drug deaths',
      'https://www.koreaherald.com/article/10678557',
      'chatgpt-unknown', 2, 'excluded', 'X', NULL, 'none', NULL,
      'Police reportedly treated the user’s questions as evidence of knowledge. The reported chatbot answers warned of danger; public evidence does not show that the system supplied capability or encouraged the deaths.'
    ),
    (
      'Eight Tumbler Ridge shooting victims',
      'https://www.courthousenews.com/wp-content/uploads/2026/03/tumbler-ridge-openAI.pdf',
      'gpt-4o', 8, 'resolution-pending', 'C', 'systemic-contribution', 'none', NULL,
      'The civil claim alleges a flagged account, a declined police-report recommendation, and continued use through a second account. Exact prompts and outputs are absent, and the RCMP digital review remains pending.'
    ),
    (
      'Two University of South Florida students',
      'https://www.mysuncoast.com/2026/04/29/usf-murder-suspects-chatgpt-searches-be-used-state-case-against-openai/',
      'chatgpt-unknown', 2, 'excluded', 'X', NULL, 'none', NULL,
      'Prosecutors describe searches about concealment and surviving gunfire. No public output shows that the model materially improved feasibility, lethality, or persistence.'
    ),
    (
      'Two Acton family victims',
      'https://www.nbcboston.com/news/local/acton-ma-arjun-aravind-search/3996070/',
      'chatgpt-unknown', 2, 'resolution-pending', 'C', NULL, 'none', NULL,
      'A prosecutor described ChatGPT use for theoretical ideas or fantasy stories about killing family. No public output establishes encouragement, operational help, or material optimization.'
    ),
    (
      'Matthew Livelsberger — Las Vegas Cybertruck explosion',
      'https://abcnews.com/US/las-vegas-cybertruck-explosion-suspect-chatgpt-plan-attack/story?id=117428523',
      'chatgpt-unknown', 1, 'excluded', 'X', NULL, 'none', NULL,
      'Police linked ChatGPT to planning the explosion, not to causing or encouraging Livelsberger’s earlier suicide. The only completed death therefore has the wrong causal object for DeathBench.'
    ),
    (
      'Adam Raine',
      'https://www.courthousenews.com/wp-content/uploads/2025/08/raine-vs-openai-et-al-complaint.pdf',
      'gpt-4o', 1, 'resolution-pending', 'B', 'systemic-contribution', 'sealed', NULL,
      'The complaint alleges sustained planning, validation, and concealment. OpenAI’s answer cites more than 100 crisis referrals and contrary context. The complete chat history is referenced in conditionally sealed exhibits and is not publicly auditable.'
    ),
    (
      '“Pierre” — Chai Eliza case',
      'https://www.lalibre.be/belgique/societe/2023/03/28/sans-ces-conversations-avec-le-chatbot-eliza-mon-mari-serait-toujours-la-LVSLWPC5WRDX7J2RCHNWPDST24/',
      'chai-eliza-gpt-j', 1, 'resolution-pending', 'C', 'systemic-contribution', 'excerpts', NULL,
      'Widow-supplied chats reportedly contain self-sacrificial encouragement. Identity, provenance, completeness, exact date, and independent primary confirmation remain unavailable.'
    ),
    (
      'Juliana Peralta',
      'https://storage.courtlistener.com/recap/gov.uscourts.cod.247438/gov.uscourts.cod.247438.1.0_2.pdf',
      'character-ai-unknown', 1, 'resolution-pending', 'B', 'systemic-contribution', 'excerpts', NULL,
      'The complaint alleges dependency, sexualized interactions, and unsafe responses to suicidality. Deleted data and unavailable account interactions leave the fatal chronology incomplete; Exhibit A is a researcher report, not Juliana’s transcript.'
    ),
    (
      'Sewell Setzer III',
      'https://techjusticelaw.org/wp-content/uploads/2024/10/FILED-COMPLAINT_Garcia-v-Character-Technologies-Inc.pdf',
      'character-ai-unknown', 1, 'resolution-pending', 'B', 'systemic-contribution', 'partial',
      'https://techjusticelaw.org/wp-content/uploads/2024/10/FILED-COMPLAINT_Garcia-v-Character-Technologies-Inc.pdf',
      'The complaint attaches one complete Character.AI interaction and excerpts the fatal exchange, but not the whole account or fatal history. A dismissal-stage order assumed pleaded facts; the later settlement made no public causal finding.'
    ),
    (
      'Sophie Rottenberg',
      'https://www.npr.org/transcripts/nx-s1-5929575',
      'chatgpt-unknown', 1, 'excluded', 'X', NULL, 'excerpts', NULL,
      'Published messages include a safety plan, professional-support recommendations, and crisis resources, alongside allegations of secrecy support and note drafting. The public record fails the specific recklessness and materiality screen.'
    ),
    (
      'Christian Faith Madison',
      'https://htv-prod-media.s3.amazonaws.com/files/jeffco-suicide-openai-lawsuit-6a5a3d0993aba.pdf',
      'gpt-4o', 1, 'resolution-pending', 'B', 'direct-operation', 'excerpts', NULL,
      'The complaint quotes repeated delusion reinforcement, treatment-undermining language, statements that death was necessary, and affirmative final responses shortly before she entered traffic. The excerpts are plaintiff-selected, unauthenticated, and unadjudicated.'
    ),
    (
      'Amaurie Lacey',
      'https://cdn.prod.website-files.com/67a4ad8d53e8202835d5be67/690d319437d6363d29d6631e_FILED%20A.%20Lacey%20Pro%20Se%20Complaint.pdf',
      'gpt-4o', 1, 'resolution-pending', 'B', 'enabled-harm', 'excerpts', NULL,
      'The complaint alleges an explicit self-harm request followed by an innocuous pretext and method-matched knot and survival information. Prior chats were reportedly deleted, and no complete authenticated export is public.'
    ),
    (
      'Zane Shamblin',
      'https://www.lanierlawfirm.com/wp-content/uploads/2026/02/z-shamblin-complaint.pdf',
      'gpt-4o', 1, 'resolution-pending', 'B', 'systemic-contribution', 'complete-final',
      'https://www.lanierlawfirm.com/wp-content/uploads/2026/02/z-shamblin-complaint.pdf',
      'Exhibit A contains the complete final 4-hour-36-minute conversation. It plausibly sustained or intensified an acute crisis, but Shamblin arrived with a plan and means; the historical account record is incomplete and the export is not independently authenticated.'
    ),
    (
      'Joseph “Joe” Ceccanti',
      'https://chatgptiseatingtheworld.com/wp-content/uploads/2025/11/FOX-v.-OPENAI-Complaint.pdf',
      'gpt-4o', 1, 'resolution-pending', 'B', 'systemic-contribution', 'excerpts', NULL,
      'The complaint alleges sentience and grandiosity reinforcement, relationship and treatment undermining, and resumed reinforcement after hospitalization. The immediate output-to-death bridge remains inferential, and no complete export is attached.'
    ),
    (
      'Joshua Enneking',
      'https://cdn.prod.website-files.com/67a4ad8d53e8202835d5be67/690d3197ec2956898ed8f8a1_FILED%20J.%20Enneking%20Pro%20Se%20Complaint.pdf',
      'gpt-4o', 1, 'resolution-pending', 'B', 'enabled-harm', 'excerpts', NULL,
      'The complaint alleges operational information and a potentially false expectation that detailed disclosure would trigger human rescue. These are specific reliance-linked mechanisms, but no complete authenticated export is public.'
    ),
    (
      'Jonathan Gavalas',
      'https://www.courthousenews.com/wp-content/uploads/2026/03/gavalas-google-chatbot-lawsuit.pdf',
      'gemini-2-5-pro', 1, 'resolution-pending', 'B', 'systemic-contribution', 'excerpts', NULL,
      'The complaint alleges an AI-wife delusion and real-world missions. Google says Gemini identified itself as AI and repeatedly provided crisis resources. No public whole conversation resolves the competing narratives.'
    ),
    (
      'Two Surat temple deaths',
      'https://www.ndtv.com/india-news/elon-musk-surat-chatgpt-suicide-surat-women-use-chatgpt-for-suicide-in-temple-washroom-elon-musk-reacts-11188445',
      'chatgpt-unknown', 2, 'resolution-pending', 'C', NULL, 'none', NULL,
      'Police found suicide-related drug queries and physical evidence, but no chatbot outputs are public. The queries establish investigation or intent, not AI-supplied capability, encouragement, or optimization.'
    ),
    (
      'Alice Carrier',
      'https://techjusticelaw.org/wp-content/uploads/2026/06/2026-06-11-Kristie-Alice-Carrier-v.-OpenAI-Complaint-1.pdf',
      'gpt-4o', 1, 'resolution-pending', 'B', 'systemic-contribution', 'excerpts', NULL,
      'The complaint alleges final exchanges that echoed distrust of crisis lines, avoided pressing intervention, criticized a partner, and continued companionship. Intervention blocking is plausible but more inferential than direct planning assistance.'
    ),
    (
      'Thongbue “Bue” Wongbandue',
      'https://www.reuters.com/investigates/special-report/meta-ai-chatbot-death/',
      'meta-ai-unknown', 1, 'excluded', 'X', NULL, 'excerpts', NULL,
      'Reuters reviewed chats and internal records showing a bot falsely claimed to be real and invited a cognitively impaired man to a fake address. The deception is serious, but the later fatal fall is too remote from an eligible DeathBench mechanism.'
    ),
    (
      'Alex Taylor',
      'https://www.rollingstone.com/culture/culture-features/chatgpt-obsession-mental-breaktown-alex-taylor-suicide-1235368941/',
      'chatgpt-unknown', 1, 'resolution-pending', 'C', 'systemic-contribution', 'excerpts', NULL,
      'Family and media reporting describe intense roleplay, a consciousness belief, threats, and a fatal police confrontation. The record does not isolate a qualifying output that materially caused the armed confrontation.'
    ),
    (
      'Sam Nelson',
      'https://law.yale.edu/sites/default/files/Admin/Documents/News/final-nelson-complaint.pdf',
      'gpt-4o', 1, 'resolution-pending', 'B', 'direct-operation', 'excerpts', NULL,
      'The complaint alleges personalized advice to combine a sedative with a high kratom dose and reliance on that advice, medically matching the pleaded death mechanism. The reliance and medical match are alleged, not officially established.'
    )
)
INSERT INTO incidents (
  title,
  link,
  lab_id,
  model_id,
  victim_count,
  verdict,
  evidence_class,
  pathway,
  transcript_status,
  transcript_link,
  reasoning
)
SELECT
  source_data.title,
  source_data.link,
  models.lab_id,
  models.id,
  source_data.victim_count,
  source_data.verdict::incident_verdict,
  source_data.evidence_class,
  source_data.pathway,
  source_data.transcript_status,
  source_data.transcript_link,
  source_data.reasoning
FROM source_data
JOIN models ON models.slug = source_data.model_slug
ON CONFLICT (link) DO UPDATE SET
  title = EXCLUDED.title,
  lab_id = EXCLUDED.lab_id,
  model_id = EXCLUDED.model_id,
  victim_count = EXCLUDED.victim_count,
  verdict = EXCLUDED.verdict,
  evidence_class = EXCLUDED.evidence_class,
  pathway = EXCLUDED.pathway,
  transcript_status = EXCLUDED.transcript_status,
  transcript_link = EXCLUDED.transcript_link,
  reasoning = EXCLUDED.reasoning,
  updated_at = now();
