import {
    OPENING_TEXT,
    FIGHT_CHOICE_LABELS,
    FIGHT_TEXT,
    FIGHT_TEXT_AFTER_OOXX,
    FIGHT_JOKE_RETURN_LINE,
    BED_STOP_LINE_BY_LANG,
    BED_CRY_LOOP_LINES,
    BED_EXTRA_MONEY_OPTION_TEXT,
    BED_EXTRA_MONEY_LINE,
    BED_N_DIALOGUE_LINES,
    BED_N_SLEEP_BRANCH_TEXT,
    HEAD_TOUCH_TEXT
} from '../config/runtime_text.js';

export const STORY_FLOW_VERSION = 1;
export const STORY_FLOW_CHAPTER_ID = 'chapter01';
export const STORY_FLOW_OVERRIDE_STORAGE_KEY = 'story_flow_overrides_tw_v1';
export const STORY_FLOW_START_NODE_ID = 'N0001';

export const STORY_FLOW_NODE_TYPES = Object.freeze({
    DIALOGUE: 'dialogue',
    CHOICE: 'choice',
    TRANSITION: 'transition',
    MINIGAME: 'minigame',
    DEATH: 'death',
    TBC: 'tbc',
    TITLE: 'title'
});

const NODE_TYPE_SET = new Set(Object.values(STORY_FLOW_NODE_TYPES));

const RUNTIME_SOURCE_MAP = Object.freeze({
    OPENING_TEXT,
    FIGHT_CHOICE_LABELS,
    FIGHT_TEXT,
    FIGHT_TEXT_AFTER_OOXX,
    FIGHT_JOKE_RETURN_LINE,
    BED_STOP_LINE_BY_LANG,
    BED_CRY_LOOP_LINES,
    BED_EXTRA_MONEY_OPTION_TEXT,
    BED_EXTRA_MONEY_LINE,
    BED_N_DIALOGUE_LINES,
    BED_N_SLEEP_BRANCH_TEXT,
    HEAD_TOUCH_TEXT
});

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function id(num) {
    return `N${String(num).padStart(4, '0')}`;
}

function bindingStoryText(key) {
    return { kind: 'story_text', key };
}

function bindingRuntime(source, path) {
    return { kind: 'runtime_text', source, path: path.slice() };
}

function getByPath(root, path) {
    let cursor = root;
    for (const segment of path) {
        if (cursor == null) return '';
        cursor = cursor[segment];
    }
    if (typeof cursor === 'string') return cursor;
    if (cursor == null) return '';
    return String(cursor);
}

function setByPath(root, path, value) {
    let cursor = root;
    for (let i = 0; i < path.length - 1; i += 1) {
        const segment = path[i];
        if (cursor[segment] == null || typeof cursor[segment] !== 'object') {
            cursor[segment] = {};
        }
        cursor = cursor[segment];
    }
    cursor[path[path.length - 1]] = value;
}

function getBindingKey(binding) {
    if (!binding) return '';
    if (binding.kind === 'story_text') return `story_text:${binding.key}`;
    if (binding.kind === 'runtime_text') return `runtime_text:${binding.source}:${binding.path.join('.')}`;
    return '';
}

function resolveTextFromBinding(binding, storySetByLang) {
    if (!binding) return '';
    if (binding.kind === 'story_text') {
        const text = storySetByLang?.tw?.strings?.text?.[binding.key];
        return typeof text === 'string' ? text : '';
    }
    if (binding.kind === 'runtime_text') {
        const source = RUNTIME_SOURCE_MAP[binding.source];
        if (!source) return '';
        return getByPath(source, binding.path);
    }
    return '';
}

function applyTextToBinding(binding, value, storySetByLang) {
    if (!binding || typeof value !== 'string') return false;
    if (binding.kind === 'story_text') {
        if (!storySetByLang?.tw?.strings?.text) return false;
        storySetByLang.tw.strings.text[binding.key] = value;
        return true;
    }
    if (binding.kind === 'runtime_text') {
        const source = RUNTIME_SOURCE_MAP[binding.source];
        if (!source) return false;
        setByPath(source, binding.path, value);
        return true;
    }
    return false;
}

function isDialogueNodeEditable(node) {
    return node.type === STORY_FLOW_NODE_TYPES.DIALOGUE && !!node.sourceBinding;
}

function isChoiceOptionEditable(option) {
    return !!option?.sourceBinding;
}

const FLOW_NODE_DEFINITIONS = [];

function choiceOption(optionId, nextNodeId, sourceBinding, defaultTw = '') {
    return {
        optionId,
        nextNodeId,
        sourceBinding: sourceBinding || null,
        defaultTw
    };
}

function addNode(node) {
    FLOW_NODE_DEFINITIONS.push(node);
}

function addDialogue(num, sceneId, nextNum, sourceBinding, defaultTw = '') {
    addNode({
        nodeId: id(num),
        type: STORY_FLOW_NODE_TYPES.DIALOGUE,
        sceneId,
        nextNodeId: nextNum == null ? '' : id(nextNum),
        sourceBinding: sourceBinding || null,
        defaultTw
    });
}

function addChoice(num, sceneId, sourceBinding, options) {
    addNode({
        nodeId: id(num),
        type: STORY_FLOW_NODE_TYPES.CHOICE,
        sceneId,
        sourceBinding: sourceBinding || null,
        choiceOptions: options
    });
}

function addTransition(num, sceneId, nextNum, defaultTw) {
    addNode({
        nodeId: id(num),
        type: STORY_FLOW_NODE_TYPES.TRANSITION,
        sceneId,
        nextNodeId: nextNum == null ? '' : id(nextNum),
        defaultTw
    });
}

function addMiniGame(num, sceneId, nextNum, defaultTw) {
    addNode({
        nodeId: id(num),
        type: STORY_FLOW_NODE_TYPES.MINIGAME,
        sceneId,
        nextNodeId: nextNum == null ? '' : id(nextNum),
        defaultTw
    });
}

function addDeath(num, sceneId, defaultTw, sourceBinding = null) {
    addNode({
        nodeId: id(num),
        type: STORY_FLOW_NODE_TYPES.DEATH,
        sceneId,
        sourceBinding,
        defaultTw
    });
}

function addTbc(num, sceneId, defaultTw) {
    addNode({
        nodeId: id(num),
        type: STORY_FLOW_NODE_TYPES.TBC,
        sceneId,
        defaultTw
    });
}

function addTitle(num, defaultTw) {
    addNode({
        nodeId: id(num),
        type: STORY_FLOW_NODE_TYPES.TITLE,
        sceneId: 'title',
        defaultTw
    });
}

function buildFlowDefinitions() {
    FLOW_NODE_DEFINITIONS.length = 0;

    const buildBedBranch = (base, phase1OptionPrefix, sleepChoicePrefix) => {
        const n = (offset) => base + offset;

        addDialogue(n(0), 'default', n(1), bindingStoryText('resp_3'));
        addTransition(n(1), 'default', n(2), '黑幕過場切到 bed');
        addDialogue(n(2), 'bed', n(3), bindingStoryText('bed_line_1'));
        addChoice(n(3), 'bed', bindingStoryText('choice_title'), [
            choiceOption(`${phase1OptionPrefix}_OPT1`, id(n(4)), bindingStoryText('bed_choice_tail')),
            choiceOption(`${phase1OptionPrefix}_OPT2`, id(n(18)), bindingStoryText('bed_choice_thigh')),
            choiceOption(`${phase1OptionPrefix}_OPT3`, id(n(19)), bindingStoryText('bed_choice_ooxx'))
        ]);

        addDialogue(n(4), 'bed', n(5), bindingStoryText('bed_line_2'));
        addChoice(n(5), 'bed', bindingStoryText('choice_title'), [
            choiceOption(`${id(n(5))}_OPT1`, id(n(6)), bindingStoryText('bed_choice_continue')),
            choiceOption(`${id(n(5))}_OPT2`, id(n(10)), bindingStoryText('bed_choice_stop'))
        ]);

        addDialogue(n(6), 'bed', n(7), bindingStoryText('bed_line_continue'));
        addChoice(n(7), 'bed', bindingStoryText('choice_title'), [
            choiceOption(`${id(n(7))}_OPT1`, id(n(8)), bindingStoryText('bed_choice_continue')),
            choiceOption(`${id(n(7))}_OPT2`, id(n(12)), bindingStoryText('bed_choice_stop'))
        ]);

        addDialogue(n(8), 'bed', n(9), bindingRuntime('BED_CRY_LOOP_LINES', ['tw', 0]));
        addChoice(n(9), 'bed', bindingStoryText('choice_title'), [
            choiceOption(`${id(n(9))}_OPT1`, id(n(14)), bindingStoryText('bed_choice_continue')),
            choiceOption(`${id(n(9))}_OPT2`, id(n(16)), bindingStoryText('bed_choice_stop'))
        ]);

        addDialogue(n(10), 'bed', n(11), bindingRuntime('BED_STOP_LINE_BY_LANG', ['tw']));
        addChoice(n(11), 'bed', bindingStoryText('choice_title'), [
            choiceOption(`${id(n(11))}_OPT1`, id(n(22)), bindingStoryText('bed_choice_thigh')),
            choiceOption(`${id(n(11))}_OPT2`, id(n(23)), bindingStoryText('bed_choice_ooxx'))
        ]);

        addDialogue(n(12), 'bed', n(13), bindingRuntime('BED_STOP_LINE_BY_LANG', ['tw']));
        addChoice(n(13), 'bed', bindingStoryText('choice_title'), [
            choiceOption(`${id(n(13))}_OPT1`, id(n(25)), bindingStoryText('bed_choice_thigh')),
            choiceOption(`${id(n(13))}_OPT2`, id(n(58)), bindingStoryText('bed_choice_ooxx'))
        ]);

        addDialogue(n(14), 'bed', n(15), bindingRuntime('BED_CRY_LOOP_LINES', ['tw', 4]));
        addChoice(n(15), 'bed', bindingStoryText('choice_title'), [
            choiceOption(`${id(n(15))}_OPT1`, id(n(30)), bindingRuntime('BED_EXTRA_MONEY_OPTION_TEXT', ['tw'])),
            choiceOption(`${id(n(15))}_OPT2`, id(n(26)), bindingStoryText('bed_choice_continue')),
            choiceOption(`${id(n(15))}_OPT3`, id(n(28)), bindingStoryText('bed_choice_stop'))
        ]);

        addDialogue(n(16), 'bed', n(17), bindingRuntime('BED_STOP_LINE_BY_LANG', ['tw']));
        addChoice(n(17), 'bed', bindingStoryText('choice_title'), [
            choiceOption(`${id(n(17))}_OPT1`, id(n(60)), bindingStoryText('bed_choice_thigh')),
            choiceOption(`${id(n(17))}_OPT2`, id(n(61)), bindingStoryText('bed_choice_ooxx'))
        ]);

        addDeath(n(18), 'bed', '死亡（床戲選項：摸大腿）');
        addMiniGame(n(19), 'bed', n(20), '小遊戲：OOXX（床戲）');
        addTitle(n(20), 'OOXX 結束後回標題');

        addDeath(n(22), 'bed', '死亡（停手後選摸大腿）');
        addMiniGame(n(23), 'bed', n(24), '小遊戲：OOXX（停手後分支 A）');
        addTitle(n(24), 'OOXX 結束後回標題');

        addDeath(n(25), 'bed', '死亡（停手後選摸大腿）');
        addDialogue(n(26), 'bed', n(27), bindingRuntime('BED_CRY_LOOP_LINES', ['tw', 5]));
        addTbc(n(27), 'bed', '床戲循環段（已展開到關鍵門檻）');

        addDialogue(n(28), 'bed', n(29), bindingRuntime('BED_STOP_LINE_BY_LANG', ['tw']));
        addChoice(n(29), 'bed', bindingStoryText('choice_title'), [
            choiceOption(`${id(n(29))}_OPT1`, id(n(63)), bindingStoryText('bed_choice_thigh')),
            choiceOption(`${id(n(29))}_OPT2`, id(n(64)), bindingStoryText('bed_choice_ooxx'))
        ]);

        addDialogue(n(30), 'bed', n(31), bindingRuntime('BED_EXTRA_MONEY_LINE', ['tw']));
        addTransition(n(31), 'bed', n(32), '黑幕過場切到 bed_n');

        for (let i = 0; i < 11; i += 1) {
            addDialogue(
                n(32 + i),
                'bed_n',
                i === 10 ? n(43) : n(33 + i),
                bindingRuntime('BED_N_DIALOGUE_LINES', ['tw', i])
            );
        }

        addTransition(n(43), 'bed_n', n(44), '黑幕過場（睡覺場景）');
        addDialogue(n(44), 'bed_n', n(45), bindingRuntime('BED_N_SLEEP_BRANCH_TEXT', ['tw', 'postSleepLine']));
        addChoice(n(45), 'bed_n', bindingRuntime('BED_N_SLEEP_BRANCH_TEXT', ['tw', 'choiceTitle']), [
            choiceOption(`${sleepChoicePrefix}_OPT1`, id(n(46)), bindingRuntime('BED_N_SLEEP_BRANCH_TEXT', ['tw', 'optionUnderBlanket'])),
            choiceOption(`${sleepChoicePrefix}_OPT2`, id(n(47)), bindingRuntime('BED_N_SLEEP_BRANCH_TEXT', ['tw', 'optionSleepSofa']))
        ]);

        addDeath(n(46), 'bed_n', '死亡（睡前分支：鑽進棉被）');
        addDialogue(n(47), 'bed_n', n(48), bindingRuntime('BED_N_SLEEP_BRANCH_TEXT', ['tw', 'goodNightLine']));
        addTbc(n(48), 'bed_n', '待續（乖乖睡沙發）');

        addMiniGame(n(58), 'bed', n(59), '小遊戲：OOXX（停手後分支 B）');
        addTitle(n(59), 'OOXX 結束後回標題');
        addDeath(n(60), 'bed', '死亡（停手後選摸大腿）');
        addMiniGame(n(61), 'bed', n(62), '小遊戲：OOXX（停手後分支 C）');
        addTitle(n(62), 'OOXX 結束後回標題');
        addDeath(n(63), 'bed', '死亡（停手後選摸大腿）');
        addMiniGame(n(64), 'bed', n(65), '小遊戲：OOXX（停手後分支 D）');
        addTitle(n(65), 'OOXX 結束後回標題');
    };

    addNode({
        nodeId: id(1),
        type: STORY_FLOW_NODE_TYPES.TITLE,
        sceneId: 'title',
        nextNodeId: id(2),
        defaultTw: '開始標題'
    });
    addDialogue(2, 'park', 3, bindingRuntime('OPENING_TEXT', ['tw', 'greeting']));
    addChoice(3, 'park', bindingStoryText('choice_title'), [
        choiceOption('N0003_OPT1', id(4), bindingRuntime('OPENING_TEXT', ['tw', 'choiceIntro'])),
        choiceOption('N0003_OPT2', id(8), bindingRuntime('OPENING_TEXT', ['tw', 'choiceSkipIntro']))
    ]);

    addDialogue(4, 'park', 5, bindingRuntime('OPENING_TEXT', ['tw', 'introLines', 0]));
    addDialogue(5, 'park', 6, bindingRuntime('OPENING_TEXT', ['tw', 'introLines', 1]));
    addDialogue(6, 'park', 7, bindingRuntime('OPENING_TEXT', ['tw', 'introLines', 2]));
    addDialogue(7, 'park', 8, bindingRuntime('OPENING_TEXT', ['tw', 'introLines', 3]));
    addChoice(8, 'park', bindingStoryText('choice_title'), [
        choiceOption('N0008_OPT1', id(11), bindingRuntime('OPENING_TEXT', ['tw', 'choiceGoHomeAfterIntro'])),
        choiceOption('N0008_OPT2', id(9), bindingRuntime('OPENING_TEXT', ['tw', 'choiceRecordStore']))
    ]);
    addDialogue(9, 'park', 10, bindingRuntime('OPENING_TEXT', ['tw', 'recordStoreReply']));
    addTbc(10, 'park', '待續（唱片行分支）');

    addDialogue(11, 'park', 12, bindingRuntime('OPENING_TEXT', ['tw', 'goHomeTransitionLine']));
    addTransition(12, 'park', 13, '黑幕過場（2 秒）切回 default');
    addDialogue(13, 'default', 14, bindingStoryText('line_1'));
    addDialogue(14, 'default', 15, bindingStoryText('line_2'));
    addDialogue(15, 'default', 16, bindingStoryText('line_3'));
    addDialogue(16, 'default', 17, bindingStoryText('line_4'));
    addDialogue(17, 'default', 18, bindingStoryText('line_5'));
    addChoice(18, 'default', bindingStoryText('choice_title'), [
        choiceOption('N0018_OPT1', id(19), bindingStoryText('choice_1')),
        choiceOption('N0018_OPT2', id(21), bindingRuntime('FIGHT_CHOICE_LABELS', ['tw'])),
        choiceOption('N0018_OPT3', id(100), bindingStoryText('choice_3')),
        choiceOption('N0018_OPT4', id(400), bindingStoryText('choice_4'))
    ]);
    addDialogue(19, 'default', 20, bindingStoryText('resp_1'));
    addDeath(20, 'default', '死亡（主線選項 1）');

    addTransition(21, 'default', 22, '黑幕過場切到 fight');
    addDialogue(22, 'fight', 23, bindingRuntime('FIGHT_TEXT', ['tw', 'intro']));
    addChoice(23, 'fight', bindingRuntime('FIGHT_TEXT', ['tw', 'choiceTitle']), [
        choiceOption('N0023_OPT1', id(24), bindingRuntime('FIGHT_TEXT', ['tw', 'attackOption'])),
        choiceOption('N0023_OPT2', id(27), bindingRuntime('FIGHT_TEXT', ['tw', 'jokeOption']))
    ]);
    addDialogue(24, 'fight', 25, bindingRuntime('FIGHT_TEXT', ['tw', 'afterHitLine1']));
    addDialogue(25, 'fight', 26, bindingRuntime('FIGHT_TEXT', ['tw', 'afterHitLine2']));
    addDeath(26, 'fight', '死亡（戰鬥攻擊）');
    addTransition(27, 'fight', 28, '黑幕過場切回 default');
    addDialogue(28, 'default', 29, bindingRuntime('FIGHT_JOKE_RETURN_LINE', ['tw']));
    addChoice(29, 'default', bindingStoryText('choice_title'), [
        choiceOption('N0029_OPT1', id(30), bindingStoryText('choice_1')),
        choiceOption('N0029_OPT2', id(200), bindingStoryText('choice_3')),
        choiceOption('N0029_OPT3', id(36), bindingStoryText('choice_4'))
    ]);
    addDialogue(30, 'default', 31, bindingStoryText('resp_1'));
    addDeath(31, 'default', '死亡（戰鬥後追問選項 1）');

    addMiniGame(36, 'default', 37, '小遊戲：OOXX（戰鬥後分支）');
    addTransition(37, 'default', 38, 'OOXX 結果過場');
    addChoice(38, 'default', bindingStoryText('choice_title'), [
        choiceOption('N0038_OPT1', id(39), bindingStoryText('choice_1')),
        choiceOption('N0038_OPT2', id(41), bindingStoryText('choice_3'))
    ]);
    addDialogue(39, 'default', 40, bindingStoryText('resp_1'));
    addDeath(40, 'default', '死亡（OOXX 後追問選項 1）');
    addDialogue(41, 'bed', 42, null, '進入床戲分支（細節展開見 N0200 之後）');
    addTbc(42, 'bed', '床戲分支已在流程表完整展開（避免重複）');

    buildBedBranch(100, 'N0103', 'N0145');
    buildBedBranch(200, 'N0203', 'N0245');

    addMiniGame(400, 'default', 401, '小遊戲：OOXX（主線選項 4）');
    addTransition(401, 'default', 402, 'OOXX 結果過場');
    addChoice(402, 'default', bindingStoryText('choice_title'), [
        choiceOption('N0402_OPT1', id(403), bindingStoryText('choice_1')),
        choiceOption('N0402_OPT2', id(405), bindingRuntime('FIGHT_CHOICE_LABELS', ['tw'])),
        choiceOption('N0402_OPT3', id(418), bindingStoryText('choice_3'))
    ]);
    addDialogue(403, 'default', 404, bindingStoryText('resp_1'));
    addDeath(404, 'default', '死亡（OOXX 後主選單選項 1）');
    addTransition(405, 'default', 406, '黑幕過場切到 fight（OOXX 後）');
    addDialogue(406, 'fight', 407, bindingRuntime('FIGHT_TEXT_AFTER_OOXX', ['tw', 'intro']));
    addChoice(407, 'fight', bindingRuntime('FIGHT_TEXT_AFTER_OOXX', ['tw', 'choiceTitle']), [
        choiceOption('N0407_OPT1', id(408), bindingRuntime('FIGHT_TEXT_AFTER_OOXX', ['tw', 'attackOption'])),
        choiceOption('N0407_OPT2', id(411), bindingRuntime('FIGHT_TEXT_AFTER_OOXX', ['tw', 'jokeOption']))
    ]);
    addDialogue(408, 'fight', 409, bindingRuntime('FIGHT_TEXT_AFTER_OOXX', ['tw', 'afterHitLine1']));
    addDialogue(409, 'fight', 410, bindingRuntime('FIGHT_TEXT_AFTER_OOXX', ['tw', 'afterHitLine2']));
    addDeath(410, 'fight', '死亡（OOXX 後戰鬥攻擊）');
    addTransition(411, 'fight', 412, '黑幕過場切回 default');
    addDialogue(412, 'default', 413, bindingRuntime('FIGHT_JOKE_RETURN_LINE', ['tw']));
    addChoice(413, 'default', bindingStoryText('choice_title'), [
        choiceOption('N0413_OPT1', id(414), bindingStoryText('choice_1')),
        choiceOption('N0413_OPT2', id(416), bindingStoryText('choice_3'))
    ]);
    addDialogue(414, 'default', 415, bindingStoryText('resp_1'));
    addDeath(415, 'default', '死亡（OOXX 後追問選項 1）');
    addDialogue(416, 'bed', 417, null, '進入床戲分支（OOXX 後）');
    addTbc(417, 'bed', '床戲分支已於流程表展開（N0200 起）');
    addDialogue(418, 'bed', 419, null, '進入床戲分支（OOXX 後主選單）');
    addTbc(419, 'bed', '床戲分支已於流程表展開（N0100 起）');

    addDialogue(900, 'default', 901, bindingRuntime('HEAD_TOUCH_TEXT', ['tw', 'mild']));
    addDialogue(901, 'default', 902, bindingRuntime('HEAD_TOUCH_TEXT', ['tw', 'angry']));
    addDeath(902, 'default', '死亡（摸頭觸發）', bindingRuntime('HEAD_TOUCH_TEXT', ['tw', 'fatal']));
}

function freezeDefinitions(definitions) {
    return definitions.map((node) => Object.freeze({
        ...node,
        choiceOptions: Array.isArray(node.choiceOptions)
            ? Object.freeze(node.choiceOptions.map((option) => Object.freeze({ ...option })))
            : undefined
    }));
}

let frozenFlowDefinitionsCache = null;

function getFrozenFlowDefinitions() {
    if (!frozenFlowDefinitionsCache) {
        buildFlowDefinitions();
        frozenFlowDefinitionsCache = freezeDefinitions(FLOW_NODE_DEFINITIONS);
    }
    return frozenFlowDefinitionsCache;
}

function toCatalogNode(definition, storySetByLang) {
    const resolvedTw = resolveTextFromBinding(definition.sourceBinding, storySetByLang);
    const node = {
        nodeId: definition.nodeId,
        type: definition.type,
        sceneId: definition.sceneId,
        nextNodeId: definition.nextNodeId || '',
        tw: resolvedTw || definition.defaultTw || '',
        en: '',
        jp: '',
        sourceBinding: definition.sourceBinding ? deepClone(definition.sourceBinding) : null
    };
    if (Array.isArray(definition.choiceOptions)) {
        node.choiceOptions = definition.choiceOptions.map((option) => {
            const optionTw = resolveTextFromBinding(option.sourceBinding, storySetByLang);
            return {
                optionId: option.optionId,
                nextNodeId: option.nextNodeId || '',
                tw: optionTw || option.defaultTw || '',
                en: '',
                jp: '',
                sourceBinding: option.sourceBinding ? deepClone(option.sourceBinding) : null
            };
        });
    }
    return node;
}

function collectEdges(node) {
    const edges = [];
    if (node.nextNodeId) edges.push(node.nextNodeId);
    if (node.type === STORY_FLOW_NODE_TYPES.CHOICE && Array.isArray(node.choiceOptions)) {
        for (const option of node.choiceOptions) {
            if (option.nextNodeId) edges.push(option.nextNodeId);
        }
    }
    return edges;
}

function synchronizeEditableTextByBinding(catalog) {
    const textByBinding = new Map();
    let conflictCount = 0;
    for (const node of catalog.nodes) {
        if (isDialogueNodeEditable(node)) {
            const key = getBindingKey(node.sourceBinding);
            if (key) {
                if (textByBinding.has(key) && textByBinding.get(key) !== node.tw) conflictCount += 1;
                textByBinding.set(key, node.tw || '');
            }
        }
        if (node.type !== STORY_FLOW_NODE_TYPES.CHOICE || !Array.isArray(node.choiceOptions)) continue;
        for (const option of node.choiceOptions) {
            if (!isChoiceOptionEditable(option)) continue;
            const key = getBindingKey(option.sourceBinding);
            if (!key) continue;
            if (textByBinding.has(key) && textByBinding.get(key) !== option.tw) conflictCount += 1;
            textByBinding.set(key, option.tw || '');
        }
    }
    for (const node of catalog.nodes) {
        if (isDialogueNodeEditable(node)) {
            const key = getBindingKey(node.sourceBinding);
            if (key && textByBinding.has(key)) node.tw = textByBinding.get(key);
        }
        if (node.type !== STORY_FLOW_NODE_TYPES.CHOICE || !Array.isArray(node.choiceOptions)) continue;
        for (const option of node.choiceOptions) {
            if (!isChoiceOptionEditable(option)) continue;
            const key = getBindingKey(option.sourceBinding);
            if (key && textByBinding.has(key)) option.tw = textByBinding.get(key);
        }
    }
    return { conflictCount };
}

function applyCatalogEditableTextsToSources(catalog, storySetByLang) {
    let appliedCount = 0;
    for (const node of catalog.nodes) {
        if (isDialogueNodeEditable(node) && applyTextToBinding(node.sourceBinding, node.tw || '', storySetByLang)) {
            appliedCount += 1;
        }
        if (node.type !== STORY_FLOW_NODE_TYPES.CHOICE || !Array.isArray(node.choiceOptions)) continue;
        for (const option of node.choiceOptions) {
            if (!isChoiceOptionEditable(option)) continue;
            if (applyTextToBinding(option.sourceBinding, option.tw || '', storySetByLang)) {
                appliedCount += 1;
            }
        }
    }
    return { appliedCount };
}

export function validateStoryFlowCatalog(catalog) {
    const errors = [];
    if (!catalog || typeof catalog !== 'object') return { ok: false, errors: ['catalog must be an object'] };
    if (!Array.isArray(catalog.nodes) || catalog.nodes.length === 0) {
        return { ok: false, errors: ['catalog.nodes must be a non-empty array'] };
    }

    const nodeMap = new Map();
    for (const node of catalog.nodes) {
        if (!node?.nodeId || typeof node.nodeId !== 'string') {
            errors.push('nodeId is required for every node');
            continue;
        }
        if (nodeMap.has(node.nodeId)) errors.push(`duplicate nodeId: ${node.nodeId}`);
        if (!NODE_TYPE_SET.has(node.type)) errors.push(`node ${node.nodeId}: invalid type "${node.type}"`);
        if (!node.sceneId || typeof node.sceneId !== 'string') errors.push(`node ${node.nodeId}: sceneId is required`);
        if (node.nextNodeId && node.nextNodeId === node.nodeId) errors.push(`node ${node.nodeId}: self-loop is not allowed`);
        if (node.type === STORY_FLOW_NODE_TYPES.CHOICE) {
            if (!Array.isArray(node.choiceOptions) || node.choiceOptions.length === 0) {
                errors.push(`node ${node.nodeId}: choiceOptions must be a non-empty array`);
            } else {
                const optionIds = new Set();
                for (const option of node.choiceOptions) {
                    if (!option.optionId || typeof option.optionId !== 'string') {
                        errors.push(`node ${node.nodeId}: optionId is required`);
                        continue;
                    }
                    if (optionIds.has(option.optionId)) errors.push(`node ${node.nodeId}: duplicate optionId ${option.optionId}`);
                    optionIds.add(option.optionId);
                    if (!option.nextNodeId || typeof option.nextNodeId !== 'string') {
                        errors.push(`node ${node.nodeId}.${option.optionId}: nextNodeId is required`);
                    }
                    if (option.nextNodeId === node.nodeId) {
                        errors.push(`node ${node.nodeId}.${option.optionId}: self-loop is not allowed`);
                    }
                }
            }
        }
        nodeMap.set(node.nodeId, node);
    }
    if (errors.length > 0) return { ok: false, errors };

    const inDegree = new Map();
    for (const nodeId of nodeMap.keys()) inDegree.set(nodeId, 0);
    for (const node of catalog.nodes) {
        for (const target of collectEdges(node)) {
            if (!nodeMap.has(target)) {
                errors.push(`missing node reference: ${node.nodeId} -> ${target}`);
                continue;
            }
            inDegree.set(target, (inDegree.get(target) || 0) + 1);
        }
    }
    for (const [nodeId, count] of inDegree.entries()) {
        if (nodeId === catalog.startNodeId) continue;
        if (count > 1) errors.push(`node ${nodeId} has ${count} incoming edges (must be <= 1)`);
    }

    const visiting = new Set();
    const visited = new Set();
    const cycles = new Set();
    const dfs = (nodeId) => {
        if (visiting.has(nodeId)) {
            cycles.add(nodeId);
            return;
        }
        if (visited.has(nodeId)) return;
        visiting.add(nodeId);
        const node = nodeMap.get(nodeId);
        if (node) for (const next of collectEdges(node)) dfs(next);
        visiting.delete(nodeId);
        visited.add(nodeId);
    };
    for (const nodeId of nodeMap.keys()) dfs(nodeId);
    for (const cycleNodeId of cycles) errors.push(`cycle detected around node ${cycleNodeId}`);
    return { ok: errors.length === 0, errors };
}

export function createStoryFlowCatalog(storySetByLang) {
    const catalog = {
        version: STORY_FLOW_VERSION,
        chapterId: STORY_FLOW_CHAPTER_ID,
        startNodeId: STORY_FLOW_START_NODE_ID,
        nodes: getFrozenFlowDefinitions().map((definition) => toCatalogNode(definition, storySetByLang))
    };
    synchronizeEditableTextByBinding(catalog);
    return catalog;
}

export function buildStoryFlowExportPayload(catalog) {
    return {
        version: catalog?.version ?? STORY_FLOW_VERSION,
        chapterId: catalog?.chapterId ?? STORY_FLOW_CHAPTER_ID,
        startNodeId: catalog?.startNodeId ?? STORY_FLOW_START_NODE_ID,
        exportedAt: new Date().toISOString(),
        nodes: deepClone(Array.isArray(catalog?.nodes) ? catalog.nodes : [])
    };
}

export function mergeStoryFlowImport(baseCatalog, importedPayload) {
    const catalog = deepClone(baseCatalog);
    const report = {
        updatedDialogue: 0,
        updatedOptions: 0,
        skippedUnknownNodeIds: 0,
        skippedUnknownOptionIds: 0,
        skippedReadonlyFields: 0,
        skippedInvalidEntries: 0,
        bindingConflicts: 0,
        errors: []
    };
    if (!importedPayload || typeof importedPayload !== 'object') {
        report.errors.push('import payload must be an object');
        return { catalog, report };
    }
    if (!Array.isArray(importedPayload.nodes)) {
        report.errors.push('import payload.nodes must be an array');
        return { catalog, report };
    }

    const nodeMap = new Map(catalog.nodes.map((node) => [node.nodeId, node]));
    for (const importedNode of importedPayload.nodes) {
        if (!importedNode || typeof importedNode !== 'object' || typeof importedNode.nodeId !== 'string') {
            report.skippedInvalidEntries += 1;
            continue;
        }
        const targetNode = nodeMap.get(importedNode.nodeId);
        if (!targetNode) {
            report.skippedUnknownNodeIds += 1;
            continue;
        }
        if (typeof importedNode.tw === 'string') {
            if (isDialogueNodeEditable(targetNode)) {
                targetNode.tw = importedNode.tw;
                report.updatedDialogue += 1;
            } else {
                report.skippedReadonlyFields += 1;
            }
        }
        if (Array.isArray(importedNode.choiceOptions) && targetNode.type === STORY_FLOW_NODE_TYPES.CHOICE) {
            const optionMap = new Map((targetNode.choiceOptions || []).map((option) => [option.optionId, option]));
            for (const importedOption of importedNode.choiceOptions) {
                if (!importedOption || typeof importedOption.optionId !== 'string') {
                    report.skippedInvalidEntries += 1;
                    continue;
                }
                const targetOption = optionMap.get(importedOption.optionId);
                if (!targetOption) {
                    report.skippedUnknownOptionIds += 1;
                    continue;
                }
                if (typeof importedOption.tw === 'string') {
                    if (isChoiceOptionEditable(targetOption)) {
                        targetOption.tw = importedOption.tw;
                        report.updatedOptions += 1;
                    } else {
                        report.skippedReadonlyFields += 1;
                    }
                }
            }
        }
    }
    const syncResult = synchronizeEditableTextByBinding(catalog);
    report.bindingConflicts = syncResult.conflictCount;
    return { catalog, report };
}

export function readStoredStoryFlowOverrides(storage = globalThis?.localStorage) {
    if (!storage) return null;
    try {
        const raw = storage.getItem(STORY_FLOW_OVERRIDE_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err) {
        console.warn('Failed to read story flow overrides:', err);
        return null;
    }
}

export function writeStoredStoryFlowOverrides(payload, storage = globalThis?.localStorage) {
    if (!storage) return false;
    try {
        storage.setItem(STORY_FLOW_OVERRIDE_STORAGE_KEY, JSON.stringify(payload));
        return true;
    } catch (err) {
        console.warn('Failed to save story flow overrides:', err);
        return false;
    }
}

export function clearStoredStoryFlowOverrides(storage = globalThis?.localStorage) {
    if (!storage) return false;
    try {
        storage.removeItem(STORY_FLOW_OVERRIDE_STORAGE_KEY);
        return true;
    } catch (err) {
        console.warn('Failed to clear story flow overrides:', err);
        return false;
    }
}

export function applyStoredStoryFlowTwOverrides(storySetByLang, storage = globalThis?.localStorage) {
    const stored = readStoredStoryFlowOverrides(storage);
    if (!stored) return { applied: false, reason: 'no_overrides' };
    const baseCatalog = createStoryFlowCatalog(storySetByLang);
    const merged = mergeStoryFlowImport(baseCatalog, stored);
    const applyResult = applyCatalogEditableTextsToSources(merged.catalog, storySetByLang);
    return { applied: true, appliedCount: applyResult.appliedCount, importReport: merged.report };
}

export function applyCatalogToStorySources(catalog, storySetByLang) {
    return applyCatalogEditableTextsToSources(catalog, storySetByLang);
}
