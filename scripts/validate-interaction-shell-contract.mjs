import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  page: fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8"),
  api: fs.readFileSync(path.join(root, "src/lib/api.ts"), "utf8"),
  contract: fs.readFileSync(path.join(root, "src/lib/interaction.ts"), "utf8"),
  profileRoute: fs.readFileSync(path.join(root, "src/app/api/packages/[packageId]/interaction-profile/route.ts"), "utf8"),
  sessionRoute: fs.readFileSync(path.join(root, "src/app/api/interaction-sessions/route.ts"), "utf8"),
  turnRoute: fs.readFileSync(path.join(root, "src/app/api/interaction-sessions/[sessionId]/turns/route.ts"), "utf8"),
  feedbackRoute: fs.readFileSync(path.join(root, "src/app/api/interaction-sessions/[sessionId]/feedback/route.ts"), "utf8"),
};

const errors = [];

function requireToken(fileKey, token, label = token) {
  if (!files[fileKey].includes(token)) {
    errors.push(`${fileKey} missing ${label}`);
  }
}

for (const token of [
  "Completed-avatar interaction app",
  "Text interaction",
  "Avatar presentation",
  "Family review feedback",
  "Mic capture reserved",
  "Video output reserved",
  "not new corpus intake",
]) {
  requireToken("page", token);
}

for (const token of [
  "allowed_modalities",
  "deferred_modalities",
  "blocked_modalities",
  "disclosure_labels",
  "artifact_refs",
  "approved_for_private_interaction",
  "Speech-to-speech adapter is reserved",
  "Full-motion video remains deferred",
]) {
  requireToken("contract", token);
}

for (const token of [
  "/api/packages/",
  "/api/interaction-sessions",
  "sendInteractionTurn",
  "sendInteractionFeedback",
]) {
  requireToken("api", token);
}

for (const [key, file] of Object.entries(files)) {
  if (key === "turnRoute") continue;
  if (/getUserMedia|MediaRecorder|new WebSocket|localStorage|sessionStorage/.test(file)) {
    errors.push(`${key} contains live capture/storage behavior outside the deferred seam`);
  }
}

if (!files.turnRoute.includes('modality === "text"')) {
  errors.push("turn route does not limit orchestrator proxying to text mode");
}

if (errors.length > 0) {
  console.error("interaction shell contract failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("interaction shell contract passed");
console.log(JSON.stringify({
  route: "/",
  endpoints: [
    "GET /api/packages/{packageId}/interaction-profile",
    "POST /api/interaction-sessions",
    "POST /api/interaction-sessions/{sessionId}/turns",
    "POST /api/interaction-sessions/{sessionId}/feedback",
  ],
  allowed_modalities: ["text", "image"],
  deferred_modalities: ["voice", "video"],
}, null, 2));
