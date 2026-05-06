import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type SanctraStorageRef = {
  provider: "gcs" | "local";
  uri: string;
  bucket?: string;
  objectKey: string;
  localMirrorPath: string;
};

export type SanctraStorageRecord = {
  id: string;
  kind: "dataset-submission" | "curation-capture";
  lane: "self" | "family";
  createdAt: string;
  objectKey: string;
  localPath: string;
  storageRef: SanctraStorageRef;
};

export type SanctraAttachmentRecord = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  objectKey: string;
  localPath: string;
  storageRef: SanctraStorageRef;
};

const safeSegment = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "item";

export function storageRoot() {
  return path.resolve(process.env.SANCTRA_DATASET_STORAGE_DIR || path.join(process.cwd(), ".sanctra-storage"));
}

export function storageUri(objectKey: string, localPath: string): SanctraStorageRef {
  const bucket = process.env.SANCTRA_DATASET_STORAGE_BUCKET || process.env.SANCTRA_GCS_BUCKET;
  if (bucket) {
    return { provider: "gcs", uri: `gs://${bucket}/${objectKey}`, bucket, objectKey, localMirrorPath: localPath };
  }
  return { provider: "local", uri: `file://${localPath}`, objectKey, localMirrorPath: localPath };
}

function localPathFor(objectKey: string) {
  const root = storageRoot();
  const normalized = objectKey.replace(/^\/+/, "");
  const fullPath = path.resolve(root, normalized);
  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) throw new Error("invalid object key");
  return fullPath;
}

export async function persistSanctraRecord(input: {
  kind: SanctraStorageRecord["kind"];
  lane: "self" | "family";
  prefix?: string;
  payload: unknown;
}) {
  const createdAt = new Date().toISOString();
  const id = `${input.prefix ? safeSegment(input.prefix) : input.kind}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const date = createdAt.slice(0, 10);
  const objectKey = `sanctra/${input.kind}/${date}/${id}.json`;
  const localPath = localPathFor(objectKey);
  await mkdir(path.dirname(localPath), { recursive: true });
  const record: SanctraStorageRecord & { payload: unknown } = {
    id,
    kind: input.kind,
    lane: input.lane,
    createdAt,
    objectKey,
    localPath,
    storageRef: storageUri(objectKey, localPath),
    payload: input.payload,
  };
  await writeFile(localPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

export async function persistSanctraCapture(input: {
  lane: "self" | "family";
  promptId: string;
  step: "text" | "audio" | "image" | "video";
  payload: Record<string, unknown>;
  attachment?: { fileName: string; contentType: string; bytes: Buffer };
}) {
  const createdAt = new Date().toISOString();
  const id = `curation-${safeSegment(input.promptId)}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const date = createdAt.slice(0, 10);
  let attachment: SanctraAttachmentRecord | undefined;

  if (input.attachment) {
    const fileName = safeSegment(input.attachment.fileName || `${input.step}-capture.bin`);
    const objectKey = `sanctra/curation-capture/${date}/${id}/${fileName}`;
    const localPath = localPathFor(objectKey);
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, input.attachment.bytes);
    attachment = {
      fileName,
      contentType: input.attachment.contentType || "application/octet-stream",
      sizeBytes: input.attachment.bytes.byteLength,
      objectKey,
      localPath,
      storageRef: storageUri(objectKey, localPath),
    };
  }

  const manifestObjectKey = `sanctra/curation-capture/${date}/${id}/manifest.json`;
  const manifestPath = localPathFor(manifestObjectKey);
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const record: SanctraStorageRecord & { payload: Record<string, unknown>; attachment?: SanctraAttachmentRecord } = {
    id,
    kind: "curation-capture",
    lane: input.lane,
    createdAt,
    objectKey: manifestObjectKey,
    localPath: manifestPath,
    storageRef: storageUri(manifestObjectKey, manifestPath),
    payload: input.payload,
    attachment,
  };
  await writeFile(manifestPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

export async function persistSanctraBlob(input: {
  kind: "curation-media";
  lane: "self" | "family";
  prefix: string;
  filename: string;
  contentType: string;
  bytes: ArrayBuffer;
}) {
  const createdAt = new Date().toISOString();
  const extension = path.extname(input.filename) || ".bin";
  const id = `${safeSegment(input.prefix)}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const date = createdAt.slice(0, 10);
  const objectKey = `sanctra/${input.kind}/${date}/${id}${extension}`;
  const localPath = path.join(storageRoot(), objectKey);
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, Buffer.from(input.bytes));
  return {
    id,
    kind: input.kind,
    lane: input.lane,
    createdAt,
    filename: input.filename,
    contentType: input.contentType,
    objectKey,
    localPath,
    storageRef: storageUri(objectKey, localPath),
  };
}

export async function readSanctraRecord(objectKey: string) {
  const fullPath = localPathFor(objectKey);
  return JSON.parse(await readFile(fullPath, "utf8"));
}
