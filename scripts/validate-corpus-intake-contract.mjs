#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/app/dataset/live/page.tsx',
  'src/app/dataset/posthumous/page.tsx',
  'src/app/api/corpus-intake/submit/route.ts',
  'src/lib/corpusIntake.ts',
];
const errors = [];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`missing ${file}`);
}
const contract = fs.existsSync(path.join(root, 'src/lib/corpusIntake.ts')) ? fs.readFileSync(path.join(root, 'src/lib/corpusIntake.ts'), 'utf8') : '';
for (const token of ['live_subject', 'posthumous_archive', 'model_training', 'provider_finetune', 'avatar_runtime_deployment', 'training_requires_later_explicit_gate']) {
  if (!contract.includes(token)) errors.push(`corpus contract missing ${token}`);
}
const route = fs.existsSync(path.join(root, 'src/app/api/corpus-intake/submit/route.ts')) ? fs.readFileSync(path.join(root, 'src/app/api/corpus-intake/submit/route.ts'), 'utf8') : '';
for (const token of ['SANCTRA_CORPUS_BUCKET', 'storage.googleapis.com/upload/storage/v1', 'training_allowed: false', 'dataset_shape_review_required']) {
  if (!route.includes(token)) errors.push(`upload route missing ${token}`);
}
if (errors.length) {
  console.error('corpus intake contract failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('corpus intake contract passed');
