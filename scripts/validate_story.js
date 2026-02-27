const fs = require("fs");
const path = require("path");

function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
}

function hasString(obj, key) {
    return typeof obj?.[key] === "string" && obj[key].length > 0;
}

function validateStoryContent(content) {
    const errors = [];
    if (!isObject(content)) return ["content must be an object"];

    if (!isObject(content.meta)) errors.push("meta is required");
    if (!hasString(content.meta, "chapterId")) errors.push("meta.chapterId is required");
    if (!hasString(content.meta, "lang")) errors.push("meta.lang is required");
    if (!hasString(content, "entryNode")) errors.push("entryNode is required");
    if (!isObject(content.strings)) errors.push("strings is required");
    if (!isObject(content.strings?.ui)) errors.push("strings.ui is required");
    if (!isObject(content.strings?.text)) errors.push("strings.text is required");
    if (!Array.isArray(content.nodes) || content.nodes.length === 0) errors.push("nodes must be non-empty array");

    const ids = new Set();
    const refs = [];

    for (const node of content.nodes || []) {
        if (!hasString(node, "id")) {
            errors.push("node.id is required");
            continue;
        }
        if (ids.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
        ids.add(node.id);

        if (!hasString(node, "type")) {
            errors.push(`node ${node.id}: type is required`);
            continue;
        }

        if (node.type === "line" && !hasString(node, "textKey")) {
            errors.push(`node ${node.id}: line requires textKey`);
        }
        if (node.type === "action" && !hasString(node, "actionId")) {
            errors.push(`node ${node.id}: action requires actionId`);
        }
        if (hasString(node, "nextNodeId")) refs.push([node.id, node.nextNodeId]);

        if (node.type === "choice") {
            if (!hasString(node, "titleKey")) errors.push(`node ${node.id}: choice requires titleKey`);
            if (!Array.isArray(node.options) || node.options.length === 0) {
                errors.push(`node ${node.id}: choice requires options`);
            } else {
                for (const option of node.options) {
                    if (!hasString(option, "id")) errors.push(`node ${node.id}: option.id required`);
                    if (!hasString(option, "textKey")) errors.push(`node ${node.id}: option.textKey required`);
                    if (!hasString(option, "nextNodeId") && !hasString(option, "actionId")) {
                        errors.push(`node ${node.id}: option ${option.id} needs nextNodeId or actionId`);
                    }
                    if (hasString(option, "nextNodeId")) refs.push([`${node.id}.${option.id}`, option.nextNodeId]);
                }
            }
        }
    }

    if (hasString(content, "entryNode") && !ids.has(content.entryNode)) {
        errors.push(`missing entry node: ${content.entryNode}`);
    }
    for (const [owner, target] of refs) {
        if (!ids.has(target)) errors.push(`missing reference: ${owner} -> ${target}`);
    }

    return errors;
}

function run() {
    const contentDir = path.join(process.cwd(), "src", "js", "story", "content");
    const files = fs.readdirSync(contentDir).filter((name) => name.endsWith(".json"));
    if (files.length === 0) {
        console.error("No story json files found.");
        process.exit(1);
    }

    let hasError = false;
    for (const file of files) {
        const fullPath = path.join(contentDir, file);
        const raw = fs.readFileSync(fullPath, "utf8");
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            console.error(`${file}: invalid JSON`);
            console.error(e.message);
            hasError = true;
            continue;
        }
        const errors = validateStoryContent(parsed);
        if (errors.length > 0) {
            hasError = true;
            console.error(`${file}:`);
            for (const err of errors) console.error(`  - ${err}`);
        } else {
            console.log(`${file}: OK`);
        }
    }

    if (hasError) process.exit(1);
}

run();
