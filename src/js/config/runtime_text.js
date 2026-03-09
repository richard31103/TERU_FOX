import { DIALOGUE_EXPRESSION_LIBRARY } from './expression_library.js';

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
        afterHitLine1: 'Ow... you were actually serious?!',
        afterHitLine2: 'I will bite you to death!'
    },
    jp: {
        intro: 'えっ？ ボクとケンカするの！？',
        choiceTitle: '戦闘オプション',
        attackOption: '攻撃',
        jokeOption: 'わ、冗談だって',
        afterHitLine1: '痛っ... 本気で来たの！？',
        afterHitLine2: '噛み殺してやる！'
    }
};

export const FIGHT_TEXT_AFTER_OOXX = {
    tw: {
        intro: '怎麼說打就打，你當我是寶可夢嗎?',
        choiceTitle: '戰鬥選項',
        attackOption: '瘋狂亂抓',
        jokeOption: '放棄戰鬥',
        afterHitLine1: '厄阿阿阿',
        afterHitLine2: '你死定了...'
    },
    en: {
        intro: 'Why are we fighting all of a sudden? Do you think I am a Pokemon?',
        choiceTitle: 'Battle Options',
        attackOption: 'Fury Swipes',
        jokeOption: 'Give Up',
        afterHitLine1: 'Aghhh!',
        afterHitLine2: 'You are dead...'
    },
    jp: {
        intro: 'いきなりバトルって、ボクをポケモンだと思ってるの？',
        choiceTitle: '戦闘オプション',
        attackOption: 'みだれひっかき',
        jokeOption: '戦闘をやめる',
        afterHitLine1: 'うああああ',
        afterHitLine2: 'お前、もう終わりだ...'
    }
};

export const FIGHT_JOKE_RETURN_LINE = {
    tw: '那你到底想要幹麻?',
    en: 'So what do you actually want to do?',
    jp: 'で、結局何したいの？'
};

export const OPENING_TEXT = {
    tw: {
        greeting: '你好呀，我是提爾，很高興認識你!',
        choiceIntro: '你好呀，可以自我介紹一下嗎?',
        choiceSkipIntro: '不用介紹了',
        nameQuestionTitle: '你叫什麼名字?',
        choiceEnterName: '點擊選項輸入名字',
        choiceNoName: '不想告訴你',
        namePrompt: '請輸入你的名字（最多10個字）',
        nameTooLongAlert: '名字不能超過{max}個字，請重新輸入。',
        nameConfirmLine: '你好阿{name}',
        nameDeclineReplyLine: '好吧...那就不叫你名字',
        choiceGoHome: '我可以跟你回家嗎?',
        choiceGoHomeAfterIntro: '我可以跟你回家嗎?',
        choiceRecordStore: '要一起去逛唱片行嗎?',
        choiceCoffee: '我想要去喝咖啡',
        choiceJustChat: '什麼也不幹，就在這聊天',
        moveToLawnLine: '我腿有點酸了，去草坪坐一下吧',
        weatherChoiceLine: '天氣真好，{{player_name}}想做什麼呢?',
        goHomeTransitionLine: '好呀，我們去草坪上面聊吧',
        recordStoreReply: '好呀',
        coffeeIntroLines: [
            '我其實不常喝咖啡呢...',
            '咖啡好苦喝了又睡不著覺',
            '但是上次喝了賴瑞叔叔泡的咖啡讓我稍微有改觀'
        ],
        coffeeChoiceTitle: '{{player_name}}要點什麼給提爾喝?',
        coffeeChoiceLatte: '拿鐵',
        coffeeChoiceAmericano: '美式',
        coffeeChoiceChocoShakeNoCream: '巧克力冰沙(不加奶油)',
        coffeeChoiceSleepyTea: '昏睡紅茶',
        coffeeResponseLatte: '拿鐵嗎...我想要加三包糖，真的不懂咖啡在喝什麼耶',
        coffeeResponseAmericano: '美式...嗚嗚，(硬喝一口)，好難喝...',
        coffeeResponseChocoShakeNoCream: '哇! {{player_name}}怎麼知道我喜歡這個!',
        coffeeResponseSleepyTea: '突然...好睏...',
        introLines: [
            '我是提爾狐',
            '你也可以叫我 "TERU FOX"',
            '我是一名音樂製作人，除此之外也是DJ哦!',
            '感興趣的話，可以點擊右邊的"狐狸按鈕"，了解更多資訊!'
        ]
    },
    en: {
        greeting: 'Hey~ I am TERU, nice to meet you!',
        choiceIntro: 'Hey, can you introduce yourself?',
        choiceSkipIntro: 'No need to introduce yourself.',
        nameQuestionTitle: 'What is your name?',
        choiceEnterName: 'Tap to enter your name',
        choiceNoName: 'I do not want to tell you',
        namePrompt: 'Please enter your name (max 10 characters).',
        nameTooLongAlert: 'Name cannot be longer than {max} characters. Please try again.',
        nameConfirmLine: 'Hi {name}',
        nameDeclineReplyLine: 'Alright... I will not call your name.',
        choiceGoHome: 'Can I go home with you?',
        choiceGoHomeAfterIntro: 'Can I go home with you?',
        choiceRecordStore: 'Want to browse a record store together?',
        choiceCoffee: 'I want to grab coffee.',
        choiceJustChat: 'Let us just chat here.',
        moveToLawnLine: 'My legs are a bit tired. Let us sit on the lawn.',
        weatherChoiceLine: 'Nice weather. What do you want to do?',
        goHomeTransitionLine: 'Sure, let us chat on the lawn first.',
        recordStoreReply: 'Sure.',
        coffeeIntroLines: [
            'I actually do not drink coffee that often...',
            'Coffee is bitter, and it keeps me awake.',
            "But Uncle Larry's coffee last time changed my mind a little."
        ],
        coffeeChoiceTitle: 'What do you want to order for TERU?',
        coffeeChoiceLatte: 'Latte',
        coffeeChoiceAmericano: 'Americano',
        coffeeChoiceChocoShakeNoCream: 'Chocolate Shake (No Cream)',
        coffeeChoiceSleepyTea: 'Sleepy Black Tea',
        coffeeResponseLatte: 'Latte... I want three sugar packets. I really do not get coffee.',
        coffeeResponseAmericano: 'Americano... ugh... (forces one sip) it tastes awful...',
        coffeeResponseChocoShakeNoCream: 'Wow! How did you know I like this!',
        coffeeResponseSleepyTea: 'Suddenly... so sleepy...',
        introLines: [
            'I am TERU.',
            'You can also call me "TERU FOX".',
            'I am a music producer, and I am also a DJ!',
            'If you are interested, tap the fox button on the right to learn more!'
        ]
    },
    jp: {
        greeting: 'やあ〜 ボクはテール、会えてうれしい！',
        choiceIntro: 'やあ、自己紹介してくれる？',
        choiceSkipIntro: '自己紹介はいらないよ。',
        nameQuestionTitle: 'キミの名前は？',
        choiceEnterName: '名前を入力する',
        choiceNoName: '教えたくない',
        namePrompt: '名前を入力してね（10文字以内）。',
        nameTooLongAlert: '名前は{max}文字以内で入力してね。',
        nameConfirmLine: 'こんにちは{name}',
        nameDeclineReplyLine: 'そっか... じゃあ名前では呼ばないね。',
        choiceGoHome: 'キミの家に行ってもいい？',
        choiceGoHomeAfterIntro: 'キミの家に行ってもいい？',
        choiceRecordStore: '一緒にレコード屋さんを見に行く？',
        choiceCoffee: 'コーヒーを飲みに行きたい。',
        choiceJustChat: '何もしないで、ここで話そう。',
        moveToLawnLine: 'ちょっと足が疲れたから、芝生で座って話そう。',
        weatherChoiceLine: 'いい天気だね。何したい？',
        goHomeTransitionLine: 'いいよ。まずは芝生で話そうか。',
        recordStoreReply: 'いいよ。',
        coffeeIntroLines: [
            '実は、コーヒーはあまり飲まないんだ...',
            'コーヒーって苦いし、飲むと眠れなくなるし。',
            'でもこの前ラリーさんのコーヒーを飲んで、ちょっと印象が変わった。'
        ],
        coffeeChoiceTitle: 'テールに何を頼んであげる？',
        coffeeChoiceLatte: 'ラテ',
        coffeeChoiceAmericano: 'アメリカーノ',
        coffeeChoiceChocoShakeNoCream: 'チョコシェイク（ホイップなし）',
        coffeeChoiceSleepyTea: '昏睡紅茶',
        coffeeResponseLatte: 'ラテか... 砂糖3袋入れたい。コーヒーの良さ、ほんと分からないや。',
        coffeeResponseAmericano: 'アメリカーノ... うぅ、（無理して一口）まずい...',
        coffeeResponseChocoShakeNoCream: 'わあ！ どうして私がこれ好きって分かったの！？',
        coffeeResponseSleepyTea: '急に... 眠い...',
        introLines: [
            'ボクはテール。',
            '「TERU FOX」って呼んでね。',
            '音楽制作をしていて、DJもやってるよ！',
            '興味があったら、右のキツネボタンを押して詳しく見てね！'
        ]
    }
};

export const OPENING_HEADS = { ...DIALOGUE_EXPRESSION_LIBRARY.opening };

export const AFRAID_HEADS = { ...DIALOGUE_EXPRESSION_LIBRARY.afraid };

export const AFRAID_TARGET_LINES_TW = new Set([
    '你……你想做什麼？',
    '摸...摸夠了吧...你還想幹嘛?'
]);

export const AFRAID_TARGET_CHOICE_TITLE_TW = '你想做什麼？';

export const SHY_BED_TRANSITION_HEADS = { ...DIALOGUE_EXPRESSION_LIBRARY.shyBedTransition };

export const FIGHT_TAIL_PIVOT_SOURCE = { x: 1389.57, y: 1259.96 };
export const FIGHT_SCENE_OBJECT_POSITION = { x: 0.5, y: 0.58 };
export const FIGHT_SOURCE_FALLBACK_SIZE = { width: 2048, height: 2048 };

export const PET_FOX_DISPLAY_MS = 3000;
export const BED_ENTRY_TRANSITION = { fadeInMs: 700, holdMs: 200, fadeOutMs: 700 };
export const BED_TAIL_BURST_RESET_MS = 260;

export const BED_STOP_LINE_BY_LANG = {
    tw: '你還想幹嘛?',
    en: 'What else do you want to do?',
    jp: 'で、まだ何したいの？'
};

export const BED_CRY_LOOP_LINES = {
    tw: [
        '我受不了拉...',
        '嗚嗚嗚喔...',
        '咿咿咿阿...',
        '嗚欸欸欸...',
        '姆喔喔喔...',
        '嗚嗚嗚嗚...'
    ],
    en: [
        "I can't take it anymore...",
        'Uuuh... uuoh...',
        'Iiih... aaah...',
        'Uweh... eeh...',
        'Mmm... ooh...',
        'Uuuu...'
    ],
    jp: [
        'もう無理...',
        'うぅぅぅお...',
        'いぃぃぃあ...',
        'うぇぇぇぇ...',
        'むおぉぉぉ...',
        'うぅぅぅ...'
    ]
};

export const BED_EXTRA_MONEY_OPTION_TEXT = {
    tw: '再拿出500$',
    en: 'Pull Out Another $500',
    jp: 'さらに500$を出す'
};

export const BED_EXTRA_MONEY_LINE = {
    tw: '我想買DJ器材...',
    en: 'I want to buy DJ gear...',
    jp: 'DJ機材を買いたいんだ...'
};

export const BED_N_DIALOGUE_LINES = {
    tw: [
        '謝謝乾爹...',
        '提爾會努力練習DJ的...',
        '好冷喔...',
        '冷氣可以關小一點嗎?',
        '全裸好害羞...(雖然我本來就不穿褲子)',
        '可以不要繼續盯著我了嗎...',
        '為什麼你這麼堅持「摸尾巴」?',
        '太有耐心了吧...',
        '嗚嗚...',
        '形象都要沒了...',
        '我要睡覺了，不准碰我!!'
    ],
    en: [
        'Thanks, sugar daddy...',
        'TERU will work hard on DJ practice...',
        'It is so cold...',
        'Could you turn the AC down a bit?',
        'Being totally naked is so embarrassing... (Though I do not wear pants anyway.)',
        'Could you stop staring at me like that...?',
        'How did you even know to tap "Touch Tail" that many times?',
        'You are way too patient...',
        'Meow meow...',
        'My image is basically gone...',
        'I am going to sleep now, do not touch me!!'
    ],
    jp: [
        'パパ、ありがとう...',
        'テール、DJの練習を頑張るね...',
        '寒いよ...',
        'エアコン、もう少し弱くしてくれる？',
        '全裸って恥ずかしい...(まあ、もともとズボンは履いてないけど)',
        'そんなに見つめ続けないでくれる...？',
        'なんでそんなに尻尾にこだわってるの？',
        '執着がすごいよ...',
        'にゃーにゃー...',
        'イメージが壊れちゃう...',
        'もう寝るから、触るな！！'
    ]
};

export const BED_N_SLEEP_BRANCH_TEXT = {
    tw: {
        postSleepLine: '床是我的，{{player_name}}去睡沙發!',
        choiceTitle: '你要怎麼做？',
        optionUnderBlanket: '鑽進棉被裡',
        optionSleepSofa: '乖乖去睡沙發',
        goodNightLine: '晚安',
        deathText: '{{player_name}}被咬死了'
    },
    en: {
        postSleepLine: 'The bed is mine. Go sleep on the couch!',
        choiceTitle: 'What will you do?',
        optionUnderBlanket: 'Slip under the blanket',
        optionSleepSofa: 'Go sleep on the couch',
        goodNightLine: 'Good night.',
        deathText: 'You were bitten to death.'
    },
    jp: {
        postSleepLine: 'ベッドはボクの。キミはソファで寝て！',
        choiceTitle: 'どうする？',
        optionUnderBlanket: '布団に潜り込む',
        optionSleepSofa: 'おとなしくソファで寝る',
        goodNightLine: 'おやすみ。',
        deathText: '噛み殺された。'
    }
};

export const BED_N_TRANSITION = { fadeInMs: 600, holdMs: 3000, fadeOutMs: 600 };

export const HEAD_TOUCH_THRESHOLDS = {
    first: 3,
    second: 3,
    fatal: 5
};

export const HEAD_TOUCH_TEXT = {
    tw: {
        mild: '你幹麻啦',
        angry: '你很煩耶! 再弄我咬你喔!',
        fatal: '{{player_name}}被咬死了'
    },
    en: {
        mild: 'Hey, what are you doing?',
        angry: "You're really annoying! Keep messing with me and I'll bite you!",
        fatal: 'You were bitten to death.'
    },
    jp: {
        mild: 'ちょっと、何してるの？',
        angry: 'ほんとしつこい！これ以上やったら噛むよ！',
        fatal: '噛み殺された。'
    }
};

export const HEAD_TOUCH_ASSETS = { ...DIALOGUE_EXPRESSION_LIBRARY.headTouch };
