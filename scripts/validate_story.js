const fs = require('fs');
const path = require('path');

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function hasString(obj, key) {
  return typeof obj?.[key] === 'string' && obj[key].length > 0;
}

function getRequiredTextKeys(content) {
  const keys = new Set();
  for (const node of content.nodes || []) {
    if (hasString(node, 'textKey')) keys.add(node.textKey);
    if (node?.type === 'choice') {
      if (hasString(node, 'titleKey')) keys.add(node.titleKey);
      for (const option of node.options || []) {
        if (hasString(option, 'textKey')) keys.add(option.textKey);
      }
    }
  }
  return keys;
}

function validateStoryContent(content) {
  const errors = [];
  const warnings = [];

  if (!isObject(content)) return { errors: ['content must be an object'], warnings };

  if (!isObject(content.meta)) errors.push('meta is required');
  if (!hasString(content.meta, 'chapterId')) errors.push('meta.chapterId is required');
  if (!hasString(content.meta, 'lang')) errors.push('meta.lang is required');
  if (!hasString(content, 'entryNode')) errors.push('entryNode is required');

  if (!isObject(content.strings)) errors.push('strings is required');
  if (!hasString(content.strings, 'startBtn')) errors.push('strings.startBtn is required');
  if (!hasString(content.strings, 'deathText')) errors.push('strings.deathText is required');
  if (!hasString(content.strings, 'speaker')) errors.push('strings.speaker is required');
  if (!isObject(content.strings?.ui)) errors.push('strings.ui is required');
  if (!isObject(content.strings?.text)) errors.push('strings.text is required');

  if (!Array.isArray(content.nodes) || content.nodes.length === 0) {
    errors.push('nodes must be non-empty array');
  }

  const ids = new Set();
  const refs = [];

  for (const node of content.nodes || []) {
    if (!hasString(node, 'id')) {
      errors.push('node.id is required');
      continue;
    }
    if (ids.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    ids.add(node.id);

    if (!hasString(node, 'type')) {
      errors.push(`node ${node.id}: type is required`);
      continue;
    }

    if (!['line', 'choice', 'action', 'jump', 'end'].includes(node.type)) {
      errors.push(`node ${node.id}: unsupported type ${node.type}`);
      continue;
    }

    if (node.type === 'line') {
      if (!hasString(node, 'textKey')) errors.push(`node ${node.id}: line requires textKey`);
      if (!hasString(node, 'nextNodeId')) errors.push(`node ${node.id}: line requires nextNodeId`);
    }

    if (node.type === 'jump' && !hasString(node, 'nextNodeId')) {
      errors.push(`node ${node.id}: jump requires nextNodeId`);
    }

    if (node.type === 'action' && !hasString(node, 'actionId')) {
      errors.push(`node ${node.id}: action requires actionId`);
    }

    if (hasString(node, 'nextNodeId')) refs.push([node.id, node.nextNodeId]);

    if (node.type === 'choice') {
      if (!hasString(node, 'titleKey')) errors.push(`node ${node.id}: choice requires titleKey`);
      if (!Array.isArray(node.options) || node.options.length === 0) {
        errors.push(`node ${node.id}: choice requires options`);
      } else {
        for (const option of node.options) {
          if (!hasString(option, 'id')) errors.push(`node ${node.id}: option.id required`);
          if (!hasString(option, 'textKey')) errors.push(`node ${node.id}: option.textKey required`);
          if (!hasString(option, 'nextNodeId') && !hasString(option, 'actionId')) {
            errors.push(`node ${node.id}: option ${option.id || '?'} needs nextNodeId or actionId`);
          }
          if (hasString(option, 'nextNodeId')) refs.push([`${node.id}.${option.id}`, option.nextNodeId]);
        }
      }
    }
  }

  if (hasString(content, 'entryNode') && !ids.has(content.entryNode)) {
    errors.push(`missing entry node: ${content.entryNode}`);
  }

  for (const [owner, target] of refs) {
    if (!ids.has(target)) errors.push(`missing reference: ${owner} -> ${target}`);
  }

  const textMap = content.strings?.text || {};
  const requiredTextKeys = getRequiredTextKeys(content);
  for (const key of requiredTextKeys) {
    if (!hasString(textMap, key)) {
      errors.push(`missing strings.text key: ${key}`);
    }
  }

  const unusedTextKeys = Object.keys(textMap).filter((k) => !requiredTextKeys.has(k));
  if (unusedTextKeys.length > 0) {
    warnings.push(`unused strings.text keys: ${unusedTextKeys.join(', ')}`);
  }

  return { errors, warnings };
}

function groupByChapter(files) {
  const groups = new Map();
  for (const file of files) {
    const m = file.match(/^(.*)\.([a-z]{2,3})\.json$/i);
    if (!m) continue;
    const chapter = m[1];
    if (!groups.has(chapter)) groups.set(chapter, []);
    groups.get(chapter).push(file);
  }
  return groups;
}

function validateCrossLocale(chapterFiles, parsedByFile) {
  const errors = [];
  const warnings = [];

  if (chapterFiles.length <= 1) return { errors, warnings };

  const sorted = [...chapterFiles].sort((a, b) => {
    if (a.includes('.tw.')) return -1;
    if (b.includes('.tw.')) return 1;
    return a.localeCompare(b);
  });

  const baseFile = sorted[0];
  const base = parsedByFile.get(baseFile);
  const baseNodeIds = new Set((base.nodes || []).map((n) => n.id));
  const baseTextKeys = new Set(Object.keys(base.strings?.text || {}));

  for (const file of sorted.slice(1)) {
    const cur = parsedByFile.get(file);
    const curNodeIds = new Set((cur.nodes || []).map((n) => n.id));
    const curTextKeys = new Set(Object.keys(cur.strings?.text || {}));

    for (const id of baseNodeIds) {
      if (!curNodeIds.has(id)) warnings.push(`${file}: missing node id from ${baseFile}: ${id}`);
    }
    for (const id of curNodeIds) {
      if (!baseNodeIds.has(id)) warnings.push(`${file}: extra node id not in ${baseFile}: ${id}`);
    }

    for (const key of baseTextKeys) {
      if (!curTextKeys.has(key)) errors.push(`${file}: missing strings.text key from ${baseFile}: ${key}`);
    }
  }

  return { errors, warnings };
}

function run() {
  const contentDir = path.join(process.cwd(), 'src', 'js', 'story', 'content');
  const files = fs.readdirSync(contentDir).filter((name) => name.endsWith('.json'));
  if (files.length === 0) {
    console.error('No story json files found.');
    process.exit(1);
  }

  let hasError = false;
  const parsedByFile = new Map();

  for (const file of files) {
    const fullPath = path.join(contentDir, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error(`${file}: invalid JSON`);
      console.error(`  - ${e.message}`);
      hasError = true;
      continue;
    }

    parsedByFile.set(file, parsed);
    const { errors, warnings } = validateStoryContent(parsed);
    if (errors.length > 0) {
      hasError = true;
      console.error(`${file}:`);
      for (const err of errors) console.error(`  - ${err}`);
    } else {
      console.log(`${file}: OK`);
    }

    for (const warn of warnings) {
      console.warn(`${file}: WARN: ${warn}`);
    }
  }

  const grouped = groupByChapter(files);
  for (const [chapter, chapterFiles] of grouped.entries()) {
    const { errors, warnings } = validateCrossLocale(chapterFiles, parsedByFile);
    for (const err of errors) {
      hasError = true;
      console.error(`[${chapter}] ${err}`);
    }
    for (const warn of warnings) {
      console.warn(`[${chapter}] WARN: ${warn}`);
    }
  }

  if (hasError) process.exit(1);
}

run();
