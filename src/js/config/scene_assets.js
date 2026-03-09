import { withAssetVersion } from './asset_versioning.js';
import { SCENE_EXPRESSION_LIBRARY } from './expression_library.js';

export const SCENE_DEFAULT = 'default';
export const SCENE_PARK = 'park';
export const SCENE_BED = 'bed';
export const SCENE_BED_N = 'bed_n';
export const SCENE_FIGHT = 'fight';

const DEFAULT_EXPR = SCENE_EXPRESSION_LIBRARY.default;
const PARK_EXPR = SCENE_EXPRESSION_LIBRARY.park;
const BED_EXPR = SCENE_EXPRESSION_LIBRARY.bed;
const BED_N_EXPR = SCENE_EXPRESSION_LIBRARY.bed_n;
const FIGHT_EXPR = SCENE_EXPRESSION_LIBRARY.fight;

/** @typedef {{
 * bg: string,
 * body: string,
 * tail: string,
 * idle: string,
 * blink: string,
 * speak: string,
 * angry: string,
 * happy: string,
 * happyTalk: string,
 * tailOrigin: string,
 * hasSpecialHeads: boolean,
 * moneyHead?: string,
 * moneyBlink?: string,
 * idleClosed?: string,
 * speakClosed?: string,
 * idleClosedCry?: string,
 * speakClosedCry?: string,
 * idleTears?: string,
 * speakTears?: string,
 * blinkSpeakTears?: string,
 * parkEyes?: string,
 * parkMouth?: string,
 * parkEyebrows?: string
 * }} SceneAssets
 */

function mapSceneAssetRecord(sceneAssetRecord) {
    const mappedRecord = {};
    Object.entries(sceneAssetRecord || {}).forEach(([key, value]) => {
        mappedRecord[key] = typeof value === 'string' ? withAssetVersion(value) : value;
    });
    return mappedRecord;
}

/** @type {Record<string, SceneAssets>} */
const RAW_SCENE_ASSETS = {
    [SCENE_DEFAULT]: {
        bg: DEFAULT_EXPR.bg,
        body: DEFAULT_EXPR.body,
        tail: DEFAULT_EXPR.tail,
        idle: DEFAULT_EXPR.idle,
        blink: DEFAULT_EXPR.blink,
        speak: DEFAULT_EXPR.speak,
        angry: DEFAULT_EXPR.angry,
        happy: DEFAULT_EXPR.happy,
        moneyHead: DEFAULT_EXPR.moneyHead,
        moneyBlink: DEFAULT_EXPR.moneyBlink,
        happyTalk: DEFAULT_EXPR.happyTalk,
        tailOrigin: '68.7376% 75.0098%',
        hasSpecialHeads: true
    },
    [SCENE_PARK]: {
        bg: PARK_EXPR.bgPark,
        body: PARK_EXPR.fullBody,
        tail: PARK_EXPR.fullBody,
        idle: PARK_EXPR.fullBody,
        blink: PARK_EXPR.fullBody,
        speak: PARK_EXPR.fullBody,
        angry: PARK_EXPR.fullBody,
        happy: PARK_EXPR.fullBody,
        happyTalk: PARK_EXPR.fullBody,
        parkEyes: PARK_EXPR.eyesClosed,
        parkMouth: PARK_EXPR.mouthClosed,
        parkEyebrows: PARK_EXPR.eyebrowsDown,
        tailOrigin: '50% 50%',
        hasSpecialHeads: false
    },
    [SCENE_BED]: {
        bg: BED_EXPR.bg,
        body: BED_EXPR.body,
        tail: BED_EXPR.tail,
        idle: BED_EXPR.idle,
        blink: BED_EXPR.blink,
        speak: BED_EXPR.speak,
        moneyHead: BED_EXPR.moneyHead,
        moneyBlink: BED_EXPR.moneyBlink,
        idleClosed: BED_EXPR.idleClosed,
        speakClosed: BED_EXPR.speakClosed,
        idleClosedCry: BED_EXPR.idleClosedCry,
        speakClosedCry: BED_EXPR.speakClosedCry,
        idleTears: BED_EXPR.idleTears,
        speakTears: BED_EXPR.speakTears,
        blinkSpeakTears: BED_EXPR.blinkSpeakTears,
        angry: BED_EXPR.idle,
        happy: BED_EXPR.idle,
        happyTalk: BED_EXPR.idle,
        tailOrigin: '42.6980% 62.0781%',
        hasSpecialHeads: false
    },
    [SCENE_BED_N]: {
        bg: BED_N_EXPR.bg,
        body: BED_N_EXPR.body,
        tail: BED_N_EXPR.tail,
        idle: BED_N_EXPR.idle,
        blink: BED_N_EXPR.blink,
        speak: BED_N_EXPR.speak,
        angry: BED_N_EXPR.idle,
        happy: BED_N_EXPR.idle,
        happyTalk: BED_N_EXPR.idle,
        tailOrigin: '42.6980% 62.0781%',
        hasSpecialHeads: false
    },
    [SCENE_FIGHT]: {
        bg: FIGHT_EXPR.bg,
        body: FIGHT_EXPR.body,
        tail: FIGHT_EXPR.tail,
        idle: FIGHT_EXPR.idle,
        blink: FIGHT_EXPR.blink,
        speak: FIGHT_EXPR.speak,
        angry: FIGHT_EXPR.angry,
        happy: FIGHT_EXPR.happy,
        happyTalk: FIGHT_EXPR.happyTalk,
        tailOrigin: '67.8501% 61.5215%',
        hasSpecialHeads: true
    }
};

/** @type {Record<string, SceneAssets>} */
export const SCENE_ASSETS = Object.fromEntries(
    Object.entries(RAW_SCENE_ASSETS).map(([sceneId, sceneAssets]) => [
        sceneId,
        mapSceneAssetRecord(sceneAssets)
    ])
);

function uniqueAssets(assets) {
    return Array.from(new Set(assets));
}

function versionAssetList(assets) {
    return uniqueAssets((assets || []).map((assetPath) => withAssetVersion(assetPath)));
}

const DEFAULT_SCENE_IMAGE_ASSETS = versionAssetList([
    DEFAULT_EXPR.bg,
    DEFAULT_EXPR.body,
    DEFAULT_EXPR.tail,
    DEFAULT_EXPR.idle,
    DEFAULT_EXPR.blink,
    DEFAULT_EXPR.speak,
    DEFAULT_EXPR.angry,
    DEFAULT_EXPR.happy,
    DEFAULT_EXPR.happyTalk,
    DEFAULT_EXPR.idleNormal,
    DEFAULT_EXPR.blinkNormal,
    DEFAULT_EXPR.touchNormal,
    DEFAULT_EXPR.touchAngry,
    DEFAULT_EXPR.touchAngryBlink,
    DEFAULT_EXPR.touchAngryTouch,
    DEFAULT_EXPR.headphone,
    DEFAULT_EXPR.moneyHead,
    DEFAULT_EXPR.moneyBlink,
    DEFAULT_EXPR.afraidIdle,
    DEFAULT_EXPR.afraidBlink,
    DEFAULT_EXPR.afraidSpeak,
    DEFAULT_EXPR.shyHappy,
    DEFAULT_EXPR.shySpeak,
    DEFAULT_EXPR.shyBlink,
    DEFAULT_EXPR.moneyPopup,
    DEFAULT_EXPR.petDesktop,
    DEFAULT_EXPR.petMobile
]);

const PARK_SCENE_IMAGE_ASSETS = versionAssetList([
    PARK_EXPR.bgPark,
    PARK_EXPR.bgCoffee,
    PARK_EXPR.fullBody,
    PARK_EXPR.eyesClosed,
    PARK_EXPR.mouthClosed,
    PARK_EXPR.eyebrowsDown
]);

const BED_SCENE_IMAGE_ASSETS = versionAssetList([
    BED_EXPR.bg,
    BED_EXPR.body,
    BED_EXPR.tail,
    BED_EXPR.idle,
    BED_EXPR.blink,
    BED_EXPR.speak,
    BED_EXPR.moneyHead,
    BED_EXPR.moneyBlink,
    BED_EXPR.idleClosed,
    BED_EXPR.speakClosed,
    BED_EXPR.idleClosedCry,
    BED_EXPR.speakClosedCry,
    BED_EXPR.idleTears,
    BED_EXPR.speakTears,
    BED_EXPR.blinkSpeakTears,
    BED_EXPR.headphone,
    BED_EXPR.moneyPopup
]);

const BED_N_SCENE_IMAGE_ASSETS = versionAssetList([
    BED_N_EXPR.bg,
    BED_N_EXPR.body,
    BED_N_EXPR.tail,
    BED_N_EXPR.idle,
    BED_N_EXPR.speak,
    BED_N_EXPR.sleep,
    BED_N_EXPR.sleepNoLight
]);

const FIGHT_SCENE_IMAGE_ASSETS = versionAssetList([
    FIGHT_EXPR.bg,
    FIGHT_EXPR.body,
    FIGHT_EXPR.blink,
    FIGHT_EXPR.angry,
    FIGHT_EXPR.damageBreak,
    FIGHT_EXPR.postHit,
    FIGHT_EXPR.tail,
    FIGHT_EXPR.headphone
]);

export const SCENE_IMAGE_ASSET_GROUPS = {
    [SCENE_DEFAULT]: DEFAULT_SCENE_IMAGE_ASSETS,
    [SCENE_PARK]: PARK_SCENE_IMAGE_ASSETS,
    [SCENE_BED]: BED_SCENE_IMAGE_ASSETS,
    [SCENE_BED_N]: BED_N_SCENE_IMAGE_ASSETS,
    [SCENE_FIGHT]: FIGHT_SCENE_IMAGE_ASSETS
};

export const BOOT_IMAGE_ASSETS = uniqueAssets([
    ...PARK_SCENE_IMAGE_ASSETS,
    ...DEFAULT_SCENE_IMAGE_ASSETS,
    SCENE_EXPRESSION_LIBRARY.ui.foxFace
]);

export const PRELOAD_IMAGE_ASSETS = uniqueAssets([
    ...BOOT_IMAGE_ASSETS,
    ...PARK_SCENE_IMAGE_ASSETS,
    ...BED_SCENE_IMAGE_ASSETS,
    ...BED_N_SCENE_IMAGE_ASSETS,
    ...FIGHT_SCENE_IMAGE_ASSETS
]);

