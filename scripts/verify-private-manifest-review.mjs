import { readFileSync } from 'node:fs';

const data = readFileSync('src/lib/privateManifestReview.ts', 'utf8');
const page = readFileSync('src/app/admin/manifest-review/page.tsx', 'utf8');
const css = readFileSync('src/app/admin/manifest-review/ManifestReviewPage.module.css', 'utf8');

const requiredStates = ['corpus_staged', 'needs_review', 'quarantined', 'approved', 'approved_with_limits', 'rejected'];
const requiredFields = ['intakeId', 'lane', 'submittedAt', 'privacyFlags', 'blockedOperations', 'authorityStatus', 'identityConfidence', 'likenessRisk', 'reviewerRecommendation', 'manifestUri', 'storageRoot'];
const hardLocks = ['No provider calls', 'No training or fine-tuning', 'No public delivery', 'No raw corpus exposure by default', 'No browser-direct corpus download'];

for (const token of [...requiredStates, ...requiredFields, ...hardLocks]) {
  if (!data.includes(token) && !page.includes(token)) {
    throw new Error(`missing private manifest review contract token: ${token}`);
  }
}

if (!data.includes('gs://sanctra-corpus-intake/pilot-corpus/')) {
  throw new Error('missing pilot-corpus GCS manifest boundary');
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
