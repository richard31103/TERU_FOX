import { withAssetVersion } from './asset_versioning.js';

function v(assetPath) {
    return withAssetVersion(assetPath);
}

function freezeObj(obj) {
    return Object.freeze(obj);
}

const DEFAULT_SCENE_EXPRESSIONS = freezeObj({
    bg: v('assets/images/scenes/default/bg-main.jpg'),
    body: v('assets/images/scenes/default/body-main.png'),
    tail: v('assets/images/scenes/default/tail-main.png'),
    idle: v('assets/images/scenes/default/head-no-speak.png'),
    blink: v('assets/images/scenes/default/head-blink.png'),
    speak: v('assets/images/scenes/default/head-speak.png'),
    angry: v('assets/images/scenes/default/head-angry.png'),
    happy: v('assets/images/scenes/default/head-happy.png'),
    happyTalk: v('assets/images/scenes/default/head-happy-talk.png'),
    idleNormal: v('assets/images/scenes/default/head-no-speak-normal.png'),
    blinkNormal: v('assets/images/scenes/default/head-blink-normal.png'),
    touchNormal: v('assets/images/scenes/default/head-touch.png'),
    touchAngry: v('assets/images/scenes/default/head-touch-angry.png'),
    touchAngryBlink: v('assets/images/scenes/default/head-touch-angry-blink.png'),
    touchAngryTouch: v('assets/images/scenes/default/head-touch-angry-touch.png'),
    headphone: v('assets/images/scenes/default/headphone.png'),
    moneyHead: v('assets/images/scenes/default/head-money.png'),
    moneyBlink: v('assets/images/scenes/default/head-money-blink.png'),
    afraidIdle: v('assets/images/scenes/default/head-afraid.png'),
    afraidBlink: v('assets/images/scenes/default/head-afraid-blink.png'),
    afraidSpeak: v('assets/images/scenes/default/head-afraid-speak.png'),
    shyHappy: v('assets/images/scenes/default/head-shy.png'),
    shySpeak: v('assets/images/scenes/default/head-shy-speak.png'),
    shyBlink: v('assets/images/scenes/default/head-shy-blink.png'),
    moneyPopup: v('assets/images/scenes/default/money-popup.png'),
    petDesktop: v('assets/images/scenes/default/pet-fox-desktop.jpg'),
    petMobile: v('assets/images/scenes/default/pet-fox-mobile.jpg')
});

const PARK_SCENE_EXPRESSIONS = freezeObj({
    bgPark: v('assets/images/scenes/Park/bg-park.jpg'),
    bgCoffee: v('assets/images/scenes/Park/bg-coffee.jpg'),
    bgRecordStore: v('assets/images/scenes/Park/bg-record_store.jpg'),
    fullBody: v('assets/images/scenes/Park/Full_body.png'),
    eyesClosed: v('assets/images/scenes/Park/eyes close.png'),
    mouthClosed: v('assets/images/scenes/Park/mouth close.png'),
    eyebrowsDown: v('assets/images/scenes/Park/eyebrows down.png')
});

const BED_SCENE_EXPRESSIONS = freezeObj({
    bg: v('assets/images/scenes/bed/bed-bg.jpg'),
    body: v('assets/images/scenes/bed/bed-body.png'),
    tail: v('assets/images/scenes/bed/bed-tail.png'),
    idle: v('assets/images/scenes/bed/bed-head-no-speak.png'),
    blink: v('assets/images/scenes/bed/bed-head-blink.png'),
    speak: v('assets/images/scenes/bed/bed-head-speak.png'),
    moneyHead: v('assets/images/scenes/bed/bed-head-shock.png'),
    moneyBlink: v('assets/images/scenes/bed/bed-head-blink-shock.png'),
    idleClosed: v('assets/images/scenes/bed/bed-head-no-speak-eyes-close.png'),
    speakClosed: v('assets/images/scenes/bed/bed-head-speak-eyes-close.png'),
    idleClosedCry: v('assets/images/scenes/bed/bed-head-no-speak-eyes-close-cry.png'),
    speakClosedCry: v('assets/images/scenes/bed/bed-head-speak-eyes-close-cry.png'),
    idleTears: v('assets/images/scenes/bed/bed-head-no-speak-tears.png'),
    speakTears: v('assets/images/scenes/bed/bed-head-speak-tears.png'),
    blinkSpeakTears: v('assets/images/scenes/bed/bed-head-blink-speak-tears.png'),
    headphone: v('assets/images/scenes/bed/bed-headphone.png'),
    moneyPopup: v('assets/images/scenes/bed/bed-money-popup.png')
});

const BED_N_SCENE_EXPRESSIONS = freezeObj({
    bg: v('assets/images/scenes/bed_N/bed_N-bg.jpg'),
    body: v('assets/images/scenes/bed_N/bed_N-body-naked.png'),
    tail: v('assets/images/scenes/bed_N/bed_N-tail.png'),
    idle: v('assets/images/scenes/bed_N/bed_N-head-blink-speak-tears.png'),
    blink: v('assets/images/scenes/bed_N/bed_N-head-blink-speak-tears.png'),
    speak: v('assets/images/scenes/bed_N/bed_N-head-speak-eyes-close-cry.png'),
    sleep: v('assets/images/scenes/bed_N/bed_N-sleep.jpg'),
    sleepNoLight: v('assets/images/scenes/bed_N/bed_N-sleep_nolight.jpg')
});

const FIGHT_SCENE_EXPRESSIONS = freezeObj({
    bg: v('assets/images/scenes/default/bg-main.jpg'),
    body: v('assets/images/scenes/fight/fight-fox-notail.png'),
    tail: v('assets/images/scenes/fight/fight-tail.png'),
    idle: v('assets/images/scenes/fight/fight-fox-notail.png'),
    blink: v('assets/images/scenes/fight/fight-fox-eyes-close-notail.png'),
    speak: v('assets/images/scenes/fight/fight-fox-notail.png'),
    angry: v('assets/images/scenes/fight/fight-fox-damage-notail.png'),
    happy: v('assets/images/scenes/fight/fight-fox-notail.png'),
    happyTalk: v('assets/images/scenes/fight/fight-fox-notail.png'),
    damageBreak: v('assets/images/scenes/fight/fight-fox-damage-notail-break.png'),
    postHit: v('assets/images/scenes/fight/fight-fox-naked.png'),
    headphone: v('assets/images/scenes/fight/fight-headphone.png')
});

export const SCENE_EXPRESSION_LIBRARY = freezeObj({
    default: DEFAULT_SCENE_EXPRESSIONS,
    park: PARK_SCENE_EXPRESSIONS,
    bed: BED_SCENE_EXPRESSIONS,
    bed_n: BED_N_SCENE_EXPRESSIONS,
    fight: FIGHT_SCENE_EXPRESSIONS,
    ui: freezeObj({
        foxFace: v('assets/images/ui/fox-face.png')
    })
});

export const DIALOGUE_EXPRESSION_LIBRARY = freezeObj({
    opening: freezeObj({
        idle: DEFAULT_SCENE_EXPRESSIONS.idleNormal,
        blink: DEFAULT_SCENE_EXPRESSIONS.blinkNormal,
        speak: DEFAULT_SCENE_EXPRESSIONS.speak
    }),
    afraid: freezeObj({
        idle: DEFAULT_SCENE_EXPRESSIONS.afraidIdle,
        blink: DEFAULT_SCENE_EXPRESSIONS.afraidBlink,
        speak: DEFAULT_SCENE_EXPRESSIONS.afraidSpeak
    }),
    shyBedTransition: freezeObj({
        happy: DEFAULT_SCENE_EXPRESSIONS.shyHappy,
        speak: DEFAULT_SCENE_EXPRESSIONS.shySpeak,
        blink: DEFAULT_SCENE_EXPRESSIONS.shyBlink
    }),
    headTouch: freezeObj({
        normal: DEFAULT_SCENE_EXPRESSIONS.touchNormal,
        angry: DEFAULT_SCENE_EXPRESSIONS.touchAngry,
        angryBlink: DEFAULT_SCENE_EXPRESSIONS.touchAngryBlink,
        angryTouch: DEFAULT_SCENE_EXPRESSIONS.touchAngryTouch
    })
});

export function getSceneExpression(sceneId, expressionId, fallback = '') {
    const scene = SCENE_EXPRESSION_LIBRARY?.[sceneId];
    if (!scene || typeof scene !== 'object') return fallback;
    const value = scene[expressionId];
    return typeof value === 'string' ? value : fallback;
}

export function getDialogueExpressionSet(setId) {
    const set = DIALOGUE_EXPRESSION_LIBRARY?.[setId];
    if (!set || typeof set !== 'object') return null;
    return { ...set };
}
