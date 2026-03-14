#!/usr/bin/env node
/**
 * upload-e2e-artifacts.mjs
 *
 * Uploads Playwright test artifacts (videos and PDFs) to Supabase storage
 * and updates README.md with per-journey links.
 *
 * Required env vars:
 *   SUPABASE_ARTIFACTS_URL              — cloud project URL
 *   SUPABASE_ARTIFACTS_SERVICE_ROLE_KEY — service role key
 *
 * Usage:
 *   export SUPABASE_ARTIFACTS_URL=https://xxxx.supabase.co
 *   export SUPABASE_ARTIFACTS_SERVICE_ROLE_KEY=eyJ...
 *   npm run upload:artifacts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// 1. Env vars
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_ARTIFACTS_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_ARTIFACTS_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('Error: SUPABASE_ARTIFACTS_URL is not set.');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_ARTIFACTS_SERVICE_ROLE_KEY is not set.');
  process.exit(1);
}

const BUCKET = 'e2e-artifacts';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const today = todayString();
const projectRoot = process.cwd();
const testResultsDir = path.join(projectRoot, 'test-results');
const pdfsDir = path.join(testResultsDir, 'pdfs');

// ---------------------------------------------------------------------------
// 2. Map test-results folders to journey numbers
//    e.g. "journey-02-aml-ctf-assessm-..." → "journey-02"
// ---------------------------------------------------------------------------

/** @param {string} dirName @returns {string|null} */
function journeyKey(dirName) {
  const m = dirName.match(/^(journey-\d+)/i);
  return m ? m[1].toLowerCase() : null;
}

const JOURNEY_LABELS = {
  'journey-01': 'Journey 1 — Account Creation',
  'journey-02': 'Journey 2 — AML/CTF Self-Assessment',
};

// ---------------------------------------------------------------------------
// 3. Collect artifacts
// ---------------------------------------------------------------------------

/** @type {Map<string, { video?: {localPath:string;filename:string}; pdfs: {localPath:string;filename:string}[] }>} */
const byJourney = new Map();

// Initialise all known journeys so they appear even if no artifacts found
for (const key of Object.keys(JOURNEY_LABELS)) {
  byJourney.set(key, { pdfs: [] });
}

// Videos — one per test-results subfolder
if (fs.existsSync(testResultsDir)) {
  for (const entry of fs.readdirSync(testResultsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const key = journeyKey(entry.name);
    if (!key) continue;
    const videoPath = path.join(testResultsDir, entry.name, 'video.webm');
    if (!fs.existsSync(videoPath)) continue;
    const stat = fs.statSync(videoPath);
    if (stat.size > MAX_FILE_SIZE) {
      console.warn(`Skipping ${entry.name}/video.webm — exceeds 50 MB`);
      continue;
    }
    const bucket = byJourney.get(key) ?? { pdfs: [] };
    bucket.video = { localPath: videoPath, filename: `${key}-video.webm` };
    byJourney.set(key, bucket);
  }
}

// PDFs — assign to journey-02 by default (audit report comes from that journey)
if (fs.existsSync(pdfsDir)) {
  for (const filename of fs.readdirSync(pdfsDir)) {
    if (!filename.endsWith('.pdf')) continue;
    const fullPath = path.join(pdfsDir, filename);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile() || stat.size > MAX_FILE_SIZE) continue;
    const bucket = byJourney.get('journey-02') ?? { pdfs: [] };
    bucket.pdfs.push({ localPath: fullPath, filename });
    byJourney.set('journey-02', bucket);
  }
}

const totalArtifacts = [...byJourney.values()].reduce(
  (n, b) => n + (b.video ? 1 : 0) + b.pdfs.length,
  0,
);

if (totalArtifacts === 0) {
  console.log('No artifacts found. Run `npm run test:e2e` first.');
  process.exit(0);
}

console.log(`Found ${totalArtifacts} artifact(s) to upload.\n`);

// ---------------------------------------------------------------------------
// 4. Upload
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * @param {string} localPath
 * @param {string} storagePath
 * @param {string} contentType
 * @returns {Promise<string|null>} public URL or null on failure
 */
async function upload(localPath, storagePath, contentType) {
  process.stdout.write(`  ${path.basename(localPath)} → ${storagePath} ... `);
  const fileBuffer = fs.readFileSync(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { upsert: true, contentType });
  if (error) {
    console.log(`FAILED (${error.message})`);
    return null;
  }
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  console.log(`OK`);
  return url;
}

/** @type {Map<string, { videoUrl?: string; pdfUrls: {filename:string;url:string}[] }>} */
const results = new Map();

for (const [key, artifacts] of byJourney) {
  console.log(`${JOURNEY_LABELS[key] ?? key}`);
  const result = { pdfUrls: [] };

  if (artifacts.video) {
    const storagePath = `videos/${today}/${artifacts.video.filename}`;
    const url = await upload(artifacts.video.localPath, storagePath, 'video/webm');
    if (url) result.videoUrl = url;
  }

  for (const pdf of artifacts.pdfs) {
    const storagePath = `pdfs/${today}/${pdf.filename}`;
    const url = await upload(pdf.localPath, storagePath, 'application/pdf');
    if (url) result.pdfUrls.push({ filename: pdf.filename, url });
  }

  results.set(key, result);
  console.log('');
}

// ---------------------------------------------------------------------------
// 5. Update README.md
// ---------------------------------------------------------------------------

const readmePath = path.join(projectRoot, 'README.md');
if (!fs.existsSync(readmePath)) {
  console.warn('README.md not found — skipping update.');
  process.exit(0);
}

const START = '<!-- E2E_ARTIFACTS_START -->';
const END = '<!-- E2E_ARTIFACTS_END -->';

let readme = fs.readFileSync(readmePath, 'utf8');
const startIdx = readme.indexOf(START);
const endIdx = readme.indexOf(END);

if (startIdx === -1 || endIdx === -1) {
  console.warn('README markers not found — skipping update.');
  process.exit(0);
}

// Build per-journey markdown
const sections = [];
for (const [key, result] of results) {
  const label = JOURNEY_LABELS[key] ?? key;
  const lines = [`#### ${label}`];

  if (!result.videoUrl && result.pdfUrls.length === 0) {
    lines.push('_No artifacts recorded for this journey._');
  } else {
    if (result.videoUrl) {
      lines.push(`- 📹 **Video** — [Watch recording](${result.videoUrl})`);
    }
    for (const { filename, url } of result.pdfUrls) {
      lines.push(`- 📄 **PDF** — [Open audit report](${url})`);
    }
  }

  sections.push(lines.join('\n'));
}

const newBlock =
  `${START}\n` +
  `### E2E Test Recordings\n\n` +
  `_Last updated: ${today}_\n\n` +
  sections.join('\n\n') +
  `\n${END}`;

readme = readme.slice(0, startIdx) + newBlock + readme.slice(endIdx + END.length);
fs.writeFileSync(readmePath, readme, 'utf8');
console.log('README.md updated.');
