/**
 * @typedef {"line"|"choice"|"action"|"jump"|"end"} StoryNodeType
 */

/**
 * @typedef {{
 *   id: string,
 *   textKey?: string,
 *   nextNodeId?: string,
 *   actionId?: string
 * }} BaseNode
 */

/**
 * @typedef {{
 *   id: string,
 *   textKey: string,
 *   nextNodeId?: string,
 *   effects?: Record<string, string | number | boolean>
 * }} ChoiceOption
 */

/**
 * @typedef {{
 *   id: string,
 *   type: "choice",
 *   titleKey: string,
 *   options: ChoiceOption[],
 *   nextNodeId?: string
 * }} ChoiceNode
 */

/**
 * @typedef {{
 *   meta: { chapterId: string, lang: string },
 *   entryNode: string,
 *   strings: {
 *     startBtn: string,
 *     deathText: string,
 *     speaker: string,
 *     ui: Record<string, string>,
 *     text: Record<string, string>
 *   },
 *   nodes: Array<BaseNode | ChoiceNode>
 * }} StoryContent
 */

function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
}

function hasString(obj, key) {
    return typeof obj?.[key] === "string" && obj[key].length > 0;
}

export function validateStoryContent(content) {
    /** @type {string[]} */
    const errors = [];

    if (!isObject(content)) {
        return { ok: false, errors: ["content must be an object"] };
    }

    if (!isObject(content.meta)) errors.push("meta is required");
    if (!hasString(content.meta, "chapterId")) errors.push("meta.chapterId is required");
    if (!hasString(content.meta, "lang")) errors.push("meta.lang is required");
    if (!hasString(content, "entryNode")) errors.push("entryNode is required");

    if (!isObject(content.strings)) errors.push("strings is required");
    if (!hasString(content.strings, "startBtn")) errors.push("strings.startBtn is required");
    if (!hasString(content.strings, "deathText")) errors.push("strings.deathText is required");
    if (!hasString(content.strings, "speaker")) errors.push("strings.speaker is required");
    if (!isObject(content.strings?.ui)) errors.push("strings.ui is required");
    if (!isObject(content.strings?.text)) errors.push("strings.text is required");

    if (!Array.isArray(content.nodes) || content.nodes.length === 0) {
        errors.push("nodes must be a non-empty array");
    }

    const nodeIds = new Set();
    const unresolved = [];

    if (Array.isArray(content.nodes)) {
        for (const node of content.nodes) {
            if (!isObject(node)) {
                errors.push("node must be an object");
                continue;
            }
            if (!hasString(node, "id")) {
                errors.push("node.id is required");
                continue;
            }
            if (nodeIds.has(node.id)) {
                errors.push(`duplicate node id: ${node.id}`);
            }
            nodeIds.add(node.id);

            if (!hasString(node, "type")) {
                errors.push(`node ${node.id}: type is required`);
                continue;
            }

            const type = node.type;
            if (!["line", "choice", "action", "jump", "end"].includes(type)) {
                errors.push(`node ${node.id}: unsupported type ${type}`);
                continue;
            }

            if ((type === "line" || type === "jump") && !hasString(node, "nextNodeId")) {
                errors.push(`node ${node.id}: nextNodeId is required for ${type}`);
            }

            if (type === "line" && !hasString(node, "textKey")) {
                errors.push(`node ${node.id}: textKey is required for line`);
            }

            if (type === "action" && !hasString(node, "actionId")) {
                errors.push(`node ${node.id}: actionId is required for action`);
            }

            if (type === "choice") {
                if (!hasString(node, "titleKey")) {
                    errors.push(`node ${node.id}: titleKey is required for choice`);
                }
                if (!Array.isArray(node.options) || node.options.length === 0) {
                    errors.push(`node ${node.id}: options must be a non-empty array`);
                } else {
                    for (const option of node.options) {
                        if (!hasString(option, "id")) {
                            errors.push(`node ${node.id}: option.id is required`);
                        }
                        if (!hasString(option, "textKey")) {
                            errors.push(`node ${node.id}: option.textKey is required`);
                        }
                        if (!hasString(option, "nextNodeId") && !hasString(option, "actionId")) {
                            errors.push(`node ${node.id}: option ${option.id} needs nextNodeId or actionId`);
                        }
                        if (hasString(option, "nextNodeId")) {
                            unresolved.push({ owner: `${node.id}.${option.id}`, target: option.nextNodeId });
                        }
                    }
                }
            }

            if (hasString(node, "nextNodeId")) {
                unresolved.push({ owner: node.id, target: node.nextNodeId });
            }
        }
    }

    if (hasString(content, "entryNode") && !nodeIds.has(content.entryNode)) {
        errors.push(`entryNode ${content.entryNode} does not exist`);
    }

    for (const ref of unresolved) {
        if (!nodeIds.has(ref.target)) {
            errors.push(`missing node reference: ${ref.owner} -> ${ref.target}`);
        }
    }

    return { ok: errors.length === 0, errors };
}

export function validateStorySet(storyByLang) {
    const errors = [];
    if (!isObject(storyByLang)) {
        return { ok: false, errors: ["storyByLang must be an object"] };
    }
    const langs = Object.keys(storyByLang);
    if (langs.length === 0) {
        return { ok: false, errors: ["storyByLang cannot be empty"] };
    }

    for (const lang of langs) {
        const result = validateStoryContent(storyByLang[lang]);
        if (!result.ok) {
            for (const err of result.errors) {
                errors.push(`[${lang}] ${err}`);
            }
        }
    }

    return { ok: errors.length === 0, errors };
}
