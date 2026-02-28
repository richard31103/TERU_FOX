const fs = require('fs');
const path = require('path');

const root = process.cwd();
const ASSET_EXT = /\.(png|jpe?g|gif|webp|mp3|wav|ogg)$/i;

function walk(dir, collector = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(root, full).replace(/\\/g, '/');

    if (rel.startsWith('node_modules/')) continue;
    if (rel.startsWith('.git/')) continue;

    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, collector);
      continue;
    }

    collector.push({ full, rel });
  }
  return collector;
}

const files = walk(root);
const assetFiles = files.filter((f) => ASSET_EXT.test(f.rel));

const sourceFiles = files.filter((f) => {
  if (f.rel.startsWith('archive/legacy/')) return false;
  if (f.rel.startsWith('archive/unused/')) return false;
  return /\.(html|js|json|css|md)$/i.test(f.rel);
});

const sourceText = sourceFiles.map((f) => fs.readFileSync(f.full, 'utf8')).join('\n');

function isUsed(relPath) {
  const parts = relPath.split('/').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const relRegex = parts.join('[/\\\\]');
  const re = new RegExp(`(?<![A-Za-z0-9_./-])${relRegex}(?![A-Za-z0-9_./-])`);
  return re.test(sourceText);
}

const unused = assetFiles.filter((asset) => !isUsed(asset.rel)).map((a) => a.rel).sort();

if (unused.length === 0) {
  console.log('No unused assets found.');
  process.exit(0);
}

console.log(`Unused assets (${unused.length}):`);
for (const rel of unused) {
  console.log(`- ${rel}`);
}
