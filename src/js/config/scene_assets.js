export const SCENE_DEFAULT = 'default';
export const SCENE_PARK = 'park';
export const SCENE_BED = 'bed';
export const SCENE_BED_N = 'bed_n';
export const SCENE_FIGHT = 'fight';

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

/** @type {Record<string, SceneAssets>} */
export const SCENE_ASSETS = {
    [SCENE_DEFAULT]: {
        bg: 'assets/images/scenes/default/bg-main.jpg',
        body: 'assets/images/scenes/default/body-main.png',
        tail: 'assets/images/scenes/default/tail-main.png',
        idle: 'assets/images/scenes/default/head-no-speak.png',
        blink: 'assets/images/scenes/default/head-blink.png',
        speak: 'assets/images/scenes/default/head-speak.png',
        angry: 'assets/images/scenes/default/head-angry.png',
        happy: 'assets/images/scenes/default/head-happy.png',
        moneyHead: 'assets/images/scenes/default/head-money.png',
        moneyBlink: 'assets/images/scenes/default/head-money-blink.png',
        happyTalk: 'assets/images/scenes/default/head-happy-talk.png',
        tailOrigin: '68.7376% 75.0098%',
        hasSpecialHeads: true
    },
    [SCENE_PARK]: {
        bg: 'assets/images/scenes/Park/bg-park.jpg',
        body: 'assets/images/scenes/Park/Full_body.png',
        tail: 'assets/images/scenes/Park/Full_body.png',
        idle: 'assets/images/scenes/Park/Full_body.png',
        blink: 'assets/images/scenes/Park/Full_body.png',
        speak: 'assets/images/scenes/Park/Full_body.png',
        angry: 'assets/images/scenes/Park/Full_body.png',
        happy: 'assets/images/scenes/Park/Full_body.png',
        happyTalk: 'assets/images/scenes/Park/Full_body.png',
        parkEyes: 'assets/images/scenes/Park/eyes close.png',
        parkMouth: 'assets/images/scenes/Park/mouth close.png',
        parkEyebrows: 'assets/images/scenes/Park/eyebrows down.png',
        tailOrigin: '50% 50%',
        hasSpecialHeads: false
    },
    [SCENE_BED]: {
        bg: 'assets/images/scenes/bed/bed-bg.jpg',
        body: 'assets/images/scenes/bed/bed-body.png',
        tail: 'assets/images/scenes/bed/bed-tail.png',
        idle: 'assets/images/scenes/bed/bed-head-no-speak.png',
        blink: 'assets/images/scenes/bed/bed-head-blink.png',
        speak: 'assets/images/scenes/bed/bed-head-speak.png',
        moneyHead: 'assets/images/scenes/bed/bed-head-shock.png',
        moneyBlink: 'assets/images/scenes/bed/bed-head-blink-shock.png',
        idleClosed: 'assets/images/scenes/bed/bed-head-no-speak-eyes-close.png',
        speakClosed: 'assets/images/scenes/bed/bed-head-speak-eyes-close.png',
        idleClosedCry: 'assets/images/scenes/bed/bed-head-no-speak-eyes-close-cry.png',
        speakClosedCry: 'assets/images/scenes/bed/bed-head-speak-eyes-close-cry.png',
        idleTears: 'assets/images/scenes/bed/bed-head-no-speak-tears.png',
        speakTears: 'assets/images/scenes/bed/bed-head-speak-tears.png',
        blinkSpeakTears: 'assets/images/scenes/bed/bed-head-blink-speak-tears.png',
        angry: 'assets/images/scenes/bed/bed-head-no-speak.png',
        happy: 'assets/images/scenes/bed/bed-head-no-speak.png',
        happyTalk: 'assets/images/scenes/bed/bed-head-no-speak.png',
        tailOrigin: '42.6980% 62.0781%',
        hasSpecialHeads: false
    },
    [SCENE_BED_N]: {
        bg: 'assets/images/scenes/bed_N/bed_N-bg.jpg',
        body: 'assets/images/scenes/bed_N/bed_N-body-naked.png',
        tail: 'assets/images/scenes/bed_N/bed_N-tail.png',
        idle: 'assets/images/scenes/bed_N/bed_N-head-blink-speak-tears.png',
        blink: 'assets/images/scenes/bed_N/bed_N-head-blink-speak-tears.png',
        speak: 'assets/images/scenes/bed_N/bed_N-head-speak-eyes-close-cry.png',
        angry: 'assets/images/scenes/bed_N/bed_N-head-blink-speak-tears.png',
        happy: 'assets/images/scenes/bed_N/bed_N-head-blink-speak-tears.png',
        happyTalk: 'assets/images/scenes/bed_N/bed_N-head-blink-speak-tears.png',
        tailOrigin: '42.6980% 62.0781%',
        hasSpecialHeads: false
    },
    [SCENE_FIGHT]: {
        bg: 'assets/images/scenes/default/bg-main.jpg',
        body: 'assets/images/scenes/fight/fight-fox-notail.png',
        tail: 'assets/images/scenes/fight/fight-tail.png',
        idle: 'assets/images/scenes/fight/fight-fox-notail.png',
        blink: 'assets/images/scenes/fight/fight-fox-eyes-close-notail.png',
        speak: 'assets/images/scenes/fight/fight-fox-notail.png',
        angry: 'assets/images/scenes/fight/fight-fox-damage-notail.png',
        happy: 'assets/images/scenes/fight/fight-fox-notail.png',
        happyTalk: 'assets/images/scenes/fight/fight-fox-notail.png',
        tailOrigin: '67.8501% 61.5215%',
        hasSpecialHeads: true
    }
};

function uniqueAssets(assets) {
    return Array.from(new Set(assets));
}

const DEFAULT_SCENE_IMAGE_ASSETS = uniqueAssets([
    'assets/images/scenes/default/bg-main.jpg',
    'assets/images/scenes/default/body-main.png',
    'assets/images/scenes/default/tail-main.png',
    'assets/images/scenes/default/head-no-speak.png',
    'assets/images/scenes/default/head-blink.png',
    'assets/images/scenes/default/head-speak.png',
    'assets/images/scenes/default/head-angry.png',
    'assets/images/scenes/default/head-happy.png',
    'assets/images/scenes/default/head-happy-talk.png',
    'assets/images/scenes/default/head-no-speak-normal.png',
    'assets/images/scenes/default/head-blink-normal.png',
    'assets/images/scenes/default/head-touch.png',
    'assets/images/scenes/default/head-touch-angry.png',
    'assets/images/scenes/default/head-touch-angry-blink.png',
    'assets/images/scenes/default/head-touch-angry-touch.png',
    'assets/images/scenes/default/headphone.png',
    'assets/images/scenes/default/head-money.png',
    'assets/images/scenes/default/head-money-blink.png',
    'assets/images/scenes/default/head-afraid.png',
    'assets/images/scenes/default/head-afraid-blink.png',
    'assets/images/scenes/default/head-afraid-speak.png',
    'assets/images/scenes/default/head-shy.png',
    'assets/images/scenes/default/head-shy-speak.png',
    'assets/images/scenes/default/head-shy-blink.png',
    'assets/images/scenes/default/money-popup.png',
    'assets/images/scenes/default/pet-fox-desktop.jpg',
    'assets/images/scenes/default/pet-fox-mobile.jpg'
]);

const PARK_SCENE_IMAGE_ASSETS = uniqueAssets([
    'assets/images/scenes/Park/bg-park.jpg',
    'assets/images/scenes/Park/bg-coffee.jpg',
    'assets/images/scenes/Park/Full_body.png',
    'assets/images/scenes/Park/eyes close.png',
    'assets/images/scenes/Park/mouth close.png',
    'assets/images/scenes/Park/eyebrows down.png'
]);

const BED_SCENE_IMAGE_ASSETS = uniqueAssets([
    'assets/images/scenes/bed/bed-bg.jpg',
    'assets/images/scenes/bed/bed-body.png',
    'assets/images/scenes/bed/bed-tail.png',
    'assets/images/scenes/bed/bed-head-no-speak.png',
    'assets/images/scenes/bed/bed-head-blink.png',
    'assets/images/scenes/bed/bed-head-speak.png',
    'assets/images/scenes/bed/bed-head-shock.png',
    'assets/images/scenes/bed/bed-head-blink-shock.png',
    'assets/images/scenes/bed/bed-head-no-speak-eyes-close.png',
    'assets/images/scenes/bed/bed-head-speak-eyes-close.png',
    'assets/images/scenes/bed/bed-head-no-speak-eyes-close-cry.png',
    'assets/images/scenes/bed/bed-head-speak-eyes-close-cry.png',
    'assets/images/scenes/bed/bed-head-no-speak-tears.png',
    'assets/images/scenes/bed/bed-head-speak-tears.png',
    'assets/images/scenes/bed/bed-head-blink-speak-tears.png',
    'assets/images/scenes/bed/bed-headphone.png',
    'assets/images/scenes/bed/bed-money-popup.png'
]);

const BED_N_SCENE_IMAGE_ASSETS = uniqueAssets([
    'assets/images/scenes/bed_N/bed_N-bg.jpg',
    'assets/images/scenes/bed_N/bed_N-body-naked.png',
    'assets/images/scenes/bed_N/bed_N-tail.png',
    'assets/images/scenes/bed_N/bed_N-head-blink-speak-tears.png',
    'assets/images/scenes/bed_N/bed_N-head-speak-eyes-close-cry.png',
    'assets/images/scenes/bed_N/bed_N-sleep.jpg',
    'assets/images/scenes/bed_N/bed_N-sleep_nolight.jpg'
]);

const FIGHT_SCENE_IMAGE_ASSETS = uniqueAssets([
    'assets/images/scenes/default/bg-main.jpg',
    'assets/images/scenes/fight/fight-fox-notail.png',
    'assets/images/scenes/fight/fight-fox-eyes-close-notail.png',
    'assets/images/scenes/fight/fight-fox-damage-notail.png',
    'assets/images/scenes/fight/fight-fox-damage-notail-break.png',
    'assets/images/scenes/fight/fight-fox-naked.png',
    'assets/images/scenes/fight/fight-tail.png',
    'assets/images/scenes/fight/fight-headphone.png'
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
    'assets/images/ui/fox-face.png'
]);

export const PRELOAD_IMAGE_ASSETS = uniqueAssets([
    ...BOOT_IMAGE_ASSETS,
    ...PARK_SCENE_IMAGE_ASSETS,
    ...BED_SCENE_IMAGE_ASSETS,
    ...BED_N_SCENE_IMAGE_ASSETS,
    ...FIGHT_SCENE_IMAGE_ASSETS
]);

