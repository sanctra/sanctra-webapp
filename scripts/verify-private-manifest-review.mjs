import { readFileSync } from 'node:fs';

const data = readFileSync('src/lib/privateManifestReview.ts', 'utf8');
const page = readFileSync('src/app/admin/manifest-review/page.tsx', 'utf8');
const css = readFileSync('src/app/admin/manifest-review/ManifestReviewPage.module.css', 'utf8');

const requiredStates = ['corpus_staged', 'needs_review', 'quarantined', 'approved', 'approved_with_limits', 'rejected'];
const requiredFields = ['intakeId', 'lane', 'submittedAt', 'privacyFlags', 'blockedOperations', 'authorityStatus', 'identityConfidence', 'likenessRisk', 'reviewerRecommendation', 'manifestUri', 'storageRoot'];
const hardLocks = ['No provider calls', 'No training or fine-tuning', 'No public delivery', 'No raw corpus exposure by default', 'No browser-direct corpus download'];
const adminGateTokens = ['getPrivateManifestReviewAccess', 'SANCTRA_PRIVATE_MANIFEST_REVIEW_ADMIN_SECRET', 'x-sanctra-manifest-review-key', 'sanctra_manifest_review_key', 'timingSafeEqual', 'notFound()'];
const dataPathTokens = ['loadPrivateManifestQueue', 'SANCTRA_PRIVATE_MANIFEST_QUEUE_JSON', 'SANCTRA_PRIVATE_MANIFEST_QUEUE_PATH', 'SANCTRA_PRIVATE_MANIFEST_REVIEW_FIXTURE_MODE', 'fixture-only', 'not live GCS manifest coverage'];

for (const token of [...requiredStates, ...requiredFields, ...hardLocks, ...adminGateTokens, ...dataPathTokens]) {
  if (!data.includes(token) && !page.includes(token)) {
    throw new Error(`missing private manifest review contract token: ${token}`);
  }
}

if (!data.includes('gs://sanctra-corpus-intake/pilot-corpus/')) {
  throw new Error('missing pilot-corpus GCS manifest boundary');
}

if (page.includes('pilotManifestQueue') || !page.includes('queue.manifests.map')) {
  throw new Error('page must not import the static pilot fixture as the production review path');
}

if (!data.includes('const pilotFixtureManifestQueue') || data.includes('export const pilotManifestQueue')) {
  throw new Error('fixture queue must remain private and must not be exported as the route data source');
}

if (!data.includes('throw new Error("private manifest queue is not configured') || !data.includes('source: "fixture_only"')) {
  throw new Error('manifest review route must fail closed unless a server-side metadata export or explicit fixture mode is configured');
}

if (/href=\{?manifest\.(manifestUri|storageRoot)/.test(page) || /signedUrl|downloadUrl|mediaUrl|rawUrl/.test(data + page)) {
  throw new Error('raw media or direct manifest download exposure detected');
}

if (!(data + page).includes('raw object links withheld') || !page.includes('raw browser listing disabled')) {
  throw new Error('metadata-only/raw-media-blocking copy missing');
}

if (!css.includes('.queueCard') || !css.includes('.detailCard')) {
  throw new Error('queue/detail styling hooks missing');
}

console.log('private manifest review contract: ok');
