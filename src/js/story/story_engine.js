import { validateStorySet } from "./schema.js";

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function mergeWithBase(baseContent, localizedContent, lang) {
    const base = cloneJson(baseContent);
    if (!localizedContent) {
        base.meta = { ...base.meta, lang };
        return base;
    }

    const localStrings = localizedContent.strings || {};
    return {
        meta: {
            chapterId: localizedContent.meta?.chapterId || base.meta.chapterId,
            lang: localizedContent.meta?.lang || lang,
        },
        entryNode: localizedContent.entryNode || base.entryNode,
        strings: {
            startBtn: localStrings.startBtn || base.strings.startBtn,
            deathText: localStrings.deathText || base.strings.deathText,
            speaker: localStrings.speaker || base.strings.speaker,
            ui: {
                ...base.strings.ui,
                ...(localStrings.ui || {}),
            },
            text: {
                ...base.strings.text,
                ...(localStrings.text || {}),
            },
        },
        nodes: Array.isArray(localizedContent.nodes) && localizedContent.nodes.length > 0
            ? localizedContent.nodes
            : base.nodes,
    };
}

function buildNodeMap(content) {
    const map = new Map();
    for (const node of content.nodes) {
        map.set(node.id, node);
    }
    return map;
}

function collectOpeningLineNodes(content, nodeMap) {
    const lineIds = [];
    let cursor = content.entryNode;
    const guard = new Set();
    while (cursor && !guard.has(cursor)) {
        guard.add(cursor);
        const node = nodeMap.get(cursor);
        if (!node) break;
        if (node.type === "choice") break;
        if (node.type === "line") lineIds.push(cursor);
        cursor = node.nextNodeId;
    }
    return lineIds;
}

function findFirstChoiceNode(content, nodeMap) {
    let cursor = content.entryNode;
    const guard = new Set();
    while (cursor && !guard.has(cursor)) {
        guard.add(cursor);
        const node = nodeMap.get(cursor);
        if (!node) return null;
        if (node.type === "choice") return node;
        cursor = node.nextNodeId;
    }
    return null;
}

function findChoiceOutcome(content, nodeMap, option) {
    if (!option) return { actionId: null, responseText: "" };
    if (option.actionId) return { actionId: option.actionId, responseText: "" };

    let cursor = option.nextNodeId;
    let responseText = "";
    let actionId = null;
    const guard = new Set();

    while (cursor && !guard.has(cursor)) {
        guard.add(cursor);
        const node = nodeMap.get(cursor);
        if (!node) break;

        if (node.type === "line" && !responseText) {
            responseText = content.strings.text[node.textKey] || "";
        }
        if (node.type === "action") {
            actionId = node.actionId;
            break;
        }
        if (!node.nextNodeId) break;
        cursor = node.nextNodeId;
    }

    return { actionId, responseText };
}

function toLegacyLanguageBundle(content) {
    const nodeMap = buildNodeMap(content);
    const openingLineIds = collectOpeningLineNodes(content, nodeMap);
    const choiceNode = findFirstChoiceNode(content, nodeMap);

    const lines = openingLineIds.map((id) => {
        const node = nodeMap.get(id);
        return content.strings.text[node.textKey] || "";
    });

    const choices = choiceNode
        ? choiceNode.options.map((o) => content.strings.text[o.textKey] || "")
        : [];

    const responses = choiceNode
        ? choiceNode.options.map((o) => findChoiceOutcome(content, nodeMap, o).responseText || "")
        : [];

    return {
        startBtn: content.strings.startBtn,
        deathText: content.strings.deathText,
        speaker: content.strings.speaker,
        lines,
        choiceTitle: content.strings.text[choiceNode?.titleKey] || "",
        choices,
        responses,
        ui: content.strings.ui,
    };
}

export async function loadChapterStorySet(chapterId, langs = ["tw", "en", "jp"]) {
    const results = {};
    const baseLang = langs.includes("tw") ? "tw" : langs[0];
    const baseUrl = new URL(`./content/${chapterId}.${baseLang}.json`, import.meta.url);
    const baseRes = await fetch(baseUrl, { cache: "no-cache" });
    if (!baseRes.ok) {
        throw new Error(`Failed to load base story content: ${baseUrl}`);
    }
    const baseContent = await baseRes.json();
    results[baseLang] = baseContent;

    for (const lang of langs) {
        if (lang === baseLang) continue;

        const url = new URL(`./content/${chapterId}.${lang}.json`, import.meta.url);
        let localizedContent = null;
        try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res.ok) {
                localizedContent = await res.json();
            } else {
                console.warn(`Story locale missing (${lang}), fallback to ${baseLang}: ${url}`);
            }
        } catch (err) {
            console.warn(`Story locale load failed (${lang}), fallback to ${baseLang}: ${url}`, err);
        }

        results[lang] = mergeWithBase(baseContent, localizedContent, lang);
    }

    const validation = validateStorySet(results);
    if (!validation.ok) {
        throw new Error(`Story validation failed:\n${validation.errors.join("\n")}`);
    }

    return results;
}

export function createStoryEngine(storyByLang, defaultLang = "tw") {
    const nodeMaps = {};
    const legacyL10n = {};

    for (const [lang, content] of Object.entries(storyByLang)) {
        nodeMaps[lang] = buildNodeMap(content);
        legacyL10n[lang] = toLegacyLanguageBundle(content);
    }

    let currentLang = defaultLang in storyByLang ? defaultLang : Object.keys(storyByLang)[0];
    let currentNodeId = storyByLang[currentLang].entryNode;

    function setLanguage(lang) {
        if (!(lang in storyByLang)) return false;
        currentLang = lang;
        currentNodeId = storyByLang[currentLang].entryNode;
        return true;
    }

    function getLanguage() {
        return currentLang;
    }

    function getContent(lang = currentLang) {
        return storyByLang[lang];
    }

    function getNodeMap(lang = currentLang) {
        return nodeMaps[lang];
    }

    function getNode(nodeId, lang = currentLang) {
        return getNodeMap(lang).get(nodeId) || null;
    }

    function reset(nodeId) {
        currentNodeId = nodeId || getContent().entryNode;
        return currentNodeId;
    }

    function getCurrentNode() {
        return getNode(currentNodeId);
    }

    function getLegacyL10n() {
        return legacyL10n;
    }

    function getPresentationScript() {
        const content = getContent();
        const map = getNodeMap();
        const openingLineIds = collectOpeningLineNodes(content, map);
        const choiceNode = findFirstChoiceNode(content, map);
        const list = openingLineIds.map(() => ({ type: "line" }));
        if (choiceNode) list.push({ type: "choice" });
        return list;
    }

    function getChoiceNode() {
        return findFirstChoiceNode(getContent(), getNodeMap());
    }

    function getChoiceActionByIndex(index) {
        const choiceNode = getChoiceNode();
        if (!choiceNode || !choiceNode.options[index]) return null;
        return choiceNode.options[index].actionId || null;
    }

    function getChoiceOutcomeByIndex(index) {
        const content = getContent();
        const nodeMap = getNodeMap();
        const choiceNode = getChoiceNode();
        if (!choiceNode || !choiceNode.options[index]) return { actionId: null, responseText: "" };
        return findChoiceOutcome(content, nodeMap, choiceNode.options[index]);
    }

    function getTextByKey(textKey, lang = currentLang) {
        return getContent(lang).strings.text[textKey] || "";
    }

    function getUiBundle(lang = currentLang) {
        return getContent(lang).strings;
    }

    return {
        setLanguage,
        getLanguage,
        getNode,
        getCurrentNode,
        reset,
        getLegacyL10n,
        getPresentationScript,
        getChoiceNode,
        getChoiceActionByIndex,
        getChoiceOutcomeByIndex,
        getTextByKey,
        getUiBundle,
    };
}
