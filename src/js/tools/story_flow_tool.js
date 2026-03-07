import { loadChapterStorySet } from '../story/story_engine.js';
import {
    STORY_FLOW_NODE_TYPES,
    STORY_FLOW_OVERRIDE_STORAGE_KEY,
    buildStoryFlowExportPayload,
    clearStoredStoryFlowOverrides,
    createStoryFlowCatalog,
    mergeStoryFlowImport,
    readStoredStoryFlowOverrides,
    validateStoryFlowCatalog,
    writeStoredStoryFlowOverrides
} from '../story/story_flow_catalog.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const TYPE_LABELS = Object.freeze({
    [STORY_FLOW_NODE_TYPES.DIALOGUE]: '對話',
    [STORY_FLOW_NODE_TYPES.CHOICE]: '選項',
    [STORY_FLOW_NODE_TYPES.TRANSITION]: '過場(黑畫面)',
    [STORY_FLOW_NODE_TYPES.MINIGAME]: '小遊戲',
    [STORY_FLOW_NODE_TYPES.DEATH]: '死亡',
    [STORY_FLOW_NODE_TYPES.TBC]: '待續',
    [STORY_FLOW_NODE_TYPES.TITLE]: '開始標題'
});

const TYPE_COLORS = Object.freeze({
    [STORY_FLOW_NODE_TYPES.DIALOGUE]: '#e6f0ff',
    [STORY_FLOW_NODE_TYPES.CHOICE]: '#eefce8',
    [STORY_FLOW_NODE_TYPES.TRANSITION]: '#f4f2ff',
    [STORY_FLOW_NODE_TYPES.MINIGAME]: '#fff8dd',
    [STORY_FLOW_NODE_TYPES.DEATH]: '#ffe7e7',
    [STORY_FLOW_NODE_TYPES.TBC]: '#ffeef9',
    [STORY_FLOW_NODE_TYPES.TITLE]: '#f1f5f9'
});

const state = {
    baseCatalog: null,
    catalog: null,
    validation: { ok: false, errors: [] },
    selectedNodeId: ''
};

const refs = {
    status: document.getElementById('status-text'),
    summary: document.getElementById('summary-text'),
    report: document.getElementById('import-report'),
    nodeList: document.getElementById('node-list'),
    filterType: document.getElementById('filter-type'),
    filterScene: document.getElementById('filter-scene'),
    filterKeyword: document.getElementById('filter-keyword'),
    filterUntranslated: document.getElementById('filter-untranslated'),
    btnExport: document.getElementById('btn-export'),
    btnApply: document.getElementById('btn-apply'),
    btnClear: document.getElementById('btn-clear'),
    btnReset: document.getElementById('btn-reset'),
    importFile: document.getElementById('import-file'),
    graphWrap: document.getElementById('graph-wrap'),
    graphSvg: document.getElementById('graph-svg'),
    btnGraphCenter: document.getElementById('btn-graph-center'),
    graphShowEdgeText: document.getElementById('graph-show-edge-text')
};

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function truncate(value, maxLength = 16) {
    const text = String(value || '');
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
}

function bindingKey(binding) {
    if (!binding) return '';
    if (binding.kind === 'story_text') return `story:${binding.key}`;
    if (binding.kind === 'runtime_text') return `runtime:${binding.source}:${binding.path.join('.')}`;
    return '';
}

function bindingLabel(binding) {
    if (!binding) return '-';
    if (binding.kind === 'story_text') return `story.strings.text.${binding.key}`;
    if (binding.kind === 'runtime_text') return `${binding.source}.${binding.path.join('.')}`;
    return '-';
}

function getPrevMap(catalog) {
    const prev = new Map();
    for (const node of catalog.nodes) prev.set(node.nodeId, []);
    for (const node of catalog.nodes) {
        if (node.nextNodeId && prev.has(node.nextNodeId)) {
            prev.get(node.nextNodeId).push(node.nodeId);
        }
        if (node.type === STORY_FLOW_NODE_TYPES.CHOICE && Array.isArray(node.choiceOptions)) {
            for (const option of node.choiceOptions) {
                if (option.nextNodeId && prev.has(option.nextNodeId)) {
                    prev.get(option.nextNodeId).push(`${node.nodeId}.${option.optionId}`);
                }
            }
        }
    }
    return prev;
}

function isNodeUntranslated(node) {
    const nodeMissing = (node.en || '').trim() === '' || (node.jp || '').trim() === '';
    if (!nodeMissing) return false;
    if (node.type !== STORY_FLOW_NODE_TYPES.CHOICE) return true;
    if (!Array.isArray(node.choiceOptions) || node.choiceOptions.length === 0) return true;
    return node.choiceOptions.some((option) => (option.en || '').trim() === '' || (option.jp || '').trim() === '');
}

function matchesKeyword(node, keyword) {
    if (!keyword) return true;
    const lower = keyword.toLowerCase();
    if (node.nodeId.toLowerCase().includes(lower)) return true;
    if ((node.tw || '').toLowerCase().includes(lower)) return true;
    if (node.type === STORY_FLOW_NODE_TYPES.CHOICE && Array.isArray(node.choiceOptions)) {
        return node.choiceOptions.some((option) => {
            if (option.optionId.toLowerCase().includes(lower)) return true;
            return (option.tw || '').toLowerCase().includes(lower);
        });
    }
    return false;
}

function getFilteredNodes() {
    const filterType = refs.filterType.value;
    const filterScene = refs.filterScene.value;
    const keyword = refs.filterKeyword.value.trim();
    const untranslatedOnly = refs.filterUntranslated.checked;

    return state.catalog.nodes.filter((node) => {
        if (filterType && node.type !== filterType) return false;
        if (filterScene && node.sceneId !== filterScene) return false;
        if (untranslatedOnly && !isNodeUntranslated(node)) return false;
        return matchesKeyword(node, keyword);
    });
}

function updateSummary(filteredNodes) {
    const total = state.catalog.nodes.length;
    const filtered = filteredNodes.length;
    const validationLabel = state.validation.ok
        ? '結構驗證: OK'
        : `結構驗證: FAIL (${state.validation.errors.length})`;
    refs.summary.textContent = `總節點 ${total} / 顯示 ${filtered} | ${validationLabel} | 覆寫 key: ${STORY_FLOW_OVERRIDE_STORAGE_KEY}`;
}

function syncBindingValue(key, value) {
    if (!key) return;
    for (const node of state.catalog.nodes) {
        if (bindingKey(node.sourceBinding) === key && node.type === STORY_FLOW_NODE_TYPES.DIALOGUE) {
            node.tw = value;
        }
        if (node.type !== STORY_FLOW_NODE_TYPES.CHOICE || !Array.isArray(node.choiceOptions)) continue;
        for (const option of node.choiceOptions) {
            if (bindingKey(option.sourceBinding) === key) option.tw = value;
        }
    }

    const linkedFields = refs.nodeList.querySelectorAll('[data-binding-key]');
    for (const field of linkedFields) {
        if (field.dataset.bindingKey === key && field.value !== value) field.value = value;
    }
    renderGraph();
}

function renderNodeList() {
    const filtered = getFilteredNodes();
    const prevMap = getPrevMap(state.catalog);
    updateSummary(filtered);

    if (filtered.length === 0) {
        refs.nodeList.innerHTML = '<div class="empty">沒有符合篩選條件的節點。</div>';
        return;
    }

    const html = filtered.map((node) => {
        const prev = prevMap.get(node.nodeId) || [];
        const prevText = prev.length ? prev.join(', ') : '-';
        const nextText = node.nextNodeId || '-';
        const typeLabel = TYPE_LABELS[node.type] || node.type;
        const selectedClass = state.selectedNodeId === node.nodeId ? 'node-selected' : '';

        let body = `
            <div class="meta-line"><span>上一節點:</span> ${escapeHtml(prevText)}</div>
            <div class="meta-line"><span>下一節點:</span> ${escapeHtml(nextText)}</div>
            <div class="meta-line"><span>場景:</span> ${escapeHtml(node.sceneId)}</div>
        `;

        if (node.type === STORY_FLOW_NODE_TYPES.DIALOGUE) {
            const editable = Boolean(node.sourceBinding);
            const bindKey = bindingKey(node.sourceBinding);
            const readonly = editable ? '' : 'readonly';
            const lockedClass = editable ? '' : 'readonly';
            body += `
                <div class="meta-line"><span>來源:</span> ${escapeHtml(bindingLabel(node.sourceBinding))}</div>
                <textarea class="tw-input ${lockedClass}" data-binding-key="${escapeHtml(bindKey)}" ${readonly}>${escapeHtml(node.tw || '')}</textarea>
            `;
        } else if (node.type === STORY_FLOW_NODE_TYPES.CHOICE) {
            body += `
                <div class="meta-line"><span>選項標題來源:</span> ${escapeHtml(bindingLabel(node.sourceBinding))}</div>
                <div class="meta-line"><span>標題:</span> ${escapeHtml(node.tw || '')}</div>
            `;

            const optionsHtml = (node.choiceOptions || []).map((option) => {
                const editable = Boolean(option.sourceBinding);
                const bindKey = bindingKey(option.sourceBinding);
                const readonly = editable ? '' : 'readonly';
                const lockedClass = editable ? '' : 'readonly';
                return `
                    <div class="choice-row">
                        <div class="choice-meta">${escapeHtml(option.optionId)} → ${escapeHtml(option.nextNodeId || '-')}</div>
                        <div class="choice-bind">${escapeHtml(bindingLabel(option.sourceBinding))}</div>
                        <input
                            class="tw-input ${lockedClass}"
                            data-binding-key="${escapeHtml(bindKey)}"
                            type="text"
                            value="${escapeHtml(option.tw || '')}"
                            ${readonly}
                        />
                    </div>
                `;
            }).join('');
            body += `<div class="choice-list">${optionsHtml}</div>`;
        } else {
            body += `<div class="meta-line"><span>文本:</span> ${escapeHtml(node.tw || '-')}</div>`;
        }

        return `
            <article class="node-card ${selectedClass}" data-node-card="${escapeHtml(node.nodeId)}">
                <div class="node-head">
                    <div class="node-id">${escapeHtml(node.nodeId)}</div>
                    <div class="node-type">${escapeHtml(typeLabel)}</div>
                </div>
                ${body}
            </article>
        `;
    }).join('');

    refs.nodeList.innerHTML = html;
}

function updateSceneFilterOptions() {
    const scenes = Array.from(new Set(state.catalog.nodes.map((node) => node.sceneId))).sort();
    const current = refs.filterScene.value;
    refs.filterScene.innerHTML = '<option value="">全部場景</option>' + scenes
        .map((sceneId) => `<option value="${escapeHtml(sceneId)}">${escapeHtml(sceneId)}</option>`)
        .join('');
    if (scenes.includes(current)) refs.filterScene.value = current;
}

function formatImportReport(report) {
    const lines = [
        `updatedDialogue: ${report.updatedDialogue}`,
        `updatedOptions: ${report.updatedOptions}`,
        `skippedUnknownNodeIds: ${report.skippedUnknownNodeIds}`,
        `skippedUnknownOptionIds: ${report.skippedUnknownOptionIds}`,
        `skippedReadonlyFields: ${report.skippedReadonlyFields}`,
        `skippedInvalidEntries: ${report.skippedInvalidEntries}`,
        `bindingConflicts: ${report.bindingConflicts}`
    ];
    if (report.errors?.length) lines.push(`errors: ${report.errors.join(' | ')}`);
    return lines.join('\n');
}

function isChapterStoryJson(payload) {
    return Boolean(
        payload
        && typeof payload === 'object'
        && payload.meta
        && payload.strings
        && payload.strings.text
        && typeof payload.strings.text === 'object'
    );
}

function buildFlowImportPayloadFromChapterStory(chapterStory, catalog) {
    const textMap = chapterStory?.strings?.text || {};
    const nodes = [];
    for (const node of catalog.nodes) {
        const importNode = { nodeId: node.nodeId };
        let hasChanges = false;

        if (node.type === STORY_FLOW_NODE_TYPES.DIALOGUE && node.sourceBinding?.kind === 'story_text') {
            const value = textMap[node.sourceBinding.key];
            if (typeof value === 'string') {
                importNode.tw = value;
                hasChanges = true;
            }
        }

        if (node.type === STORY_FLOW_NODE_TYPES.CHOICE && Array.isArray(node.choiceOptions)) {
            const optionUpdates = [];
            for (const option of node.choiceOptions) {
                if (option.sourceBinding?.kind !== 'story_text') continue;
                const value = textMap[option.sourceBinding.key];
                if (typeof value !== 'string') continue;
                optionUpdates.push({ optionId: option.optionId, tw: value });
            }
            if (optionUpdates.length > 0) {
                importNode.choiceOptions = optionUpdates;
                hasChanges = true;
            }
        }

        if (hasChanges) nodes.push(importNode);
    }
    return { nodes };
}

function exportCurrentCatalog() {
    const payload = buildStoryFlowExportPayload(state.catalog);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story-flow-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function applyCurrentToLocalStorage() {
    const payload = buildStoryFlowExportPayload(state.catalog);
    const ok = writeStoredStoryFlowOverrides(payload);
    refs.status.textContent = ok
        ? '已套用覆寫到 localStorage，重開遊戲即可生效。'
        : '套用失敗，請檢查 localStorage 權限。';
}

function clearOverridesInLocalStorage() {
    const ok = clearStoredStoryFlowOverrides();
    refs.status.textContent = ok
        ? '已清除 localStorage 覆寫。'
        : '清除失敗，請檢查 localStorage 權限。';
}

function applyStoredOverridesToEditor() {
    state.catalog = deepClone(state.baseCatalog);
    const stored = readStoredStoryFlowOverrides();
    if (stored) {
        const merged = mergeStoryFlowImport(state.catalog, stored);
        state.catalog = merged.catalog;
        refs.report.textContent = formatImportReport(merged.report);
    } else {
        refs.report.textContent = '尚未套用任何覆寫。';
    }
}

function resetEditorState() {
    applyStoredOverridesToEditor();
    state.validation = validateStoryFlowCatalog(state.catalog);
    updateSceneFilterOptions();
    renderNodeList();
    renderGraph();
}

async function importFromFile(file) {
    if (!state.catalog) {
        state.baseCatalog = createStoryFlowCatalog(null);
        state.catalog = deepClone(state.baseCatalog);
    }

    try {
        let text = await file.text();
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const parsed = JSON.parse(text);

        let payload = parsed;
        let mode = 'flow-json';
        if (isChapterStoryJson(parsed)) {
            payload = buildFlowImportPayloadFromChapterStory(parsed, state.catalog);
            mode = 'chapter-json';
        }

        const merged = mergeStoryFlowImport(state.catalog, payload);
        state.catalog = merged.catalog;
        state.validation = validateStoryFlowCatalog(state.catalog);
        refs.report.textContent = formatImportReport(merged.report);

        const updatedCount = merged.report.updatedDialogue + merged.report.updatedOptions;
        if (updatedCount === 0) {
            refs.status.textContent = '導入完成，但沒有可套用文字。';
        } else if (mode === 'chapter-json') {
            refs.status.textContent = `已導入 chapter story json（更新 ${updatedCount} 筆）`;
        } else {
            refs.status.textContent = `已導入流程 json（更新 ${updatedCount} 筆）`;
        }

        renderNodeList();
        renderGraph();
    } catch (err) {
        refs.status.textContent = `導入失敗: ${err.message || err}`;
    }
}

function buildGraphData(catalog) {
    const nodes = catalog.nodes.slice();
    const nodeMap = new Map(nodes.map((node) => [node.nodeId, node]));
    const edges = [];
    const outgoing = new Map();
    const inDegree = new Map();

    for (const node of nodes) {
        outgoing.set(node.nodeId, []);
        inDegree.set(node.nodeId, 0);
    }

    const pushEdge = (from, to, meta = {}) => {
        if (!nodeMap.has(from) || !nodeMap.has(to)) return;
        const edge = { from, to, ...meta };
        edges.push(edge);
        outgoing.get(from).push(edge);
        inDegree.set(to, (inDegree.get(to) || 0) + 1);
    };

    for (const node of nodes) {
        if (node.nextNodeId) pushEdge(node.nodeId, node.nextNodeId, { kind: 'next' });
        if (node.type === STORY_FLOW_NODE_TYPES.CHOICE && Array.isArray(node.choiceOptions)) {
            node.choiceOptions.forEach((option, index) => {
                if (!option.nextNodeId) return;
                pushEdge(node.nodeId, option.nextNodeId, {
                    kind: 'choice',
                    optionId: option.optionId,
                    optionText: option.tw || '',
                    optionIndex: index + 1
                });
            });
        }
    }

    const roots = [];
    if (catalog.startNodeId && nodeMap.has(catalog.startNodeId)) roots.push(catalog.startNodeId);
    const zeroInNodes = nodes
        .map((node) => node.nodeId)
        .filter((nodeId) => (inDegree.get(nodeId) || 0) === 0 && nodeId !== catalog.startNodeId)
        .sort();
    roots.push(...zeroInNodes);

    const indegreeCopy = new Map(inDegree);
    const queue = roots.slice();
    const queued = new Set(queue);
    const topo = [];

    while (queue.length > 0) {
        const nodeId = queue.shift();
        topo.push(nodeId);
        for (const edge of outgoing.get(nodeId) || []) {
            const next = edge.to;
            indegreeCopy.set(next, (indegreeCopy.get(next) || 0) - 1);
            if ((indegreeCopy.get(next) || 0) <= 0 && !queued.has(next)) {
                queue.push(next);
                queued.add(next);
            }
        }
    }

    for (const node of nodes) {
        if (!queued.has(node.nodeId)) topo.push(node.nodeId);
    }

    const depth = new Map();
    for (const nodeId of topo) depth.set(nodeId, 0);
    for (const nodeId of topo) {
        const currentDepth = depth.get(nodeId) || 0;
        for (const edge of outgoing.get(nodeId) || []) {
            const nextDepth = Math.max(depth.get(edge.to) || 0, currentDepth + 1);
            depth.set(edge.to, nextDepth);
        }
    }

    const depthGroups = new Map();
    for (const nodeId of topo) {
        const d = depth.get(nodeId) || 0;
        if (!depthGroups.has(d)) depthGroups.set(d, []);
        depthGroups.get(d).push(nodeId);
    }

    const NODE_W = 230;
    const NODE_H = 76;
    const COL_GAP = 120;
    const ROW_GAP = 18;
    const MARGIN = 30;

    const positions = new Map();
    let maxDepth = 0;
    let maxColumnHeight = 0;
    const depths = Array.from(depthGroups.keys()).sort((a, b) => a - b);
    for (const d of depths) {
        const group = depthGroups.get(d) || [];
        maxDepth = Math.max(maxDepth, d);
        maxColumnHeight = Math.max(maxColumnHeight, group.length);
        group.forEach((nodeId, idx) => {
            const x = MARGIN + d * (NODE_W + COL_GAP);
            const y = MARGIN + idx * (NODE_H + ROW_GAP);
            positions.set(nodeId, { x, y, width: NODE_W, height: NODE_H });
        });
    }

    const width = Math.max(1200, MARGIN * 2 + (maxDepth + 1) * (NODE_W + COL_GAP));
    const height = Math.max(700, MARGIN * 2 + maxColumnHeight * (NODE_H + ROW_GAP));

    return { nodes, edges, positions, width, height, nodeMap };
}

function renderGraph() {
    if (!state.catalog) return;
    const data = buildGraphData(state.catalog);
    const svg = refs.graphSvg;
    svg.innerHTML = '';
    svg.setAttribute('width', String(data.width));
    svg.setAttribute('height', String(data.height));
    svg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);

    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', 'graph-arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const markerPath = document.createElementNS(SVG_NS, 'path');
    markerPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    markerPath.setAttribute('fill', '#94a3b8');
    marker.appendChild(markerPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    const edgesLayer = document.createElementNS(SVG_NS, 'g');
    const nodesLayer = document.createElementNS(SVG_NS, 'g');
    svg.appendChild(edgesLayer);
    svg.appendChild(nodesLayer);

    const showEdgeText = refs.graphShowEdgeText.checked;

    for (const edge of data.edges) {
        const from = data.positions.get(edge.from);
        const to = data.positions.get(edge.to);
        if (!from || !to) continue;
        const sx = from.x + from.width;
        const sy = from.y + (from.height / 2);
        const tx = to.x;
        const ty = to.y + (to.height / 2);
        const c1x = sx + 50;
        const c2x = tx - 50;
        const d = `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ty}, ${tx} ${ty}`;

        const highlighted = state.selectedNodeId && (edge.from === state.selectedNodeId || edge.to === state.selectedNodeId);
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', highlighted ? '#0b65d8' : '#a3afc2');
        path.setAttribute('stroke-width', highlighted ? '2.2' : '1.4');
        path.setAttribute('marker-end', 'url(#graph-arrow)');
        edgesLayer.appendChild(path);

        if (edge.kind === 'choice') {
            let label = `#${edge.optionIndex}`;
            if (showEdgeText && edge.optionText) label = truncate(edge.optionText, 18);
            const labelX = (sx + tx) / 2;
            const labelY = (sy + ty) / 2 - 4;
            const textEl = document.createElementNS(SVG_NS, 'text');
            textEl.setAttribute('x', String(labelX));
            textEl.setAttribute('y', String(labelY));
            textEl.setAttribute('font-size', '10');
            textEl.setAttribute('fill', highlighted ? '#0b65d8' : '#64748b');
            textEl.setAttribute('text-anchor', 'middle');
            textEl.textContent = label;
            edgesLayer.appendChild(textEl);
        }
    }

    for (const node of data.nodes) {
        const pos = data.positions.get(node.nodeId);
        if (!pos) continue;
        const selected = state.selectedNodeId === node.nodeId;

        const group = document.createElementNS(SVG_NS, 'g');
        group.setAttribute('data-node-id', node.nodeId);
        group.style.cursor = 'pointer';

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', String(pos.x));
        rect.setAttribute('y', String(pos.y));
        rect.setAttribute('rx', '8');
        rect.setAttribute('ry', '8');
        rect.setAttribute('width', String(pos.width));
        rect.setAttribute('height', String(pos.height));
        rect.setAttribute('fill', TYPE_COLORS[node.type] || '#ffffff');
        rect.setAttribute('stroke', selected ? '#0b65d8' : '#8da1ba');
        rect.setAttribute('stroke-width', selected ? '2.2' : '1.1');
        group.appendChild(rect);

        const line1 = document.createElementNS(SVG_NS, 'text');
        line1.setAttribute('x', String(pos.x + 10));
        line1.setAttribute('y', String(pos.y + 18));
        line1.setAttribute('font-size', '12');
        line1.setAttribute('font-family', 'monospace');
        line1.setAttribute('font-weight', '700');
        line1.setAttribute('fill', '#0f172a');
        line1.textContent = node.nodeId;
        group.appendChild(line1);

        const line2 = document.createElementNS(SVG_NS, 'text');
        line2.setAttribute('x', String(pos.x + 10));
        line2.setAttribute('y', String(pos.y + 34));
        line2.setAttribute('font-size', '11');
        line2.setAttribute('fill', '#334155');
        line2.textContent = `${TYPE_LABELS[node.type] || node.type} | ${node.sceneId}`;
        group.appendChild(line2);

        const line3 = document.createElementNS(SVG_NS, 'text');
        line3.setAttribute('x', String(pos.x + 10));
        line3.setAttribute('y', String(pos.y + 52));
        line3.setAttribute('font-size', '10');
        line3.setAttribute('fill', '#64748b');
        line3.textContent = truncate(node.tw || '', 26);
        group.appendChild(line3);

        nodesLayer.appendChild(group);
    }
}

function centerGraphToStart() {
    if (!state.catalog?.startNodeId) return;
    const startNodeId = state.catalog.startNodeId;
    const target = refs.graphSvg.querySelector(`g[data-node-id="${startNodeId}"]`);
    if (!target || !refs.graphWrap) return;
    const bbox = target.getBBox();
    refs.graphWrap.scrollLeft = Math.max(0, bbox.x - 40);
    refs.graphWrap.scrollTop = Math.max(0, bbox.y - 120);
}

function selectNode(nodeId, { scrollToCard = true } = {}) {
    if (!nodeId) return;
    state.selectedNodeId = nodeId;
    renderNodeList();
    renderGraph();
    if (!scrollToCard) return;
    const card = refs.nodeList.querySelector(`[data-node-card="${nodeId}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function wireEvents() {
    refs.filterType.addEventListener('change', renderNodeList);
    refs.filterScene.addEventListener('change', renderNodeList);
    refs.filterKeyword.addEventListener('input', renderNodeList);
    refs.filterUntranslated.addEventListener('change', renderNodeList);

    refs.nodeList.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
        const key = target.dataset.bindingKey || '';
        if (!key) return;
        syncBindingValue(key, target.value);
    });

    refs.nodeList.addEventListener('click', (event) => {
        const card = event.target instanceof Element ? event.target.closest('[data-node-card]') : null;
        if (!card) return;
        selectNode(card.dataset.nodeCard || '', { scrollToCard: false });
    });

    refs.graphSvg.addEventListener('click', (event) => {
        const group = event.target instanceof Element ? event.target.closest('g[data-node-id]') : null;
        if (!group) return;
        selectNode(group.dataset.nodeId || '');
    });

    refs.btnExport.addEventListener('click', exportCurrentCatalog);
    refs.btnApply.addEventListener('click', applyCurrentToLocalStorage);
    refs.btnClear.addEventListener('click', clearOverridesInLocalStorage);
    refs.btnReset.addEventListener('click', resetEditorState);
    refs.btnGraphCenter.addEventListener('click', centerGraphToStart);
    refs.graphShowEdgeText.addEventListener('change', renderGraph);

    refs.importFile.addEventListener('change', async () => {
        const file = refs.importFile.files?.[0];
        if (!file) return;
        refs.status.textContent = `正在導入: ${file.name}`;
        await importFromFile(file);
        refs.importFile.value = '';
    });
}

async function bootstrap() {
    refs.status.textContent = '讀取劇情資料中...';
    let storySet = null;
    try {
        storySet = await loadChapterStorySet('chapter01', ['tw', 'en', 'jp']);
    } catch (err) {
        console.warn('Story load failed in tool bootstrap. Fallback to empty story set.', err);
    }

    state.baseCatalog = createStoryFlowCatalog(storySet);
    applyStoredOverridesToEditor();
    state.validation = validateStoryFlowCatalog(state.catalog);
    updateSceneFilterOptions();
    renderNodeList();
    renderGraph();
    centerGraphToStart();

    refs.status.textContent = storySet
        ? '已載入節點圖與編輯器。'
        : '已載入節點圖（離線模式），可先導入 chapter01.tw.json。';
}

wireEvents();
bootstrap().catch((err) => {
    console.error(err);
    refs.status.textContent = `載入失敗: ${err.message || err}`;
});

