export const DEFAULT_CHOICE_SOURCE_INDICES = [0, 1, 2, 3];
export const FOLLOWUP_CHOICE_SOURCE_INDICES = [0, 2, 3];

export const FIGHT_CHOICE_LABELS = {
    tw: '戰鬥!',
    en: 'Fight!',
    jp: '戦う！'
};

export const FIGHT_TEXT = {
    tw: {
        intro: '什麼？你想跟我打架！',
        choiceTitle: '戰鬥選項',
        attackOption: '攻擊',
        jokeOption: '我...開玩笑的啦',
        afterHitLine1: '好痛...你竟然來真的！',
        afterHitLine2: '我要咬死你！'
    },
    en: {
        intro: 'What? You want to fight me?!',
        choiceTitle: 'Battle Options',
        attackOption: 'Attack',
        jokeOption: 'I... was just kidding',
        afterHitLine1: 'Ow... You actually meant it!',
        afterHitLine2: 'I am going to bite you to death!'
    },
    jp: {
        intro: 'えっ？ ボクとケンカする気！？',
        choiceTitle: '戦闘オプション',
        attackOption: '攻撃',
        jokeOption: 'じょ、冗談だよ',
        afterHitLine1: '痛っ... 本気でやったの！？',
        afterHitLine2: 'かみ殺してやる！'
    }
};

export const OPENING_TEXT = {
    tw: {
        greeting: '你好呀~ 我是提爾很高興認識你!',
        choiceIntro: '你好呀，可以自我介紹一下嗎?',
        choiceGoHome: '我可以跟你回家嗎?',
        introLines: [
            '我是提爾，是一隻赤狐',
            '你也可以叫我 "TERU" 或是 "狐泥"',
            '擅長的技能是製作音樂，除此之外我也是一名DJ哦!',
            '對我感興趣的話，可以點擊右邊的"狐狸頭"按鈕知道我更多資訊!'
        ]
    },
    en: {
        greeting: 'Hi~ I am Teru, nice to meet you!',
        choiceIntro: 'Hi, can you introduce yourself?',
        choiceGoHome: 'Can I go home with you?',
        introLines: [
            'I am Teru, a red fox.',
            'You can also call me "TERU" or "Huni".',
            'I am good at making music, and I am also a DJ!',
            'If you are interested in me, tap the fox-head button on the right for more info!'
        ]
    },
    jp: {
        greeting: 'こんにちは〜 テルだよ。会えてうれしい!',
        choiceIntro: 'こんにちは、自己紹介してくれる?',
        choiceGoHome: '君の家に行ってもいい?',
        introLines: [
            'ボクはテル、アカギツネだよ。',
            '「TERU」か「狐泥」って呼んでね。',
            '得意なのは音楽制作で、DJもやってるよ!',
            '興味があったら、右の「狐の頭」ボタンで詳しく見てね!'
        ]
    }
};

export const OPENING_HEADS = {
    idle: 'assets/images/scenes/default/head-no-speak-normal.png',
    blink: 'assets/images/scenes/default/head-blink-normal.png',
    speak: 'assets/images/scenes/default/head-speak.png'
};

export const AFRAID_HEADS = {
    idle: 'assets/images/scenes/default/head-afraid.png',
    blink: 'assets/images/scenes/default/head-afraid-blink.png',
    speak: 'assets/images/scenes/default/head-afraid-speak.png'
};

export const AFRAID_TARGET_LINES_TW = new Set([
    '你……你想做什麼？',
    '摸...摸夠了吧...你還想幹嘛?'
]);

export const AFRAID_TARGET_CHOICE_TITLE_TW = '你想做什麼？';

export const SHY_BED_TRANSITION_HEADS = {
    happy: 'assets/images/scenes/default/head-shy.png',
    speak: 'assets/images/scenes/default/head-shy-speak.png',
    blink: 'assets/images/scenes/default/head-shy-blink.png'
};

export const FIGHT_TAIL_PIVOT_SOURCE = { x: 1389.57, y: 1259.96 };
export const FIGHT_SCENE_OBJECT_POSITION = { x: 0.5, y: 0.58 };
export const FIGHT_SOURCE_FALLBACK_SIZE = { width: 2048, height: 2048 };

export const PET_FOX_DISPLAY_MS = 3000;
export const BED_ENTRY_TRANSITION = { fadeInMs: 700, holdMs: 200, fadeOutMs: 700 };
export const BED_TAIL_BURST_RESET_MS = 260;

export const BED_STOP_LINE_BY_LANG = {
    tw: '你還想幹嘛?',
    en: 'What else do you want?',
    jp: 'まだ何するつもり？'
};

export const HEAD_TOUCH_THRESHOLDS = {
    first: 3,
    second: 3,
    fatal: 5
};

export const HEAD_TOUCH_TEXT = {
    tw: {
        mild: '你幹麻啦',
        angry: '你很煩耶! 再弄我咬你喔!',
        fatal: '你被咬死了'
    },
    en: {
        mild: 'Hey, what are you doing?',
        angry: "You're really annoying! Keep messing with me and I'll bite you!",
        fatal: 'You were bitten to death.'
    },
    jp: {
        mild: 'ちょっと、何してるの？',
        angry: 'ほんとにうるさい！これ以上やったら噛むよ！',
        fatal: '噛み殺された。'
    }
};

export const HEAD_TOUCH_ASSETS = {
    normal: 'assets/images/scenes/default/head-touch.png',
    angry: 'assets/images/scenes/default/head-touch-angry.png',
    angryBlink: 'assets/images/scenes/default/head-touch-angry-blink.png',
    angryTouch: 'assets/images/scenes/default/head-touch-angry-touch.png'
};
