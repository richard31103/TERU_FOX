import fs from 'node:fs/promises';
import path from 'node:path';

let sharp;
try {
  const mod = await import('sharp');
  sharp = mod.default || mod;
} catch (_err) {
  const fallback = new URL('../.img-tools/node_modules/sharp/lib/index.js', import.meta.url);
  const mod = await import(fallback.href);
  sharp = mod.default || mod;
}

const DEFAULT_ROOT = 'assets/images';
const DEFAULT_MIN_BYTES = 24 * 1024;
const DEFAULT_JPEG_QUALITY = 82;
const SAVE_THRESHOLD_RATIO = 0.01;
const SAVE_THRESHOLD_BYTES = 1024;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

async function walkFiles(rootDir) {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile()) files.push(full);
    }
  }
  return files;
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function shouldKeepCandidate(originalBytes, candidateBytes) {
  if (candidateBytes >= originalBytes) return false;
  const minSave = Math.max(SAVE_THRESHOLD_BYTES, Math.floor(originalBytes * SAVE_THRESHOLD_RATIO));
  return (originalBytes - candidateBytes) >= minSave;
}

async function optimizeOne(filePath, jpegQuality) {
  const ext = path.extname(filePath).toLowerCase();
  const originalBuffer = await fs.readFile(filePath);
  const originalBytes = originalBuffer.length;
  let optimizedBuffer = null;
  let mode = null;

  if (ext === '.jpg' || ext === '.jpeg') {
    optimizedBuffer = await sharp(originalBuffer)
      .jpeg({
        quality: jpegQuality,
        mozjpeg: true,
        progressive: true,
        optimizeCoding: true
      })
      .toBuffer();
    mode = `jpeg-q${jpegQuality}`;
  } else if (ext === '.png') {
    optimizedBuffer = await sharp(originalBuffer)
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        effort: 10
      })
      .toBuffer();
    mode = 'png-lossless';
  } else {
    return null;
  }

  if (!optimizedBuffer || !shouldKeepCandidate(originalBytes, optimizedBuffer.length)) {
    return {
      changed: false,
      filePath,
      originalBytes,
      optimizedBytes: originalBytes,
      mode
    };
  }

  return {
    changed: true,
    filePath,
    originalBytes,
    optimizedBytes: optimizedBuffer.length,
    optimizedBuffer,
    mode
  };
}

async function writeAtomically(filePath, buffer) {
  const tempPath = `${filePath}.tmp-opt`;
  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, filePath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args['dry-run']);
  const root = path.resolve(String(args.root || DEFAULT_ROOT));
  const minBytes = Number(args['min-bytes'] || DEFAULT_MIN_BYTES);
  const jpegQuality = Number(args['jpeg-quality'] || DEFAULT_JPEG_QUALITY);

  const allFiles = await walkFiles(root);
  const targetFiles = allFiles.filter((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
  });

  let scanned = 0;
  let skippedSmall = 0;
  let changedCount = 0;
  let totalBefore = 0;
  let totalAfter = 0;
  const changedRows = [];

  for (const filePath of targetFiles) {
    const stat = await fs.stat(filePath);
    if (stat.size < minBytes) {
      skippedSmall += 1;
      totalBefore += stat.size;
      totalAfter += stat.size;
      continue;
    }

    scanned += 1;
    const result = await optimizeOne(filePath, jpegQuality);
    if (!result) continue;

    totalBefore += result.originalBytes;
    totalAfter += result.optimizedBytes;

    if (!result.changed) continue;
    changedCount += 1;
    const saved = result.originalBytes - result.optimizedBytes;
    changedRows.push({
      filePath,
      mode: result.mode,
      before: result.originalBytes,
      after: result.optimizedBytes,
      saved
    });

    if (!dryRun) {
      await writeAtomically(filePath, result.optimizedBuffer);
    }
  }

  changedRows.sort((a, b) => b.saved - a.saved);
  const totalSaved = totalBefore - totalAfter;
  const ratio = totalBefore > 0 ? (totalSaved / totalBefore) * 100 : 0;

  console.log(`Root: ${root}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`);
  console.log(`Scanned (>= min-bytes): ${scanned}`);
  console.log(`Skipped small files: ${skippedSmall}`);
  console.log(`Changed files: ${changedCount}`);
  console.log(`Total before: ${formatMB(totalBefore)}`);
  console.log(`Total after : ${formatMB(totalAfter)}`);
  console.log(`Saved       : ${formatMB(totalSaved)} (${ratio.toFixed(2)}%)`);

  if (changedRows.length > 0) {
    console.log('Top savings:');
    for (const row of changedRows.slice(0, 20)) {
      const rel = path.relative(process.cwd(), row.filePath).replace(/\\/g, '/');
      const pct = row.before > 0 ? ((row.saved / row.before) * 100).toFixed(2) : '0.00';
      console.log(` - ${rel} | ${row.mode} | ${formatMB(row.before)} -> ${formatMB(row.after)} | -${formatMB(row.saved)} (${pct}%)`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
