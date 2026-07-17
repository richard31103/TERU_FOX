import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HealthBar } from './components/HealthBar.jsx';
import {
    BASE_ENEMY_PREVIEW,
    CLASS_DEFS,
    RARITY_DEFS,
    WEAPON_TYPES,
    WEAPON_VARIANT_COUNT
} from './data/gameData.js';
import { buildWeaponForClass, getWeaponPenaltyRate } from './logic/gacha.js';
import {
    ELEMENT_DEFS,
    activeStatusEntries,
    createEmptyStatus,
    getElementMatchup,
    normalizeStatus,
    pickRandomElementId,
    resolvePoisonTick,
    resolveElementalOnHit
} from './logic/elemental.js';
import {
    LEVELUP_REROLL_COST,
    LEVELUP_CARD_IDS,
    drawLevelUpCandidates,
    getLevelUpCardById
} from './data/levelup_cards.js';
import { ENABLE_TOWER_SHOP_TEST_TOOLS } from './config/dev_flags.js';
import {
    buildMagicShopDisplayItems,
    buildMysteryShopDisplayItems,
    buildNormalShopDisplayItems,
    getShopModalMeta,
    getSkillItemMeta
} from './data/shop_assets.js';
import { resolveTowerSceneBackground } from './data/tower_scene_assets.js';

const PLAYER_AVATAR_SRC = 'assets/images/minigames/tower/Game_TERU.png';
const BATTLE_ARENA_SRC = 'assets/images/minigames/tower/Battle_Arena.jpg';
const NORMAL_ENEMY_DIR = '/assets/images/minigames/tower/enemies/normal';
const BOSS_ENEMY_DIR = '/assets/images/minigames/tower/enemies/boss';
const NORMAL_ENEMY_COUNT = 15;
const SPECIAL_NORMAL_ASSET_KEY = 'normal_16_S';
const SPECIAL_NORMAL_WEIGHT = 1;
const SPECIAL_NORMAL_REWARD_MULTIPLIER = 5;
const BOSS_ENEMY_COUNT = 10;
const GACHA_DRAW_LIMIT = 5;
const DAMAGE_FLOAT_DURATION_MS = 900;
const ATTACK_SCRATCH_SRC = 'assets/images/minigames/tower/attack/scratch_01.png';
const ATTACK_MUZZLE_FRAME_SRCS = Object.freeze([
    'assets/images/minigames/tower/attack/muzzle_01_rotated.png',
    'assets/images/minigames/tower/attack/muzzle_02_rotated.png',
    'assets/images/minigames/tower/attack/muzzle_03_rotated.png',
    'assets/images/minigames/tower/attack/muzzle_04_rotated.png',
    'assets/images/minigames/tower/attack/muzzle_05_rotated.png'
]);
const ATTACK_SCORCH_FRAME_SRCS = Object.freeze([
    'assets/images/minigames/tower/attack/scorch_01.png',
    'assets/images/minigames/tower/attack/scorch_02.png',
    'assets/images/minigames/tower/attack/scorch_03.png'
]);
const ATTACK_TWIRL_FRAME_SRCS = Object.freeze([
    'assets/images/minigames/tower/attack/twirl_01.png',
    'assets/images/minigames/tower/attack/twirl_02.png',
    'assets/images/minigames/tower/attack/twirl_03.png'
]);
const ELEMENT_ATTACK_FRAME_MS = Object.freeze({
    projectile: 68,
    impact: 86
});
const SLOT_MACHINE_SRC = 'slot_machine.png';
const SLOT_SYMBOL_IMAGE_SRC = Object.freeze({
    water: 'assets/images/minigames/tower/slot_symbols/Water.png',
    fire: 'assets/images/minigames/tower/slot_symbols/fire.png',
    plant: 'assets/images/minigames/tower/slot_symbols/Grass.png',
    coin: 'assets/images/minigames/tower/slot_symbols/money.png'
});
const SCRATCH_FX_DURATION_MS = 320;
const SCRATCH_FX_COOLDOWN_MS = 110;
const ENCOUNTER_ENEMY_KNOCKOUT_DURATION_MS = 320;
const ENCOUNTER_ENEMY_ENTRY_DURATION_MS = 360;
const ENEMY_TURN_DELAY_MS = 320;
const MYSTERY_SHOP_TRIGGER_RATE = 0.08;
const NORMAL_SHOP_REFRESH_COST = 60;
const SHOP_VIP_ITEM_DISCOUNT_PCT = 0.2;
const SHOP_CARD_DISCOUNT_MAX_PCT = 0.5;
const SHOP_TOTAL_DISCOUNT_MAX_PCT = 0.5;
const VICTORY_GOLD_BASE_NORMAL = 22;
const VICTORY_GOLD_BASE_BOSS = 56;
const VICTORY_GOLD_PER_FLOOR = 2.7;
const SCRATCH_DAMAGE_SOURCES = new Set(['attack', 'execute', 'counter', 'companion']);
const ENEMY_SCRATCH_BLOCKED_DAMAGE_SOURCES = new Set(['attack', 'execute']);
const ENEMY_HP_LINEAR_PER_FLOOR = 6;
const ENEMY_ATK_LINEAR_PER_FLOOR = 1;
const ENEMY_HP_EXP_GROWTH = 1.038;
const ENEMY_ATK_EXP_GROWTH = 1.0195;
const ENEMY_BOSS_HP_MUL = 2.9;
const ENEMY_BOSS_ATK_MUL = 1.22;

const ENEMY_FALLBACK_SRC = {
    normal: `${NORMAL_ENEMY_DIR}/normal_01.png`,
    boss: `${BOSS_ENEMY_DIR}/boss_01.png`
};
const ENEMY_FALLBACK_LABEL = { normal: '敵', boss: '王' };
const RARITY_GLOW_COLORS = {
    common: 'rgba(148,163,184,0.45)',
    advanced: 'rgba(16,185,129,0.58)',
    rare: 'rgba(14,165,233,0.62)',
    epic: 'rgba(139,92,246,0.66)',
    legendary: 'rgba(251,191,36,0.72)'
};
const RARITY_NAME_COLOR_CLASSES = {
    common: 'tw-text-slate-100',
    advanced: 'tw-text-emerald-300',
    rare: 'tw-text-sky-300',
    epic: 'tw-text-violet-300',
    legendary: 'tw-text-amber-300'
};
const ELEMENT_GLOW_COLORS = {
    water: 'rgba(34, 211, 238, 0.6)',
    fire: 'rgba(251, 113, 133, 0.62)',
    plant: 'rgba(52, 211, 153, 0.6)'
};
const ENEMY_INTENT_TEXT = {
    attack: '準備攻擊',
    heavy: '蓄力重擊',
    guard: '準備防禦'
};
const MATCHUP_TEXT = {
    advantage: '屬性剋制',
    disadvantage: '屬性被剋',
    neutral: '屬性中性'
};
const LEVELUP_CANDIDATE_COUNT = 3;
const BASE_CRIT_MULTIPLIER = 1.55;
const MAX_DAMAGE_REDUCTION = 0.9;
const POTION_SLOT_COUNT = 2;
const BASE_PLAYER_CRIT_RATE = 0.16;
const BASE_CHARM_THRESHOLD_PCT = 0.1;
const ENRAGE_INCOMING_TURNS = 1;
const PHANTOM_TURNS = 3;
const PHANTOM_EVADE_RATE = 0.2;
const PHANTOM_INCOMING_BONUS = 0.2;
const TIME_STOP_WINDOW_MS = 2000;
const ENEMY_POISON_RATE = 0.05;
const ITEM_IV_DRIP_INTERVAL_MS = 10000;
const ITEM_IV_DRIP_HEAL_RATE = 0.01;
const SKILL_AMP_DEFAULT = 0;
const MAX_BATTLE_NOTICE_HISTORY = 5;
const SLOT_SPIN_TICK_MS = 120;
const SLOT_AUTO_STOP_INTERVAL_MS = 1000;
const SLOT_REWARD_POINT_TARGET = 10;
const SLOT_COMBO_DAMAGE_STEP = 5;
const SLOT_COIN_REWARD_PER_FLOOR = 0.4;
const SLOT_MATCHED_DAMAGE_MULTIPLIER = 1.5;
const SLOT_WEAPON_HIT_DAMAGE_MULTIPLIERS = Object.freeze([1, 1.4, 2.2]);
const SLOT_MACHINE_BASE_WIDTH = 500;
const SLOT_MACHINE_BASE_HEIGHT = 234;
const SLOT_REEL_CENTERS = Object.freeze([
    Object.freeze({ id: 'A', x: 104.5, y: 124 }),
    Object.freeze({ id: 'B', x: 250.5, y: 124 }),
    Object.freeze({ id: 'C', x: 395.5, y: 124 })
]);
const SLOT_SYMBOL_IDS = Object.freeze(['water', 'fire', 'plant']);
const SLOT_STATUS_CLEANSE_STATUS_MAP = Object.freeze({
    water: 'burn',
    fire: 'freeze',
    plant: 'poison'
});
const SLOT_STATUS_CLEANSE_LABELS = Object.freeze({
    water: '燃燒',
    fire: '冰凍',
    plant: '中毒'
});
const SLOT_RESULT_TEXT = Object.freeze({
    jackpot: '大獎攻擊',
    normal: '普通攻擊',
    scratch: '刮痧攻擊',
    heal: '治癒之泉',
    miss: '空包彈 / Miss'
});

function resolveElementAttackFxPreset(elementId) {
    if (elementId === 'fire') {
        return { elementId: 'fire', mode: 'projectile', frameSrcList: ATTACK_MUZZLE_FRAME_SRCS };
    }
    if (elementId === 'water') {
        return { elementId: 'water', mode: 'impact', frameSrcList: ATTACK_SCORCH_FRAME_SRCS };
    }
    if (elementId === 'plant') {
        return { elementId: 'plant', mode: 'impact', frameSrcList: ATTACK_TWIRL_FRAME_SRCS };
    }
    return null;
}

function formatSignedValue(value) {
    const n = Math.round(Number(value) || 0);
    return n >= 0 ? `+${n}` : `${n}`;
}

function createDefaultInventoryState() {
    return {
        armorSlot: null,
        potionSlots: Array.from({ length: POTION_SLOT_COUNT }, () => null),
        itemSlot: null,
        ownedSkills: {}
    };
}

function createDefaultRuntimeEffects() {
    return {
        attackBuffMultiplier: 1,
        attackBuffTurns: 0,
        enrageIncomingTurns: 0,
        phantomTurns: 0,
        enemyPoisonPct: 0,
        mysteryShopLocked: false,
        timeStopUntil: 0,
        timeStopEnemyKey: '',
        companion: null,
        unknownAttackPct: 0,
        unknownDefensePct: 0,
        unknownOutgoingMul: 1,
        unknownIncomingMul: 1,
        nextJackpotBonusMul: 1
    };
}

function clampRate(value, min = 0, max = 1) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.max(min, Math.min(max, parsed));
}

function randomRange(min, max) {
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin;
    return safeMin + (Math.random() * (safeMax - safeMin));
}

function sumSkillCount(ownedSkills = {}) {
    return Object.values(ownedSkills).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

function calcItemPassiveModifiers(itemSlot) {
    const base = {
        attackPct: 0,
        skillAmpPct: SKILL_AMP_DEFAULT,
        critDamageBonusPct: 0,
        luckPct: 0
    };
    if (!itemSlot) return base;
    if (itemSlot.itemType === 'ring') {
        base.attackPct += clampRate(itemSlot.attackBonusPct, -0.9, 9);
        return base;
    }
    if (itemSlot.itemType === 'amulet') {
        base.skillAmpPct += clampRate(itemSlot.skillAmpPct, -0.9, 9);
        return base;
    }
    if (itemSlot.itemType === 'bracelet') {
        base.critDamageBonusPct += clampRate(itemSlot.critDamageBonusPct, -0.9, 9);
        return base;
    }
    if (itemSlot.itemType === 'earring') {
        base.luckPct += clampRate(itemSlot.luckPct, -0.9, 9);
        return base;
    }
    return base;
}

function createDefaultBuildState() {
    return {
        attackBonus: 0,
        maxHpBonus: 0,
        damageReductionPct: 0,
        forcedElementId: null,
        critDamageBonusPct: 0,
        outgoingMultiplier: 1,
        incomingMultiplier: 1,
        selfDamageOnAttackPct: 0,
        cardCounts: {}
    };
}

function createDefaultLevelUpState() {
    return {
        isOpen: false,
        trigger: '',
        candidates: [],
        pendingEncounter: null
    };
}

function createDefaultSlotFreeDrawModalState() {
    return {
        isOpen: false,
        weapon: null
    };
}

function createDefaultSlotRoundContext() {
    return {
        active: false,
        attackCount: 0,
        matchedCount: 0,
        totalDamage: 0,
        didCrit: false,
        didGuarded: false,
        playerDefeated: false,
        enemyDefeated: false,
        notes: [],
        summaries: [],
        workingPlayerHp: 0,
        workingEnemyHp: 0,
        workingPlayerStatus: createEmptyStatus(),
        workingEnemyStatus: createEmptyStatus()
    };
}

function levelUpTriggerLabel(trigger) {
    if (trigger === 'opening') return '開局升級';
    if (trigger === 'boss') return 'Boss 擊敗升級';
    return '升級選擇';
}

function applyCardToBuildState(prevBuildState, cardId) {
    const base = prevBuildState || createDefaultBuildState();
    const card = getLevelUpCardById(cardId);
    if (!card) return base;
    return {
        ...base,
        cardCounts: {
            ...base.cardCounts,
            [cardId]: (base.cardCounts?.[cardId] || 0) + 1
        }
    };
}

function classEntries() {
    return Object.values(CLASS_DEFS);
}

function rarityLabel(weapon) {
    const rarity = RARITY_DEFS[weapon.rarityId];
    if (!rarity) return '';
    return `${rarity.name}(${rarity.colorLabel})`;
}

function weaponTypeName(typeId) {
    return WEAPON_TYPES[typeId]?.name || typeId;
}

function weaponTypeEmoji(typeId) {
    return WEAPON_TYPES[typeId]?.emoji || '??';
}

function clampVariantIndex(variantIndex) {
    const value = Number(variantIndex);
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(WEAPON_VARIANT_COUNT, Math.round(value)));
}

function formatVariantIndex(variantIndex) {
    return String(clampVariantIndex(variantIndex)).padStart(2, '0');
}

function weaponTypeImageSrc(typeId, variantIndex) {
    if (!WEAPON_TYPES[typeId]) return '';
    return `assets/images/minigames/tower/weapons/${typeId}/${typeId}_${formatVariantIndex(variantIndex)}.png`;
}

function rarityGlowColor(rarityId) {
    return RARITY_GLOW_COLORS[rarityId] || RARITY_GLOW_COLORS.common;
}

function weaponNameColorClass(rarityId) {
    return RARITY_NAME_COLOR_CLASSES[rarityId] || 'tw-text-slate-100';
}

function elementInfo(elementId) {
    return ELEMENT_DEFS[elementId] || ELEMENT_DEFS.water;
}

function elementGlowColor(elementId) {
    return ELEMENT_GLOW_COLORS[elementId] || ELEMENT_GLOW_COLORS.water;
}

function penaltyText(weapon) {
    if (!weapon || weapon.penaltyRate >= 1) return '專武加成：無懲罰';
    return `非專武懲罰：-${Math.round((1 - weapon.penaltyRate) * 100)}%`;
}

function isBossFloor(floor) {
    return floor > 0 && floor % 10 === 0;
}

function floorToBossIndex(floor) {
    const seq = Math.floor(floor / 10);
    return ((seq - 1) % BOSS_ENEMY_COUNT) + 1;
}

function formatEnemyIndex(index) {
    return String(index).padStart(2, '0');
}

const NORMAL_ENEMY_NAME_MAP = Object.freeze({
    normal_01: '尿道球腺分泌物',
    normal_02: '發酵尿道球腺分泌物',
    normal_03: '普信男',
    normal_04: '發黃普信男',
    normal_05: '福瑞恐懼患者',
    normal_06: '發黃福瑞恐懼患者',
    normal_07: '乾掉的狗屎精',
    normal_08: '變異乾狗屎精',
    normal_09: '普通魚人',
    normal_10: '普通魚人二號',
    normal_11: '玩具槍中二病狗',
    normal_12: '黃狗',
    normal_13: '克隆提爾',
    normal_14: '普通毛裝扮演者',
    normal_15: '飢渴的幽靈',
    normal_16_S: '有錢到可疑的獸控'
});

const BOSS_ENEMY_NAME_MAP = Object.freeze({
    boss_01: '尻尻',
    boss_02: '鱷魚爸爸',
    boss_03: '狼叔叔',
    boss_04: '奇多',
    boss_05: '奶油獅',
    boss_06: '壞貓貓',
    boss_07: '狗',
    boss_08: '蛇蛇蛇',
    boss_09: '射射兔',
    boss_10: '卡尤基'
});

function resolveEnemyNameByAssetKey(assetKey, isBoss = false) {
    if (isBoss) return BOSS_ENEMY_NAME_MAP[assetKey] || '塔主 Boss';
    return NORMAL_ENEMY_NAME_MAP[assetKey] || '塔內怪物';
}

const NORMAL_ENEMY_ASSET_KEYS = Object.freeze(
    Array.from({ length: NORMAL_ENEMY_COUNT }, (_, index) => `normal_${formatEnemyIndex(index + 1)}`)
);

const NORMAL_ENEMY_POOL = Object.freeze([
    ...NORMAL_ENEMY_ASSET_KEYS.map((assetKey) => ({
        assetKey,
        weight: 1,
        isSpecialNormal: false
    })),
    {
        assetKey: SPECIAL_NORMAL_ASSET_KEY,
        weight: SPECIAL_NORMAL_WEIGHT,
        isSpecialNormal: true
    }
]);

const NORMAL_ENEMY_POOL_MAP = Object.freeze(
    NORMAL_ENEMY_POOL.reduce((acc, entry) => {
        acc[entry.assetKey] = entry;
        return acc;
    }, {})
);

function normalizeNormalAssetKey(assetKey) {
    if (!assetKey || typeof assetKey !== 'string') return null;
    return NORMAL_ENEMY_POOL_MAP[assetKey] ? assetKey : null;
}

function pickWeightedNormalAssetKey(lastAssetKey, { specialWeightScale = 1 } = {}) {
    const excluded = normalizeNormalAssetKey(lastAssetKey);
    const candidates = NORMAL_ENEMY_POOL
        .filter((entry) => entry.assetKey !== excluded)
        .map((entry) => {
            if (entry.assetKey !== SPECIAL_NORMAL_ASSET_KEY) return entry;
            return {
                ...entry,
                weight: Math.max(0.01, Number(entry.weight) * Math.max(0.01, Number(specialWeightScale) || 1))
            };
        });
    const pool = candidates.length ? candidates : NORMAL_ENEMY_POOL;
    const totalWeight = pool.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
    if (totalWeight <= 0) return pool[0]?.assetKey || 'normal_01';
    let roll = Math.random() * totalWeight;
    for (const entry of pool) {
        roll -= Math.max(0, Number(entry.weight) || 0);
        if (roll <= 0) return entry.assetKey;
    }
    return pool[pool.length - 1].assetKey;
}

function pickEnemyIntentId(isBoss) {
    const roll = Math.random();
    if (isBoss) {
        if (roll < 0.45) return 'attack';
        if (roll < 0.82) return 'heavy';
        return 'guard';
    }
    if (roll < 0.7) return 'attack';
    return 'guard';
}

function randomizeStat(baseValue, varianceRate = 0.12) {
    const base = Math.max(1, Number(baseValue) || 1);
    const minMul = 1 - varianceRate;
    const maxMul = 1 + varianceRate;
    const mul = minMul + (Math.random() * (maxMul - minMul));
    return Math.max(1, Math.round(base * mul));
}

function buildEnemyForFloor({
    floor,
    lastAssetKey,
    rerollStats = false,
    specialWeightScale = 1
}) {
    const boss = isBossFloor(floor);
    const level = Math.max(1, floor);
    const bossIndex = boss ? floorToBossIndex(level) : null;
    const normalAssetKey = boss ? '' : pickWeightedNormalAssetKey(lastAssetKey, { specialWeightScale });
    const assetKey = boss ? `boss_${formatEnemyIndex(bossIndex)}` : normalAssetKey;
    const normalMeta = boss ? null : NORMAL_ENEMY_POOL_MAP[normalAssetKey];
    const hpScaled = Math.round(
        (BASE_ENEMY_PREVIEW.maxHp + (level * ENEMY_HP_LINEAR_PER_FLOOR))
        * Math.pow(ENEMY_HP_EXP_GROWTH, Math.max(0, level - 1))
    );
    const atkScaled = Math.round(
        (BASE_ENEMY_PREVIEW.attack + Math.floor(level * ENEMY_ATK_LINEAR_PER_FLOOR))
        * Math.pow(ENEMY_ATK_EXP_GROWTH, Math.max(0, level - 1))
    );
    const defaultHp = boss ? Math.max(1, Math.round(hpScaled * ENEMY_BOSS_HP_MUL)) : hpScaled;
    const defaultAttack = boss ? Math.max(1, Math.round(atkScaled * ENEMY_BOSS_ATK_MUL)) : atkScaled;
    return {
        floor: level,
        level,
        name: resolveEnemyNameByAssetKey(assetKey, boss),
        isBoss: boss,
        isSpecialNormal: !boss && Boolean(normalMeta?.isSpecialNormal),
        rewardMultiplier: (!boss && normalMeta?.isSpecialNormal) ? SPECIAL_NORMAL_REWARD_MULTIPLIER : 1,
        elementId: pickRandomElementId(),
        assetKey,
        imageSrc: `${boss ? BOSS_ENEMY_DIR : NORMAL_ENEMY_DIR}/${assetKey}.png`,
        maxHp: rerollStats ? randomizeStat(defaultHp, boss ? 0.14 : 0.12) : defaultHp,
        attack: rerollStats ? randomizeStat(defaultAttack, boss ? 0.12 : 0.1) : defaultAttack,
        intentId: pickEnemyIntentId(boss)
    };
}

function resolveShopAccess({ shopId, enemyIsBoss, mysteryShopAvailable, unlimitedOpen }) {
    if (unlimitedOpen) return true;
    if (shopId === 'normal') return true;
    if (shopId === 'magic') return Boolean(enemyIsBoss);
    if (shopId === 'mystery') return Boolean(mysteryShopAvailable);
    return false;
}

function resolveEffectiveCost(baseCost, freeShopEnabled) {
    if (freeShopEnabled) return 0;
    const parsed = Number(baseCost);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.round(parsed));
}

function WeaponTypeIcon({ typeId, variantIndex, rarityId, size = 'inline' }) {
    const src = weaponTypeImageSrc(typeId, variantIndex);
    const [broken, setBroken] = useState(false);
    const glowStyle = { '--tower-weapon-glow': rarityGlowColor(rarityId) };

    useEffect(() => {
        setBroken(false);
    }, [src]);

    if (!src || broken) {
        return (
            <span className={`tower-weapon-fallback tower-weapon-fallback-${size}`} style={glowStyle} aria-hidden="true">
                {weaponTypeEmoji(typeId)}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt={`${weaponTypeName(typeId)} icon`}
            className={`tower-weapon-image tower-weapon-image-${size}`}
            style={glowStyle}
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
        />
    );
}

function ElementChip({ elementId }) {
    const element = elementInfo(elementId);
    return (
        <span className={`tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold ${element.uiClass}`}>
            <span aria-hidden="true">{element.emoji}</span>
            <span>{element.name}</span>
        </span>
    );
}

function StatusChipList({ status }) {
    const statusEntries = activeStatusEntries(status);
    if (!statusEntries.length) return <span className="tw-text-slate-400">無</span>;
    return (
        <span className="tw-inline-flex tw-flex-wrap tw-items-center tw-gap-1">
            {statusEntries.map((entry) => (
                <span key={entry.id} className={`tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold ${entry.uiClass}`}>
                    <span aria-hidden="true">{entry.emoji}</span>
                    <span>{entry.name}{entry.turns > 1 ? ` ${entry.turns}` : ''}</span>
                </span>
            ))}
        </span>
    );
}

function ElementEmojiSlot({ elementId }) {
    const element = elementInfo(elementId);
    return (
        <span className="tower-element-slot" aria-label={`element ${element.name}`}>
            {element.emoji}
        </span>
    );
}

function normalizeSlotSymbolId(symbolId) {
    return SLOT_SYMBOL_IDS.includes(symbolId) ? symbolId : 'water';
}

function resolveSlotWeaponSymbolId(elementId) {
    if (elementId === 'water' || elementId === 'fire' || elementId === 'plant') return elementId;
    return 'fire';
}

function slotSymbolByIndex(index) {
    const len = SLOT_SYMBOL_IDS.length || 1;
    const normalized = ((Math.round(Number(index) || 0) % len) + len) % len;
    return SLOT_SYMBOL_IDS[normalized] || 'water';
}

function slotReelsFromIndices(indices) {
    return Array.from({ length: 3 }, (_, index) => slotSymbolByIndex(indices[index]));
}

function pickWeightedSlotSymbolIndex(weightMap = {}) {
    const weightedPool = SLOT_SYMBOL_IDS.map((symbolId) => ({
        symbolId,
        weight: Math.max(0.001, Number(weightMap[symbolId]) || 0)
    }));
    const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) {
        return Math.floor(Math.random() * SLOT_SYMBOL_IDS.length);
    }
    let cursor = Math.random() * totalWeight;
    for (let index = 0; index < weightedPool.length; index += 1) {
        cursor -= weightedPool[index].weight;
        if (cursor <= 0) return index;
    }
    return weightedPool.length - 1;
}

function createRandomSlotReelIndices({
    weaponSymbolId = 'fire',
    weaponRateBonusPct = 0,
    coinRatePenaltyPct = 0
} = {}) {
    const safeWeaponRateBonus = Math.max(-0.9, Number(weaponRateBonusPct) || 0);
    const safeCoinRatePenalty = Math.max(0, Number(coinRatePenaltyPct) || 0);
    const weightMap = {
        water: 1,
        fire: 1,
        plant: 1,
        coin: Math.max(0.05, 1 - safeCoinRatePenalty)
    };
    if (weightMap[weaponSymbolId]) {
        weightMap[weaponSymbolId] = Math.max(0.05, weightMap[weaponSymbolId] * (1 + safeWeaponRateBonus));
    }
    return Array.from({ length: 3 }, () => pickWeightedSlotSymbolIndex(weightMap));
}

function slotSymbolMeta(symbolId) {
    if (symbolId === 'water') {
        return {
            id: 'water',
            label: '水',
            emoji: ELEMENT_DEFS.water?.emoji || 'W',
            imageSrc: SLOT_SYMBOL_IMAGE_SRC.water
        };
    }
    if (symbolId === 'fire') {
        return {
            id: 'fire',
            label: '火',
            emoji: ELEMENT_DEFS.fire?.emoji || 'F',
            imageSrc: SLOT_SYMBOL_IMAGE_SRC.fire
        };
    }
    if (symbolId === 'plant') {
        return {
            id: 'plant',
            label: '植',
            emoji: ELEMENT_DEFS.plant?.emoji || 'P',
            imageSrc: SLOT_SYMBOL_IMAGE_SRC.plant
        };
    }
    return {
        id: 'coin',
        label: '金',
        emoji: '💰',
        imageSrc: SLOT_SYMBOL_IMAGE_SRC.coin
    };
}

function renderSlotSymbolNode(symbol, { ariaLabel = '' } = {}) {
    return (
        <span className={`tower-slot-symbol tower-slot-symbol-${symbol.id}`} aria-label={ariaLabel || undefined}>
            {symbol.imageSrc ? (
                <img
                    src={symbol.imageSrc}
                    alt={`${symbol.label}符號`}
                    className="tower-slot-symbol-image"
                    onLoad={(event) => event.currentTarget.parentElement?.classList.remove('is-image-error')}
                    onError={(event) => event.currentTarget.parentElement?.classList.add('is-image-error')}
                />
            ) : null}
            <span className="tower-slot-symbol-fallback" aria-hidden="true">{symbol.emoji}</span>
        </span>
    );
}

function slotWeaponHitDamageMultiplier(hitCount) {
    const normalized = Math.max(1, Math.min(3, Math.round(Number(hitCount) || 1)));
    return SLOT_WEAPON_HIT_DAMAGE_MULTIPLIERS[normalized - 1] || SLOT_WEAPON_HIT_DAMAGE_MULTIPLIERS[0];
}

/**
 * @deprecated Legacy slot settlement flow. Kept only for compatibility notes.
 */
function evaluateSlotReels(symbols, weaponElementId, {
    coinAsWeaponChance = 0,
    forceJackpotChance = 0,
    rewardPointBonus = 0
} = {}) {
    const normalizedSymbols = Array.from({ length: 3 }, (_, index) => normalizeSlotSymbolId(symbols[index]));
    const counts = normalizedSymbols.reduce((acc, symbolId) => {
        acc[symbolId] = (acc[symbolId] || 0) + 1;
        return acc;
    }, {});
    const weaponSymbolId = resolveSlotWeaponSymbolId(weaponElementId);
    const coinCount = counts.coin || 0;
    const weaponCount = counts[weaponSymbolId] || 0;
    const safeCoinAsWeaponChance = clampRate(coinAsWeaponChance, 0, 0.95);
    let coinWeaponProxyCount = 0;
    for (let i = 0; i < coinCount; i += 1) {
        if (Math.random() < safeCoinAsWeaponChance) coinWeaponProxyCount += 1;
    }
    let effectiveWeaponCount = Math.min(3, weaponCount + coinWeaponProxyCount);
    const uniqueSymbolCount = new Set(normalizedSymbols).size;
    const allDifferentNonCoin = uniqueSymbolCount === 3 && coinCount === 0;
    const nonWeaponTriplet = uniqueSymbolCount === 1
        && coinCount === 0
        && normalizedSymbols[0] !== weaponSymbolId;
    const statusCleanseSymbolIds = ['water', 'fire', 'plant']
        .filter((symbolId) => (counts[symbolId] || 0) >= 2);
    const statusCleanseList = statusCleanseSymbolIds
        .map((symbolId) => SLOT_STATUS_CLEANSE_LABELS[symbolId])
        .filter(Boolean);

    let type = 'miss';
    let damageMultiplier = 0;
    let healPct = 0;
    let comboDelta = 0;
    let comboReset = true;
    let rewardPointGain = 0;
    let forcedJackpotTriggered = false;

    if (effectiveWeaponCount === 2 && coinCount === 0 && Math.random() < clampRate(forceJackpotChance, 0, 0.95)) {
        effectiveWeaponCount = 3;
        forcedJackpotTriggered = true;
    }

    if (effectiveWeaponCount >= 3) {
        type = 'jackpot';
        damageMultiplier = 5;
        comboDelta = 1;
        comboReset = false;
    }
    else if (effectiveWeaponCount === 2) {
        type = 'normal';
        damageMultiplier = 2;
        comboReset = false;
    }
    else if (effectiveWeaponCount === 1) {
        type = 'scratch';
        damageMultiplier = 1;
        comboReset = true;
        if (allDifferentNonCoin) {
            rewardPointGain = Math.max(1, 1 + Math.max(0, Math.round(Number(rewardPointBonus) || 0)));
        }
    }
    else if (nonWeaponTriplet) {
        type = 'heal';
        healPct = 0.1;
        comboReset = false;
    }

    const coinMultiplier = coinCount === 3 ? 5 : (coinCount === 2 ? 2 : (coinCount === 1 ? 1 : 0));
    const weaponMeta = slotSymbolMeta(weaponSymbolId);
    const summary = (() => {
        if (type === 'jackpot') {
            return `武器屬性 ${weaponMeta.label} x3，傷害預覽 x5，Combo +1`;
        }
        if (type === 'normal') {
            return `武器屬性 ${weaponMeta.label} x2，傷害預覽 x2，Combo 維持`;
        }
        if (type === 'scratch') {
            return `武器屬性 ${weaponMeta.label} x1，傷害預覽 x1，Combo 歸零`;
        }
        if (type === 'heal') {
            const healSymbol = slotSymbolMeta(normalizedSymbols[0]);
            return `${healSymbol.label} x3，回復最大生命 10%，Combo 維持`;
        }
        return '未形成攻擊連線，判定為 Miss，Combo 歸零';
    })();
    const extraSummary = [];
    if (coinWeaponProxyCount > 0) extraSummary.push(`幸運金幣轉化 ${coinWeaponProxyCount} 格`);
    if (forcedJackpotTriggered) extraSummary.push('殘影干涉觸發三連');

    return {
        type,
        title: SLOT_RESULT_TEXT[type] || SLOT_RESULT_TEXT.miss,
        summary: extraSummary.length > 0 ? `${summary}（${extraSummary.join('，')}）` : summary,
        reels: normalizedSymbols,
        counts,
        weaponSymbolId,
        weaponCount,
        effectiveWeaponCount,
        coinWeaponProxyCount,
        damageMultiplier,
        healPct,
        comboDelta,
        comboReset,
        rewardPointGain,
        coinCount,
        coinMultiplier,
        forcedJackpotTriggered,
        statusCleanseSymbolIds,
        statusCleanseList
    };
}

/**
 * @deprecated Legacy slot settlement flow. Kept only for compatibility notes.
 */
function calcSlotCoinReward(coinMultiplier, floorLevel) {
    const multiplier = Math.max(0, Number(coinMultiplier) || 0);
    if (multiplier <= 0) return 0;
    const level = Math.max(1, Number(floorLevel) || 1);
    const base = Math.max(1, Math.round(1 + (level * SLOT_COIN_REWARD_PER_FLOOR)));
    return Math.max(0, Math.round(base * multiplier));
}

/**
 * @deprecated Legacy slot settlement flow. Kept only for compatibility notes.
 */
function calcSlotComboDamageMultiplier(comboPreview) {
    const combo = Math.max(0, Number(comboPreview) || 0);
    if (combo <= 0) return 1;
    return Math.max(1, Math.round(combo * SLOT_COMBO_DAMAGE_STEP));
}

function applySlotStatusCleanse(status, symbolIds = []) {
    const nextStatus = normalizeStatus(status);
    const removedLabels = [];
    const symbols = Array.isArray(symbolIds) ? symbolIds : [];
    symbols.forEach((symbolId) => {
        const statusId = SLOT_STATUS_CLEANSE_STATUS_MAP[symbolId];
        if (!statusId || !Object.prototype.hasOwnProperty.call(nextStatus, statusId)) return;
        if (nextStatus[statusId] <= 0) return;
        nextStatus[statusId] = 0;
        const label = SLOT_STATUS_CLEANSE_LABELS[symbolId];
        if (label) removedLabels.push(label);
    });
    return {
        nextStatus,
        removedLabels
    };
}

export function TowerApp({
    lang = 'tw',
    onExit = () => {},
    playSound = () => {},
    shakeScreen = () => {}
}) {
    const [phase, setPhase] = useState('class');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [drawnWeapon, setDrawnWeapon] = useState(null);
    const [selectedWeapon, setSelectedWeapon] = useState(null);
    const [drawCount, setDrawCount] = useState(0);
    const [playerHp, setPlayerHp] = useState(null);
    const [gold, setGold] = useState(0);
    const [floor, setFloor] = useState(1);
    const [enemyLevel, setEnemyLevel] = useState(1);
    const [enemyMaxHp, setEnemyMaxHp] = useState(BASE_ENEMY_PREVIEW.maxHp);
    const [enemyHp, setEnemyHp] = useState(BASE_ENEMY_PREVIEW.maxHp);
    const [enemyAttack, setEnemyAttack] = useState(BASE_ENEMY_PREVIEW.attack);
    const [enemyIsBoss, setEnemyIsBoss] = useState(false);
    const [enemyIsSpecialNormal, setEnemyIsSpecialNormal] = useState(false);
    const [enemyRewardMultiplier, setEnemyRewardMultiplier] = useState(1);
    const [enemyElementId, setEnemyElementId] = useState('water');
    const [enemyAssetKey, setEnemyAssetKey] = useState('');
    const [enemyName, setEnemyName] = useState('塔內怪物');
    const [enemyImageSrc, setEnemyImageSrc] = useState('');
    const [enemyIntentId, setEnemyIntentId] = useState('attack');
    const [enemyGuardActive, setEnemyGuardActive] = useState(false);
    const [playerStatus, setPlayerStatus] = useState(() => createEmptyStatus());
    const [enemyStatus, setEnemyStatus] = useState(() => createEmptyStatus());
    const [battleNotice, setBattleNotice] = useState('準備開始戰鬥。');
    const [battleNoticeHistory, setBattleNoticeHistory] = useState([]);
    const [levelUpState, setLevelUpState] = useState(() => createDefaultLevelUpState());
    const [buildState, setBuildState] = useState(() => createDefaultBuildState());
    const [inventoryState, setInventoryState] = useState(() => createDefaultInventoryState());
    const [runtimeEffects, setRuntimeEffects] = useState(() => createDefaultRuntimeEffects());
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [replacementFlowState, setReplacementFlowState] = useState(null);
    const [openShopId, setOpenShopId] = useState('');
    const [serviceModalState, setServiceModalState] = useState(null);
    const [shopModalNonce, setShopModalNonce] = useState(0);
    const [normalShopRefreshUsedAtFloor, setNormalShopRefreshUsedAtFloor] = useState(null);
    const [mysteryShopAvailable, setMysteryShopAvailable] = useState(false);
    const [mysteryShopExpireOnNextVictory, setMysteryShopExpireOnNextVictory] = useState(false);
    const [isDefeated, setIsDefeated] = useState(false);
    const [isEnemyTurnPending, setIsEnemyTurnPending] = useState(false);
    const [encounterTransitionPhase, setEncounterTransitionPhase] = useState('idle');
    const [isTestInvincible, setIsTestInvincible] = useState(false);
    const [isTestFreeShop, setIsTestFreeShop] = useState(false);
    const [isTestUnlimitedShop, setIsTestUnlimitedShop] = useState(false);
    const [isDevToolsExpanded, setIsDevToolsExpanded] = useState(false);
    const [isPlayerAvatarBroken, setIsPlayerAvatarBroken] = useState(false);
    const [isEnemyAvatarBroken, setIsEnemyAvatarBroken] = useState(false);
    const [isPlayerHitFxActive, setIsPlayerHitFxActive] = useState(false);
    const [isEnemyHitFxActive, setIsEnemyHitFxActive] = useState(false);
    const [playerDamageFloats, setPlayerDamageFloats] = useState([]);
    const [enemyDamageFloats, setEnemyDamageFloats] = useState([]);
    const [playerScratchFx, setPlayerScratchFx] = useState([]);
    const [enemyScratchFx, setEnemyScratchFx] = useState([]);
    const [enemyElementAttackFx, setEnemyElementAttackFx] = useState([]);
    const [slotMode, setSlotMode] = useState('manual');
    const [slotReelIndices, setSlotReelIndices] = useState(() => [0, 1, 2]);
    const [slotReels, setSlotReels] = useState(() => slotReelsFromIndices([0, 1, 2]));
    const [slotLockedReels, setSlotLockedReels] = useState(() => [false, false, false]);
    const [slotRequiredStopCount, setSlotRequiredStopCount] = useState(3);
    const [slotStoppedCount, setSlotStoppedCount] = useState(3);
    const [isSlotSpinning, setIsSlotSpinning] = useState(false);
    const [slotSpinResult, setSlotSpinResult] = useState(null);
    const [slotWeaponHitCount, setSlotWeaponHitCount] = useState(0);
    const [slotPreviewCombo, setSlotPreviewCombo] = useState(0);
    const [slotRewardPoints, setSlotRewardPoints] = useState(0);
    const [slotFreeDraws, setSlotFreeDraws] = useState(0);
    const [slotFreeDrawModalState, setSlotFreeDrawModalState] = useState(() => createDefaultSlotFreeDrawModalState());
    const [isBattleInfoExpanded, setIsBattleInfoExpanded] = useState(false);
    const buildStateRef = useRef(createDefaultBuildState());
    const playerStatusRef = useRef(createEmptyStatus());
    const enemyStatusRef = useRef(createEmptyStatus());
    const inventoryStateRef = useRef(createDefaultInventoryState());
    const runtimeEffectsRef = useRef(createDefaultRuntimeEffects());
    const itemRegenTimerRef = useRef(null);
    const timeStopTimerRef = useRef(null);
    const playerHitTimerRef = useRef(null);
    const enemyHitTimerRef = useRef(null);
    const enemyTurnTimerRef = useRef(null);
    const encounterTransitionTimerIdsRef = useRef([]);
    const floatIdRef = useRef(0);
    const floatTimeoutIdsRef = useRef([]);
    const scratchIdRef = useRef(0);
    const scratchTimeoutIdsRef = useRef([]);
    const lastScratchAtRef = useRef({ player: 0, enemy: 0 });
    const elementFxIdRef = useRef(0);
    const elementFxTimerIdsRef = useRef([]);
    const slotSpinIntervalRef = useRef(null);
    const slotAutoStopTimeoutIdsRef = useRef([]);
    const slotReelIndicesRef = useRef([0, 1, 2]);
    const slotReelsRef = useRef(slotReels);
    const slotLockedReelsRef = useRef([false, false, false]);
    const slotRequiredStopCountRef = useRef(3);
    const slotStoppedCountRef = useRef(3);
    const slotIsSpinningRef = useRef(false);
    const slotWeaponHitCountRef = useRef(0);
    const slotPreviewComboRef = useRef(0);
    const slotRewardPointsRef = useRef(0);
    const slotRoundContextRef = useRef(createDefaultSlotRoundContext());

    const selectedClass = CLASS_DEFS[selectedClassId] || null;
    const armorSlot = inventoryState.armorSlot;
    const potionSlots = inventoryState.potionSlots || [];
    const itemSlot = inventoryState.itemSlot;
    const ownedSkills = inventoryState.ownedSkills || {};
    const itemPassive = useMemo(() => calcItemPassiveModifiers(itemSlot), [itemSlot]);
    const playerMaxHp = useMemo(() => {
        if (!selectedClass) return 0;
        const baseMax = selectedClass.maxHp + (buildState.maxHpBonus || 0);
        return Math.max(1, Math.round(baseMax));
    }, [selectedClass, buildState.maxHpBonus]);
    const runtimeAttackPct = Number(runtimeEffects.unknownAttackPct) || 0;
    const runtimeDefensePct = Number(runtimeEffects.unknownDefensePct) || 0;
    const hasCompanion = Boolean(runtimeEffects.companion && Number(runtimeEffects.companion.hp) > 0);
    const totalOwnedSkillCount = useMemo(() => sumSkillCount(ownedSkills), [ownedSkills]);
    const armorReductionPct = Math.max(0, Number(armorSlot?.damageReductionPct) || 0);
    const totalDamageReductionPct = Math.min(
        MAX_DAMAGE_REDUCTION,
        Math.max(-0.5, (Number(buildState.damageReductionPct) || 0)
            + armorReductionPct
            + runtimeDefensePct)
    );
    const playerAttackPower = useMemo(() => {
        if (!selectedClass || !selectedWeapon) return 0;
        const basePower = selectedClass.baseAtk + selectedWeapon.effectiveAttack + (buildState.attackBonus || 0);
        const attackPct = Math.max(-0.9, itemPassive.attackPct + runtimeAttackPct);
        return Math.max(1, Math.round(basePower * (1 + attackPct)));
    }, [selectedClass, selectedWeapon, buildState.attackBonus, itemPassive.attackPct, runtimeAttackPct]);
    const playerPreview = useMemo(() => {
        if (!selectedClass || !selectedWeapon) return null;
        return {
            maxHp: playerMaxHp,
            currentHp: playerHp ?? playerMaxHp,
            attack: playerAttackPower
        };
    }, [selectedClass, selectedWeapon, playerHp, playerMaxHp, playerAttackPower]);
    const currentEnemyName = useMemo(
        () => enemyName || resolveEnemyNameByAssetKey(enemyAssetKey, enemyIsBoss),
        [enemyName, enemyAssetKey, enemyIsBoss]
    );
    const effectivePlayerAttackElementId = buildState.forcedElementId || selectedWeapon?.elementId || 'water';
    const playerAttackMatchup = useMemo(() => {
        if (!selectedWeapon) return { multiplier: 1, relation: 'neutral' };
        return getElementMatchup(effectivePlayerAttackElementId, enemyElementId);
    }, [selectedWeapon, effectivePlayerAttackElementId, enemyElementId]);
    const playerAttackElementDelta = useMemo(() => {
        if (!playerPreview) return 0;
        return Math.round(playerPreview.attack * ((playerAttackMatchup?.multiplier || 1) - 1));
    }, [playerPreview, playerAttackMatchup]);
    const playerAttackElementDeltaText = playerAttackElementDelta >= 0
        ? `(+${playerAttackElementDelta})`
        : `(${playerAttackElementDelta})`;
    const playerAttackElementDeltaClass = playerAttackElementDelta > 0
        ? 'tw-text-emerald-200'
        : (playerAttackElementDelta < 0 ? 'tw-text-rose-200' : 'tw-text-slate-300');
    const pickedCardEntries = useMemo(() => (
        Object.entries(buildState.cardCounts || {})
            .filter(([, count]) => Number(count) > 0)
            .map(([cardId, count]) => ({ card: getLevelUpCardById(cardId), count }))
            .filter((entry) => Boolean(entry.card))
    ), [buildState.cardCounts]);
    const cardEffects = useMemo(() => {
        const cardCounts = buildState.cardCounts || {};
        const stack = (cardId) => Math.max(0, Number(cardCounts[cardId]) || 0);
        const resilientStacks = stack(LEVELUP_CARD_IDS.resilient_physique);
        const fairTradeStacks = stack(LEVELUP_CARD_IDS.fair_trade);
        const pureArmingStacks = stack(LEVELUP_CARD_IDS.pure_arming);
        const sameArmorWeaponElement = Boolean(
            pureArmingStacks > 0
            && armorSlot?.elementId
            && selectedWeapon?.elementId
            && armorSlot.elementId === selectedWeapon.elementId
        );
        return {
            missComboFloorEnabled: stack(LEVELUP_CARD_IDS.safety_airbag) > 0,
            missReflectPct: 0.3 * stack(LEVELUP_CARD_IDS.thorn_armor),
            potionHealBonusPct: 0.2 * stack(LEVELUP_CARD_IDS.potion_apprentice),
            immunePoisonBurn: resilientStacks > 0,
            directDamageTakenMul: 1 + (0.1 * resilientStacks),
            nonWeaponTripletHealBonusPct: 0.1 * stack(LEVELUP_CARD_IDS.elemental_absorption),
            coinAsWeaponChance: Math.min(0.95, 0.2 * stack(LEVELUP_CARD_IDS.lucky_coin)),
            weaponRateBonusPct: (0.1 * fairTradeStacks) + (sameArmorWeaponElement ? (0.05 * pureArmingStacks) : 0),
            coinRatePenaltyPct: Math.min(0.8, 0.05 * fairTradeStacks),
            forceJackpotChance: Math.min(0.95, 0.15 * stack(LEVELUP_CARD_IDS.afterimage_interference)),
            rewardPointBonus: stack(LEVELUP_CARD_IDS.pity_master),
            lowHpDamageMul: 1 + (0.5 * stack(LEVELUP_CARD_IDS.last_stand)),
            fullHpCritBonusPct: 0.2 * stack(LEVELUP_CARD_IDS.full_hp_frenzy),
            comboTrueDamagePctPerStep: 0.1 * stack(LEVELUP_CARD_IDS.combo_breakthrough),
            bossDamageMul: 1 + (0.2 * stack(LEVELUP_CARD_IDS.giant_slayer)),
            loneGambleJackpotMul: stack(LEVELUP_CARD_IDS.all_in_gamble) > 0
                ? 1 + stack(LEVELUP_CARD_IDS.all_in_gamble)
                : 1,
            victoryGoldBonusPct: 0.3 * stack(LEVELUP_CARD_IDS.greedy_hand),
            shopDiscountPct: Math.min(SHOP_CARD_DISCOUNT_MAX_PCT, SHOP_VIP_ITEM_DISCOUNT_PCT * stack(LEVELUP_CARD_IDS.vip_member)),
            poisonTwoWeaponHeal: stack(LEVELUP_CARD_IDS.toxin_conversion) > 0,
            charmThresholdPct: stack(LEVELUP_CARD_IDS.charm_extension) > 0
                ? 0.2
                : BASE_CHARM_THRESHOLD_PCT,
            autoStopIntervalMul: Math.max(0.3, 1 - (0.3 * stack(LEVELUP_CARD_IDS.time_distortion))),
            pureArmingActive: sameArmorWeaponElement
        };
    }, [buildState.cardCounts, armorSlot?.elementId, selectedWeapon?.elementId]);
    const ownedSkillEntries = useMemo(() => (
        Object.entries(ownedSkills)
            .map(([skillId, count]) => ({
                skillId,
                count: Math.max(0, Number(count) || 0),
                meta: getSkillItemMeta(skillId)
            }))
            .filter((entry) => entry.count > 0 && entry.meta)
            .sort((a, b) => a.meta.name.localeCompare(b.meta.name))
    ), [ownedSkills]);
    const isLevelUpOpen = levelUpState.isOpen;
    const isDraftFocus = isLevelUpOpen;
    const isSlotFreeDrawModalOpen = Boolean(slotFreeDrawModalState?.isOpen);
    const isShopModalOpen = Boolean(openShopId);
    const isReplacementModalOpen = Boolean(replacementFlowState?.isOpen);
    const isServiceModalOpen = Boolean(serviceModalState?.isOpen);
    const isEncounterTransitioning = encounterTransitionPhase !== 'idle';
    const isCombatLocked = isEnemyTurnPending
        || isEncounterTransitioning
        || isLevelUpOpen
        || isSlotFreeDrawModalOpen
        || isShopModalOpen
        || isSkillModalOpen
        || isReplacementModalOpen
        || isServiceModalOpen;
    const combatLockReason = useMemo(() => {
        if (isDefeated) return '已敗北，請重新挑戰或返回職業選擇。';
        if (isLevelUpOpen) return '升級選擇中，請先挑選卡片。';
        if (isSlotFreeDrawModalOpen) return '免費抽卡確認中，請先完成。';
        if (isShopModalOpen) return '商店視窗開啟中，請先關閉。';
        if (isSkillModalOpen) return '技能視窗開啟中，請先關閉。';
        if (isReplacementModalOpen) return '替換視窗開啟中，請先完成。';
        if (isServiceModalOpen) return '服務預覽視窗開啟中，請先確認或取消。';
        if (isEncounterTransitioning) return '怪物換場中，請稍候。';
        if (isEnemyTurnPending) return `${currentEnemyName}行動中，請稍候。`;
        return '';
    }, [
        isDefeated,
        isLevelUpOpen,
        isSlotFreeDrawModalOpen,
        isShopModalOpen,
        isSkillModalOpen,
        isReplacementModalOpen,
        isServiceModalOpen,
        isEncounterTransitioning,
        isEnemyTurnPending,
        currentEnemyName
    ]);
    const slotWeaponSymbolId = useMemo(
        () => resolveSlotWeaponSymbolId(selectedWeapon?.elementId || 'fire'),
        [selectedWeapon?.elementId]
    );
    const slotAutoStopIntervalMs = Math.max(250, Math.round(SLOT_AUTO_STOP_INTERVAL_MS * cardEffects.autoStopIntervalMul));
    const slotAutoStopIntervalSecText = Number.isInteger(slotAutoStopIntervalMs / 1000)
        ? String(slotAutoStopIntervalMs / 1000)
        : (slotAutoStopIntervalMs / 1000).toFixed(1);
    const isSlotAutoUnlocked = floor >= 10;
    const isSlotUiLocked = isDefeated
        || isLevelUpOpen
        || isSlotFreeDrawModalOpen
        || isShopModalOpen
        || isSkillModalOpen
        || isReplacementModalOpen
        || isServiceModalOpen
        || isEncounterTransitioning;
    const nextSlotStopIndex = Math.min(slotRequiredStopCount, Math.max(1, slotStoppedCount + 1));
    const shouldShowDetailedBattleInfo = isBattleInfoExpanded || isDefeated;
    const battleInfoSummary = useMemo(() => {
        if (!playerPreview) return '尚未進入戰鬥。';
        const cardCount = pickedCardEntries.reduce((sum, entry) => sum + Math.max(0, Number(entry.count) || 0), 0);
        return `HP ${playerPreview.currentHp}/${playerPreview.maxHp}｜ATK ${playerPreview.attack}｜卡片 ${cardCount} 張`;
    }, [playerPreview, pickedCardEntries]);
    const shopTestToolsEnabled = ENABLE_TOWER_SHOP_TEST_TOOLS === true;
    const effectiveTestFreeShop = shopTestToolsEnabled && isTestFreeShop;
    const effectiveTestUnlimitedShop = shopTestToolsEnabled && isTestUnlimitedShop;
    const canOpenNormalShop = resolveShopAccess({
        shopId: 'normal',
        enemyIsBoss,
        mysteryShopAvailable,
        unlimitedOpen: effectiveTestUnlimitedShop
    });
    const canOpenMagicShop = resolveShopAccess({
        shopId: 'magic',
        enemyIsBoss,
        mysteryShopAvailable,
        unlimitedOpen: effectiveTestUnlimitedShop
    });
    const canOpenMysteryShop = resolveShopAccess({
        shopId: 'mystery',
        enemyIsBoss,
        mysteryShopAvailable,
        unlimitedOpen: effectiveTestUnlimitedShop
    });
    const canRefreshNormalShop = floor % 5 === 0 && normalShopRefreshUsedAtFloor !== floor;
    const activeShopMeta = useMemo(() => getShopModalMeta(openShopId), [openShopId]);
    const activeShopItems = useMemo(() => {
        if (!openShopId) return [];
        if (openShopId === 'normal') return buildNormalShopDisplayItems();
        if (openShopId === 'magic') return buildMagicShopDisplayItems();
        if (openShopId === 'mystery') return buildMysteryShopDisplayItems();
        return [];
    }, [openShopId, shopModalNonce]);
    const currentTowerBgSrc = useMemo(() => resolveTowerSceneBackground({
        phase,
        inShop: isShopModalOpen || isServiceModalOpen,
        isBoss: enemyIsBoss
    }), [phase, isShopModalOpen, isServiceModalOpen, enemyIsBoss]);
    const towerRootStyle = useMemo(() => ({
        '--tower-bg-image': currentTowerBgSrc ? `url("${currentTowerBgSrc}")` : 'none'
    }), [currentTowerBgSrc]);
    const activeServiceItem = serviceModalState?.item || null;
    const activeServicePreview = serviceModalState?.preview || null;
    const enemyTransitionClass = encounterTransitionPhase === 'enemy_knockout'
        ? 'tower-enemy-knockout'
        : (encounterTransitionPhase === 'enemy_entry' ? 'tower-enemy-slide-in' : '');
    const enemyHitFxClass = isEnemyHitFxActive && encounterTransitionPhase === 'idle'
        ? 'tower-target-hit-shake'
        : '';
    const enemyAvatarFxClass = `${enemyHitFxClass} ${enemyTransitionClass}`.trim();
    const playerAvatarStyle = useMemo(() => ({
        '--tower-avatar-glow': elementGlowColor(effectivePlayerAttackElementId)
    }), [effectivePlayerAttackElementId]);
    const enemyAvatarStyle = useMemo(() => ({
        '--tower-avatar-glow': elementGlowColor(enemyElementId)
    }), [enemyElementId]);

    const clampHp = (value, maxHp) => Math.max(0, Math.min(maxHp, value));

    function clearEnemyTurnTimer() {
        if (enemyTurnTimerRef.current) {
            clearTimeout(enemyTurnTimerRef.current);
            enemyTurnTimerRef.current = null;
        }
        setIsEnemyTurnPending(false);
    }

    function clearEncounterTransition({ resetState = true } = {}) {
        encounterTransitionTimerIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        encounterTransitionTimerIdsRef.current = [];
        if (!resetState) return;
        setEncounterTransitionPhase('idle');
    }

    function clearSlotMachineTimers() {
        if (slotSpinIntervalRef.current) {
            clearInterval(slotSpinIntervalRef.current);
            slotSpinIntervalRef.current = null;
        }
        slotAutoStopTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        slotAutoStopTimeoutIdsRef.current = [];
    }

    function commitSlotReels(nextReels) {
        const normalized = (Array.isArray(nextReels) ? nextReels : [])
            .slice(0, 3)
            .map((symbolId) => normalizeSlotSymbolId(symbolId));
        while (normalized.length < 3) normalized.push(slotSymbolByIndex(normalized.length));
        slotReelsRef.current = normalized;
        setSlotReels(normalized);
    }

    function commitSlotReelIndices(nextIndices) {
        const normalized = (Array.isArray(nextIndices) ? nextIndices : [])
            .slice(0, 3)
            .map((value) => Math.round(Number(value) || 0));
        while (normalized.length < 3) normalized.push(normalized.length);
        slotReelIndicesRef.current = normalized;
        setSlotReelIndices(normalized);
        commitSlotReels(slotReelsFromIndices(normalized));
    }

    function commitSlotLockedReels(nextLockedReels) {
        const normalized = (Array.isArray(nextLockedReels) ? nextLockedReels : [])
            .slice(0, 3)
            .map((value) => Boolean(value));
        while (normalized.length < 3) normalized.push(false);
        slotLockedReelsRef.current = normalized;
        setSlotLockedReels(normalized);
    }

    function commitSlotRequiredStopCount(nextValue) {
        const normalized = Math.max(1, Math.min(3, Math.round(Number(nextValue) || 3)));
        slotRequiredStopCountRef.current = normalized;
        setSlotRequiredStopCount(normalized);
    }

    function commitSlotStoppedCount(nextValue) {
        const normalized = Math.max(0, Math.min(3, Math.round(Number(nextValue) || 0)));
        slotStoppedCountRef.current = normalized;
        setSlotStoppedCount(normalized);
    }

    function commitSlotSpinning(nextValue) {
        const normalized = Boolean(nextValue);
        slotIsSpinningRef.current = normalized;
        setIsSlotSpinning(normalized);
    }

    function commitSlotWeaponHitCount(nextValue) {
        const normalized = Math.max(0, Math.round(Number(nextValue) || 0));
        slotWeaponHitCountRef.current = normalized;
        setSlotWeaponHitCount(normalized);
    }

    function commitSlotPreviewCombo(nextValue) {
        const normalized = Math.max(0, Math.round(Number(nextValue) || 0));
        slotPreviewComboRef.current = normalized;
        setSlotPreviewCombo(normalized);
    }

    function commitSlotRewardPoints(nextValue) {
        const normalized = Math.max(0, Math.round(Number(nextValue) || 0));
        slotRewardPointsRef.current = normalized;
        setSlotRewardPoints(normalized);
    }

    function resetSlotRoundContext() {
        slotRoundContextRef.current = createDefaultSlotRoundContext();
    }

    function resetSlotMachineState({ resetMode = true } = {}) {
        clearSlotMachineTimers();
        resetSlotRoundContext();
        commitSlotSpinning(false);
        commitSlotLockedReels([false, false, false]);
        commitSlotRequiredStopCount(3);
        commitSlotStoppedCount(3);
        commitSlotWeaponHitCount(0);
        commitSlotReelIndices(createRandomSlotReelIndices({
            weaponSymbolId: slotWeaponSymbolId,
            weaponRateBonusPct: cardEffects.weaponRateBonusPct,
            coinRatePenaltyPct: cardEffects.coinRatePenaltyPct
        }));
        commitSlotPreviewCombo(0);
        commitSlotRewardPoints(0);
        setSlotFreeDraws(0);
        setSlotSpinResult(null);
        setSlotFreeDrawModalState(createDefaultSlotFreeDrawModalState());
        if (resetMode) setSlotMode('manual');
    }

    function beginSlotRoundContext() {
        if (slotRoundContextRef.current.active) return slotRoundContextRef.current;
        if (!selectedClass || !selectedWeapon || !playerPreview) return null;
        if (isDefeated || isEnemyTurnPending || isLevelUpOpen || isShopModalOpen || isReplacementModalOpen || isServiceModalOpen) {
            return null;
        }

        setOpenShopId('');
        const turnStart = processPlayerTurnStart();
        if (turnStart.blocked) return null;

        const nextContext = createDefaultSlotRoundContext();
        nextContext.active = true;
        nextContext.notes = [...turnStart.notes];
        nextContext.workingPlayerHp = turnStart.nextHp;
        nextContext.workingEnemyHp = enemyHp;
        nextContext.workingPlayerStatus = normalizeStatus(turnStart.nextStatus);
        nextContext.workingEnemyStatus = normalizeStatus(enemyStatusRef.current);
        slotRoundContextRef.current = nextContext;
        return nextContext;
    }

    function triggerSlotReelAttack({ reelIndex = 0, symbolId = 'water', matched = false } = {}) {
        const slotRound = beginSlotRoundContext();
        if (!slotRound) return false;
        if (slotRound.playerDefeated || slotRound.enemyDefeated) return false;

        const symbolMeta = slotSymbolMeta(symbolId);
        const baseDamageMul = matched ? SLOT_MATCHED_DAMAGE_MULTIPLIER : 1;
        const extraNotices = matched
            ? [`第 ${reelIndex + 1} 軸 ${symbolMeta.label}：武器匹配，傷害 x${SLOT_MATCHED_DAMAGE_MULTIPLIER}`]
            : [`第 ${reelIndex + 1} 軸 ${symbolMeta.label}：中立攻擊（不套用屬性機制）`];

        const attackResult = executePlayerAttackCore({
            actionLabel: `拉霸攻擊（第 ${reelIndex + 1} 軸）`,
            baseDamageMul,
            attackElementId: selectedWeapon?.elementId || effectivePlayerAttackElementId,
            visualElementId: symbolId,
            enableElementMechanics: matched,
            extraNotices,
            workingPlayerHp: slotRound.workingPlayerHp,
            workingEnemyHp: slotRound.workingEnemyHp,
            workingPlayerStatus: slotRound.workingPlayerStatus,
            workingEnemyStatus: slotRound.workingEnemyStatus,
            notes: slotRound.notes
        });

        slotRound.notes = attackResult.notices;
        slotRound.workingPlayerHp = attackResult.workingPlayerHp;
        slotRound.workingEnemyHp = attackResult.workingEnemyHp;
        slotRound.workingPlayerStatus = attackResult.workingPlayerStatus;
        slotRound.workingEnemyStatus = attackResult.workingEnemyStatus;
        slotRound.attackCount += 1;
        slotRound.totalDamage += Math.max(0, Number(attackResult.totalStrikeDamage) || 0);
        slotRound.didCrit = slotRound.didCrit || attackResult.didCrit;
        slotRound.didGuarded = slotRound.didGuarded || attackResult.didGuarded;
        slotRound.playerDefeated = slotRound.playerDefeated || attackResult.playerDefeated;
        slotRound.enemyDefeated = slotRound.enemyDefeated || attackResult.enemyDefeated;
        if (matched) slotRound.matchedCount += 1;
        if (attackResult.strikeSummary) slotRound.summaries.push(attackResult.strikeSummary);
        slotRoundContextRef.current = slotRound;
        return true;
    }

    function finalizeSlotSpin(finalReels, { matchedCount = slotWeaponHitCountRef.current } = {}) {
        clearSlotMachineTimers();
        commitSlotSpinning(false);
        commitSlotStoppedCount(slotRequiredStopCountRef.current);
        const slotRound = slotRoundContextRef.current;
        const safeMatchedCount = Math.max(
            0,
            Math.min(3, Math.round(Number(slotRound.active ? slotRound.matchedCount : matchedCount) || 0))
        );
        const safeAttackCount = Math.max(0, Math.round(Number(slotRound.active ? slotRound.attackCount : 0) || 0));
        const neutralAttackCount = Math.max(0, safeAttackCount - safeMatchedCount);
        commitSlotPreviewCombo(safeMatchedCount);
        const summaryText = safeAttackCount > 0
            ? `本輪觸發 ${safeAttackCount} 次攻擊：武器匹配 ${safeMatchedCount} 次（x${SLOT_MATCHED_DAMAGE_MULTIPLIER}），中立攻擊 ${neutralAttackCount} 次。`
            : '本輪未觸發攻擊。';
        const outcomePayload = {
            type: safeMatchedCount >= 3 ? 'jackpot' : (safeMatchedCount > 0 ? 'normal' : (safeAttackCount > 0 ? 'scratch' : 'miss')),
            title: safeMatchedCount > 0 ? `武器匹配 x${safeMatchedCount}` : (safeAttackCount > 0 ? `中立攻擊 x${safeAttackCount}` : '未命中'),
            summary: summaryText,
            comboPreview: safeMatchedCount,
            rewardPointsPreview: slotRewardPointsRef.current,
            freeDrawGain: 0,
            coinReward: 0,
            coinCount: 0,
            coinMultiplier: 0,
            statusCleanseList: [],
            appliedCleanseList: [],
            rewardPointGain: 0
        };
        setSlotSpinResult(outcomePayload);
        commitSlotWeaponHitCount(safeMatchedCount);

        if (!slotRound.active) {
            resetSlotRoundContext();
            return;
        }

        commitPlayerStatus(slotRound.workingPlayerStatus);
        commitEnemyStatus(slotRound.workingEnemyStatus);
        consumePlayerActionBuffs();
        const noticePrefix = slotRound.notes.length > 0 ? `${slotRound.notes.join('，')}，` : '';
        const skipEnemyTurn = Number(runtimeEffectsRef.current?.timeStopUntil) > Date.now();

        if (slotRound.playerDefeated) {
            setIsDefeated(true);
            if (slotRound.enemyDefeated) {
                setBattleNotice(`${noticePrefix}${summaryText}，成功擊敗 ${currentEnemyName}，但你在反噬中倒下。`);
            } else {
                setBattleNotice(`${noticePrefix}${summaryText}，但你倒下了。`);
            }
            resetSlotRoundContext();
            return;
        }

        if (slotRound.enemyDefeated) {
            setBattleNotice(`${noticePrefix}${summaryText}，成功擊敗 ${currentEnemyName}。`);
            resetSlotRoundContext();
            handleEnemyDefeated();
            return;
        }

        if (skipEnemyTurn) {
            setBattleNotice(`${noticePrefix}${summaryText}，時間暫停中，${currentEnemyName} 暫不行動。`);
            resetSlotRoundContext();
            return;
        }

        setBattleNotice(`${noticePrefix}${summaryText}`);
        queueEnemyTurn(false, {
            playerStatus: slotRound.workingPlayerStatus,
            enemyStatus: slotRound.workingEnemyStatus,
            playerHp: slotRound.workingPlayerHp,
            enemyHp: slotRound.workingEnemyHp
        });
        resetSlotRoundContext();
    }

    function stopNextSlotReel() {
        if (!slotIsSpinningRef.current) return;
        const requiredStopCount = Math.max(1, Math.min(3, Number(slotRequiredStopCountRef.current) || 3));
        const stoppedCount = Math.max(0, Math.min(requiredStopCount, Number(slotStoppedCountRef.current) || 0));
        if (stoppedCount >= requiredStopCount) return;

        const nextStoppedCount = stoppedCount + 1;
        commitSlotStoppedCount(nextStoppedCount);
        const reelStopIndex = Math.max(0, Math.min(2, nextStoppedCount - 1));
        const stoppedSymbolId = normalizeSlotSymbolId(slotReelsRef.current[reelStopIndex]);
        const isMatched = stoppedSymbolId === slotWeaponSymbolId;
        const didTriggerAttack = triggerSlotReelAttack({
            reelIndex: reelStopIndex,
            symbolId: stoppedSymbolId,
            matched: isMatched
        });
        const slotRound = slotRoundContextRef.current;
        const nextMatchedCount = Math.max(
            0,
            Math.round(Number(slotRound.active ? slotRound.matchedCount : slotWeaponHitCountRef.current) || 0)
        );
        if (didTriggerAttack) commitSlotWeaponHitCount(nextMatchedCount);
        if (!didTriggerAttack && !slotRound.active) {
            finalizeSlotSpin(slotReelsRef.current, { matchedCount: nextMatchedCount });
            return;
        }
        if (slotRound.playerDefeated || slotRound.enemyDefeated || nextStoppedCount >= requiredStopCount) {
            finalizeSlotSpin(slotReelsRef.current, { matchedCount: nextMatchedCount });
        }
    }

    function handleStartSlotSpin() {
        if (!selectedWeapon || isSlotUiLocked || slotIsSpinningRef.current) return;
        if (slotMode === 'auto' && !isSlotAutoUnlocked) return;
        playSound('slot_start');
        clearSlotMachineTimers();
        resetSlotRoundContext();
        setSlotSpinResult(null);
        commitSlotWeaponHitCount(0);
        commitSlotPreviewCombo(0);
        const thirdReelLocked = Math.max(0, Number(playerStatusRef.current?.freeze) || 0) > 0;
        commitSlotLockedReels([false, false, thirdReelLocked]);
        commitSlotRequiredStopCount(thirdReelLocked ? 2 : 3);
        commitSlotSpinning(true);
        commitSlotStoppedCount(0);
        const startIndices = createRandomSlotReelIndices({
            weaponSymbolId: slotWeaponSymbolId,
            weaponRateBonusPct: cardEffects.weaponRateBonusPct,
            coinRatePenaltyPct: cardEffects.coinRatePenaltyPct
        });
        if (thirdReelLocked) {
            startIndices[2] = Math.round(Number(slotReelIndicesRef.current?.[2]) || 0);
        }
        commitSlotReelIndices(startIndices);

        slotSpinIntervalRef.current = setInterval(() => {
            if (!slotIsSpinningRef.current) return;
            const requiredStopCount = Math.max(1, Math.min(3, Number(slotRequiredStopCountRef.current) || 3));
            const stoppedCount = Math.max(0, Math.min(requiredStopCount, Number(slotStoppedCountRef.current) || 0));
            if (stoppedCount >= requiredStopCount) return;
            const nextIndices = slotReelIndicesRef.current.map((value, index) => (
                index < stoppedCount || slotLockedReelsRef.current[index] ? value : (value + 1)
            ));
            commitSlotReelIndices(nextIndices);
        }, SLOT_SPIN_TICK_MS);

        if (slotMode === 'auto') {
            Array.from({ length: Math.max(1, Number(slotRequiredStopCountRef.current) || 3) }, (_, index) => index + 1).forEach((step) => {
                const timeoutId = setTimeout(() => {
                    stopNextSlotReel();
                }, slotAutoStopIntervalMs * step);
                slotAutoStopTimeoutIdsRef.current.push(timeoutId);
            });
        }
    }

    function handleStopSlotReel() {
        if (!isSlotSpinning || slotMode === 'auto') return;
        playSound('slot_click');
        stopNextSlotReel();
    }

    function handleToggleSlotMode(event) {
        const checked = Boolean(event?.target?.checked);
        if (isSlotSpinning) return;
        if (checked && !isSlotAutoUnlocked) return;
        playSound('click');
        setSlotMode(checked ? 'auto' : 'manual');
    }

    function commitBuildState(nextBuildState) {
        const normalized = nextBuildState || createDefaultBuildState();
        buildStateRef.current = normalized;
        setBuildState(normalized);
    }

    function resetBuildState() {
        commitBuildState(createDefaultBuildState());
    }

    function commitInventoryState(nextState) {
        const normalized = nextState || createDefaultInventoryState();
        inventoryStateRef.current = normalized;
        setInventoryState(normalized);
    }

    function updateInventoryState(updater) {
        setInventoryState((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            const normalized = next || createDefaultInventoryState();
            inventoryStateRef.current = normalized;
            return normalized;
        });
    }

    function resetInventoryState() {
        commitInventoryState(createDefaultInventoryState());
    }

    function commitRuntimeEffects(nextState) {
        const normalized = nextState || createDefaultRuntimeEffects();
        runtimeEffectsRef.current = normalized;
        setRuntimeEffects(normalized);
    }

    function updateRuntimeEffects(updater) {
        setRuntimeEffects((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            const normalized = next || createDefaultRuntimeEffects();
            runtimeEffectsRef.current = normalized;
            return normalized;
        });
    }

    function resetRuntimeEffects() {
        commitRuntimeEffects(createDefaultRuntimeEffects());
    }

    function openLevelUpSelection(trigger, pendingEncounter = null) {
        clearEnemyTurnTimer();
        setIsSkillModalOpen(false);
        closeReplacementFlow();
        setServiceModalState(null);
        setSlotFreeDrawModalState(createDefaultSlotFreeDrawModalState());
        setOpenShopId('');
        setLevelUpState({
            isOpen: true,
            trigger,
            candidates: drawLevelUpCandidates(LEVELUP_CANDIDATE_COUNT),
            pendingEncounter
        });
    }

    function closeLevelUpSelection() {
        setLevelUpState(createDefaultLevelUpState());
    }

    function handleRerollLevelUpCards() {
        if (!isLevelUpOpen) return;
        if (gold < LEVELUP_REROLL_COST) return;
        playSound('click');
        setGold((prev) => Math.max(0, prev - LEVELUP_REROLL_COST));
        setLevelUpState((prev) => ({
            ...prev,
            candidates: drawLevelUpCandidates(LEVELUP_CANDIDATE_COUNT)
        }));
        setBattleNotice(`已消耗 ${LEVELUP_REROLL_COST} 金幣刷新卡池。`);
    }

    function handleSelectLevelUpCard(cardId) {
        if (!isLevelUpOpen) return;
        const pickedCard = levelUpState.candidates.find((candidate) => candidate.id === cardId);
        if (!pickedCard || !selectedClass) return;

        playSound('click');

        const prevBuild = buildStateRef.current || createDefaultBuildState();
        const nextBuild = applyCardToBuildState(prevBuild, cardId);
        commitBuildState(nextBuild);

        const previousMaxHp = selectedClass.maxHp + (prevBuild.maxHpBonus || 0);
        const nextMaxHp = selectedClass.maxHp + (nextBuild.maxHpBonus || 0);
        const currentHpValue = playerHp ?? previousMaxHp;
        if (nextMaxHp !== previousMaxHp) {
            const boostedHp = clampHp(currentHpValue + (nextMaxHp - previousMaxHp), nextMaxHp);
            setPlayerHp(boostedHp);
        }

        const pendingEncounter = levelUpState.pendingEncounter;
        closeLevelUpSelection();

        if (pendingEncounter && Number.isFinite(pendingEncounter.nextFloor)) {
            spawnEncounterForFloor(
                pendingEncounter.nextFloor,
                pendingEncounter.lastKey || enemyAssetKey,
                { rerollStats: Boolean(pendingEncounter.rerollStats) }
            );
            setBattleNotice(`已獲得「${pickedCard.name}」，前進至第 ${pendingEncounter.nextFloor} 層。`);
            return;
        }

        setBattleNotice(`已獲得「${pickedCard.name}」，準備開戰。`);
    }

    function resolveCost(baseCost) {
        const baseResolved = resolveEffectiveCost(baseCost, effectiveTestFreeShop);
        if (baseResolved <= 0) return 0;
        const vipDiscount = itemSlot?.itemType === 'vip_card' ? SHOP_VIP_ITEM_DISCOUNT_PCT : 0;
        const cardDiscount = Math.max(0, Number(cardEffects.shopDiscountPct) || 0);
        const totalDiscount = Math.min(SHOP_TOTAL_DISCOUNT_MAX_PCT, vipDiscount + cardDiscount);
        return Math.max(0, Math.round(baseResolved * (1 - totalDiscount)));
    }

    function spendGoldForShop(baseCost) {
        const effectiveCost = resolveCost(baseCost);
        if (gold < effectiveCost) return { ok: false, baseCost, effectiveCost };
        if (effectiveCost > 0) {
            setGold((prev) => Math.max(0, prev - effectiveCost));
        }
        return { ok: true, baseCost, effectiveCost };
    }

    function handleOpenShop(shopId) {
        if (isDefeated || isCombatLocked) return;
        const canOpen = resolveShopAccess({
            shopId,
            enemyIsBoss,
            mysteryShopAvailable,
            unlimitedOpen: effectiveTestUnlimitedShop
        });
        if (!canOpen) {
            if (shopId === 'magic') {
                setBattleNotice('魔法商店僅在 Boss 關卡可開啟。');
                return;
            }
            if (shopId === 'mystery') {
                setBattleNotice('神秘商店尚未出現。');
                return;
            }
        }
        playSound('click');
        setIsSkillModalOpen(false);
        closeReplacementFlow();
        setServiceModalState(null);
        setOpenShopId(shopId);
        setShopModalNonce((prev) => prev + 1);
    }

    function handleCloseShop() {
        playSound('click');
        setServiceModalState(null);
        setOpenShopId('');
        closeReplacementFlow();
    }

    function withUpgradeSuffix(name, step = 1) {
        const baseName = typeof name === 'string' ? name : '武器';
        const match = baseName.match(/\+(\d+)$/);
        if (!match) return `${baseName}+${Math.max(1, step)}`;
        const current = Number(match[1]) || 0;
        return baseName.replace(/\+\d+$/, `+${Math.max(0, current + step)}`);
    }

    function buildWeaponFromShopItem(item) {
        if (!selectedClass || !item) return null;
        const baseAttack = Math.max(1, Math.round(Number(item.baseAttack) || 12));
        const weaponType = item.weaponType || 'sword';
        const rarityId = item.rarityId || 'common';
        const penaltyRate = getWeaponPenaltyRate(selectedClass.id, weaponType);
        const effectiveAttack = Math.max(1, Math.round(baseAttack * penaltyRate));
        return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: item.name || `${RARITY_DEFS[rarityId]?.name || ''}${weaponTypeName(weaponType)}`,
            rarityId,
            weaponType,
            elementId: item.elementId || pickRandomElementId(),
            variantIndex: clampVariantIndex(item.variantIndex),
            baseAttack,
            effectiveAttack,
            penaltyRate
        };
    }

    function buildServicePreview(item) {
        if (!item || item.kind !== 'service' || !selectedClass || !selectedWeapon || !playerPreview) return null;
        const effectiveCost = resolveCost(item.baseCost);
        const affordable = gold >= effectiveCost;
        const goldAfter = affordable ? Math.max(0, gold - effectiveCost) : gold;
        if (item.serviceType === 'enchant') {
            const candidateWeaponElementId = pickRandomElementId({ exclude: [selectedWeapon.elementId] });
            const currentAttackElementId = buildState.forcedElementId || selectedWeapon.elementId || 'water';
            const nextAttackElementId = buildState.forcedElementId || candidateWeaponElementId;
            const currentMatchup = getElementMatchup(currentAttackElementId, enemyElementId);
            const nextMatchup = getElementMatchup(nextAttackElementId, enemyElementId);
            const currentDelta = Math.round(playerPreview.attack * ((currentMatchup.multiplier || 1) - 1));
            const nextDelta = Math.round(playerPreview.attack * ((nextMatchup.multiplier || 1) - 1));
            return {
                serviceType: 'enchant',
                effectiveCost,
                affordable,
                goldBefore: gold,
                goldAfter,
                candidateWeaponElementId,
                currentAttackElementId,
                nextAttackElementId,
                currentMatchup,
                nextMatchup,
                currentDelta,
                nextDelta,
                forcedElementLocked: Boolean(buildState.forcedElementId)
            };
        }
        if (item.serviceType === 'upgrade') {
            const nextBaseAttack = Math.max(1, Math.round((selectedWeapon.baseAttack * 1.12) + 2));
            const penaltyRate = getWeaponPenaltyRate(selectedClass.id, selectedWeapon.weaponType);
            const nextEffectiveAttack = Math.max(1, Math.round(nextBaseAttack * penaltyRate));
            return {
                serviceType: 'upgrade',
                effectiveCost,
                affordable,
                goldBefore: gold,
                goldAfter,
                currentBaseAttack: selectedWeapon.baseAttack,
                currentEffectiveAttack: selectedWeapon.effectiveAttack,
                nextBaseAttack,
                nextEffectiveAttack,
                penaltyRate
            };
        }
        return {
            serviceType: item.serviceType,
            effectiveCost,
            affordable,
            goldBefore: gold,
            goldAfter
        };
    }

    function closeServiceModal({ silent = false } = {}) {
        if (!silent) playSound('click');
        setServiceModalState(null);
    }

    function openServiceModal(item) {
        if (!item || item.kind !== 'service') return;
        if (!selectedClass || !selectedWeapon || !playerPreview) {
            setBattleNotice('服務購買失敗：尚未裝備武器。');
            return;
        }
        const preview = buildServicePreview(item);
        if (!preview) {
            setBattleNotice('服務預覽建立失敗，請稍後再試。');
            return;
        }
        playSound('click');
        setOpenShopId('');
        closeReplacementFlow();
        setServiceModalState({
            isOpen: true,
            item,
            preview
        });
    }

    function handleConfirmServicePurchase() {
        const serviceItem = serviceModalState?.item;
        const preview = serviceModalState?.preview;
        if (!serviceItem) return;
        if (!selectedClass || !selectedWeapon) {
            setBattleNotice('服務購買失敗：尚未裝備武器。');
            closeServiceModal({ silent: true });
            return;
        }
        playSound('click');
        const spendResult = spendGoldForShop(serviceItem.baseCost);
        if (!spendResult.ok) {
            setBattleNotice(`服務購買失敗：金幣不足（需 ${spendResult.effectiveCost}）。`);
            return;
        }
        const costText = formatPurchaseCostText(spendResult);
        if (serviceItem.serviceType === 'enchant') {
            const nextElementId = preview?.candidateWeaponElementId
                || pickRandomElementId({ exclude: [selectedWeapon.elementId] });
            setSelectedWeapon((prev) => (prev ? { ...prev, elementId: nextElementId } : prev));
            setBattleNotice(`附魔完成，${costText}，武器元素已變更。`);
            closeServiceModal({ silent: true });
            return;
        }
        if (serviceItem.serviceType === 'upgrade') {
            const nextBaseAttack = Number(preview?.nextBaseAttack);
            const nextEffectiveAttack = Number(preview?.nextEffectiveAttack);
            const nextPenaltyRate = Number(preview?.penaltyRate);
            setSelectedWeapon((prev) => {
                if (!prev || !selectedClass) return prev;
                const boostedBase = Number.isFinite(nextBaseAttack)
                    ? Math.max(1, Math.round(nextBaseAttack))
                    : Math.max(1, Math.round((prev.baseAttack * 1.12) + 2));
                const penaltyRate = Number.isFinite(nextPenaltyRate)
                    ? nextPenaltyRate
                    : getWeaponPenaltyRate(selectedClass.id, prev.weaponType);
                const boostedEffective = Number.isFinite(nextEffectiveAttack)
                    ? Math.max(1, Math.round(nextEffectiveAttack))
                    : Math.max(1, Math.round(boostedBase * penaltyRate));
                return {
                    ...prev,
                    name: withUpgradeSuffix(prev.name, 1),
                    baseAttack: boostedBase,
                    effectiveAttack: boostedEffective,
                    penaltyRate
                };
            });
            setBattleNotice(`強化完成，${costText}，武器攻擊已提升。`);
            closeServiceModal({ silent: true });
            return;
        }
        setBattleNotice('未知服務類型，未套用效果。');
        closeServiceModal({ silent: true });
    }

    function createMysteryItemInstance(item) {
        if (!item) return null;
        const base = {
            ...item,
            oneShot: Boolean(item.oneShot),
            consumed: false,
            createdAt: Date.now()
        };
        switch (item.itemType) {
            case 'ring':
                return {
                    ...base,
                    attackBonusPct: Number(randomRange(0.05, 0.2).toFixed(3))
                };
            case 'amulet':
                return {
                    ...base,
                    skillAmpPct: Number(randomRange(0.05, 0.1).toFixed(3))
                };
            case 'bracelet':
                return {
                    ...base,
                    critDamageBonusPct: Number(randomRange(0.1, 0.5).toFixed(3))
                };
            case 'earring':
                return {
                    ...base,
                    luckPct: Number(randomRange(0.05, 0.2).toFixed(3))
                };
            case 'substitute':
                return {
                    ...base,
                    guardCount: 1
                };
            default:
                return base;
        }
    }

    function startReplacementFlow(flow) {
        if (!flow?.item) return;
        setReplacementFlowState({
            isOpen: true,
            ...flow
        });
    }

    function closeReplacementFlow() {
        setReplacementFlowState(null);
    }

    function formatPurchaseCostText(spendResult) {
        return spendResult.effectiveCost > 0
            ? `消耗 ${spendResult.effectiveCost} 金幣`
            : '免費購物生效，未扣金幣';
    }

    function applyShopPurchase(item, { replaceIndex = null } = {}) {
        if (!item) return { ok: false, notice: '購買失敗：無效商品。' };

        const label = `${activeShopMeta?.title || '商店'}購買「${item.name}」`;
        const currentInventory = inventoryStateRef.current || createDefaultInventoryState();
        if (item.kind === 'armor' && currentInventory.armorSlot && replaceIndex !== 0) {
            startReplacementFlow({ target: 'armor', item });
            return { ok: false, pending: true };
        }
        if (item.kind === 'mystery' && currentInventory.itemSlot && replaceIndex !== 0) {
            startReplacementFlow({ target: 'item', item });
            return { ok: false, pending: true };
        }
        if (item.kind === 'consumable') {
            const currentSlots = currentInventory.potionSlots || [];
            const stackIndex = currentSlots.findIndex((slot) => slot && slot.id === item.id && Number(slot.count) < Number(slot.maxStack || 9));
            const emptyIndex = currentSlots.findIndex((slot) => !slot);
            const needReplace = stackIndex < 0
                && emptyIndex < 0
                && !(Number.isInteger(replaceIndex) && replaceIndex >= 0 && replaceIndex < POTION_SLOT_COUNT);
            if (needReplace) {
                startReplacementFlow({ target: 'potion', item });
                return { ok: false, pending: true };
            }
        }
        if (item.kind === 'weapon' && !selectedClass) {
            return { ok: false, notice: `${label}失敗：尚未選擇職業。` };
        }
        if (item.kind === 'service') {
            return { ok: false, notice: '服務商品需進入專屬視窗確認。' };
        }

        const spendResult = spendGoldForShop(item.baseCost);
        if (!spendResult.ok) {
            return { ok: false, notice: `${label}失敗：金幣不足（需 ${spendResult.effectiveCost}）。` };
        }

        const costText = formatPurchaseCostText(spendResult);

        if (item.kind === 'weapon') {
            const nextWeapon = buildWeaponFromShopItem(item);
            if (!nextWeapon) return { ok: false, notice: `${label}失敗：武器資料異常。` };
            setSelectedWeapon(nextWeapon);
            return { ok: true, notice: `${label}完成，${costText}，已裝備 ${nextWeapon.name}。` };
        }

        if (item.kind === 'skill') {
            updateInventoryState((prev) => {
                const current = Math.max(0, Number(prev.ownedSkills?.[item.skillId] || 0));
                return {
                    ...prev,
                    ownedSkills: {
                        ...prev.ownedSkills,
                        [item.skillId]: current + 1
                    }
                };
            });
            return { ok: true, notice: `${label}完成，${costText}，技能卡 +1。` };
        }

        if (item.kind === 'armor') {
            updateInventoryState((prev) => ({
                ...prev,
                armorSlot: {
                    ...item,
                    equippedAt: Date.now()
                }
            }));
            return { ok: true, notice: `${label}完成，${costText}，防具已裝備。` };
        }

        if (item.kind === 'mystery') {
            updateInventoryState((prev) => ({
                ...prev,
                itemSlot: createMysteryItemInstance(item)
            }));
            return { ok: true, notice: `${label}完成，${costText}，道具已放入道具格。` };
        }

        if (item.kind === 'consumable') {
            const currentSlots = inventoryStateRef.current.potionSlots || [];
            const stackIndex = currentSlots.findIndex((slot) => slot && slot.id === item.id && Number(slot.count) < Number(slot.maxStack || 9));
            const emptyIndex = currentSlots.findIndex((slot) => !slot);
            let targetIndex = -1;
            if (stackIndex >= 0) targetIndex = stackIndex;
            else if (emptyIndex >= 0) targetIndex = emptyIndex;
            else if (Number.isInteger(replaceIndex) && replaceIndex >= 0 && replaceIndex < POTION_SLOT_COUNT) targetIndex = replaceIndex;
            else return { ok: false, notice: `${label}失敗：補品欄位已滿。` };
            updateInventoryState((prev) => {
                const nextSlots = [...(prev.potionSlots || [])];
                const existing = nextSlots[targetIndex];
                if (existing && existing.id === item.id) {
                    nextSlots[targetIndex] = {
                        ...existing,
                        count: Math.min(Number(existing.maxStack || 9), Number(existing.count || 0) + 1)
                    };
                } else {
                    nextSlots[targetIndex] = {
                        ...item,
                        count: 1,
                        slotIndex: targetIndex
                    };
                }
                return {
                    ...prev,
                    potionSlots: nextSlots
                };
            });
            return { ok: true, notice: `${label}完成，${costText}，補品已入庫。` };
        }

        return { ok: false, notice: `${label}失敗：未支援的商品類型。` };
    }

    function tryPurchaseShopItem(item, options = {}) {
        if (item?.kind === 'service') {
            openServiceModal(item);
            return;
        }
        const result = applyShopPurchase(item, options);
        if (result.pending) return;
        if (!result.ok) {
            if (result.notice) setBattleNotice(result.notice);
            return;
        }
        closeReplacementFlow();
        setBattleNotice(result.notice);
    }

    function handleConfirmReplacement(slotIndex) {
        if (!replacementFlowState?.item) return;
        const replaceIndex = replacementFlowState.target === 'potion' ? slotIndex : 0;
        tryPurchaseShopItem(replacementFlowState.item, { replaceIndex });
    }

    function handleNormalShopRefreshDemo() {
        if (!canRefreshNormalShop) {
            if (floor % 5 !== 0) {
                setBattleNotice('常駐商店刷新僅在每 5 層可使用一次。');
                return;
            }
            setBattleNotice(`第 ${floor} 層的常駐商店刷新已使用過。`);
            return;
        }
        const spendResult = spendGoldForShop(NORMAL_SHOP_REFRESH_COST);
        if (!spendResult.ok) {
            setBattleNotice(`常駐商店刷新失敗：金幣不足（需 ${spendResult.effectiveCost}）。`);
            return;
        }
        setNormalShopRefreshUsedAtFloor(floor);
        const costText = spendResult.effectiveCost > 0
            ? `消耗 ${spendResult.effectiveCost} 金幣`
            : '免費購物生效，未扣金幣';
        setShopModalNonce((prev) => prev + 1);
        setBattleNotice(`常駐商店已刷新，${costText}。`);
    }

    function commitPlayerStatus(nextStatus) {
        const normalized = normalizeStatus(nextStatus);
        playerStatusRef.current = normalized;
        setPlayerStatus(normalized);
    }

    function commitEnemyStatus(nextStatus) {
        const normalized = normalizeStatus(nextStatus);
        enemyStatusRef.current = normalized;
        setEnemyStatus(normalized);
    }

    function resetElementStatusState() {
        commitPlayerStatus(createEmptyStatus());
        commitEnemyStatus(createEmptyStatus());
    }

    function clearScratchFx({ resetState = true } = {}) {
        scratchTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        scratchTimeoutIdsRef.current = [];
        lastScratchAtRef.current = { player: 0, enemy: 0 };
        if (!resetState) return;
        setPlayerScratchFx([]);
        setEnemyScratchFx([]);
    }

    function clearElementAttackFx({ resetState = true } = {}) {
        elementFxTimerIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        elementFxTimerIdsRef.current = [];
        if (!resetState) return;
        setEnemyElementAttackFx([]);
    }

    function resetVisualEffects() {
        clearScratchFx();
        clearElementAttackFx();
        setIsPlayerHitFxActive(false);
        setIsEnemyHitFxActive(false);
        setPlayerDamageFloats([]);
        setEnemyDamageFloats([]);
    }

    function resetToClassState() {
        clearEnemyTurnTimer();
        clearEncounterTransition();
        clearSlotMachineTimers();
        closeLevelUpSelection();
        resetBuildState();
        setPhase('class');
        setSelectedClassId('');
        setDrawnWeapon(null);
        setSelectedWeapon(null);
        setDrawCount(0);
        setPlayerHp(null);
        setGold(0);
        setFloor(1);
        setEnemyLevel(1);
        setEnemyMaxHp(BASE_ENEMY_PREVIEW.maxHp);
        setEnemyHp(BASE_ENEMY_PREVIEW.maxHp);
        setEnemyAttack(BASE_ENEMY_PREVIEW.attack);
        setEnemyIsBoss(false);
        setEnemyIsSpecialNormal(false);
        setEnemyRewardMultiplier(1);
        setEnemyElementId('water');
        setEnemyAssetKey('');
        setEnemyName('塔內怪物');
        setEnemyImageSrc('');
        setEnemyIntentId('attack');
        setEnemyGuardActive(false);
        setIsSkillModalOpen(false);
        closeReplacementFlow();
        setServiceModalState(null);
        setOpenShopId('');
        setNormalShopRefreshUsedAtFloor(null);
        setMysteryShopAvailable(false);
        setMysteryShopExpireOnNextVictory(false);
        setIsDefeated(false);
        setIsEnemyTurnPending(false);
        setIsDevToolsExpanded(false);
        setIsBattleInfoExpanded(false);
        setIsPlayerAvatarBroken(false);
        setIsEnemyAvatarBroken(false);
        resetInventoryState();
        resetRuntimeEffects();
        resetElementStatusState();
        clearElementAttackFx();
        resetVisualEffects();
        resetSlotMachineState();
        setBattleNoticeHistory([]);
        setBattleNotice('準備開始戰鬥。');
    }

    function spawnEncounterForFloor(nextFloor, lastKey = enemyAssetKey, { rerollStats = false } = {}) {
        clearEnemyTurnTimer();
        const luckBonusPct = Math.max(0, Number(calcItemPassiveModifiers(inventoryStateRef.current.itemSlot).luckPct) || 0);
        const specialWeightScale = 1 + luckBonusPct;
        const encounter = buildEnemyForFloor({
            floor: nextFloor,
            lastAssetKey: lastKey,
            rerollStats,
            specialWeightScale
        });
        setFloor(encounter.floor);
        setEnemyLevel(encounter.level);
        setEnemyMaxHp(encounter.maxHp);
        setEnemyHp(encounter.maxHp);
        setEnemyAttack(encounter.attack);
        setEnemyIsBoss(encounter.isBoss);
        setEnemyIsSpecialNormal(Boolean(encounter.isSpecialNormal));
        setEnemyRewardMultiplier(Math.max(1, Number(encounter.rewardMultiplier) || 1));
        setEnemyElementId(encounter.elementId);
        setEnemyAssetKey(encounter.assetKey);
        setEnemyName(encounter.name);
        setEnemyImageSrc(encounter.imageSrc);
        setEnemyIntentId(encounter.intentId);
        setEnemyGuardActive(false);
        setIsEnemyAvatarBroken(false);
        resetElementStatusState();
        updateRuntimeEffects((prev) => ({
            ...prev,
            enemyPoisonPct: 0,
            timeStopUntil: 0,
            timeStopEnemyKey: ''
        }));
    }

    function queueEncounterTransition({ nextFloor, lastKey = enemyAssetKey, rerollStats = false, notice = '' } = {}) {
        if (!Number.isFinite(nextFloor)) return;
        clearEncounterTransition();
        setEncounterTransitionPhase('enemy_knockout');

        const knockoutTimerId = setTimeout(() => {
            encounterTransitionTimerIdsRef.current = encounterTransitionTimerIdsRef.current.filter((savedId) => savedId !== knockoutTimerId);
            spawnEncounterForFloor(nextFloor, lastKey, { rerollStats: Boolean(rerollStats) });
            setEncounterTransitionPhase('enemy_entry');
            if (notice) setBattleNotice(notice);

            const entryTimerId = setTimeout(() => {
                encounterTransitionTimerIdsRef.current = encounterTransitionTimerIdsRef.current.filter((savedId) => savedId !== entryTimerId);
                setEncounterTransitionPhase('idle');
            }, ENCOUNTER_ENEMY_ENTRY_DURATION_MS);
            encounterTransitionTimerIdsRef.current.push(entryTimerId);
        }, ENCOUNTER_ENEMY_KNOCKOUT_DURATION_MS);
        encounterTransitionTimerIdsRef.current.push(knockoutTimerId);
    }

    function startBattleRun(resetGold = true) {
        if (!selectedClass || !selectedWeapon) return;
        clearEnemyTurnTimer();
        clearEncounterTransition();
        clearSlotMachineTimers();
        closeLevelUpSelection();
        resetBuildState();
        setIsDefeated(false);
        setIsSkillModalOpen(false);
        closeReplacementFlow();
        setServiceModalState(null);
        setOpenShopId('');
        setIsDevToolsExpanded(false);
        setNormalShopRefreshUsedAtFloor(null);
        setIsEnemyTurnPending(false);
        setPlayerHp(selectedClass.maxHp);
        if (resetGold) setGold(0);
        setIsBattleInfoExpanded(false);
        setMysteryShopAvailable(false);
        setMysteryShopExpireOnNextVictory(false);
        resetInventoryState();
        resetRuntimeEffects();
        resetElementStatusState();
        clearElementAttackFx();
        resetVisualEffects();
        resetSlotMachineState();
        setBattleNoticeHistory([]);
        spawnEncounterForFloor(1, '');
        openLevelUpSelection('opening');
        setBattleNotice('開局升級：請先選擇一張卡片。');
    }

    function triggerHitFx(target) {
        if (target === 'player') {
            if (playerHitTimerRef.current) clearTimeout(playerHitTimerRef.current);
            setIsPlayerHitFxActive(false);
            requestAnimationFrame(() => {
                setIsPlayerHitFxActive(true);
                playerHitTimerRef.current = setTimeout(() => {
                    setIsPlayerHitFxActive(false);
                    playerHitTimerRef.current = null;
                }, 190);
            });
            return;
        }
        if (enemyHitTimerRef.current) clearTimeout(enemyHitTimerRef.current);
        setIsEnemyHitFxActive(false);
        requestAnimationFrame(() => {
            setIsEnemyHitFxActive(true);
            enemyHitTimerRef.current = setTimeout(() => {
                setIsEnemyHitFxActive(false);
                enemyHitTimerRef.current = null;
            }, 190);
        });
    }

    function spawnDamageFloat(target, amount, isCrit = false) {
        const dmg = Math.max(1, Math.round(Number(amount) || 0));
        const id = ++floatIdRef.current;
        const baseX = target === 'player' ? 30 : 70;
        const entry = {
            id,
            text: `-${dmg}`,
            x: Math.max(8, Math.min(92, baseX + ((Math.random() * 12) - 6))),
            y: 10 + (Math.random() * 8),
            isCrit: Boolean(isCrit)
        };
        if (target === 'player') setPlayerDamageFloats((prev) => [...prev, entry]);
        else setEnemyDamageFloats((prev) => [...prev, entry]);

        const timeoutId = setTimeout(() => {
            if (target === 'player') setPlayerDamageFloats((prev) => prev.filter((item) => item.id !== id));
            else setEnemyDamageFloats((prev) => prev.filter((item) => item.id !== id));
            floatTimeoutIdsRef.current = floatTimeoutIdsRef.current.filter((savedId) => savedId !== timeoutId);
        }, DAMAGE_FLOAT_DURATION_MS);
        floatTimeoutIdsRef.current.push(timeoutId);
    }

    function shouldSpawnScratchFx(damageSource) {
        return SCRATCH_DAMAGE_SOURCES.has(String(damageSource || ''));
    }

    function resolveElementAttackFrameSrc(entry) {
        if (!entry) return '';
        const preset = resolveElementAttackFxPreset(entry.elementId);
        if (!preset || preset.mode !== entry.mode) return '';
        const frameIndex = Math.max(0, Math.min(preset.frameSrcList.length - 1, Math.round(Number(entry.frameIndex) || 0)));
        return preset.frameSrcList[frameIndex] || '';
    }

    function removeEnemyElementAttackFxById(id) {
        setEnemyElementAttackFx((prev) => prev.filter((entry) => entry.id !== id));
    }

    function advanceElementFxFrame(id) {
        setEnemyElementAttackFx((prev) => {
            const next = [...prev];
            const index = next.findIndex((entry) => entry.id === id);
            if (index < 0) return prev;
            next[index] = {
                ...next[index],
                frameIndex: Math.max(0, Math.round(Number(next[index].frameIndex) || 0) + 1)
            };
            return next;
        });
    }

    function spawnEnemyElementAttackFx(elementId) {
        const preset = resolveElementAttackFxPreset(elementId);
        if (!preset) return;
        const id = ++elementFxIdRef.current;
        const jitterX = (Math.random() * 4) - 2;
        const jitterY = (Math.random() * 4) - 2;
        const baseEndX = 56 + (jitterX * 0.28);
        const baseEndY = 50 + (jitterY * 0.28);
        const entry = preset.mode === 'projectile'
            ? {
                id,
                elementId: preset.elementId,
                mode: 'projectile',
                frameIndex: 0,
                x: baseEndX,
                y: baseEndY,
                startX: -128 + jitterX,
                startY: 58 + jitterY,
                endX: baseEndX,
                endY: baseEndY
            }
            : {
                id,
                elementId: preset.elementId,
                mode: 'impact',
                frameIndex: 0,
                x: baseEndX,
                y: baseEndY,
                startX: baseEndX,
                startY: baseEndY,
                endX: baseEndX,
                endY: baseEndY
            };
        setEnemyElementAttackFx((prev) => [...prev, entry]);

        const frameCount = Math.max(1, preset.frameSrcList.length);
        const frameMs = Math.max(16, Number(ELEMENT_ATTACK_FRAME_MS[preset.mode]) || 64);
        for (let step = 1; step <= frameCount; step += 1) {
            const timeoutId = setTimeout(() => {
                elementFxTimerIdsRef.current = elementFxTimerIdsRef.current.filter((savedId) => savedId !== timeoutId);
                if (step < frameCount) {
                    advanceElementFxFrame(id);
                    return;
                }
                removeEnemyElementAttackFxById(id);
            }, frameMs * step);
            elementFxTimerIdsRef.current.push(timeoutId);
        }
    }

    function spawnScratchFx(target, { isCrit = false, mirrored = false } = {}) {
        if (target !== 'player' && target !== 'enemy') return;
        const now = Date.now();
        const lastHitAt = Number(lastScratchAtRef.current?.[target]) || 0;
        if ((now - lastHitAt) < SCRATCH_FX_COOLDOWN_MS) return;
        lastScratchAtRef.current = {
            ...lastScratchAtRef.current,
            [target]: now
        };

        const id = ++scratchIdRef.current;
        const baseX = target === 'player' ? 38 : 62;
        const entry = {
            id,
            x: Math.max(18, Math.min(82, baseX + ((Math.random() * 12) - 6))),
            y: Math.max(24, Math.min(80, 44 + ((Math.random() * 14) - 7))),
            scale: Number((0.9 + (Math.random() * 0.22)).toFixed(3)),
            mirrored: Boolean(mirrored),
            isCrit: Boolean(isCrit)
        };
        if (target === 'player') setPlayerScratchFx((prev) => [...prev, entry]);
        else setEnemyScratchFx((prev) => [...prev, entry]);

        const timeoutId = setTimeout(() => {
            if (target === 'player') setPlayerScratchFx((prev) => prev.filter((item) => item.id !== id));
            else setEnemyScratchFx((prev) => prev.filter((item) => item.id !== id));
            scratchTimeoutIdsRef.current = scratchTimeoutIdsRef.current.filter((savedId) => savedId !== timeoutId);
        }, SCRATCH_FX_DURATION_MS);
        scratchTimeoutIdsRef.current.push(timeoutId);
    }

    function consumeEnemyGuard(amount) {
        const value = Math.max(1, Math.round(amount));
        if (!enemyGuardActive) return { amount: value, guarded: false };
        setEnemyGuardActive(false);
        return { amount: Math.max(1, Math.round(value * 0.65)), guarded: true };
    }

    function applyDamageToEnemy(amount, isCrit = false, sound = 'attack', fromHp = enemyHp, { damageSource = '' } = {}) {
        const currentHp = Math.max(0, Number(fromHp) || 0);
        if (currentHp <= 0) return { actual: 0, defeated: true, nextHp: 0 };
        const actual = Math.min(currentHp, Math.max(1, Math.round(amount)));
        const nextHp = clampHp(currentHp - actual, enemyMaxHp);
        triggerHitFx('enemy');
        spawnDamageFloat('enemy', actual, isCrit);
        if (
            actual > 0
            && shouldSpawnScratchFx(damageSource)
            && !ENEMY_SCRATCH_BLOCKED_DAMAGE_SOURCES.has(String(damageSource || ''))
        ) {
            spawnScratchFx('enemy', { isCrit, mirrored: false });
        }
        playSound(sound);
        if (actual >= Math.round(enemyMaxHp * 0.28) || isCrit) shakeScreen('light');
        setEnemyHp(nextHp);
        return { actual, defeated: nextHp <= 0, nextHp };
    }

    function applyDamageToPlayer(
        amount,
        fromHp = (playerHp ?? playerMaxHp ?? selectedClass?.maxHp ?? 0),
        sound = 'hit',
        { ignoreModifiers = false, skipEvasion = false, damageSource = '' } = {}
    ) {
        if (!selectedClass) return { actual: 0, defeated: false, nextHp: 0 };
        const currentHp = Math.max(0, Number(fromHp) || 0);
        if (currentHp <= 0) return { actual: 0, defeated: true, nextHp: 0 };
        const runtime = runtimeEffectsRef.current || createDefaultRuntimeEffects();
        if (!ignoreModifiers && !skipEvasion && Number(runtime.phantomTurns) > 0 && Math.random() < PHANTOM_EVADE_RATE) {
            playSound('defend');
            return { actual: 0, defeated: false, nextHp: currentHp, evaded: true };
        }
        const baseDamage = Math.max(1, Math.round(Number(amount) || 1));
        let resolvedDamage = baseDamage;
        if (!ignoreModifiers) {
            const enrageIncomingMul = Number(runtime.enrageIncomingTurns) > 0 ? 2 : 1;
            const phantomIncomingMul = Number(runtime.phantomTurns) > 0 ? (1 + PHANTOM_INCOMING_BONUS) : 1;
            const incomingMul = Math.max(0, Number(buildStateRef.current?.incomingMultiplier) || 1)
                * Math.max(0, Number(runtime.unknownIncomingMul) || 1)
                * enrageIncomingMul
                * phantomIncomingMul;
            const burnDefenseDisabled = Math.max(0, Number(playerStatusRef.current?.burn) || 0) > 0;
            const armorReduction = burnDefenseDisabled
                ? 0
                : Math.max(0, Number(inventoryStateRef.current.armorSlot?.damageReductionPct) || 0);
            const reductionRaw = burnDefenseDisabled
                ? 0
                : ((Number(buildStateRef.current?.damageReductionPct) || 0)
                    + armorReduction
                    + (Number(runtime.unknownDefensePct) || 0));
            const reduction = burnDefenseDisabled
                ? 0
                : Math.max(-0.5, Math.min(MAX_DAMAGE_REDUCTION, reductionRaw));
            const cardIncomingMul = Math.max(0.1, Number(cardEffects.directDamageTakenMul) || 1);
            resolvedDamage = Math.max(1, Math.round((baseDamage * incomingMul) * (1 - reduction) * cardIncomingMul));
        }
        const rawDamage = Math.min(currentHp, resolvedDamage);
        let actual = isTestInvincible ? 0 : rawDamage;
        let nextHp = clampHp(currentHp - actual, playerMaxHp || selectedClass.maxHp);
        let blockedBySubstitute = false;
        if (!isTestInvincible && nextHp <= 0) {
            const currentItem = inventoryStateRef.current.itemSlot;
            if (currentItem?.itemType === 'substitute' && Number(currentItem.guardCount) > 0) {
                blockedBySubstitute = true;
                nextHp = 1;
                actual = Math.max(0, currentHp - nextHp);
                updateInventoryState((prev) => ({
                    ...prev,
                    itemSlot: null
                }));
            }
        }
        triggerHitFx('player');
        spawnDamageFloat('player', rawDamage, false);
        if (rawDamage > 0 && shouldSpawnScratchFx(damageSource)) {
            spawnScratchFx('player', { isCrit: false, mirrored: true });
        }
        playSound(sound);
        if (rawDamage >= Math.round((playerMaxHp || selectedClass.maxHp) * 0.24)) shakeScreen('light');
        setPlayerHp(nextHp);
        return {
            actual,
            defeated: !isTestInvincible && nextHp <= 0,
            nextHp,
            blockedBySubstitute
        };
    }

    function applyHealToPlayer(amount, fromHp = (playerHp ?? selectedClass?.maxHp ?? 0)) {
        if (!selectedClass) return { healed: 0, nextHp: fromHp };
        const maxHp = playerMaxHp || selectedClass.maxHp;
        const currentHp = clampHp(Number(fromHp) || 0, maxHp);
        const healed = clampHp(currentHp + Math.max(0, Math.round(amount)), maxHp) - currentHp;
        const nextHp = currentHp + healed;
        if (healed > 0) setPlayerHp(nextHp);
        return { healed, nextHp };
    }

    function applyHealToEnemy(amount, fromHp = enemyHp) {
        const currentHp = clampHp(Number(fromHp) || 0, enemyMaxHp);
        const healed = clampHp(currentHp + Math.max(0, Math.round(amount)), enemyMaxHp) - currentHp;
        const nextHp = currentHp + healed;
        if (healed > 0) setEnemyHp(nextHp);
        return { healed, nextHp };
    }

    function applyDruidRegen(currentHp) {
        if (!selectedClass || selectedClass.id !== 'druid') return { healed: 0, nextHp: currentHp };
        const maxHp = playerMaxHp || selectedClass.maxHp;
        if (currentHp >= maxHp) return { healed: 0, nextHp: currentHp };
        const healAmount = Math.max(1, Math.round(maxHp * 0.03));
        return applyHealToPlayer(healAmount, currentHp);
    }

    function consumePlayerActionBuffs() {
        updateRuntimeEffects((prev) => {
            if (Number(prev.attackBuffTurns) <= 0) {
                return prev;
            }
            const remaining = Math.max(0, Number(prev.attackBuffTurns) - 1);
            return {
                ...prev,
                attackBuffTurns: remaining,
                attackBuffMultiplier: remaining > 0 ? prev.attackBuffMultiplier : 1
            };
        });
    }

    function consumeEnemyTurnBuffs() {
        updateRuntimeEffects((prev) => ({
            ...prev,
            enrageIncomingTurns: Math.max(0, Number(prev.enrageIncomingTurns) - 1),
            phantomTurns: Math.max(0, Number(prev.phantomTurns) - 1)
        }));
    }

    function applyCompanionStrike(currentEnemyHp) {
        const companion = runtimeEffectsRef.current?.companion;
        if (!companion || Number(companion.hp) <= 0) {
            return { nextEnemyHp: currentEnemyHp, actual: 0, defeated: false };
        }
        const strikeBase = Math.max(1, Number(companion.attack) || Math.round(enemyAttack * 0.7));
        const strike = applyDamageToEnemy(strikeBase, false, 'attack', currentEnemyHp, { damageSource: 'companion' });
        return {
            nextEnemyHp: strike.nextHp,
            actual: strike.actual,
            defeated: strike.defeated
        };
    }

    function applyDamageToCompanion(rawAmount) {
        const companion = runtimeEffectsRef.current?.companion;
        if (!companion || Number(companion.hp) <= 0) {
            return { actual: 0, defeated: false };
        }
        const incoming = Math.max(1, Math.round(Number(rawAmount) || 1));
        const doubled = Math.max(1, Math.round(incoming * 2));
        const actual = Math.min(Math.max(1, Number(companion.hp) || 1), doubled);
        const nextHp = Math.max(0, (Number(companion.hp) || 0) - actual);
        updateRuntimeEffects((prev) => ({
            ...prev,
            companion: nextHp > 0
                ? {
                    ...(prev.companion || companion),
                    hp: nextHp
                }
                : null
        }));
        return { actual, defeated: nextHp <= 0 };
    }

    function rollNextEnemyIntent() {
        setEnemyIntentId(pickEnemyIntentId(enemyIsBoss));
    }

    function buildMatchupNotice(attackerElementId, defenderElementId, matchup) {
        if (!matchup || matchup.relation === 'neutral') return '';
        const attacker = elementInfo(attackerElementId);
        const defender = elementInfo(defenderElementId);
        return `${MATCHUP_TEXT[matchup.relation]}（${attacker.name}→${defender.name}）`;
    }

    function applyPlayerStatusCardImmunity(status, notes = []) {
        let nextStatus = normalizeStatus(status);
        if (!cardEffects.immunePoisonBurn) return nextStatus;
        let removed = false;
        if (nextStatus.poison > 0) {
            nextStatus = { ...nextStatus, poison: 0 };
            removed = true;
        }
        if (nextStatus.burn > 0) {
            nextStatus = { ...nextStatus, burn: 0 };
            removed = true;
        }
        if (removed) notes.push('堅韌體魄：免疫中毒與燃燒');
        return nextStatus;
    }

    function processPlayerTurnStart() {
        if (!selectedClass) return { blocked: true, reason: 'invalid', notes: [], nextHp: 0, nextStatus: normalizeStatus(playerStatusRef.current) };
        let nextStatus = normalizeStatus(playerStatusRef.current);
        let nextHp = playerHp ?? playerMaxHp ?? selectedClass.maxHp;
        const notes = [];
        nextStatus = applyPlayerStatusCardImmunity(nextStatus, notes);

        const poisonTick = resolvePoisonTick(nextStatus, nextHp);
        nextStatus = poisonTick.nextStatus;
        if (poisonTick.damage > 0) {
            const poisonHit = applyDamageToPlayer(poisonTick.damage, nextHp, 'hit', {
                ignoreModifiers: true,
                skipEvasion: true,
                damageSource: 'poison'
            });
            nextHp = poisonHit.nextHp;
            notes.push(`中毒造成 ${poisonHit.actual} 傷害`);
            if (poisonHit.defeated) {
                commitPlayerStatus(nextStatus);
                setIsDefeated(true);
                setBattleNotice(`${notes.join('，')}，你被擊倒了。`);
                return { blocked: true, reason: 'defeated', notes, nextHp, nextStatus };
            }
        }

        if (nextStatus.burn > 0) notes.push('燃燒中：本回合減傷失效');
        if (nextStatus.freeze > 0) {
            nextStatus.freeze = Math.max(0, nextStatus.freeze - 1);
            notes.push('冰凍中：第 3 軸鎖定');
        }

        nextStatus = applyPlayerStatusCardImmunity(nextStatus, notes);
        commitPlayerStatus(nextStatus);
        return { blocked: false, reason: 'ready', notes, nextHp, nextStatus };
    }

    function handleEnemyDefeated() {
        const defeatedEnemyName = currentEnemyName;
        const shouldExpireMysteryShop = mysteryShopAvailable && mysteryShopExpireOnNextVictory;
        if (shouldExpireMysteryShop) {
            setMysteryShopAvailable(false);
            setMysteryShopExpireOnNextVictory(false);
            if (openShopId === 'mystery') setOpenShopId('');
        }

        const baseRewardRaw = (enemyIsBoss ? VICTORY_GOLD_BASE_BOSS : VICTORY_GOLD_BASE_NORMAL) + Math.round(floor * VICTORY_GOLD_PER_FLOOR);
        const baseReward = Math.max(1, Math.round(baseRewardRaw * (1 + Math.max(0, cardEffects.victoryGoldBonusPct))));
        const rewardMultiplier = enemyIsBoss ? 1 : Math.max(1, Math.round(Number(enemyRewardMultiplier) || 1));
        const reward = baseReward * rewardMultiplier;
        const nextFloor = floor + 1;
        setGold((prev) => prev + reward);
        let mysteryTriggered = false;
        const runtime = runtimeEffectsRef.current || createDefaultRuntimeEffects();
        const luckBonus = Math.max(0, Number(calcItemPassiveModifiers(inventoryStateRef.current.itemSlot).luckPct) || 0);
        const mysteryRate = MYSTERY_SHOP_TRIGGER_RATE * (1 + luckBonus);
        if (!runtime.mysteryShopLocked && !mysteryShopAvailable && Math.random() < mysteryRate) {
            setMysteryShopAvailable(true);
            setMysteryShopExpireOnNextVictory(true);
            mysteryTriggered = true;
        }
        const mysteryNotice = mysteryTriggered ? ' 神秘商店出現（持續到下一場勝利）。' : '';
        if (enemyIsBoss) {
            openLevelUpSelection('boss', {
                nextFloor,
                lastKey: enemyAssetKey,
                rerollStats: false
            });
            setBattleNotice(`${defeatedEnemyName} 已擊敗！獲得 ${reward} 金幣，請先選擇升級卡。${mysteryNotice}`);
            return;
        }
        const victoryNotice = (enemyIsSpecialNormal && rewardMultiplier > 1)
            ? `${defeatedEnemyName}（特殊）已擊敗！獲得 ${reward} 金幣（${rewardMultiplier} 倍掉落），前進到第 ${nextFloor} 層。${mysteryNotice}`
            : `${defeatedEnemyName} 已擊敗！獲得 ${reward} 金幣，前進到第 ${nextFloor} 層。${mysteryNotice}`;
        queueEncounterTransition({
            nextFloor,
            lastKey: enemyAssetKey,
            rerollStats: false,
            notice: victoryNotice
        });
    }

    function resolveEnemyTurn(playerDefending, context = {}) {
        if (!selectedClass || !selectedWeapon) return;
        let workingEnemyHp = Number.isFinite(context.enemyHp) ? context.enemyHp : enemyHp;
        let workingPlayerHp = Number.isFinite(context.playerHp) ? context.playerHp : (playerHp ?? playerMaxHp ?? selectedClass.maxHp);
        let workingEnemyStatus = normalizeStatus(context.enemyStatus || enemyStatusRef.current);
        let workingPlayerStatus = normalizeStatus(context.playerStatus || playerStatusRef.current);
        const notices = [];
        let enemyTurnConsumed = false;
        const finalizeEnemyTurn = () => {
            if (enemyTurnConsumed) return;
            enemyTurnConsumed = true;
            consumeEnemyTurnBuffs();
        };
        const commitTurnStatuses = () => {
            if (workingPlayerStatus.burn > 0) {
                workingPlayerStatus = {
                    ...workingPlayerStatus,
                    burn: Math.max(0, Number(workingPlayerStatus.burn) - 1)
                };
            }
            commitEnemyStatus(workingEnemyStatus);
            commitPlayerStatus(workingPlayerStatus);
        };

        const enemyPoisonTick = resolvePoisonTick(workingEnemyStatus, workingEnemyHp);
        workingEnemyStatus = enemyPoisonTick.nextStatus;
        if (enemyPoisonTick.damage > 0) {
            const poisonHit = applyDamageToEnemy(enemyPoisonTick.damage, false, 'hit', workingEnemyHp, { damageSource: 'poison' });
            workingEnemyHp = poisonHit.nextHp;
            notices.push(`${currentEnemyName}中毒受到 ${poisonHit.actual} 傷害`);
            if (poisonHit.defeated) {
                commitTurnStatuses();
                setBattleNotice(`${notices.join('，')}，${currentEnemyName}倒下。`);
                handleEnemyDefeated();
                return;
            }
        }

        if (workingEnemyStatus.burn > 0) {
            workingEnemyStatus = {
                ...workingEnemyStatus,
                burn: Math.max(0, Number(workingEnemyStatus.burn) - 1)
            };
        }
        if (workingEnemyStatus.freeze > 0) {
            workingEnemyStatus = {
                ...workingEnemyStatus,
                freeze: Math.max(0, Number(workingEnemyStatus.freeze) - 1)
            };
        }

        const poisonPct = Math.max(0, Number(runtimeEffectsRef.current?.enemyPoisonPct) || 0);
        if (poisonPct > 0) {
            const poisonDamage = Math.max(1, Math.round(workingEnemyHp * poisonPct));
            const poisonHit = applyDamageToEnemy(poisonDamage, false, 'hit', workingEnemyHp, { damageSource: 'poison' });
            workingEnemyHp = poisonHit.nextHp;
            notices.push(`${currentEnemyName}中毒受到 ${poisonHit.actual} 傷害`);
            if (poisonHit.defeated) {
                commitTurnStatuses();
                setBattleNotice(`${notices.join('，')}，${currentEnemyName}倒下。`);
                handleEnemyDefeated();
                return;
            }
        }

        if (enemyIntentId === 'guard') {
            setEnemyGuardActive(true);
            commitTurnStatuses();
            playSound('defend');
            rollNextEnemyIntent();
            notices.push(`${currentEnemyName}進入防禦姿態，下次受擊會減傷`);
            finalizeEnemyTurn();
            setBattleNotice(notices.join('，'));
            return;
        }

        let incoming = enemyIntentId === 'heavy' ? Math.round(enemyAttack * 1.55) : enemyAttack;
        if (enemyIntentId === 'heavy') shakeScreen('light');

        const enemyMatchup = getElementMatchup(enemyElementId, selectedWeapon.elementId);
        incoming = Math.max(1, Math.round(incoming * enemyMatchup.multiplier));
        const enemyMatchupNotice = buildMatchupNotice(enemyElementId, selectedWeapon.elementId, enemyMatchup);
        if (enemyMatchupNotice) notices.push(enemyMatchupNotice);

        if (playerDefending) {
            playSound('defend');
            const parryChance = enemyIntentId === 'heavy' ? 0.28 : 0.2;
            if (Math.random() < parryChance) {
                const reflected = consumeEnemyGuard(Math.max(1, Math.round((playerPreview?.attack || 10) * 0.55)));
                const reflectedResult = applyDamageToEnemy(reflected.amount, false, 'defend', workingEnemyHp, { damageSource: 'counter' });
                workingEnemyHp = reflectedResult.nextHp;
                shakeScreen('light');
                commitTurnStatuses();
                if (reflectedResult.defeated) {
                    setBattleNotice(`${notices.join('，')}${notices.length ? '，' : ''}盾反成功！反彈 ${reflectedResult.actual} 傷害並擊倒 ${currentEnemyName}。`);
                    handleEnemyDefeated();
                    return;
                }
                rollNextEnemyIntent();
                finalizeEnemyTurn();
                setBattleNotice(`${notices.join('，')}${notices.length ? '，' : ''}盾反成功！反彈 ${reflectedResult.actual} 傷害。`);
                return;
            }
            incoming = Math.max(1, Math.round(incoming * 0.5));
        }

        const enemyOnHit = resolveElementalOnHit({
            attackerElementId: enemyElementId,
            attackerStatus: workingEnemyStatus,
            defenderStatus: workingPlayerStatus
        });
        workingEnemyStatus = enemyOnHit.nextAttackerStatus;
        workingPlayerStatus = applyPlayerStatusCardImmunity(enemyOnHit.nextDefenderStatus, notices);
        incoming = Math.max(1, Math.round(incoming * enemyOnHit.hitDamageMultiplier));
        if (enemyOnHit.reactionNotes.length) notices.push(`反應：${enemyOnHit.reactionNotes.join('/')}`);
        if (enemyOnHit.effectNotes.length) notices.push(`附加：${enemyOnHit.effectNotes.join('/')}`);

        const hit = applyDamageToPlayer(incoming, workingPlayerHp, 'hit', { damageSource: 'attack' });
        workingPlayerHp = hit.nextHp;
        if (hit.evaded) notices.push('幻影生效，成功閃避本次攻擊');
        if (hit.blockedBySubstitute) notices.push('替身生效，擋下致死傷害');
        if (hit.defeated) {
            commitTurnStatuses();
            setIsDefeated(true);
            finalizeEnemyTurn();
            setBattleNotice(`${notices.join('，')}${notices.length ? '，' : ''}${currentEnemyName}攻擊造成 ${hit.actual} 傷害，你被擊倒了。`);
            return;
        }

        const missReflectPct = Math.max(0, Number(context.missReflectPct) || 0);
        if (missReflectPct > 0 && hit.actual > 0 && workingEnemyHp > 0) {
            const reflectedAmount = Math.max(1, Math.round(hit.actual * missReflectPct));
            const reflectedHit = applyDamageToEnemy(reflectedAmount, false, 'defend', workingEnemyHp, { damageSource: 'counter' });
            workingEnemyHp = reflectedHit.nextHp;
            notices.push(`荊棘反甲反彈 ${reflectedHit.actual} 傷害`);
            if (reflectedHit.defeated) {
                commitTurnStatuses();
                finalizeEnemyTurn();
                setBattleNotice(`${notices.join('，')}，${currentEnemyName}被反彈擊倒。`);
                handleEnemyDefeated();
                return;
            }
        }

        const loneGambleMul = Math.max(1, Number(context.loneGambleMul) || 1);
        if (loneGambleMul > 1 && hit.actual > 0) {
            updateRuntimeEffects((prev) => ({
                ...prev,
                nextJackpotBonusMul: Math.max(1, Number(prev.nextJackpotBonusMul) || 1, loneGambleMul)
            }));
            notices.push(`孤注一擲蓄力：下次大獎攻擊 x${loneGambleMul}`);
        }

        if (enemyOnHit.lifestealRate > 0) {
            const enemyHeal = applyHealToEnemy(Math.round(hit.actual * enemyOnHit.lifestealRate), workingEnemyHp);
            workingEnemyHp = enemyHeal.nextHp;
            if (enemyHeal.healed > 0) notices.push(`${currentEnemyName}吸血回復 ${enemyHeal.healed} HP`);
        }

        const companionHit = applyDamageToCompanion(incoming);
        if (companionHit.actual > 0) {
            notices.push(`魅惑同伴承受 ${companionHit.actual} 傷害`);
            if (companionHit.defeated) notices.push('魅惑同伴已倒下');
        }

        const druidHeal = applyDruidRegen(workingPlayerHp);
        workingPlayerHp = druidHeal.nextHp;
        if (druidHeal.healed > 0) notices.push(`德魯伊回復 ${druidHeal.healed} HP`);

        commitTurnStatuses();
        rollNextEnemyIntent();
        finalizeEnemyTurn();
        const intentLabel = enemyIntentId === 'heavy' ? '重擊' : '攻擊';
        setBattleNotice(`${notices.join('，')}${notices.length ? '，' : ''}${playerDefending ? '防禦後，' : ''}${currentEnemyName}${intentLabel}造成 ${hit.actual} 傷害。`);
    }

    function queueEnemyTurn(playerDefending, context = {}) {
        if (isLevelUpOpen || isServiceModalOpen) return;
        clearEnemyTurnTimer();
        setIsEnemyTurnPending(true);
        enemyTurnTimerRef.current = setTimeout(() => {
            enemyTurnTimerRef.current = null;
            try {
                resolveEnemyTurn(playerDefending, context);
            } finally {
                setIsEnemyTurnPending(false);
            }
        }, ENEMY_TURN_DELAY_MS);
    }

    function executePlayerAttackCore({
        actionLabel = '攻擊',
        strikeCount = 1,
        baseDamageMul = 1,
        fixedDamageMul = null,
        missRate = 0,
        critChanceBonus = 0,
        forceCrit = false,
        attackElementId = effectivePlayerAttackElementId,
        visualElementId = null,
        enableElementMechanics = true,
        applyPoison = false,
        poisonPct = ENEMY_POISON_RATE,
        executeThreshold = 0,
        executeBossAllowed = false,
        selfCostPct = 0,
        extraNotices = [],
        bonusTrueDamagePct = 0,
        convertDamageToSelfHeal = false,
        workingPlayerHp = playerHp,
        workingEnemyHp = enemyHp,
        workingPlayerStatus = playerStatusRef.current,
        workingEnemyStatus = enemyStatusRef.current,
        notes = []
    } = {}) {
        const notices = [...(Array.isArray(notes) ? notes : []), ...extraNotices];
        const maxPlayerHp = playerMaxHp || selectedClass.maxHp;
        let nextPlayerHp = Number.isFinite(workingPlayerHp) ? workingPlayerHp : (playerHp ?? maxPlayerHp);
        let nextEnemyHp = Number.isFinite(workingEnemyHp) ? workingEnemyHp : enemyHp;
        let nextPlayerStatus = normalizeStatus(workingPlayerStatus);
        let nextEnemyStatus = normalizeStatus(workingEnemyStatus);
        const runtime = runtimeEffectsRef.current || createDefaultRuntimeEffects();
        const safeAttackElementId = attackElementId || effectivePlayerAttackElementId;
        const safeVisualElementId = visualElementId || safeAttackElementId;
        const lowHpDamageMulActive = cardEffects.lowHpDamageMul > 1
            && ((nextPlayerHp / Math.max(1, maxPlayerHp)) < 0.3);
        if (lowHpDamageMulActive) {
            notices.push(`破釜沉舟：最終傷害 x${Number(cardEffects.lowHpDamageMul).toFixed(2)}`);
        }

        const attackSelfHitRate = Math.max(0, Number(buildStateRef.current?.selfDamageOnAttackPct) || 0);
        const attackSelfHitAmount = Math.max(1, Math.round((playerMaxHp || selectedClass.maxHp) * attackSelfHitRate));
        if (selfCostPct > 0) {
            const selfCost = Math.max(1, Math.round((playerMaxHp || selectedClass.maxHp) * selfCostPct));
            const selfCostHit = applyDamageToPlayer(selfCost, nextPlayerHp, 'hit', {
                ignoreModifiers: true,
                skipEvasion: true,
                damageSource: 'self_cost'
            });
            nextPlayerHp = selfCostHit.nextHp;
            notices.push(`${actionLabel}消耗 ${selfCostHit.actual} HP`);
            if (selfCostHit.defeated) {
                return {
                    status: 'self_cost_defeat',
                    notices,
                    workingPlayerHp: nextPlayerHp,
                    workingEnemyHp: nextEnemyHp,
                    workingPlayerStatus: nextPlayerStatus,
                    workingEnemyStatus: nextEnemyStatus,
                    totalStrikeDamage: 0,
                    didCrit: false,
                    didGuarded: false,
                    playerDefeated: true,
                    enemyDefeated: nextEnemyHp <= 0,
                    strikeSummary: ''
                };
            }
        }

        if (safeVisualElementId === 'fire' || safeVisualElementId === 'water' || safeVisualElementId === 'plant') {
            spawnEnemyElementAttackFx(safeVisualElementId);
        }
        playSound('attack');

        if (executeThreshold > 0 && !enemyIsBoss && (nextEnemyHp / Math.max(1, enemyMaxHp)) <= executeThreshold) {
            const executeHit = applyDamageToEnemy(nextEnemyHp, true, 'attack', nextEnemyHp, { damageSource: 'execute' });
            nextEnemyHp = executeHit.nextHp;
            return {
                status: 'execute_success',
                executeDamage: executeHit.actual,
                notices,
                workingPlayerHp: nextPlayerHp,
                workingEnemyHp: nextEnemyHp,
                workingPlayerStatus: nextPlayerStatus,
                workingEnemyStatus: nextEnemyStatus,
                totalStrikeDamage: executeHit.actual,
                didCrit: true,
                didGuarded: false,
                playerDefeated: false,
                enemyDefeated: true,
                strikeSummary: ''
            };
        }
        if (executeThreshold > 0) {
            if (enemyIsBoss && !executeBossAllowed) {
                notices.push(`處決對 ${currentEnemyName} 無效`);
            } else {
                notices.push(`${currentEnemyName}血量高於 ${Math.round(executeThreshold * 100)}%，處決失敗`);
            }
            return {
                status: 'execute_failed',
                notices,
                workingPlayerHp: nextPlayerHp,
                workingEnemyHp: nextEnemyHp,
                workingPlayerStatus: nextPlayerStatus,
                workingEnemyStatus: nextEnemyStatus,
                totalStrikeDamage: 0,
                didCrit: false,
                didGuarded: false,
                playerDefeated: false,
                enemyDefeated: false,
                strikeSummary: ''
            };
        }

        let totalStrikeDamage = 0;
        let totalConvertedHealing = 0;
        let didCrit = false;
        let didGuarded = false;
        const playerMatchup = enableElementMechanics
            ? getElementMatchup(safeAttackElementId, enemyElementId)
            : { multiplier: 1, relation: 'neutral' };
        if (enableElementMechanics) {
            const playerMatchupNotice = buildMatchupNotice(safeAttackElementId, enemyElementId, playerMatchup);
            if (playerMatchupNotice) notices.push(playerMatchupNotice);
        }

        const onHit = enableElementMechanics
            ? resolveElementalOnHit({
                attackerElementId: safeAttackElementId,
                attackerStatus: nextPlayerStatus,
                defenderStatus: nextEnemyStatus
            })
            : {
                nextAttackerStatus: normalizeStatus(nextPlayerStatus),
                nextDefenderStatus: normalizeStatus(nextEnemyStatus),
                hitDamageMultiplier: 1,
                lifestealRate: 0,
                reactionNotes: [],
                effectNotes: []
            };
        nextPlayerStatus = applyPlayerStatusCardImmunity(onHit.nextAttackerStatus, notices);
        nextEnemyStatus = onHit.nextDefenderStatus;
        if (enableElementMechanics && onHit.reactionNotes.length) notices.push(`反應：${onHit.reactionNotes.join('/')}`);
        if (enableElementMechanics && onHit.effectNotes.length) notices.push(`附加：${onHit.effectNotes.join('/')}`);

        if (applyPoison) {
            updateRuntimeEffects((prev) => ({
                ...prev,
                enemyPoisonPct: Math.max(Number(prev.enemyPoisonPct) || 0, poisonPct)
            }));
            notices.push(`中毒生效（每回合 ${Math.round(poisonPct * 100)}%）`);
        }

        for (let strikeIndex = 0; strikeIndex < Math.max(1, strikeCount); strikeIndex += 1) {
            if (Math.random() < missRate) {
                notices.push(`${actionLabel} 第 ${strikeIndex + 1} 段落空`);
                continue;
            }
            let outgoing = Math.max(1, Math.round(playerPreview.attack * (0.88 + (Math.random() * 0.24))));
            outgoing = Math.max(1, Math.round(outgoing * baseDamageMul));
            if (fixedDamageMul !== null) {
                outgoing = Math.max(1, Math.round(playerPreview.attack * fixedDamageMul));
            }
            const activeAttackBuffMul = Number(runtime.attackBuffTurns) > 0
                ? Math.max(0.1, Number(runtime.attackBuffMultiplier) || 1)
                : 1;
            const outgoingMultiplier = Math.max(0, Number(buildStateRef.current?.outgoingMultiplier) || 1)
                * Math.max(0, Number(runtime.unknownOutgoingMul) || 1)
                * activeAttackBuffMul;
            outgoing = Math.max(1, Math.round(outgoing * outgoingMultiplier));
            outgoing = Math.max(1, Math.round(outgoing * playerMatchup.multiplier));
            outgoing = Math.max(1, Math.round(outgoing * onHit.hitDamageMultiplier));
            if (enemyIsBoss && cardEffects.bossDamageMul > 1) {
                outgoing = Math.max(1, Math.round(outgoing * cardEffects.bossDamageMul));
            }
            if (lowHpDamageMulActive) {
                outgoing = Math.max(1, Math.round(outgoing * cardEffects.lowHpDamageMul));
            }

            const fullHpCritBonusPct = nextPlayerHp >= maxPlayerHp
                ? Math.max(0, Number(cardEffects.fullHpCritBonusPct) || 0)
                : 0;
            const critRate = clampRate(
                BASE_PLAYER_CRIT_RATE + critChanceBonus + fullHpCritBonusPct + Math.max(0, Number(runtime.unknownCritChanceBonus) || 0),
                0,
                0.95
            );
            const isCrit = forceCrit || Math.random() < critRate;
            if (isCrit) {
                const critDamageBonusPct = Math.max(0, Number(buildStateRef.current?.critDamageBonusPct) || 0)
                    + Math.max(0, Number(calcItemPassiveModifiers(inventoryStateRef.current.itemSlot).critDamageBonusPct) || 0);
                outgoing = Math.max(1, Math.round(outgoing * (BASE_CRIT_MULTIPLIER + critDamageBonusPct)));
                didCrit = true;
            }

            const guarded = consumeEnemyGuard(outgoing);
            didGuarded = didGuarded || guarded.guarded;
            if (convertDamageToSelfHeal) {
                totalConvertedHealing += Math.max(1, Math.round(guarded.amount));
                continue;
            }
            const strike = applyDamageToEnemy(guarded.amount, isCrit, 'attack', nextEnemyHp, { damageSource: 'attack' });
            nextEnemyHp = strike.nextHp;
            totalStrikeDamage += strike.actual;
            if (onHit.lifestealRate > 0 && strike.actual > 0) {
                const playerHeal = applyHealToPlayer(Math.round(strike.actual * onHit.lifestealRate), nextPlayerHp);
                nextPlayerHp = playerHeal.nextHp;
                if (playerHeal.healed > 0) notices.push(`吸血回復 ${playerHeal.healed} HP`);
            }
            if (strike.defeated) break;
        }

        if (convertDamageToSelfHeal && totalConvertedHealing > 0) {
            const convertedHeal = applyHealToPlayer(totalConvertedHealing, nextPlayerHp);
            nextPlayerHp = convertedHeal.nextHp;
            notices.push(`毒素轉換：回復 ${convertedHeal.healed} HP`);
        }

        if (!convertDamageToSelfHeal && bonusTrueDamagePct > 0 && nextEnemyHp > 0) {
            const trueDamage = Math.max(1, Math.round(nextEnemyHp * bonusTrueDamagePct));
            const trueStrike = applyDamageToEnemy(trueDamage, false, 'attack', nextEnemyHp, { damageSource: 'attack' });
            nextEnemyHp = trueStrike.nextHp;
            totalStrikeDamage += trueStrike.actual;
            if (trueStrike.actual > 0) notices.push(`連擊突破追加真傷 ${trueStrike.actual}`);
        }

        if (!convertDamageToSelfHeal) {
            const companionStrike = applyCompanionStrike(nextEnemyHp);
            if (companionStrike.actual > 0) {
                nextEnemyHp = companionStrike.nextEnemyHp;
                totalStrikeDamage += companionStrike.actual;
                notices.push(`魅惑同伴追加 ${companionStrike.actual} 傷害`);
            }
        }

        let selfHit = { actual: 0, defeated: false, nextHp: nextPlayerHp };
        if (attackSelfHitRate > 0) {
            selfHit = applyDamageToPlayer(attackSelfHitAmount, nextPlayerHp, 'hit', {
                ignoreModifiers: true,
                skipEvasion: true,
                damageSource: 'recoil'
            });
            nextPlayerHp = selfHit.nextHp;
            notices.push(selfHit.actual > 0 ? `焦渴之炎反噬 ${selfHit.actual} 傷害` : '焦渴之炎反噬被無敵抵銷');
        }

        const strikeSummary = `你使用「${actionLabel}」對 ${currentEnemyName} 造成 ${totalStrikeDamage} 傷害${didCrit ? '（暴擊）' : ''}${didGuarded ? '（敵方防禦減傷）' : ''}`;
        return {
            status: 'resolved',
            notices,
            workingPlayerHp: nextPlayerHp,
            workingEnemyHp: nextEnemyHp,
            workingPlayerStatus: nextPlayerStatus,
            workingEnemyStatus: nextEnemyStatus,
            totalStrikeDamage,
            didCrit,
            didGuarded,
            playerDefeated: selfHit.defeated,
            enemyDefeated: nextEnemyHp <= 0,
            strikeSummary
        };
    }

    function performPlayerAttackAction({
        actionLabel = '攻擊',
        strikeCount = 1,
        baseDamageMul = 1,
        fixedDamageMul = null,
        missRate = 0,
        critChanceBonus = 0,
        forceCrit = false,
        forceElementId = null,
        visualElementId = null,
        enableElementMechanics = true,
        applyPoison = false,
        poisonPct = ENEMY_POISON_RATE,
        executeThreshold = 0,
        executeBossAllowed = false,
        selfCostPct = 0,
        skipEnemyTurn = false,
        extraNotices = [],
        bonusTrueDamagePct = 0,
        convertDamageToSelfHeal = false
    } = {}) {
        if (!selectedClass || !selectedWeapon || !playerPreview) return;
        if (isDefeated || isEnemyTurnPending || isLevelUpOpen || isShopModalOpen || isReplacementModalOpen || isServiceModalOpen) return;

        setOpenShopId('');
        const turnStart = processPlayerTurnStart();
        if (turnStart.blocked) return;

        let actionConsumed = false;
        const finalizeAction = () => {
            if (actionConsumed) return;
            actionConsumed = true;
            consumePlayerActionBuffs();
        };

        const attackResult = executePlayerAttackCore({
            actionLabel,
            strikeCount,
            baseDamageMul,
            fixedDamageMul,
            missRate,
            critChanceBonus,
            forceCrit,
            attackElementId: forceElementId || effectivePlayerAttackElementId,
            visualElementId,
            enableElementMechanics,
            applyPoison,
            poisonPct,
            executeThreshold,
            executeBossAllowed,
            selfCostPct,
            extraNotices,
            bonusTrueDamagePct,
            convertDamageToSelfHeal,
            workingPlayerHp: turnStart.nextHp,
            workingEnemyHp: enemyHp,
            workingPlayerStatus: normalizeStatus(turnStart.nextStatus),
            workingEnemyStatus: normalizeStatus(enemyStatusRef.current),
            notes: turnStart.notes
        });

        commitPlayerStatus(attackResult.workingPlayerStatus);
        commitEnemyStatus(attackResult.workingEnemyStatus);
        finalizeAction();

        if (attackResult.status === 'self_cost_defeat') {
            setIsDefeated(true);
            setBattleNotice(`${attackResult.notices.join('，')}，你倒下了。`);
            return;
        }

        if (attackResult.status === 'execute_success') {
            setBattleNotice(`「${actionLabel}」發動，直接處決 ${currentEnemyName}（${attackResult.executeDamage}）。`);
            handleEnemyDefeated();
            return;
        }

        if (attackResult.status === 'execute_failed') {
            setBattleNotice(attackResult.notices.join('，'));
            if (!skipEnemyTurn) {
                queueEnemyTurn(false, {
                    playerStatus: attackResult.workingPlayerStatus,
                    enemyStatus: attackResult.workingEnemyStatus,
                    playerHp: attackResult.workingPlayerHp,
                    enemyHp: attackResult.workingEnemyHp
                });
            }
            return;
        }

        const strikeSummary = attackResult.strikeSummary;
        const noticePrefix = attackResult.notices.length ? `${attackResult.notices.join('，')}，` : '';
        if (attackResult.playerDefeated) {
            setIsDefeated(true);
            if (attackResult.enemyDefeated) {
                setBattleNotice(`${noticePrefix}${strikeSummary}，成功擊敗 ${currentEnemyName}，但你在反噬中倒下。`);
                return;
            }
            setBattleNotice(`${noticePrefix}${strikeSummary}，但你在反噬中倒下。`);
            return;
        }

        if (attackResult.enemyDefeated) {
            setBattleNotice(`${noticePrefix}${strikeSummary}，成功擊敗 ${currentEnemyName}。`);
            handleEnemyDefeated();
            return;
        }

        if (skipEnemyTurn) {
            setBattleNotice(`${noticePrefix}${strikeSummary}，時間暫停中，${currentEnemyName} 暫不行動。`);
            return;
        }

        setBattleNotice(`${noticePrefix}${strikeSummary}`);
        queueEnemyTurn(false, {
            playerStatus: attackResult.workingPlayerStatus,
            enemyStatus: attackResult.workingEnemyStatus,
            playerHp: attackResult.workingPlayerHp,
            enemyHp: attackResult.workingEnemyHp
        });
    }

    /**
     * @deprecated Legacy slot settlement flow. Current slot attacks resolve immediately per reel.
     */
    function resolveSlotOutcomeAttack(outcome, { clearStoredResult = true } = {}) {
        if (!selectedClass || !selectedWeapon || isDefeated || isCombatLocked) return false;
        if (!outcome) return false;
        if (clearStoredResult) setSlotSpinResult(null);

        const rewardGold = Math.max(
            0,
            Number(outcome.coinReward) || calcSlotCoinReward(outcome.coinMultiplier, floor)
        );
        if (rewardGold > 0) {
            setGold((prev) => prev + rewardGold);
        }

        const slotNotices = [];
        if (Array.isArray(outcome.appliedCleanseList) && outcome.appliedCleanseList.length > 0) {
            slotNotices.push(`拉霸淨化：解除${outcome.appliedCleanseList.join('、')}`);
        }
        if (rewardGold > 0) {
            slotNotices.push(`拉霸金幣 +${rewardGold}`);
        }

        const skipEnemyTurn = Number(runtimeEffectsRef.current?.timeStopUntil) > Date.now();
        if (outcome.type === 'heal') {
            runUtilityAction('治癒之泉', ({ playerHp }) => {
                const healPct = Math.max(0, Number(outcome.healPct) || 0) + Math.max(0, Number(cardEffects.nonWeaponTripletHealBonusPct) || 0);
                const healAmount = Math.max(1, Math.round((playerMaxHp || selectedClass.maxHp) * healPct));
                const healed = applyHealToPlayer(healAmount, playerHp);
                return {
                    playerHp: healed.nextHp,
                    notice: `治癒之泉回復 ${healed.healed} HP。`
                };
            }, {
                skipEnemyTurn,
                extraNotices: slotNotices
            });
            return true;
        }

        if (outcome.type === 'miss') {
            if (cardEffects.missComboFloorEnabled) {
                slotNotices.push('安全氣囊：Miss 只扣 1 層 Combo');
            }
            runUtilityAction('空包彈 / Miss', () => ({
                notice: `拉霸未命中，${currentEnemyName}趁勢反擊。`
            }), {
                skipEnemyTurn: false,
                extraNotices: slotNotices,
                enemyTurnContext: {
                    missReflectPct: cardEffects.missReflectPct,
                    loneGambleMul: cardEffects.loneGambleJackpotMul
                }
            });
            return true;
        }

        const comboMul = calcSlotComboDamageMultiplier(outcome.comboPreview);
        if (comboMul > 1) {
            slotNotices.push(`Combo 傷害倍率 x${comboMul}`);
        }
        const slotDamageMul = Math.max(1, Number(outcome.damageMultiplier) || 1);
        let finalDamageMul = Math.max(1, slotDamageMul * comboMul);

        const jackpotBoostMul = outcome.type === 'jackpot'
            ? Math.max(1, Number(runtimeEffectsRef.current?.nextJackpotBonusMul) || 1)
            : 1;
        if (outcome.type === 'jackpot' && jackpotBoostMul > 1) {
            finalDamageMul = Math.max(1, finalDamageMul * jackpotBoostMul);
            slotNotices.push(`孤注一擲：大獎倍率 x${jackpotBoostMul}`);
            updateRuntimeEffects((prev) => ({ ...prev, nextJackpotBonusMul: 1 }));
        } else if (outcome.type !== 'jackpot' && Math.max(1, Number(runtimeEffectsRef.current?.nextJackpotBonusMul) || 1) > 1) {
            slotNotices.push('孤注一擲未命中：本次未觸發大獎加成');
            updateRuntimeEffects((prev) => ({ ...prev, nextJackpotBonusMul: 1 }));
        }

        const comboTrueDamagePct = Math.max(0, Number(cardEffects.comboTrueDamagePctPerStep) || 0)
            * Math.max(0, Math.round(Number(outcome.comboPreview) || 0) - 2);
        if (comboTrueDamagePct > 0) {
            slotNotices.push(`連擊突破：追加 ${Math.round(comboTrueDamagePct * 100)}% 真傷`);
        }

        const poisonConvertActive = Boolean(
            cardEffects.poisonTwoWeaponHeal
            && outcome.type === 'normal'
            && Math.max(0, Number(playerStatusRef.current?.poison) || 0) > 0
        );
        if (poisonConvertActive) {
            slotNotices.push('毒素轉換：本次雙連傷害改為回血');
        }

        performPlayerAttackAction({
            actionLabel: outcome.title || '普通攻擊',
            baseDamageMul: finalDamageMul,
            skipEnemyTurn,
            extraNotices: slotNotices,
            bonusTrueDamagePct: comboTrueDamagePct,
            convertDamageToSelfHeal: poisonConvertActive
        });
        return true;
    }

    function handleAttack() {
        if (!selectedClass || !selectedWeapon || isDefeated || isCombatLocked) return;
        if (isSlotSpinning) {
            setBattleNotice(`拉霸轉軸中：每停一軸都會攻擊，武器匹配為 x${SLOT_MATCHED_DAMAGE_MULTIPLIER}。`);
            return;
        }
        setBattleNotice(`攻擊採拉霸即時觸發：每停一軸都會攻擊，武器匹配為 x${SLOT_MATCHED_DAMAGE_MULTIPLIER}。`);
    }

    function consumeSkillCard(skillId) {
        const current = Math.max(0, Number(inventoryStateRef.current?.ownedSkills?.[skillId] || 0));
        if (current <= 0) return false;
        updateInventoryState((prev) => {
            const nextCount = Math.max(0, Number(prev.ownedSkills?.[skillId] || 0) - 1);
            const nextSkills = { ...prev.ownedSkills };
            if (nextCount <= 0) delete nextSkills[skillId];
            else nextSkills[skillId] = nextCount;
            return {
                ...prev,
                ownedSkills: nextSkills
            };
        });
        return true;
    }

    function handleOpenSkillModal() {
        if (isDefeated || isCombatLocked) return;
        playSound('click');
        setOpenShopId('');
        setIsSkillModalOpen(true);
    }

    function handleCloseSkillModal() {
        playSound('click');
        setIsSkillModalOpen(false);
    }

    function runUtilityAction(
        actionLabel,
        applyEffect,
        { skipEnemyTurn = false, extraNotices = [], enemyTurnContext = null } = {}
    ) {
        if (!selectedClass || !selectedWeapon || !playerPreview) return;
        if (isDefeated || isEnemyTurnPending || isLevelUpOpen || isShopModalOpen || isReplacementModalOpen || isServiceModalOpen) return;
        if (slotSpinResult) setSlotSpinResult(null);
        const turnStart = processPlayerTurnStart();
        if (turnStart.blocked) return;

        const notices = [...turnStart.notes, ...extraNotices];
        let workingPlayerStatus = normalizeStatus(turnStart.nextStatus);
        let workingEnemyStatus = normalizeStatus(enemyStatusRef.current);
        let workingPlayerHp = turnStart.nextHp;
        const effectResult = applyEffect({
            notices,
            playerStatus: workingPlayerStatus,
            enemyStatus: workingEnemyStatus,
            playerHp: workingPlayerHp
        }) || {};
        workingPlayerStatus = normalizeStatus(effectResult.playerStatus || workingPlayerStatus);
        workingEnemyStatus = normalizeStatus(effectResult.enemyStatus || workingEnemyStatus);
        workingPlayerHp = Number.isFinite(effectResult.playerHp) ? effectResult.playerHp : workingPlayerHp;
        commitPlayerStatus(workingPlayerStatus);
        commitEnemyStatus(workingEnemyStatus);
        consumePlayerActionBuffs();
        const noticeText = effectResult.notice || `${actionLabel}已使用。`;
        setBattleNotice(`${notices.join('，')}${notices.length ? '，' : ''}${noticeText}`);
        const finalSkipEnemyTurn = Boolean(skipEnemyTurn || effectResult.skipEnemyTurn);
        const queuedEnemyHp = Number.isFinite(effectResult.enemyHp) ? effectResult.enemyHp : enemyHp;
        if (!finalSkipEnemyTurn) {
            queueEnemyTurn(false, {
                playerStatus: workingPlayerStatus,
                enemyStatus: workingEnemyStatus,
                playerHp: workingPlayerHp,
                enemyHp: queuedEnemyHp,
                ...(enemyTurnContext || {})
            });
        }
    }

    function handleUsePotion(slotIndex) {
        if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= POTION_SLOT_COUNT) return;
        const potion = inventoryStateRef.current?.potionSlots?.[slotIndex];
        if (!potion) {
            setBattleNotice(`補品格 ${slotIndex + 1} 目前為空。`);
            return;
        }
        setIsSkillModalOpen(false);
        runUtilityAction(`補品 ${slotIndex + 1}`, ({ playerHp }) => {
            const notices = [];
            let nextHp = playerHp;
            if (potion.consumableType === 'heal') {
                const healPct = Math.max(0, Number(potion.healPct) || 0) + Math.max(0, Number(cardEffects.potionHealBonusPct) || 0);
                const healAmount = Math.max(1, Math.round((playerMaxHp || selectedClass.maxHp) * healPct));
                const healed = applyHealToPlayer(healAmount, playerHp);
                nextHp = healed.nextHp;
                notices.push(`回復 ${healed.healed} HP`);
            }
            if (potion.consumableType === 'attack_buff') {
                updateRuntimeEffects((prev) => ({
                    ...prev,
                    attackBuffMultiplier: Math.max(Number(prev.attackBuffMultiplier) || 1, Number(potion.attackMul) || 1),
                    attackBuffTurns: Math.max(Number(prev.attackBuffTurns) || 0, Number(potion.durationTurns) || 1)
                }));
                notices.push(`獲得 ${Number(potion.durationTurns) || 1} 回合增傷`);
            }
            updateInventoryState((prev) => {
                const nextSlots = [...(prev.potionSlots || [])];
                const current = nextSlots[slotIndex];
                if (!current) return prev;
                const nextCount = Math.max(0, Number(current.count || 0) - 1);
                nextSlots[slotIndex] = nextCount > 0
                    ? { ...current, count: nextCount }
                    : null;
                return {
                    ...prev,
                    potionSlots: nextSlots
                };
            });
            return {
                playerHp: nextHp,
                notice: `使用「${potion.name}」${notices.length ? `，${notices.join('，')}` : ''}。`
            };
        }, {
            skipEnemyTurn: Number(runtimeEffectsRef.current?.timeStopUntil) > Date.now()
        });
    }

    function handleUseItemSlot() {
        const item = inventoryStateRef.current?.itemSlot;
        if (!item) {
            setBattleNotice('道具格目前為空。');
            return;
        }
        setIsSkillModalOpen(false);
        if (!item.oneShot) {
            setBattleNotice(`「${item.name}」為常駐被動，已自動生效。`);
            return;
        }
        runUtilityAction(item.name, ({ notices, playerHp }) => {
            let nextHp = playerHp;
            let notice = `使用「${item.name}」`;
            let nextItemSlot = null;
            if (item.itemType === 'unknown_potion') {
                const roll = Math.floor(Math.random() * 7);
                if (roll === 0) {
                    const heal = applyHealToPlayer(Math.round((playerMaxHp || selectedClass.maxHp) * 0.2), playerHp);
                    nextHp = heal.nextHp;
                    notice += `，觸發正面效果：回復 ${heal.healed} HP`;
                } else if (roll === 1) {
                    const loss = applyDamageToPlayer(Math.round((playerMaxHp || selectedClass.maxHp) * 0.1), playerHp, 'hit', { ignoreModifiers: true, skipEvasion: true, damageSource: 'item_self' });
                    nextHp = loss.nextHp;
                    notice += `，觸發負面效果：失去 ${loss.actual} HP`;
                } else if (roll === 2) {
                    updateRuntimeEffects((prev) => ({ ...prev, unknownAttackPct: (Number(prev.unknownAttackPct) || 0) + 0.1 }));
                    notice += '，觸發正面效果：傷害 +10%';
                } else if (roll === 3) {
                    updateRuntimeEffects((prev) => ({ ...prev, unknownAttackPct: (Number(prev.unknownAttackPct) || 0) - 0.05 }));
                    notice += '，觸發負面效果：傷害 -5%';
                } else if (roll === 4) {
                    updateRuntimeEffects((prev) => ({ ...prev, unknownDefensePct: (Number(prev.unknownDefensePct) || 0) + 0.1 }));
                    notice += '，觸發正面效果：防禦 +10%';
                } else if (roll === 5) {
                    updateRuntimeEffects((prev) => ({ ...prev, unknownDefensePct: (Number(prev.unknownDefensePct) || 0) - 0.05 }));
                    notice += '，觸發負面效果：防禦 -5%';
                } else {
                    const skillIds = Object.keys(inventoryStateRef.current?.ownedSkills || {});
                    const randomSkillId = skillIds[Math.floor(Math.random() * skillIds.length)];
                    if (randomSkillId) {
                        notices.push(`藥效觸發技能：${getSkillItemMeta(randomSkillId)?.name || randomSkillId}`);
                    } else {
                        notices.push('藥效未觸發技能（技能庫為空）');
                    }
                }
            } else if (item.itemType === 'weapon_exchange' && selectedWeapon) {
                const rarityOrder = ['common', 'advanced', 'rare', 'epic', 'legendary'];
                const currentIndex = Math.max(0, rarityOrder.indexOf(selectedWeapon.rarityId));
                const direction = Math.random() < 0.5 ? -1 : 1;
                const nextIndex = Math.max(0, Math.min(rarityOrder.length - 1, currentIndex + direction));
                const nextRarityId = rarityOrder[nextIndex];
                const currentMul = Number(RARITY_DEFS[selectedWeapon.rarityId]?.atkMul) || 1;
                const nextMul = Number(RARITY_DEFS[nextRarityId]?.atkMul) || 1;
                const scaledBase = Math.max(1, Math.round((selectedWeapon.baseAttack / currentMul) * nextMul));
                const penaltyRate = getWeaponPenaltyRate(selectedClass.id, selectedWeapon.weaponType);
                setSelectedWeapon((prev) => (prev ? {
                    ...prev,
                    rarityId: nextRarityId,
                    name: `${RARITY_DEFS[nextRarityId]?.name || ''}${weaponTypeName(prev.weaponType)}`,
                    baseAttack: scaledBase,
                    effectiveAttack: Math.max(1, Math.round(scaledBase * penaltyRate)),
                    penaltyRate
                } : prev));
                notice += `，武器稀有度變為 ${RARITY_DEFS[nextRarityId]?.name || nextRarityId}`;
            } else if (item.itemType === 'robbery') {
                const pools = buildMysteryShopDisplayItems().filter((entry) => entry.itemType !== 'robbery');
                const stolen = pools[Math.floor(Math.random() * pools.length)];
                if (stolen) {
                    nextItemSlot = createMysteryItemInstance(stolen);
                    notice += `，成功搶走「${stolen.name}」`;
                }
                updateRuntimeEffects((prev) => ({ ...prev, mysteryShopLocked: true }));
                setMysteryShopAvailable(false);
                setMysteryShopExpireOnNextVictory(false);
            }
            updateInventoryState((prev) => ({
                ...prev,
                itemSlot: nextItemSlot
            }));
            return { playerHp: nextHp, notice: `${notice}。` };
        }, {
            skipEnemyTurn: Number(runtimeEffectsRef.current?.timeStopUntil) > Date.now()
        });
    }

    function handleUseSkill(skillId) {
        const skillMeta = getSkillItemMeta(skillId);
        if (!skillMeta) return;
        setIsSkillModalOpen(false);
        if (!consumeSkillCard(skillId)) {
            setBattleNotice(`技能「${skillMeta.name}」已不足。`);
            return;
        }
        const skillAmp = Math.max(0, Number(calcItemPassiveModifiers(inventoryStateRef.current.itemSlot).skillAmpPct) || 0);
        const timeStopActive = Number(runtimeEffectsRef.current?.timeStopUntil) > Date.now();
        if (skillId === 'skill_triple_strike') {
            performPlayerAttackAction({
                actionLabel: '三連擊',
                strikeCount: 3,
                baseDamageMul: 1 + (skillAmp * 0.4),
                skipEnemyTurn: timeStopActive
            });
            return;
        }
        if (skillId === 'skill_envenom') {
            performPlayerAttackAction({
                actionLabel: '塗毒',
                baseDamageMul: 1 + (skillAmp * 0.2),
                applyPoison: true,
                poisonPct: ENEMY_POISON_RATE * (1 + skillAmp),
                skipEnemyTurn: timeStopActive
            });
            return;
        }
        if (skillId === 'skill_wild_slash') {
            performPlayerAttackAction({
                actionLabel: '亂砍',
                missRate: 0.5,
                fixedDamageMul: 5 * (1 + skillAmp),
                skipEnemyTurn: timeStopActive
            });
            return;
        }
        if (skillId === 'skill_time_stop') {
            runUtilityAction('時間暫停', () => {
                const now = Date.now();
                updateRuntimeEffects((prev) => ({
                    ...prev,
                    timeStopUntil: now + TIME_STOP_WINDOW_MS,
                    timeStopEnemyKey: enemyAssetKey
                }));
                return {
                    notice: `時間暫停啟動：2 秒內可連續點擊攻擊，${currentEnemyName}暫不回合。`,
                    skipEnemyTurn: true
                };
            }, { skipEnemyTurn: false });
            return;
        }
        if (skillId === 'skill_enrage') {
            updateRuntimeEffects((prev) => ({
                ...prev,
                enrageIncomingTurns: Math.max(Number(prev.enrageIncomingTurns) || 0, ENRAGE_INCOMING_TURNS)
            }));
            performPlayerAttackAction({
                actionLabel: '狂怒',
                baseDamageMul: 2 * (1 + skillAmp),
                skipEnemyTurn: timeStopActive
            });
            return;
        }
        if (skillId === 'skill_element_swap') {
            const forcedElementId = pickRandomElementId({ exclude: [effectivePlayerAttackElementId] });
            performPlayerAttackAction({
                actionLabel: `屬性交換(${elementInfo(forcedElementId).name})`,
                forceElementId: forcedElementId,
                baseDamageMul: 1 + (skillAmp * 0.25),
                skipEnemyTurn: timeStopActive
            });
            return;
        }
        if (skillId === 'skill_charm') {
            runUtilityAction('魅惑', () => {
                if (enemyIsBoss) {
                    return { notice: `${currentEnemyName}無法被魅惑。` };
                }
                const thresholdPct = clampRate(cardEffects.charmThresholdPct, 0.01, 0.95);
                const hpRatio = (enemyHp / Math.max(1, enemyMaxHp));
                if (hpRatio > thresholdPct) {
                    return { notice: `魅惑條件不足（需目標 HP 低於 ${Math.round(thresholdPct * 100)}%）。` };
                }
                updateRuntimeEffects((prev) => ({
                    ...prev,
                    companion: {
                        name: '魅惑怪物',
                        maxHp: enemyMaxHp,
                        hp: enemyMaxHp,
                        attack: Math.max(1, Math.round(enemyAttack * 0.9))
                    }
                }));
                const nextFloor = floor + 1;
                spawnEncounterForFloor(nextFloor, enemyAssetKey);
                return {
                    notice: `魅惑成功，${currentEnemyName}加入我方並前進到第 ${nextFloor} 層。`,
                    skipEnemyTurn: true
                };
            }, { skipEnemyTurn: false });
            return;
        }
        if (skillId === 'skill_blood_sacrifice') {
            performPlayerAttackAction({
                actionLabel: '血之祭祀',
                selfCostPct: 0.2,
                critChanceBonus: 0.2 * (1 + skillAmp),
                skipEnemyTurn: timeStopActive
            });
            return;
        }
        if (skillId === 'skill_execute') {
            performPlayerAttackAction({
                actionLabel: '處決',
                executeThreshold: 0.1,
                skipEnemyTurn: timeStopActive
            });
            return;
        }
        if (skillId === 'skill_phantom') {
            updateRuntimeEffects((prev) => ({
                ...prev,
                phantomTurns: Math.max(Number(prev.phantomTurns) || 0, PHANTOM_TURNS)
            }));
            performPlayerAttackAction({
                actionLabel: '幻影',
                baseDamageMul: 1 + (skillAmp * 0.2),
                skipEnemyTurn: timeStopActive
            });
        }
    }

    function handleDefend() {
        if (!selectedClass || !selectedWeapon || isDefeated || isCombatLocked) return;
        if (slotSpinResult) setSlotSpinResult(null);
        setIsSkillModalOpen(false);
        setOpenShopId('');
        const turnStart = processPlayerTurnStart();
        if (turnStart.blocked) return;
        setBattleNotice(`${turnStart.notes.length ? `${turnStart.notes.join('，')}；` : ''}你採取防禦姿態。`);
        queueEnemyTurn(true, { playerStatus: turnStart.nextStatus, playerHp: turnStart.nextHp });
    }

    function handleChooseClass(classId) {
        playSound('click');
        resetToClassState();
        setSelectedClassId(classId);
        setPhase('gacha');
        setBattleNotice('請先抽出並選擇武器。');
    }

    function handleDrawWeapon() {
        if (!selectedClass || drawCount >= GACHA_DRAW_LIMIT) return;
        playSound('click');
        setDrawnWeapon(buildWeaponForClass(selectedClass.id));
        setDrawCount((prev) => prev + 1);
    }

    function handleUseDrawnWeapon() {
        if (!selectedClass || !drawnWeapon) return;
        playSound('click');
        setSelectedWeapon(drawnWeapon);
        setIsPlayerAvatarBroken(false);
        setIsEnemyAvatarBroken(false);
        setPhase('battle');
    }

    function closeSlotFreeDrawModal({ silent = false } = {}) {
        if (!silent) playSound('click');
        setSlotFreeDrawModalState(createDefaultSlotFreeDrawModalState());
    }

    function handleOpenSlotFreeDrawModal() {
        if (!selectedClass || slotFreeDraws <= 0 || isDefeated || isCombatLocked || isSlotSpinning) return;
        const freeDrawWeapon = buildWeaponForClass(selectedClass.id, { maxRarityId: 'legendary' });
        if (!freeDrawWeapon) return;
        playSound('click');
        setSlotFreeDraws((prev) => Math.max(0, Number(prev) - 1));
        setSlotFreeDrawModalState({
            isOpen: true,
            weapon: freeDrawWeapon
        });
    }

    function handleEquipSlotFreeDrawWeapon() {
        const freeDrawWeapon = slotFreeDrawModalState.weapon;
        if (!freeDrawWeapon) return;
        playSound('click');
        setSelectedWeapon(freeDrawWeapon);
        setSlotFreeDrawModalState(createDefaultSlotFreeDrawModalState());
        setBattleNotice(`免費抽卡獲得「${freeDrawWeapon.name}」，已裝備。`);
    }

    function handleKeepSlotFreeDrawWeapon() {
        const freeDrawWeapon = slotFreeDrawModalState.weapon;
        if (!freeDrawWeapon) return;
        playSound('click');
        setSlotFreeDrawModalState(createDefaultSlotFreeDrawModalState());
        setBattleNotice(`免費抽卡獲得「${freeDrawWeapon.name}」，你選擇保留原武器。`);
    }

    function handleBackToClass() {
        playSound('click');
        resetToClassState();
    }

    function handleRestartRun() {
        if (!selectedClass || !selectedWeapon) return;
        playSound('click');
        startBattleRun(true);
    }

    function handleExit() {
        clearEnemyTurnTimer();
        clearEncounterTransition();
        clearSlotMachineTimers();
        playSound('click');
        onExit();
    }

    function handleShopItemClick(item) {
        if (!item) return;
        tryPurchaseShopItem(item);
    }

    function handleEnemyAvatarError() {
        const fallbackSrc = enemyIsBoss ? ENEMY_FALLBACK_SRC.boss : ENEMY_FALLBACK_SRC.normal;
        if (enemyImageSrc !== fallbackSrc) {
            setEnemyImageSrc(fallbackSrc);
            return;
        }
        setIsEnemyAvatarBroken(true);
    }

    useEffect(() => {
        if (phase === 'battle' && selectedClass && selectedWeapon) startBattleRun(true);
    }, [phase, selectedClass, selectedWeapon]);

    useEffect(() => {
        if (!isSlotAutoUnlocked && slotMode === 'auto') {
            setSlotMode('manual');
        }
    }, [isSlotAutoUnlocked, slotMode]);

    useEffect(() => {
        if (!isSlotSpinning) return;
        if (!isSlotUiLocked) return;
        clearSlotMachineTimers();
        commitSlotSpinning(false);
        commitSlotStoppedCount(slotRequiredStopCountRef.current);
    }, [isSlotUiLocked, isSlotSpinning]);

    useEffect(() => {
        if (!isShopModalOpen && !isSkillModalOpen && !isReplacementModalOpen && !isServiceModalOpen && !isSlotFreeDrawModalOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            setOpenShopId('');
            setIsSkillModalOpen(false);
            closeReplacementFlow();
            setServiceModalState(null);
            setSlotFreeDrawModalState(createDefaultSlotFreeDrawModalState());
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isShopModalOpen, isSkillModalOpen, isReplacementModalOpen, isServiceModalOpen, isSlotFreeDrawModalOpen]);

    useEffect(() => {
        if (timeStopTimerRef.current) {
            clearTimeout(timeStopTimerRef.current);
            timeStopTimerRef.current = null;
        }
        const until = Number(runtimeEffects.timeStopUntil) || 0;
        if (until <= Date.now()) return undefined;
        const freezeEnemyKey = runtimeEffects.timeStopEnemyKey;
        if (!freezeEnemyKey || freezeEnemyKey !== enemyAssetKey) {
            updateRuntimeEffects((prev) => ({ ...prev, timeStopUntil: 0, timeStopEnemyKey: '' }));
            return undefined;
        }
        const delay = Math.max(0, until - Date.now());
        timeStopTimerRef.current = setTimeout(() => {
            timeStopTimerRef.current = null;
            updateRuntimeEffects((prev) => ({ ...prev, timeStopUntil: 0, timeStopEnemyKey: '' }));
            if (!isDefeated && enemyHp > 0 && !isEnemyTurnPending && !isEncounterTransitioning && !isLevelUpOpen && !isShopModalOpen && !isReplacementModalOpen && !isServiceModalOpen) {
                queueEnemyTurn(false, {
                    playerStatus: playerStatusRef.current,
                    enemyStatus: enemyStatusRef.current,
                    playerHp: playerHp ?? playerMaxHp,
                    enemyHp
                });
            }
        }, delay);
        return () => {
            if (timeStopTimerRef.current) {
                clearTimeout(timeStopTimerRef.current);
                timeStopTimerRef.current = null;
            }
        };
    }, [runtimeEffects.timeStopUntil, runtimeEffects.timeStopEnemyKey, enemyAssetKey, isDefeated, enemyHp, isEnemyTurnPending, isEncounterTransitioning, isLevelUpOpen, isShopModalOpen, isReplacementModalOpen, isServiceModalOpen, playerHp, playerMaxHp]);

    useEffect(() => {
        if (itemRegenTimerRef.current) {
            clearInterval(itemRegenTimerRef.current);
            itemRegenTimerRef.current = null;
        }
        if (phase !== 'battle' || isDefeated || itemSlot?.itemType !== 'iv_drip' || !selectedClass) return undefined;
        itemRegenTimerRef.current = setInterval(() => {
            const maxHp = playerMaxHp || selectedClass.maxHp;
            const healAmount = Math.max(1, Math.round(maxHp * ITEM_IV_DRIP_HEAL_RATE));
            applyHealToPlayer(healAmount, playerHp ?? maxHp);
        }, ITEM_IV_DRIP_INTERVAL_MS);
        return () => {
            if (itemRegenTimerRef.current) {
                clearInterval(itemRegenTimerRef.current);
                itemRegenTimerRef.current = null;
            }
        };
    }, [phase, isDefeated, itemSlot?.itemType, selectedClass, playerMaxHp, playerHp]);

    useEffect(() => {
        if (shopTestToolsEnabled) return;
        setIsTestFreeShop(false);
        setIsTestUnlimitedShop(false);
    }, [shopTestToolsEnabled]);

    useEffect(() => {
        if (phase !== 'battle') return;
        const notice = String(battleNotice || '').trim();
        if (!notice) return;
        setBattleNoticeHistory((prev) => {
            if (prev[0] === notice) return prev;
            return [notice, ...prev].slice(0, MAX_BATTLE_NOTICE_HISTORY);
        });
    }, [battleNotice, phase]);

    useEffect(() => () => {
        if (playerHitTimerRef.current) clearTimeout(playerHitTimerRef.current);
        if (enemyHitTimerRef.current) clearTimeout(enemyHitTimerRef.current);
        if (enemyTurnTimerRef.current) {
            clearTimeout(enemyTurnTimerRef.current);
            enemyTurnTimerRef.current = null;
        }
        if (timeStopTimerRef.current) {
            clearTimeout(timeStopTimerRef.current);
            timeStopTimerRef.current = null;
        }
        if (itemRegenTimerRef.current) {
            clearInterval(itemRegenTimerRef.current);
            itemRegenTimerRef.current = null;
        }
        clearSlotMachineTimers();
        clearEncounterTransition({ resetState: false });
        clearScratchFx({ resetState: false });
        clearElementAttackFx({ resetState: false });
        floatTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        floatTimeoutIdsRef.current = [];
    }, []);

    const isBattlePhase = phase === 'battle';

    return (
        <div className={`tower-stage-root tower-theme-pixel${isBattlePhase ? ' is-battle-phase' : ''} tw-min-h-full tw-w-full tw-text-slate-100`} style={towerRootStyle}>
            <div className="tower-stage-overlay">
                <div className={`tower-shake-layer${isBattlePhase ? ' tower-shake-layout-battle' : ''} tw-mx-auto tw-flex tw-h-full tw-flex-col ${isBattlePhase ? 'tw-w-full tw-max-w-none tw-px-3 tw-py-3 sm:tw-px-4 sm:tw-py-4' : 'tw-max-w-6xl tw-px-4 tw-py-4 sm:tw-px-8 sm:tw-py-6'}`}>
                {phase === 'class' && (
                    <section className="tw-grid tw-gap-4 md:tw-grid-cols-2">
                        {classEntries().map((classDef) => (
                            <button
                                key={classDef.id}
                                type="button"
                                onClick={() => handleChooseClass(classDef.id)}
                                className="tw-rounded-xl tw-border tw-border-slate-500 tw-bg-slate-800/90 tw-p-4 tw-text-left tw-text-slate-100 tw-transition hover:tw-border-cyan-400 hover:tw-shadow-[0_0_24px_rgba(34,211,238,0.25)]"
                            >
                                <h2 className="tw-mb-1 tw-text-lg tw-font-semibold tw-text-slate-50">{classDef.emoji} {classDef.name}</h2>
                                <p className="tw-mb-2 tw-text-sm tw-text-slate-200">{classDef.description}</p>
                                <div className="tw-grid tw-grid-cols-2 tw-gap-2 tw-text-xs tw-text-slate-100">
                                    <span>HP：{classDef.maxHp}</span>
                                    <span>攻擊：{classDef.baseAtk}</span>
                                </div>
                            </button>
                        ))}
                    </section>
                )}

                {phase === 'gacha' && selectedClass && (
                    <section className="tw-flex tw-flex-1 tw-flex-col tw-gap-4">
                        <div className="tw-rounded-xl tw-border tw-border-slate-500 tw-bg-slate-800/85 tw-p-4 tw-text-slate-100">
                            <h2 className="tw-mb-1 tw-text-lg tw-font-semibold tw-text-slate-50">單抽武器（最高稀有：藍）</h2>
                            <p className="tw-text-sm tw-text-slate-200">已選職業：{selectedClass.emoji} {selectedClass.name}，最多抽 5 次，目前 {drawCount}/{GACHA_DRAW_LIMIT}。</p>
                        </div>

                        {drawnWeapon && (
                            <article className={`tower-weapon-card tower-weapon-card-large tw-rounded-xl tw-border tw-p-4 tw-text-left ${RARITY_DEFS[drawnWeapon.rarityId]?.uiClass || 'tw-border-slate-500 tw-bg-slate-800/80 tw-text-slate-100'}`}>
                                <div className="tw-mb-3 tw-flex tw-items-center tw-justify-center">
                                    <WeaponTypeIcon typeId={drawnWeapon.weaponType} variantIndex={drawnWeapon.variantIndex} rarityId={drawnWeapon.rarityId} size="gacha" />
                                </div>
                                <h3 className="tw-text-center tw-text-2xl tw-font-extrabold">{drawnWeapon.name}</h3>
                                <p className="tw-mt-1 tw-text-center tw-text-sm">{rarityLabel(drawnWeapon)}</p>
                                <div className="tw-mt-4 tw-space-y-1 tw-text-sm">
                                    <p>武器類型：<WeaponTypeIcon typeId={drawnWeapon.weaponType} variantIndex={drawnWeapon.variantIndex} rarityId={drawnWeapon.rarityId} size="inline" /> {weaponTypeName(drawnWeapon.weaponType)}</p>
                                    <p>元素屬性：<ElementChip elementId={drawnWeapon.elementId} /></p>
                                    <p>基礎攻擊：{drawnWeapon.baseAttack}</p>
                                    <p>套用懲罰後攻擊：{drawnWeapon.effectiveAttack}</p>
                                    <p>{penaltyText(drawnWeapon)}</p>
                                </div>
                            </article>
                        )}

                        <div className="tw-mt-auto tw-flex tw-flex-wrap tw-gap-2">
                            <button type="button" onClick={handleDrawWeapon} disabled={drawCount >= GACHA_DRAW_LIMIT} className="tw-rounded-lg tw-border tw-border-cyan-400/70 tw-bg-cyan-900/40 tw-px-4 tw-py-2 tw-text-sm tw-text-slate-100 hover:tw-bg-cyan-800/50 disabled:tw-opacity-50">
                                抽武器（{drawCount}/{GACHA_DRAW_LIMIT}）
                            </button>
                            <button type="button" onClick={handleUseDrawnWeapon} disabled={!drawnWeapon} className="tw-rounded-lg tw-border tw-border-emerald-400/70 tw-bg-emerald-900/40 tw-px-4 tw-py-2 tw-text-sm tw-text-slate-100 disabled:tw-opacity-50">
                                使用這把武器開始戰鬥
                            </button>
                            <button type="button" onClick={handleBackToClass} className="tw-rounded-lg tw-border tw-border-slate-400 tw-bg-slate-700/90 tw-px-4 tw-py-2 tw-text-sm tw-text-slate-100 hover:tw-bg-slate-600">
                                返回職業選擇
                            </button>
                        </div>
                        {drawCount >= GACHA_DRAW_LIMIT && <p className="tw-text-xs tw-text-amber-300">已達 5 次上限，請使用目前武器開始戰鬥，或返回職業重新抽。</p>}
                    </section>
                )}

                {phase === 'battle' && selectedClass && selectedWeapon && playerPreview && (
                    <section className="tower-battle-layout tw-flex tw-flex-1 tw-flex-col">
                        <div className="tower-combat-grid">
                            <div className="tower-combat-arena-shell tw-rounded-xl tw-border tw-border-slate-500/70 tw-bg-slate-900/80 tw-p-3 sm:tw-p-4">
                                <div className={`tower-combat-arena${isLevelUpOpen ? ' is-draft-open' : ''}`}>
                                    <img src={BATTLE_ARENA_SRC} alt="" className="tower-combat-arena-image" aria-hidden="true" />
                                    <div className="tower-combat-arena-overlay" aria-hidden="true" />

                                    <div className="tower-arena-hp-hud tower-arena-hp-hud-player">
                                        <div className="tower-arena-hp-head">
                                            <span className="tower-arena-hp-title">
                                                <span className="tw-font-semibold tw-text-slate-100">{selectedClass.emoji} {selectedClass.name}</span>
                                                <span className="tower-gold-badge">金幣 {gold}</span>
                                            </span>
                                            <span className="tw-text-[0.68rem] tw-text-slate-300">Lv.{Math.max(1, Number(floor) || 1)}</span>
                                        </div>
                                        {itemSlot?.itemType === 'substitute' && Number(itemSlot.guardCount) > 0 && (
                                            <p className="tw-mb-1 tw-text-[0.67rem] tw-font-semibold tw-text-cyan-200">
                                                護盾 x{Math.max(0, Number(itemSlot.guardCount) || 0)}
                                            </p>
                                        )}
                                        <HealthBar label="生命值" current={playerPreview.currentHp} max={playerPreview.maxHp} />
                                    </div>

                                    <div className="tower-arena-hp-hud tower-arena-hp-hud-enemy">
                                        <div className="tower-arena-hp-head">
                                            <span className="tw-font-semibold tw-text-slate-100">{currentEnemyName}</span>
                                            <span className="tw-text-[0.68rem] tw-text-slate-300">{enemyIsBoss ? `BOSS Lv.${enemyLevel}` : `Lv.${enemyLevel}`}</span>
                                        </div>
                                        <div className="tw-mb-1 tw-flex tw-flex-wrap tw-justify-end tw-gap-1">
                                            {enemyIsSpecialNormal && (
                                                <span className="tw-rounded-md tw-border tw-border-yellow-300/80 tw-bg-yellow-950/75 tw-px-1.5 tw-py-0.5 tw-text-[0.62rem] tw-font-semibold tw-leading-none tw-text-yellow-100">
                                                    SPECIAL x5
                                                </span>
                                            )}
                                            <span className="tw-rounded-md tw-border tw-border-slate-400/65 tw-bg-slate-900/75 tw-px-1.5 tw-py-0.5 tw-text-[0.62rem] tw-leading-none tw-text-slate-200">
                                                第 {floor} 層
                                            </span>
                                        </div>
                                        <HealthBar label="生命值" current={enemyHp} max={enemyMaxHp} />
                                    </div>

                                    <div className="tower-arena-weapon-hud" aria-label="player weapon hud">
                                        <div className="tower-arena-weapon-icon" style={{ '--tower-weapon-glow': rarityGlowColor(selectedWeapon.rarityId) }}>
                                            <WeaponTypeIcon typeId={selectedWeapon.weaponType} variantIndex={selectedWeapon.variantIndex} rarityId={selectedWeapon.rarityId} size="slot" />
                                        </div>
                                        <div className="tower-arena-weapon-meta">
                                            <p className={`tw-font-semibold ${weaponNameColorClass(selectedWeapon.rarityId)}`}>{selectedWeapon.name}</p>
                                            <p className="tw-text-[0.7rem] tw-text-slate-300">武器元素：<ElementChip elementId={selectedWeapon.elementId} /></p>
                                            <p className="tw-text-[0.68rem] tw-text-slate-400">{penaltyText(selectedWeapon)}</p>
                                        </div>
                                    </div>

                                    <div className="tower-arena-actor tower-arena-actor-player" style={playerAvatarStyle}>
                                        <div className="tower-arena-actor-stage">
                                            <button
                                                type="button"
                                                onClick={handleDefend}
                                                disabled={isDefeated || isCombatLocked}
                                                className={`tower-avatar-action-hitbox tower-avatar-action-hitbox-player${isDefeated || isCombatLocked ? ' is-disabled' : ''}`}
                                                aria-label="點擊玩家防禦"
                                            />
                                            <div className="tower-scratch-layer" aria-hidden="true">
                                                {playerScratchFx.map((entry) => (
                                                    <img
                                                        key={`ps-${entry.id}`}
                                                        src={ATTACK_SCRATCH_SRC}
                                                        alt=""
                                                        className={`tower-hit-scratch${entry.mirrored ? ' is-mirrored' : ''}${entry.isCrit ? ' is-crit' : ''}`}
                                                        style={{ left: `${entry.x}%`, top: `${entry.y}%`, '--tower-scratch-scale': entry.scale }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="tower-float-layer" aria-hidden="true">
                                                {playerDamageFloats.map((entry) => (
                                                    <span key={`p-${entry.id}`} className={`tower-floating-text tower-damage-text${entry.isCrit ? ' is-crit' : ''}`} style={{ left: `${entry.x}%`, top: `${entry.y}%` }}>
                                                        {entry.text}
                                                    </span>
                                                ))}
                                            </div>
                                            {isPlayerAvatarBroken ? (
                                                <span className={`tower-player-fallback ${isPlayerHitFxActive ? 'tower-target-hit-shake' : ''}`} role="img" aria-label="Player avatar fallback">??</span>
                                            ) : (
                                                <img src={PLAYER_AVATAR_SRC} alt="TERU Tower Player" className={`tower-player-avatar ${isPlayerHitFxActive ? 'tower-target-hit-shake' : ''}`} onError={() => setIsPlayerAvatarBroken(true)} />
                                            )}
                                        </div>
                                    </div>

                                    <div className="tower-arena-actor tower-arena-actor-enemy" style={enemyAvatarStyle}>
                                        <div className="tower-arena-actor-stage">
                                            <button
                                                type="button"
                                                onClick={handleAttack}
                                                disabled={isDefeated || isCombatLocked}
                                                className={`tower-avatar-action-hitbox tower-avatar-action-hitbox-enemy${isDefeated || isCombatLocked ? ' is-disabled' : ''}`}
                                                aria-label="點擊敵人攻擊"
                                            />
                                            <div className="tower-scratch-layer" aria-hidden="true">
                                                {enemyScratchFx.map((entry) => (
                                                    <img
                                                        key={`es-${entry.id}`}
                                                        src={ATTACK_SCRATCH_SRC}
                                                        alt=""
                                                        className={`tower-hit-scratch${entry.mirrored ? ' is-mirrored' : ''}${entry.isCrit ? ' is-crit' : ''}`}
                                                        style={{ left: `${entry.x}%`, top: `${entry.y}%`, '--tower-scratch-scale': entry.scale }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="tower-element-fx-layer" aria-hidden="true">
                                                {enemyElementAttackFx.map((entry) => (
                                                    <img
                                                        key={`efx-${entry.id}`}
                                                        src={resolveElementAttackFrameSrc(entry)}
                                                        alt=""
                                                        className={`tower-element-fx is-${entry.mode} is-${entry.elementId}`}
                                                        style={{
                                                            left: `${entry.x}%`,
                                                            top: `${entry.y}%`,
                                                            '--tower-fx-start-x': String(entry.startX),
                                                            '--tower-fx-start-y': String(entry.startY),
                                                            '--tower-fx-end-x': String(entry.endX),
                                                            '--tower-fx-end-y': String(entry.endY)
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="tower-float-layer" aria-hidden="true">
                                                {enemyDamageFloats.map((entry) => (
                                                    <span key={`e-${entry.id}`} className={`tower-floating-text tower-damage-text${entry.isCrit ? ' is-crit' : ''}`} style={{ left: `${entry.x}%`, top: `${entry.y}%` }}>
                                                        {entry.text}
                                                    </span>
                                                ))}
                                            </div>
                                            {isEnemyAvatarBroken ? (
                                                <span className={`tower-enemy-emoji ${enemyAvatarFxClass}`.trim()} role="img" aria-label="Tower enemy fallback">
                                                    {enemyIsBoss ? ENEMY_FALLBACK_LABEL.boss : ENEMY_FALLBACK_LABEL.normal}
                                                </span>
                                            ) : (
                                                <img src={enemyImageSrc} alt={`Tower enemy ${currentEnemyName}`} className={`tower-enemy-avatar ${enemyAvatarFxClass}`.trim()} onError={handleEnemyAvatarError} decoding="async" />
                                            )}
                                        </div>
                                    </div>

                                    {isLevelUpOpen && (
                                        <div className="tower-arena-inline-overlay is-draft" role="presentation">
                                            <div
                                                className="tower-shop-modal-panel tower-modal-panel tower-arena-draft-panel"
                                                role="dialog"
                                                aria-modal="true"
                                                aria-label={levelUpTriggerLabel(levelUpState.trigger)}
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <div className="tower-battle-layer tower-battle-layer-command is-draft-focus tw-rounded-xl tw-border tw-border-slate-500 tw-bg-slate-800/85 tw-p-3 tw-text-slate-100 sm:tw-p-4">
                                                    <div className="tower-draft-levelup-panel tw-rounded-lg tw-border tw-border-fuchsia-300/80 tw-bg-slate-950/75 tw-p-3">
                                                        <div className="tower-draft-levelup-head tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-2">
                                                            <div>
                                                                <h4 className="tw-text-base tw-font-semibold tw-text-fuchsia-100 sm:tw-text-lg">{levelUpTriggerLabel(levelUpState.trigger)}</h4>
                                                                <p className="tw-text-sm tw-text-slate-200">選擇 1 張卡片。可重刷候選卡（每次 {LEVELUP_REROLL_COST} 金幣）。</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={handleRerollLevelUpCards}
                                                                disabled={gold < LEVELUP_REROLL_COST}
                                                                className="tw-rounded-md tw-border tw-border-amber-300/80 tw-bg-amber-900/45 tw-px-3 tw-py-1 tw-text-xs tw-text-amber-100 hover:tw-bg-amber-800/55 disabled:tw-opacity-50"
                                                            >
                                                                刷新卡片（-{LEVELUP_REROLL_COST}）
                                                            </button>
                                                        </div>
                                                        <div className="tower-draft-levelup-grid tw-mt-3 tw-grid tw-gap-2 lg:tw-grid-cols-3">
                                                            {levelUpState.candidates.map((card) => (
                                                                <button
                                                                    key={card.id}
                                                                    type="button"
                                                                    onClick={() => handleSelectLevelUpCard(card.id)}
                                                                    className={`tower-draft-levelup-card tw-flex tw-h-full tw-flex-col tw-rounded-lg tw-border tw-p-4 tw-text-left tw-transition hover:tw-scale-[1.01] hover:tw-brightness-110 ${card.uiClass}`}
                                                                >
                                                                    <span className={`tw-inline-flex tw-w-fit tw-rounded-md tw-border tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold ${card.kind === 'curse'
                                                                        ? 'tw-border-rose-300/80 tw-bg-rose-900/45 tw-text-rose-100'
                                                                        : 'tw-border-cyan-300/80 tw-bg-cyan-900/40 tw-text-cyan-100'}`}
                                                                    >
                                                                        {card.kind === 'curse' ? '詛咒卡' : '基礎卡'}
                                                                    </span>
                                                                    <h5 className="tw-mt-2 tw-text-base tw-font-semibold">{card.name}</h5>
                                                                    <p className="tw-mt-1 tw-text-xs tw-font-semibold">{card.shortEffect}</p>
                                                                    <p className="tw-mt-1 tw-text-xs tw-leading-relaxed tw-opacity-90">{card.description}</p>
                                                                    <span className="tw-mt-2 tw-text-xs tw-text-slate-100/85">點擊選擇</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="tower-draft-focus-hint">
                                                            <span>金幣：{gold}</span>
                                                            <span>狀態：{combatLockReason || '升級選卡中，戰鬥已暫停'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!isLevelUpOpen && isSlotFreeDrawModalOpen && slotFreeDrawModalState.weapon && (
                                        <div className="tower-arena-inline-overlay" onClick={() => closeSlotFreeDrawModal()} role="presentation">
                                            <div
                                                className="tower-shop-modal-panel tower-modal-panel"
                                                role="dialog"
                                                aria-modal="true"
                                                aria-label="免費抽卡結果"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <div className="tower-shop-modal-header">
                                                    <div className="tw-min-w-0">
                                                        <h4 className="tw-text-base tw-font-semibold tw-text-slate-50">免費抽卡結果</h4>
                                                        <p className="tw-text-xs tw-text-slate-300">獲得一把新武器，你可以立即裝備或保留原武器。</p>
                                                    </div>
                                                </div>
                                                <div className="tower-modal-scroll">
                                                    <div className={`tw-rounded-lg tw-border tw-p-3 ${rarityCardClass(slotFreeDrawModalState.weapon.rarityId)}`}>
                                                        <div className="tw-flex tw-items-center tw-gap-3">
                                                            <WeaponTypeIcon
                                                                typeId={slotFreeDrawModalState.weapon.weaponType}
                                                                variantIndex={slotFreeDrawModalState.weapon.variantIndex}
                                                                rarityId={slotFreeDrawModalState.weapon.rarityId}
                                                                size="slot"
                                                            />
                                                            <div className="tw-min-w-0 tw-flex-1">
                                                                <p className={`tw-text-sm tw-font-semibold ${rarityNameClass(slotFreeDrawModalState.weapon.rarityId)}`}>
                                                                    {slotFreeDrawModalState.weapon.name}
                                                                </p>
                                                                <p className="tw-text-xs tw-text-slate-200">
                                                                    屬性：<ElementChip elementId={slotFreeDrawModalState.weapon.elementId} />
                                                                </p>
                                                                <p className="tw-text-xs tw-text-slate-300">
                                                                    攻擊：{slotFreeDrawModalState.weapon.effectiveAttack}
                                                                    <span className="tw-ml-1 tw-text-slate-400">({penaltyText(slotFreeDrawModalState.weapon)})</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="tower-modal-footer">
                                                    <button
                                                        type="button"
                                                        onClick={handleKeepSlotFreeDrawWeapon}
                                                        className="tw-rounded-md tw-border tw-border-slate-400 tw-bg-slate-700/80 tw-px-3 tw-py-1 tw-text-xs"
                                                    >
                                                        保留原武器
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleEquipSlotFreeDrawWeapon}
                                                        className="tw-rounded-md tw-border tw-border-emerald-300/80 tw-bg-emerald-900/45 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-text-emerald-100"
                                                    >
                                                        立即裝備
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={`tower-arena-status-grid${(isLevelUpOpen || isSlotFreeDrawModalOpen) ? ' is-muted' : ''}`}>
                                    <article className="tower-arena-status-card tw-border-cyan-500/65">
                                        <h2 className="tw-mb-2 tw-text-sm tw-font-semibold tw-text-cyan-100">玩家狀態</h2>
                                        <div className="tower-combat-card-body tw-mt-0 tw-text-sm tw-text-slate-200">
                                            <p>
                                                攻擊元素：<ElementChip elementId={effectivePlayerAttackElementId} />
                                                {buildState.forcedElementId && buildState.forcedElementId !== selectedWeapon.elementId && (
                                                    <span className="tw-ml-2 tw-text-xs tw-text-rose-300">（焦渴之炎強制轉火）</span>
                                                )}
                                            </p>
                                            <p>
                                                總攻擊力：{playerPreview.attack}{' '}
                                                <span className={`tw-font-bold tw-tracking-wide ${playerAttackElementDeltaClass}`}>{playerAttackElementDeltaText}</span>
                                            </p>
                                            <p>狀態：<StatusChipList status={playerStatus} /></p>
                                        </div>
                                    </article>

                                    <article className="tower-slot-machine-card tw-border-violet-400/65">
                                        <div className="tower-slot-machine-frame" aria-label="slot machine frame">
                                            <img src={SLOT_MACHINE_SRC} alt="slot machine" className="tower-slot-machine-image" loading="lazy" decoding="async" />
                                            {SLOT_REEL_CENTERS.map((center, index) => {
                                                const reelIndex = Math.round(Number(slotReelIndices[index]) || 0);
                                                const symbol = slotSymbolMeta(slotSymbolByIndex(reelIndex));
                                                const prevSymbol = slotSymbolMeta(slotSymbolByIndex(reelIndex - 1));
                                                const nextSymbol = slotSymbolMeta(slotSymbolByIndex(reelIndex + 1));
                                                const isReelSpinning = isSlotSpinning && index >= slotStoppedCount && !slotLockedReels[index];
                                                return (
                                                    <div
                                                        key={center.id}
                                                        className={`tower-slot-reel-window${isReelSpinning ? ' is-spinning' : ''}`}
                                                        style={{
                                                            '--tower-slot-center-x': `${((center.x / SLOT_MACHINE_BASE_WIDTH) * 100).toFixed(4)}%`,
                                                            '--tower-slot-center-y': `${((center.y / SLOT_MACHINE_BASE_HEIGHT) * 100).toFixed(4)}%`
                                                        }}
                                                    >
                                                        {isReelSpinning ? (
                                                            <div className="tower-slot-reel-track is-spinning" aria-hidden="true">
                                                                {renderSlotSymbolNode(prevSymbol)}
                                                                {renderSlotSymbolNode(symbol)}
                                                                {renderSlotSymbolNode(nextSymbol)}
                                                            </div>
                                                        ) : (
                                                            renderSlotSymbolNode(symbol, { ariaLabel: `${center.id} reel ${symbol.label}` })
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="tower-slot-machine-controls">
                                            <label className={`tower-slot-mode-toggle${!isSlotAutoUnlocked ? ' is-locked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={slotMode === 'auto'}
                                                    onChange={handleToggleSlotMode}
                                                    disabled={!isSlotAutoUnlocked || isSlotSpinning || isSlotUiLocked}
                                                />
                                                <span>自動模式</span>
                                                {!isSlotAutoUnlocked && <span className="tower-slot-lock-tag">第 10 層解鎖</span>}
                                                <span className="tower-slot-inline-stat">匹配：{slotPreviewCombo}</span>
                                                <span className="tower-slot-inline-stat is-pity">保底 {slotRewardPoints}/{SLOT_REWARD_POINT_TARGET}</span>
                                            </label>

                                            <div className="tower-slot-machine-actions">
                                                <button
                                                    type="button"
                                                    onClick={handleStartSlotSpin}
                                                    disabled={isSlotSpinning || isSlotUiLocked || !selectedWeapon || (slotMode === 'auto' && !isSlotAutoUnlocked)}
                                                    className="tower-slot-action-btn is-start"
                                                >
                                                    {isSlotSpinning ? '轉軸中...' : '開始轉軸'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleStopSlotReel}
                                                    disabled={!isSlotSpinning || slotMode === 'auto' || slotStoppedCount >= slotRequiredStopCount}
                                                    className="tower-slot-action-btn is-stop"
                                                >
                                                    停下第 {nextSlotStopIndex} 軸
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleOpenSlotFreeDrawModal}
                                                disabled={slotFreeDraws <= 0 || isSlotSpinning || isSlotUiLocked}
                                                className="tower-slot-action-btn is-free-draw"
                                            >
                                                免費抽卡 x{slotFreeDraws}
                                            </button>

                                            {slotLockedReels[2] && isSlotSpinning && (
                                                <p className="tower-slot-auto-hint tower-slot-auto-hint-freeze">冰凍：第 3 軸鎖定</p>
                                            )}

                                            {slotMode === 'auto' && isSlotSpinning && (
                                                <p className="tower-slot-auto-hint">
                                                    自動模式：每 {slotAutoStopIntervalSecText} 秒停止 1 軸（約 {(slotRequiredStopCount * slotAutoStopIntervalMs / 1000).toFixed(1)} 秒完成）
                                                </p>
                                            )}

                                            {slotSpinResult && (
                                                <div className={`tower-slot-result-box is-${slotSpinResult.type}`}>
                                                    <p className="tower-slot-result-title">{slotSpinResult.title}</p>
                                                    <p className="tower-slot-result-summary">{slotSpinResult.summary}</p>
                                                    {slotSpinResult.coinCount > 0 && (
                                                        <p className="tower-slot-result-extra">
                                                            金幣圖案 x{slotSpinResult.coinCount}，倍率 x{slotSpinResult.coinMultiplier}
                                                            {slotSpinResult.coinReward > 0 ? `（+${slotSpinResult.coinReward} 金幣）` : ''}
                                                        </p>
                                                    )}
                                                    {slotSpinResult.statusCleanseList.length > 0 && (
                                                        <p className="tower-slot-result-extra">
                                                            狀態解除：{slotSpinResult.statusCleanseList.join('、')}
                                                        </p>
                                                    )}
                                                    {slotSpinResult.rewardPointGain > 0 && (
                                                        <p className="tower-slot-result-extra">
                                                            保底點數 +{slotSpinResult.rewardPointGain}
                                                            {slotSpinResult.freeDrawGain > 0 ? `，免費抽卡 +${slotSpinResult.freeDrawGain}` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </article>

                                    <article className="tower-arena-status-card tw-border-rose-500/65">
                                        <h2 className="tw-mb-2 tw-text-sm tw-font-semibold tw-text-rose-100">敵人狀態</h2>
                                        <div className="tower-combat-card-body tw-mt-0 tw-text-sm tw-text-slate-200">
                                            <p>名稱：{currentEnemyName}</p>
                                            <p>攻擊：{enemyAttack}</p>
                                            <p>元素：<ElementChip elementId={enemyElementId} /></p>
                                            <p>敵人意圖：{ENEMY_INTENT_TEXT[enemyIntentId] || ENEMY_INTENT_TEXT.attack}</p>
                                            <p>狀態：<StatusChipList status={enemyStatus} /></p>
                                            {(runtimeEffects.enemyPoisonPct || 0) > 0 && <p className="tw-text-lime-300">中毒：每回合 {Math.round((runtimeEffects.enemyPoisonPct || 0) * 100)}%</p>}
                                            {enemyIsSpecialNormal && <p className="tw-text-yellow-300">特殊掉落：金幣 x5</p>}
                                            {enemyGuardActive && <p className="tw-text-amber-300">防禦效果：啟用中</p>}
                                        </div>
                                    </article>
                                </div>
                            </div>
                        </div>

                        <div className="tower-battle-shell">
                            <div className="tower-combat-actions-shell">
                                    <div className="tower-combat-actions-items">
                                        <div className="tower-battle-slot-grid">
                                            <button
                                                type="button"
                                                onClick={handleUseItemSlot}
                                                disabled={isDefeated || isCombatLocked || !itemSlot}
                                                className="tower-battle-slot tower-battle-slot-button tower-battle-slot-item"
                                            >
                                                <span className="tower-battle-slot-title">道具</span>
                                                {itemSlot ? (
                                                    <>
                                                        <img src={itemSlot.imageSrc} alt={itemSlot.name} className="tower-battle-slot-image" />
                                                        <span className="tower-battle-slot-name">{itemSlot.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="tower-battle-slot-empty">空格</span>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleOpenSkillModal}
                                                disabled={isDefeated || isCombatLocked || totalOwnedSkillCount <= 0}
                                                className="tower-battle-slot tower-battle-slot-button tower-battle-slot-skill"
                                            >
                                                <span className="tower-battle-slot-title">技能</span>
                                                <span className="tower-battle-slot-name">{totalOwnedSkillCount > 0 ? `共 ${totalOwnedSkillCount} 張` : '無技能'}</span>
                                                <span className="tower-battle-slot-empty">點擊查看</span>
                                            </button>
                                            {Array.from({ length: POTION_SLOT_COUNT }, (_, index) => {
                                                const potion = potionSlots[index];
                                                return (
                                                    <button
                                                        key={`ops-potion-${index}`}
                                                        type="button"
                                                        onClick={() => handleUsePotion(index)}
                                                        disabled={isDefeated || isCombatLocked || !potion}
                                                        className="tower-battle-slot tower-battle-slot-button tower-battle-slot-potion"
                                                    >
                                                        <span className="tower-battle-slot-title">補品 {index + 1}</span>
                                                        {potion ? (
                                                            <>
                                                                <img src={potion.imageSrc} alt={potion.name} className="tower-battle-slot-image" />
                                                                <span className="tower-battle-slot-name">{potion.name} x{potion.count}</span>
                                                            </>
                                                        ) : (
                                                            <span className="tower-battle-slot-empty">空格</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                            <div className="tower-battle-slot tower-battle-slot-armor">
                                                <span className="tower-battle-slot-title">防具</span>
                                                {armorSlot ? (
                                                    <>
                                                        <img src={armorSlot.imageSrc} alt={armorSlot.name} className="tower-battle-slot-image" />
                                                        <span className="tower-battle-slot-name">{armorSlot.name}</span>
                                                        {armorSlot.elementId && (
                                                            <span className="tower-battle-slot-empty">
                                                                屬性：<ElementChip elementId={armorSlot.elementId} />
                                                            </span>
                                                        )}
                                                        <span className="tower-battle-slot-empty">減傷 +{Math.round((armorSlot.damageReductionPct || 0) * 100)}%</span>
                                                    </>
                                                ) : (
                                                    <span className="tower-battle-slot-empty">空格</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {!isDraftFocus && (
                                <div className="tower-battle-layer tower-battle-layer-resource tw-rounded-xl tw-border tw-border-slate-500/80 tw-bg-slate-900/75 tw-p-4">
                                {hasCompanion && (
                                    <div className="tw-mt-2 tw-rounded-md tw-border tw-border-fuchsia-300/70 tw-bg-fuchsia-950/45 tw-px-2 tw-py-1 tw-text-xs tw-text-fuchsia-100">
                                        魅惑同伴：{runtimeEffects.companion?.name} HP {runtimeEffects.companion?.hp}/{runtimeEffects.companion?.maxHp}
                                    </div>
                                )}
                                <div className="tower-battle-notice-panel">
                                    <div className="tower-battle-notice-head">
                                        <p className="tower-battle-notice-main">{shouldShowDetailedBattleInfo ? battleNotice : battleInfoSummary}</p>
                                        {!isDefeated && (
                                            <button
                                                type="button"
                                                onClick={() => setIsBattleInfoExpanded((prev) => !prev)}
                                                className="tower-battle-info-toggle"
                                            >
                                                {shouldShowDetailedBattleInfo ? '收合詳情' : '展開詳情'}
                                            </button>
                                        )}
                                    </div>
                                    {shouldShowDetailedBattleInfo && battleInfoSummary !== battleNotice && <p className="tower-battle-notice-summary">{battleInfoSummary}</p>}
                                    {shouldShowDetailedBattleInfo && battleNoticeHistory.length > 0 && (
                                        <div className="tower-battle-notice-history">
                                            <p className="tw-text-[11px] tw-font-semibold tw-text-slate-300">最近 5 則訊息</p>
                                            <ul className="tw-mt-1 tw-space-y-1">
                                                {battleNoticeHistory.map((entry, index) => (
                                                    <li key={`${index}-${entry}`} className="tower-battle-notice-entry">
                                                        <span className="tw-text-[11px] tw-text-slate-500">{index === 0 ? '最新' : `${index + 1}`}</span>
                                                        <span>{entry}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                {isDefeated && (
                                    <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
                                        <button type="button" onClick={handleRestartRun} className="tw-rounded-lg tw-border tw-border-cyan-400/80 tw-bg-cyan-900/45 tw-px-4 tw-py-2 tw-text-sm tw-text-slate-100 hover:tw-bg-cyan-800/55">重新挑戰第 1 層</button>
                                        <button type="button" onClick={handleBackToClass} className="tw-rounded-lg tw-border tw-border-slate-400 tw-bg-slate-700/90 tw-px-4 tw-py-2 tw-text-sm tw-text-slate-100 hover:tw-bg-slate-600">返回職業選擇</button>
                                    </div>
                                )}

                                {shouldShowDetailedBattleInfo && (
                                <div className="tw-mt-4 tw-rounded-lg tw-border tw-border-slate-500/70 tw-bg-slate-900/70 tw-p-3">
                                    <h4 className="tw-text-sm tw-font-semibold tw-text-slate-100">當前 Build</h4>
                                    <div className="tw-mt-2 tw-grid tw-gap-1 tw-text-xs tw-text-slate-300 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
                                        <p>攻擊加成：+{buildState.attackBonus}</p>
                                        <p>最大生命加成：+{buildState.maxHpBonus}</p>
                                        <p>常駐減傷：{Math.round((buildState.damageReductionPct || 0) * 100)}%</p>
                                        <p>防具減傷：{Math.round(armorReductionPct * 100)}%</p>
                                        <p>總減傷：{Math.round(totalDamageReductionPct * 100)}%</p>
                                        <p>輸出倍率：x{Number(buildState.outgoingMultiplier || 1).toFixed(2)}</p>
                                        <p>承傷倍率：x{Number(buildState.incomingMultiplier || 1).toFixed(2)}</p>
                                        <p>暴傷加成：+{Math.round((buildState.critDamageBonusPct || 0) * 100)}%</p>
                                        <p>攻擊反噬：{Math.round((buildState.selfDamageOnAttackPct || 0) * 100)}% MaxHP</p>
                                        <p>道具欄：{itemSlot ? itemSlot.name : '無'}</p>
                                        <p>技能增幅：+{Math.round((itemPassive.skillAmpPct || 0) * 100)}%</p>
                                        <p>幸運增幅：+{Math.round((itemPassive.luckPct || 0) * 100)}%</p>
                                        <p>
                                            強制攻擊元素：
                                            {buildState.forcedElementId ? ` ${elementInfo(buildState.forcedElementId).emoji}${elementInfo(buildState.forcedElementId).name}` : ' 無'}
                                        </p>
                                    </div>
                                    {pickedCardEntries.length > 0 ? (
                                        <div className="tw-mt-2 tw-flex tw-flex-wrap tw-gap-1.5">
                                            {pickedCardEntries.map((entry) => (
                                                <span
                                                    key={entry.card.id}
                                                    className={`tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-px-2 tw-py-1 tw-text-[11px] tw-font-semibold ${entry.card.kind === 'curse'
                                                        ? 'tw-border-rose-300/70 tw-bg-rose-950/45 tw-text-rose-100'
                                                        : 'tw-border-cyan-300/70 tw-bg-cyan-950/40 tw-text-cyan-100'}`}
                                                >
                                                    <span>{entry.card.name}</span>
                                                    <span>x{entry.count}</span>
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="tw-mt-2 tw-text-xs tw-text-slate-400">尚未取得卡片。</p>
                                    )}
                                </div>
                                )}
                            </div>
                            )}
                            <div className="tower-battle-side-controls">
                                <div className="tower-bottom-controls tower-bottom-controls-in-shell">
                                    <div className="tower-bottom-controls-row">
                                        <div className="tower-bottom-shop-group">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenShop('normal')}
                                                disabled={isDefeated || isCombatLocked || !canOpenNormalShop}
                                                className="tw-rounded-lg tw-border tw-border-lime-400/80 tw-bg-lime-900/35 tw-px-4 tw-py-2 tw-text-sm tw-text-slate-100 hover:tw-bg-lime-800/45 disabled:tw-opacity-50"
                                            >
                                                常駐商店
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenShop('magic')}
                                                disabled={isDefeated || isCombatLocked || !canOpenMagicShop}
                                                className="tw-rounded-lg tw-border tw-border-violet-400/80 tw-bg-violet-900/35 tw-px-4 tw-py-2 tw-text-sm tw-text-slate-100 hover:tw-bg-violet-800/45 disabled:tw-opacity-50"
                                            >
                                                魔法商店
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenShop('mystery')}
                                                disabled={isDefeated || isCombatLocked || !canOpenMysteryShop}
                                                className="tw-rounded-lg tw-border tw-border-fuchsia-400/80 tw-bg-fuchsia-900/35 tw-px-4 tw-py-2 tw-text-sm tw-text-slate-100 hover:tw-bg-fuchsia-800/45 disabled:tw-opacity-50"
                                            >
                                                神秘商店
                                            </button>
                                        </div>
                                        {!isDraftFocus && (
                                            <button
                                                type="button"
                                                onClick={() => setIsDevToolsExpanded((prev) => !prev)}
                                                className="tw-rounded-md tw-border tw-border-slate-400/80 tw-bg-slate-700/70 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-text-slate-100 hover:tw-bg-slate-600/80"
                                            >
                                                {isDevToolsExpanded ? '收合開發工具' : '展開開發工具'}
                                            </button>
                                        )}
                                        <button type="button" onClick={handleExit} className="tw-rounded-lg tw-border tw-border-slate-500 tw-bg-slate-800/80 tw-px-4 tw-py-2 tw-text-sm hover:tw-bg-slate-700">
                                            離開爬塔
                                        </button>
                                    </div>
                                    {!isDraftFocus && isDevToolsExpanded && (
                                        <div className="tower-bottom-devtools tw-rounded-lg tw-border tw-border-slate-600/70 tw-bg-slate-900/65 tw-p-2.5">
                                            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-1.5 tw-text-xs">
                                                {isTestInvincible && (
                                                    <span className="tw-rounded-md tw-border tw-border-cyan-300/80 tw-bg-cyan-900/60 tw-px-2 tw-py-1 tw-text-cyan-100">無敵已啟用</span>
                                                )}
                                                {effectiveTestFreeShop && (
                                                    <span className="tw-rounded-md tw-border tw-border-emerald-300/80 tw-bg-emerald-900/60 tw-px-2 tw-py-1 tw-text-emerald-100">免費購物中</span>
                                                )}
                                                {effectiveTestUnlimitedShop && (
                                                    <span className="tw-rounded-md tw-border tw-border-indigo-300/80 tw-bg-indigo-900/60 tw-px-2 tw-py-1 tw-text-indigo-100">商店無限制中</span>
                                                )}
                                            </div>
                                            <div className="tower-devtools-body tw-mt-2 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                                                <label className="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-border tw-border-cyan-400/60 tw-bg-cyan-950/40 tw-px-2 tw-py-1 tw-text-cyan-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={isTestInvincible}
                                                        onChange={(event) => setIsTestInvincible(event.target.checked)}
                                                        className="tw-h-3.5 tw-w-3.5 tw-accent-cyan-400"
                                                    />
                                                    <span>測試模式：無敵</span>
                                                </label>
                                                {shopTestToolsEnabled && (
                                                    <label className="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-border tw-border-emerald-400/60 tw-bg-emerald-950/40 tw-px-2 tw-py-1 tw-text-emerald-100">
                                                        <input
                                                            type="checkbox"
                                                            checked={isTestFreeShop}
                                                            onChange={(event) => setIsTestFreeShop(event.target.checked)}
                                                            className="tw-h-3.5 tw-w-3.5 tw-accent-emerald-400"
                                                        />
                                                        <span>測試模式：免費購物</span>
                                                    </label>
                                                )}
                                                {shopTestToolsEnabled && (
                                                    <label className="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-border tw-border-indigo-400/60 tw-bg-indigo-950/40 tw-px-2 tw-py-1 tw-text-indigo-100">
                                                        <input
                                                            type="checkbox"
                                                            checked={isTestUnlimitedShop}
                                                            onChange={(event) => setIsTestUnlimitedShop(event.target.checked)}
                                                            className="tw-h-3.5 tw-w-3.5 tw-accent-indigo-400"
                                                        />
                                                        <span>測試模式：商店無限制</span>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {isSkillModalOpen && (
                            <div className="tower-shop-modal-backdrop" onClick={handleCloseSkillModal} role="presentation">
                                <div className="tower-shop-modal-panel tower-modal-panel" role="dialog" aria-modal="true" aria-label="技能列表" onClick={(event) => event.stopPropagation()}>
                                    <div className="tower-shop-modal-header">
                                        <div className="tw-min-w-0">
                                            <h4 className="tw-text-base tw-font-semibold tw-text-slate-50">技能列表</h4>
                                            <p className="tw-text-xs tw-text-slate-300">已購買技能與效果說明，使用技能會消耗 1 張並算 1 次行動。</p>
                                        </div>
                                    </div>
                                    <div className="tower-modal-scroll">
                                        {ownedSkillEntries.length > 0 ? (
                                            <div className="tw-grid tw-gap-2 sm:tw-grid-cols-2">
                                                {ownedSkillEntries.map((entry) => (
                                                    <div key={entry.skillId} className="tw-rounded-lg tw-border tw-border-violet-400/60 tw-bg-violet-950/35 tw-p-3">
                                                        <div className="tw-flex tw-items-start tw-gap-2">
                                                            <img src={entry.meta.imageSrc} alt={entry.meta.name} className="tower-shop-item-image" />
                                                            <div className="tw-min-w-0 tw-flex-1">
                                                                <p className="tw-text-sm tw-font-semibold tw-text-violet-100">{entry.meta.name} x{entry.count}</p>
                                                                <p className="tw-mt-1 tw-text-xs tw-text-slate-200">{entry.meta.description}</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUseSkill(entry.skillId)}
                                                                    disabled={isDefeated || isEnemyTurnPending || isLevelUpOpen || isShopModalOpen || isReplacementModalOpen || isServiceModalOpen}
                                                                    className="tw-mt-2 tw-rounded-md tw-border tw-border-violet-300/70 tw-bg-violet-900/45 tw-px-2 tw-py-1 tw-text-xs tw-text-violet-100 disabled:tw-opacity-50"
                                                                >
                                                                    使用技能
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="tw-text-sm tw-text-slate-300">目前尚未持有技能卡。</p>
                                        )}
                                    </div>
                                    <div className="tower-modal-footer">
                                        <button type="button" onClick={handleCloseSkillModal} className="tw-rounded-md tw-border tw-border-slate-400 tw-bg-slate-700/80 tw-px-3 tw-py-1 tw-text-xs">
                                            關閉
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isReplacementModalOpen && replacementFlowState?.item && (
                            <div className="tower-shop-modal-backdrop" onClick={closeReplacementFlow} role="presentation">
                                <div className="tower-shop-modal-panel tower-modal-panel" role="dialog" aria-modal="true" aria-label="替換欄位" onClick={(event) => event.stopPropagation()}>
                                    <div className="tower-shop-modal-header">
                                        <div className="tw-min-w-0">
                                            <h4 className="tw-text-base tw-font-semibold tw-text-slate-50">欄位已滿，請選擇替換</h4>
                                            <p className="tw-text-xs tw-text-slate-300">即將購買：{replacementFlowState.item.name}</p>
                                        </div>
                                    </div>
                                    <div className="tower-modal-scroll tw-space-y-2">
                                        {replacementFlowState.target === 'potion' ? (
                                            Array.from({ length: POTION_SLOT_COUNT }, (_, index) => {
                                                const slot = potionSlots[index];
                                                return (
                                                    <button
                                                        key={`replace-potion-${index}`}
                                                        type="button"
                                                        onClick={() => handleConfirmReplacement(index)}
                                                        className="tw-flex tw-w-full tw-items-center tw-justify-between tw-rounded-md tw-border tw-border-amber-300/70 tw-bg-amber-900/35 tw-px-3 tw-py-2 tw-text-left tw-text-sm tw-text-amber-100"
                                                    >
                                                        <span>補品格 {index + 1}：{slot ? `${slot.name} x${slot.count}` : '空格'}</span>
                                                        <span>替換</span>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleConfirmReplacement(0)}
                                                className="tw-flex tw-w-full tw-items-center tw-justify-between tw-rounded-md tw-border tw-border-amber-300/70 tw-bg-amber-900/35 tw-px-3 tw-py-2 tw-text-left tw-text-sm tw-text-amber-100"
                                            >
                                                <span>{replacementFlowState.target === 'armor' ? '替換防具欄位' : '替換道具欄位'}</span>
                                                <span>確認替換</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="tower-modal-footer">
                                        <button type="button" onClick={closeReplacementFlow} className="tw-rounded-md tw-border tw-border-slate-400 tw-bg-slate-700/80 tw-px-3 tw-py-1 tw-text-xs">
                                            取消
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isServiceModalOpen && activeServiceItem && activeServicePreview && (
                            <div className="tower-shop-modal-backdrop" onClick={() => closeServiceModal()} role="presentation">
                                <div className="tower-shop-modal-panel tower-modal-panel" role="dialog" aria-modal="true" aria-label={`${activeServiceItem.name} 預覽`} onClick={(event) => event.stopPropagation()}>
                                    <div className="tower-shop-modal-header">
                                        <div className="tw-min-w-0">
                                            <h4 className="tw-text-base tw-font-semibold tw-text-slate-50">{activeServiceItem.name} 預覽</h4>
                                            <p className="tw-text-xs tw-text-slate-300">{activeServiceItem.description}</p>
                                        </div>
                                    </div>
                                    <div className="tower-modal-scroll">
                                        <div className="tower-service-preview-grid">
                                            {activeServiceItem.serviceType === 'enchant' && (
                                                <>
                                                    <div className="tower-service-preview-row">
                                                        <span>武器元素</span>
                                                        <div className="tw-inline-flex tw-items-center tw-gap-2">
                                                            <ElementChip elementId={selectedWeapon.elementId} />
                                                            <span className="tw-text-slate-400">→</span>
                                                            <ElementChip elementId={activeServicePreview.candidateWeaponElementId} />
                                                        </div>
                                                    </div>
                                                    <div className="tower-service-preview-row">
                                                        <span>攻擊元素</span>
                                                        <div className="tw-inline-flex tw-items-center tw-gap-2">
                                                            <ElementChip elementId={activeServicePreview.currentAttackElementId} />
                                                            <span className="tw-text-slate-400">→</span>
                                                            <ElementChip elementId={activeServicePreview.nextAttackElementId} />
                                                        </div>
                                                    </div>
                                                    <div className="tower-service-preview-row">
                                                        <span>對當前敵人加成</span>
                                                        <div className="tw-inline-flex tw-items-center tw-gap-2">
                                                            <span className="tw-text-slate-200">({formatSignedValue(activeServicePreview.currentDelta)})</span>
                                                            <span className="tw-text-slate-400">→</span>
                                                            <span className="tw-font-semibold tw-text-amber-200">({formatSignedValue(activeServicePreview.nextDelta)})</span>
                                                        </div>
                                                    </div>
                                                    {activeServicePreview.forcedElementLocked && (
                                                        <p className="tower-service-preview-note">
                                                            你目前有強制攻擊元素效果（焦渴之炎）。本次附魔只會改變武器元素，不會改變攻擊元素。
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                            {activeServiceItem.serviceType === 'upgrade' && (
                                                <>
                                                    <div className="tower-service-preview-row">
                                                        <span>基礎攻擊</span>
                                                        <div className="tw-inline-flex tw-items-center tw-gap-2">
                                                            <span>{activeServicePreview.currentBaseAttack}</span>
                                                            <span className="tw-text-slate-400">→</span>
                                                            <span className="tw-font-semibold tw-text-emerald-200">{activeServicePreview.nextBaseAttack}</span>
                                                            <span className="tw-text-emerald-300">({formatSignedValue((activeServicePreview.nextBaseAttack || 0) - (activeServicePreview.currentBaseAttack || 0))})</span>
                                                        </div>
                                                    </div>
                                                    <div className="tower-service-preview-row">
                                                        <span>實際攻擊</span>
                                                        <div className="tw-inline-flex tw-items-center tw-gap-2">
                                                            <span>{activeServicePreview.currentEffectiveAttack}</span>
                                                            <span className="tw-text-slate-400">→</span>
                                                            <span className="tw-font-semibold tw-text-emerald-200">{activeServicePreview.nextEffectiveAttack}</span>
                                                            <span className="tw-text-emerald-300">({formatSignedValue((activeServicePreview.nextEffectiveAttack || 0) - (activeServicePreview.currentEffectiveAttack || 0))})</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                            <div className="tower-service-preview-gold">
                                                <span>金幣：{activeServicePreview.goldBefore}</span>
                                                <span>花費：{activeServicePreview.effectiveCost}</span>
                                                <span>購買後：{activeServicePreview.goldAfter}</span>
                                            </div>
                                            {!activeServicePreview.affordable && (
                                                <p className="tower-service-preview-note tower-service-preview-note-warn">金幣不足，無法確認本次服務。</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="tower-modal-footer">
                                        <button type="button" onClick={() => closeServiceModal()} className="tw-rounded-md tw-border tw-border-slate-400 tw-bg-slate-700/80 tw-px-3 tw-py-1 tw-text-xs">
                                            取消
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmServicePurchase}
                                            disabled={!activeServicePreview.affordable}
                                            className="tw-rounded-md tw-border tw-border-amber-300/80 tw-bg-amber-900/45 tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-text-amber-100 disabled:tw-opacity-50"
                                        >
                                            確認購買
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isShopModalOpen && activeShopMeta && (
                            <div className="tower-shop-modal-backdrop" onClick={handleCloseShop} role="presentation">
                                <div className="tower-shop-modal-panel tower-modal-panel" role="dialog" aria-modal="true" aria-label={activeShopMeta.title} onClick={(event) => event.stopPropagation()}>
                                    <div className="tower-shop-modal-header">
                                        <div className="tw-min-w-0">
                                            <h4 className="tw-text-base tw-font-semibold tw-text-slate-50">{activeShopMeta.title}</h4>
                                            <p className="tw-text-xs tw-text-slate-300">{activeShopMeta.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="tower-modal-scroll">
                                        <img
                                            src={activeShopMeta.coverSrc}
                                            alt={`${activeShopMeta.title} cover`}
                                            className="tower-shop-cover-image"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                        <div className="tower-shop-modal-subbar">
                                            <span className="tw-text-xs tw-text-slate-200">金幣：{gold}</span>
                                            {effectiveTestFreeShop && <span className="tw-text-xs tw-text-emerald-200">免費購物啟用</span>}
                                            {(itemSlot?.itemType === 'vip_card' || cardEffects.shopDiscountPct > 0) && (
                                                <span className="tw-text-xs tw-text-amber-200">
                                                    VIP 折扣啟用（當前 {Math.max(1, Math.round((1 - Math.min(
                                                        SHOP_TOTAL_DISCOUNT_MAX_PCT,
                                                        (itemSlot?.itemType === 'vip_card' ? SHOP_VIP_ITEM_DISCOUNT_PCT : 0) + cardEffects.shopDiscountPct
                                                    )) * 10))} 折）
                                                </span>
                                            )}
                                            {openShopId === 'normal' && (
                                                <button
                                                    type="button"
                                                    onClick={handleNormalShopRefreshDemo}
                                                    disabled={!canRefreshNormalShop}
                                                    className="tw-rounded-md tw-border tw-border-lime-300/70 tw-bg-lime-900/45 tw-px-3 tw-py-1 tw-text-xs tw-text-lime-100 disabled:tw-opacity-50"
                                                >
                                                    刷新（{resolveCost(NORMAL_SHOP_REFRESH_COST)}）
                                                </button>
                                            )}
                                        </div>
                                        <div className={`tower-shop-grid ${activeShopMeta.gridClassName}`}>
                                            {activeShopItems.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleShopItemClick(item)}
                                                    className={`tower-shop-item-card ${item.kind === 'weapon'
                                                        ? 'tower-shop-item-weapon'
                                                        : item.kind === 'armor'
                                                            ? 'tower-shop-item-armor'
                                                            : item.kind === 'skill'
                                                                ? 'tower-shop-item-skill'
                                                                : item.kind === 'mystery'
                                                                    ? 'tower-shop-item-mystery'
                                                                    : item.kind === 'service'
                                                                        ? 'tower-shop-item-service'
                                                                        : 'tower-shop-item-default'}`}
                                                >
                                                    <img src={item.imageSrc} alt={item.name} className="tower-shop-item-image" loading="lazy" decoding="async" />
                                                    <span className="tower-shop-item-name">{item.name}</span>
                                                    <span className="tower-shop-item-desc">{item.description}</span>
                                                    <span className="tower-shop-item-cost">{resolveCost(item.baseCost)} 金幣</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="tower-modal-footer">
                                        <button type="button" onClick={handleCloseShop} className="tw-rounded-md tw-border tw-border-slate-400 tw-bg-slate-700/80 tw-px-3 tw-py-1 tw-text-xs">
                                            關閉
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}
                {phase !== 'battle' && (
                    <div className="tower-bottom-controls">
                        <div className="tower-bottom-controls-row">
                            <button type="button" onClick={handleExit} className="tw-rounded-lg tw-border tw-border-slate-500 tw-bg-slate-800/80 tw-px-4 tw-py-2 tw-text-sm hover:tw-bg-slate-700">
                                離開爬塔
                            </button>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}

