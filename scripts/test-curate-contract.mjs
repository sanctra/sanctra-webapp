import { readFile } from 'node:fs/promises';

const page = await readFile('src/app/curate/page.tsx', 'utf8');
const prototype = JSON.parse(await readFile('../async-memorial-package-scaffold/examples/guided-curation-prototype-flow.example.json', 'utf8'));
const governance = JSON.parse(await readFile('../async-memorial-package-scaffold/examples/curation-governance-prototype-summary.example.json', 'utf8'));
const protocols = await Promise.all(['text','audio','image','video'].map(async (modality) => JSON.parse(await readFile(`../async-memorial-package-scaffold/examples/guided-curation-${modality}-prompt-protocol.example.json`, 'utf8'))));

const requiredPageMarkers = [
  'prototypeFlow.lanes',
  'guided-curation-text-prompt-protocol.example.json',
  'Patrick-as-living-subject capture starts with prompt cards',
  'subject-self authority record',
  'package-level consent grant',
  'private-review audience profile',
  'revocation acknowledgement',
  'stop-condition acknowledgement',
  'no provider calls',
  'no model training',
  'no public delivery',
  'no raw private media in repo',
  'Requires review before training/provider/model eligibility',
  'Pilot packet handoff'
];
const handoff = await readFile('SANCTRA_CURATE_PILOT_HANDOFF_CON-1633_2026-05-05.md', 'utf8');
for (const marker of ['Pilot packet next action', 'provider calls', 'No raw media persistence']) {
  if (!handoff.includes(marker)) throw new Error(`Pilot handoff note missing marker: ${marker}`);
}
for (const marker of requiredPageMarkers) {
  if (!page.includes(marker)) throw new Error(`Curate page missing marker: ${marker}`);
}
if (page.includes('const selfPrompts') || page.includes('const familyPrompts')) {
  throw new Error('Curate page still uses static prompt arrays.');
}
const livingLane = prototype.lanes.find((lane) => lane.lane === 'living_subject_guided');
if (!livingLane) throw new Error('Prototype fixture missing living_subject_guided lane.');
for (const step of ['consent','text','audio','image','video','review']) {
  if (!livingLane.progress_steps.includes(step)) throw new Error(`Living-subject lane missing ${step}.`);
}
for (const protocol of protocols) {
  if (!protocol.prompt_protocol.cards.length) throw new Error(`Protocol has no cards: ${protocol.prompt_protocol.protocol_id}`);
}
for (const condition of ['no_provider_calls','no_raw_media_persistence']) {
  if (!prototype.follow_up_boundaries.includes(condition)) throw new Error(`Prototype missing ${condition}`);
}
for (const modality of ['text','audio','image','video']) {
  if (!governance.quality_gates.some((gate) => gate.modality === modality)) throw new Error(`Governance gaps missing ${modality}`);
}
console.log(JSON.stringify({ curateContract: 'ok', promptCards: protocols.reduce((n, p) => n + p.prompt_protocol.cards.length, prototype.prompt_cards.length), lane: livingLane.lane }, null, 2));
