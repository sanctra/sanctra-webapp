import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.join(await mkdtemp(path.join(tmpdir(), "sanctra-curate-storage-contract-")), "storage");
process.env.SANCTRA_DATASET_STORAGE_DIR = root;

const { persistSanctraCapture } = await import("../src/lib/sanctraStorage.ts");

const textCapture = await persistSanctraCapture({
  lane: "family",
  promptId: "text-authority",
  step: "text",
  payload: {
    lane: "family",
    promptId: "text-authority",
    step: "text",
    responseText: "I am an authorized submitter with review consent.",
    provenance: { capturedBy: "sanctra-webapp/curate" },
    review: { status: "submitted_for_review", reviewerRequired: true },
  },
});
assert.equal(textCapture.kind, "curation-capture");
assert.match(textCapture.storageRef.uri, /^file:\/\//);
const textRecord = JSON.parse(await readFile(textCapture.storageRef.localMirrorPath, "utf8"));
assert.equal(textRecord.payload.promptId, "text-authority");
assert.equal(textRecord.payload.provenance.capturedBy, "sanctra-webapp/curate");
assert.equal(textRecord.attachment, undefined);

const mediaCapture = await persistSanctraCapture({
  lane: "self",
  promptId: "audio-reassurance",
  step: "audio",
  payload: {
    lane: "self",
    promptId: "audio-reassurance",
    step: "audio",
    responseText: "Transcript and provenance notes for reviewer.",
    media: { fileName: "comfort.wav", contentType: "audio/wav", sizeBytes: 14 },
    provenance: { capturedBy: "sanctra-webapp/curate" },
    review: { status: "submitted_for_review", reviewerRequired: true },
  },
  attachment: { fileName: "comfort.wav", contentType: "audio/wav", bytes: Buffer.from("fake wav bytes") },
});
assert.equal(mediaCapture.kind, "curation-capture");
assert.match(mediaCapture.attachment.storageRef.uri, /^file:\/\//);
const mediaRecord = JSON.parse(await readFile(mediaCapture.storageRef.localMirrorPath, "utf8"));
assert.equal(mediaRecord.attachment.contentType, "audio/wav");
assert.equal(await readFile(mediaRecord.attachment.storageRef.localMirrorPath, "utf8"), "fake wav bytes");

await rm(path.dirname(root), { recursive: true, force: true });
console.log("curateStorageContract: ok");
