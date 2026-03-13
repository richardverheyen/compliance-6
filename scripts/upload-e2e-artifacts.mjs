#!/usr/bin/env node
/**
 * upload-e2e-artifacts.mjs
 *
 * Uploads Playwright test artifacts (videos and PDFs) to a Supabase storage
 * bucket and updates the README.md with links to the uploaded files.
 *
 * Required environment variables (export before running):
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
// 1. Read and validate environment variables
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_ARTIFACTS_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_ARTIFACTS_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error(
    'Error: SUPABASE_ARTIFACTS_URL is not set.\n' +
    'Export it before running this script:\n' +
    '  export SUPABASE_ARTIFACTS_URL=https://xxxx.supabase.co'
  );
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error(
    'Error: SUPABASE_ARTIFACTS_SERVICE_ROLE_KEY is not set.\n' +
    'Export it before running this script:\n' +
    '  export SUPABASE_ARTIFACTS_SERVICE_ROLE_KEY=eyJ...'
  );
  process.exit(1);
}

const BUCKET = 'e2e-artifacts';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// ---------------------------------------------------------------------------
// 2. Collect artifacts
// ---------------------------------------------------------------------------

const projectRoot = process.cwd();
const testResultsDir = path.join(projectRoot, 'test-results');
const pdfsDir = path.join(testResultsDir, 'pdfs');

/**
 * Returns today's date as YYYY-MM-DD using the local system clock.
 */
function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const today = todayString();

/** @type {{ localPath: string; filename: string; type: 'videos' | 'pdfs'; contentType: string }[]} */
const artifacts = [];

// Find .webm files recursively in test-results/
if (fs.existsSync(testResultsDir)) {
  const allFiles = fs.readdirSync(testResultsDir, { recursive: true });
  for (const rel of allFiles) {
    const relStr = typeof rel === 'string' ? rel : rel.toString();
    if (!relStr.endsWith('.webm')) continue;
    const fullPath = path.join(testResultsDir, relStr);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      if (stat.size > MAX_FILE_SIZE) {
        console.warn(`Skipping ${relStr} — file exceeds 50 MB (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
        continue;
      }
      artifacts.push({
        localPath: fullPath,
        filename: path.basename(fullPath),
        type: 'videos',
        contentType: 'video/webm',
      });
    }
  }
}

// Find .pdf files in test-results/pdfs/
if (fs.existsSync(pdfsDir)) {
  const pdfFiles = fs.readdirSync(pdfsDir);
  for (const filename of pdfFiles) {
    if (!filename.endsWith('.pdf')) continue;
    const fullPath = path.join(pdfsDir, filename);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;
    if (stat.size > MAX_FILE_SIZE) {
      console.warn(`Skipping ${filename} — file exceeds 50 MB (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
      continue;
    }
    artifacts.push({
      localPath: fullPath,
      filename,
      type: 'pdfs',
      contentType: 'application/pdf',
    });
  }
}

if (artifacts.length === 0) {
  console.log('No artifacts found in test-results/. Nothing to upload.');
  console.log('Run `npm run test:e2e` first to generate test artifacts.');
  process.exit(0);
}

console.log(`Found ${artifacts.length} artifact(s) to upload.`);

// ---------------------------------------------------------------------------
// 3. Upload to Supabase storage
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/** @type {{ filename: string; url: string }[]} */
const uploadedVideos = [];
/** @type {{ filename: string; url: string }[]} */
const uploadedPdfs = [];

for (const artifact of artifacts) {
  const storagePath = `${artifact.type}/${today}/${artifact.filename}`;
  const fileBuffer = fs.readFileSync(artifact.localPath);

  process.stdout.write(`Uploading ${artifact.filename} → ${storagePath} ... `);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      upsert: true,
      contentType: artifact.contentType,
    });

  if (error) {
    console.error(`FAILED\n  ${error.message}`);
    continue;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  console.log(`OK\n  ${publicUrl}`);

  const entry = { filename: artifact.filename, url: publicUrl };
  if (artifact.type === 'videos') {
    uploadedVideos.push(entry);
  } else {
    uploadedPdfs.push(entry);
  }
}

// ---------------------------------------------------------------------------
// 4. Build manifest
// ---------------------------------------------------------------------------

const manifest = {
  uploadedAt: new Date().toISOString(),
  date: today,
  videos: uploadedVideos,
  pdfs: uploadedPdfs,
};

console.log('\nManifest:');
console.log(JSON.stringify(manifest, null, 2));

// ---------------------------------------------------------------------------
// 5. Update README.md
// ---------------------------------------------------------------------------

const readmePath = path.join(projectRoot, 'README.md');

if (!fs.existsSync(readmePath)) {
  console.warn('README.md not found — skipping README update.');
  process.exit(0);
}

const readmeContent = fs.readFileSync(readmePath, 'utf8');

const START_MARKER = '<!-- E2E_ARTIFACTS_START -->';
const END_MARKER = '<!-- E2E_ARTIFACTS_END -->';

const startIdx = readmeContent.indexOf(START_MARKER);
const endIdx = readmeContent.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.warn('README.md does not contain E2E artifact markers — skipping README update.');
  process.exit(0);
}

// Build markdown table rows
/** @param {{ filename: string; url: string }[]} items */
function buildRows(items) {
  return items.map((item) => {
    const isVideo = item.filename.endsWith('.webm');
    const icon = isVideo ? '📹 Video' : '📄 PDF';
    const linkText = isVideo ? 'Open video' : 'Open PDF';
    return `| ${icon} | ${item.filename} | [${linkText}](${item.url}) |`;
  });
}

const videoRows = buildRows(uploadedVideos);
const pdfRows = buildRows(uploadedPdfs);
const allRows = [...videoRows, ...pdfRows];

let tableSection = '';
if (allRows.length > 0) {
  tableSection =
    '\n| Type | File | Link |\n' +
    '|------|------|------|\n' +
    allRows.join('\n') +
    '\n';
}

const newSection =
  `${START_MARKER}\n` +
  `## Latest E2E Test Recordings\n\n` +
  `> Last updated: ${today} · [View all runs](https://github.com/)\n` +
  `\n### Journey 2 — AML/CTF Self-Assessment\n` +
  tableSection +
  `\n*Videos open directly in browser or download as .webm. PDFs open inline.*\n` +
  `${END_MARKER}`;

const updatedReadme =
  readmeContent.slice(0, startIdx) +
  newSection +
  readmeContent.slice(endIdx + END_MARKER.length);

fs.writeFileSync(readmePath, updatedReadme, 'utf8');
console.log('\nREADME.md updated with artifact links.');
