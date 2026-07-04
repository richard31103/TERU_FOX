export const CLASS_DEFS = {
    mage: {
        id: 'mage',
        name: '法師',
        emoji: '🧙',
        weaponType: 'wand',
        maxHp: 72,
        baseAtk: 22,
        description: '低血量，高攻擊。專屬武器：魔杖。'
    },
    warrior: {
        id: 'warrior',
        name: '戰士',
        emoji: '🛡️',
        weaponType: 'sword',
        maxHp: 128,
        baseAtk: 14,
        description: '高血量，低攻擊。專屬武器：劍。'
    },
    archer: {
        id: 'archer',
        name: '弓箭手',
        emoji: '🏹',
        weaponType: 'bow',
        maxHp: 84,
        baseAtk: 21,
        description: '低血量，高攻擊。專屬武器：弓。'
    },
    druid: {
        id: 'druid',
        name: '德魯伊',
        emoji: '🌿',
        weaponType: 'all',
        maxHp: 118,
        baseAtk: 15,
        description: '高血量，低攻擊。全武器適配，每回合微量回血。'
    }
};

export const WEAPON_TYPES = {
    sword: { id: 'sword', name: '劍', emoji: '🗡️' },
    bow: { id: 'bow', name: '弓', emoji: '🏹' },
    wand: { id: 'wand', name: '魔杖', emoji: '🪄' }
};

export const WEAPON_TYPE_LIST = Object.keys(WEAPON_TYPES);
export const WEAPON_VARIANT_COUNT = 16;

export const RARITY_DEFS = {
    common: {
        id: 'common',
        name: '普通',
        colorLabel: '灰',
        weight: 60,
        atkMul: 1.0,
        uiClass: 'tw-border-slate-500 tw-bg-slate-800/70 tw-text-slate-100'
    },
    advanced: {
        id: 'advanced',
        name: '高級',
        colorLabel: '綠',
        weight: 24,
        atkMul: 1.16,
        uiClass: 'tw-border-emerald-500 tw-bg-emerald-900/50 tw-text-emerald-100'
    },
    rare: {
        id: 'rare',
        name: '稀有',
        colorLabel: '藍',
        weight: 10,
        atkMul: 1.32,
        uiClass: 'tw-border-sky-500 tw-bg-sky-900/50 tw-text-sky-100'
    },
    epic: {
        id: 'epic',
        name: '史詩',
        colorLabel: '紫',
        weight: 5,
        atkMul: 1.55,
        uiClass: 'tw-border-violet-500 tw-bg-violet-900/50 tw-text-violet-100'
    },
    legendary: {
        id: 'legendary',
        name: '傳說',
        colorLabel: '金',
        weight: 1,
        atkMul: 1.9,
        uiClass: 'tw-border-amber-400 tw-bg-amber-950/60 tw-text-amber-100'
    }
};

export const RARITY_ORDER = ['common', 'advanced', 'rare', 'epic', 'legendary'];

export const OPENING_GACHA_MAX_RARITY_ID = 'rare';

export const BASE_ENEMY_PREVIEW = {
    name: '訓練傀儡',
    level: 1,
    maxHp: 96,
    attack: 13,
    intent: '準備攻擊'
};
