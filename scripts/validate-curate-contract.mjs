import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "src/app/curate/page.tsx");
const page = fs.readFileSync(pagePath, "utf8");
const errors = [];

function requireToken(token, label = token) {
  if (!page.includes(token)) {
    errors.push(`missing ${label}`);
  }
}

function requireOrdered(tokens, label) {
  let cursor = -1;
  for (const token of tokens) {
    const index = page.indexOf(token, cursor + 1);
    if (index === -1) {
      errors.push(`${label} missing ${token}`);
      return;
    }
    cursor = index;
  }
}

const lanes = ["living_subject_guided", "family_archive_guided"];
const progressSteps = ["consent", "text", "audio", "image", "video", "review"];
const livingStates = ["draft", "captured", "submitted", "approved_with_limits", "recorded", "uploaded", "derivative_pending", "quarantined"];
const familyStates = ["draft", "captured", "submitted", "inventory_only", "metadata_captured", "identity_review_needed", "quarantined"];
const packageSummary = [
  "coverage_by_modality",
  "coverage_by_life_value_relationship_category",
  "reusable_scope",
  "quarantined_items",
  "readiness_gaps",
  "revocation_path",
];
const boundaries = [
  "bulk_uploader_not_implemented_in_this_slice",
  "processor_sanitation_not_implemented_in_this_slice",
  "no_provider_calls",
  "no_raw_media_persistence",
];

requireToken('route: "/curate"', "route contract");
for (const lane of lanes) requireToken(lane, `lane ${lane}`);
requireOrdered(progressSteps.map((step) => `"${step}"`), "six progress steps");
for (const state of [...livingStates, ...familyStates]) requireToken(`"${state}"`, `mocked state ${state}`);
for (const section of packageSummary) requireToken(`"${section}"`, `package summary ${section}`);
for (const boundary of boundaries) requireToken(boundary, `boundary ${boundary}`);

requireToken("Build a memorial package before upload/processing", "guided route headline");
requireToken("Guided prompts, not a generic text box", "guided prompt behavior");
requireToken("Human review remains the release gate", "review/package summary");
requireToken("Bulk upload and sanitation stay out of this first slice", "copy boundary");
requireToken("No raw media persistence".toLowerCase().replace("no raw media persistence", "no_raw_media_persistence"), "no raw media persistence boundary");

if (page.match(/fetch\s*\(|XMLHttpRequest|navigator\.mediaDevices|getUserMedia|MediaRecorder|localStorage|sessionStorage/)) {
  errors.push("prototype contains live browser capture/storage/provider behavior");
}

if (errors.length > 0) {
  console.error("curate contract failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("curate contract passed");
console.log(JSON.stringify({ route: "/curate", lanes, progressSteps, packageSummary, boundaries }, null, 2));
