import {
    CLASS_DEFS,
    OPENING_GACHA_MAX_RARITY_ID,
    RARITY_DEFS,
    RARITY_ORDER,
    WEAPON_TYPE_LIST,
    WEAPON_VARIANT_COUNT
} from '../data/gameData.js';
import { pickRandomElementId } from './elemental.js';

function clampOpeningRarityOrder(maxRarityId = OPENING_GACHA_MAX_RARITY_ID) {
    const maxIndex = Math.max(0, RARITY_ORDER.indexOf(maxRarityId));
    return RARITY_ORDER.slice(0, maxIndex + 1);
}

function weightedPick(rarityIds) {
    const pool = rarityIds.map((id) => RARITY_DEFS[id]).filter(Boolean);
    const totalWeight = pool.reduce((acc, rarity) => acc + rarity.weight, 0);
    let cursor = Math.random() * totalWeight;
    for (const rarity of pool) {
        cursor -= rarity.weight;
        if (cursor <= 0) return rarity;
    }
    return pool[pool.length - 1] || RARITY_DEFS.common;
}

function pickWeaponType() {
    const idx = Math.floor(Math.random() * WEAPON_TYPE_LIST.length);
    return WEAPON_TYPE_LIST[idx];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function computeWeaponBaseAttack(rarity) {
    const base = randomInt(14, 21);
    return Math.round(base * (rarity?.atkMul || 1));
}

export function getWeaponPenaltyRate(classId, weaponType) {
    const classDef = CLASS_DEFS[classId];
    if (!classDef) return 1;
    if (classDef.id === 'druid') return 0.9;
    return classDef.weaponType === weaponType ? 1 : 0.8;
}

export function buildWeaponForClass(classId, { maxRarityId = OPENING_GACHA_MAX_RARITY_ID } = {}) {
    const availableRarityIds = clampOpeningRarityOrder(maxRarityId);
    const rarity = weightedPick(availableRarityIds);
    const weaponType = pickWeaponType();
    const elementId = pickRandomElementId();
    const baseAttack = computeWeaponBaseAttack(rarity);
    const penaltyRate = getWeaponPenaltyRate(classId, weaponType);
    const effectiveAttack = Math.max(1, Math.round(baseAttack * penaltyRate));
    const variantIndex = randomInt(1, WEAPON_VARIANT_COUNT);
    const weaponName = `${rarity.name}${weaponType === 'sword' ? '劍' : (weaponType === 'bow' ? '弓' : '魔杖')}`;
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: weaponName,
        rarityId: rarity.id,
        weaponType,
        elementId,
        variantIndex,
        baseAttack,
        effectiveAttack,
        penaltyRate
    };
}

export function createOpeningDrawSet(classId, drawCount = 5) {
    const count = Math.max(1, drawCount);
    const result = [];
    for (let i = 0; i < count; i += 1) {
        result.push(buildWeaponForClass(classId, { maxRarityId: OPENING_GACHA_MAX_RARITY_ID }));
    }
    return result;
}
