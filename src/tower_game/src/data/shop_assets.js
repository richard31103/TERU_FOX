import { RARITY_DEFS, WEAPON_TYPES, WEAPON_VARIANT_COUNT } from './gameData.js';
import { pickRandomElementId } from '../logic/elemental.js';

const SHOP_ASSET_ROOT = 'assets/images/minigames/tower/enemies';
const WEAPON_ASSET_ROOT = 'assets/images/minigames/tower/weapons';

const SHOP_IDS = ['normal', 'magic', 'mystery'];

const SHOP_MODAL_META = Object.freeze({
    normal: Object.freeze({
        id: 'normal',
        title: '常駐商店',
        subtitle: '武器 / 防具 / 藥水',
        coverSrc: `${SHOP_ASSET_ROOT}/normal_shop.png`,
        gridClassName: 'tower-shop-grid-normal'
    }),
    magic: Object.freeze({
        id: 'magic',
        title: '魔法商店',
        subtitle: '技能 / 附魔 / 強化',
        coverSrc: `${SHOP_ASSET_ROOT}/special_shop.png`,
        gridClassName: 'tower-shop-grid-magic'
    }),
    mystery: Object.freeze({
        id: 'mystery',
        title: '神秘商店',
        subtitle: '永久強化 / 特殊道具',
        coverSrc: `${SHOP_ASSET_ROOT}/mystery_shop.png`,
        gridClassName: 'tower-shop-grid-mystery'
    })
});

const NORMAL_SHOP_DEFENSIVE_GEAR_ASSETS = Object.freeze([
    `${SHOP_ASSET_ROOT}/normal_shop/Defensive_Gear_01.png`,
    `${SHOP_ASSET_ROOT}/normal_shop/Defensive_Gear_02.png`,
    `${SHOP_ASSET_ROOT}/normal_shop/Defensive_Gear_03.png`,
    `${SHOP_ASSET_ROOT}/normal_shop/Defensive_Gear_04.png`,
    `${SHOP_ASSET_ROOT}/normal_shop/Defensive_Gear_05.png`,
    `${SHOP_ASSET_ROOT}/normal_shop/Defensive_Gear_06.png`,
    `${SHOP_ASSET_ROOT}/normal_shop/Defensive_Gear_07.png`,
    `${SHOP_ASSET_ROOT}/normal_shop/Defensive_Gear_08.png`
]);

export const MAGIC_SKILL_ITEMS = Object.freeze([
    Object.freeze({
        id: 'skill_triple_strike',
        kind: 'skill',
        skillId: 'skill_triple_strike',
        name: '三連擊',
        description: '一次打出三段',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/1.Triple_Strike.png`,
        baseCost: 140
    }),
    Object.freeze({
        id: 'skill_envenom',
        kind: 'skill',
        skillId: 'skill_envenom',
        name: '塗毒',
        description: '附加持續傷害',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/2.Envenom.png`,
        baseCost: 145
    }),
    Object.freeze({
        id: 'skill_wild_slash',
        kind: 'skill',
        skillId: 'skill_wild_slash',
        name: '亂砍',
        description: '高風險高回報',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/3.Wild_Slash.png`,
        baseCost: 150
    }),
    Object.freeze({
        id: 'skill_time_stop',
        kind: 'skill',
        skillId: 'skill_time_stop',
        name: '時間暫停',
        description: '短時間連續出手',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/4.Time_Stop.png`,
        baseCost: 165
    }),
    Object.freeze({
        id: 'skill_enrage',
        kind: 'skill',
        skillId: 'skill_enrage',
        name: '狂怒',
        description: '輸出與承傷同步提高',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/5.Enrage.png`,
        baseCost: 150
    }),
    Object.freeze({
        id: 'skill_element_swap',
        kind: 'skill',
        skillId: 'skill_element_swap',
        name: '屬性交換',
        description: '隨機替換屬性',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/6.Element_Swap.png`,
        baseCost: 140
    }),
    Object.freeze({
        id: 'skill_charm',
        kind: 'skill',
        skillId: 'skill_charm',
        name: '魅惑',
        description: '嘗試控制目標',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/7.Charm.png`,
        baseCost: 170
    }),
    Object.freeze({
        id: 'skill_blood_sacrifice',
        kind: 'skill',
        skillId: 'skill_blood_sacrifice',
        name: '血之祭祀',
        description: '獻祭生命換增幅',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/8.Blood_Sacrifice.png`,
        baseCost: 160
    }),
    Object.freeze({
        id: 'skill_execute',
        kind: 'skill',
        skillId: 'skill_execute',
        name: '處決',
        description: '低血斬殺',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/9.Execute.png`,
        baseCost: 175
    }),
    Object.freeze({
        id: 'skill_phantom',
        kind: 'skill',
        skillId: 'skill_phantom',
        name: '幻影',
        description: '閃避與承傷變化',
        imageSrc: `${SHOP_ASSET_ROOT}/skill/10.Phantom.png`,
        baseCost: 165
    })
]);

export const MAGIC_SERVICE_ITEMS = Object.freeze([
    Object.freeze({
        id: 'magic_enchant',
        kind: 'service',
        serviceType: 'enchant',
        name: '附魔',
        description: '重置武器元素',
        imageSrc: `${SHOP_ASSET_ROOT}/normal_shop/Enchantment.png`,
        baseCost: 150
    }),
    Object.freeze({
        id: 'magic_upgrade',
        kind: 'service',
        serviceType: 'upgrade',
        name: '武器強化',
        description: '提升武器攻擊',
        imageSrc: `${SHOP_ASSET_ROOT}/normal_shop/Upgrade.png`,
        baseCost: 180
    })
]);

const NORMAL_SHOP_POTION_ITEMS = Object.freeze([
    Object.freeze({
        id: 'normal_hp_m',
        kind: 'consumable',
        consumableType: 'heal',
        healPct: 0.35,
        maxStack: 9,
        name: '中型補血藥',
        description: '回復 35% 最大生命',
        imageSrc: `${SHOP_ASSET_ROOT}/normal_shop/Health_Potion_M.png`,
        baseCost: 70
    }),
    Object.freeze({
        id: 'normal_hp_l',
        kind: 'consumable',
        consumableType: 'heal',
        healPct: 0.6,
        maxStack: 9,
        name: '大型補血藥',
        description: '回復 60% 最大生命',
        imageSrc: `${SHOP_ASSET_ROOT}/normal_shop/Health_Potion_L.png`,
        baseCost: 110
    }),
    Object.freeze({
        id: 'normal_buff_m',
        kind: 'consumable',
        consumableType: 'attack_buff',
        attackMul: 1.25,
        durationTurns: 2,
        maxStack: 9,
        name: '中型強化藥',
        description: '2 回合攻擊 x1.25',
        imageSrc: `${SHOP_ASSET_ROOT}/normal_shop/Buff_Potion_M.png`,
        baseCost: 85
    }),
    Object.freeze({
        id: 'normal_buff_l',
        kind: 'consumable',
        consumableType: 'attack_buff',
        attackMul: 1.45,
        durationTurns: 3,
        maxStack: 9,
        name: '大型強化藥',
        description: '3 回合攻擊 x1.45',
        imageSrc: `${SHOP_ASSET_ROOT}/normal_shop/Buff_Potion_L.png`,
        baseCost: 130
    })
]);

const MYSTERY_ITEMS = Object.freeze([
    Object.freeze({
        id: 'mystery_ring',
        kind: 'mystery',
        itemType: 'ring',
        name: '戒指',
        description: '攻擊增幅 5%~20%',
        imageSrc: `${SHOP_ASSET_ROOT}/item/Ring.png`,
        baseCost: 220
    }),
    Object.freeze({
        id: 'mystery_amulet',
        kind: 'mystery',
        itemType: 'amulet',
        name: '項鍊',
        description: '技能增幅 5%~10%',
        imageSrc: `${SHOP_ASSET_ROOT}/item/Amulet.png`,
        baseCost: 230
    }),
    Object.freeze({
        id: 'mystery_bracelet',
        kind: 'mystery',
        itemType: 'bracelet',
        name: '手環',
        description: '暴傷增幅 10%~50%',
        imageSrc: `${SHOP_ASSET_ROOT}/item/Bracelet.png`,
        baseCost: 250
    }),
    Object.freeze({
        id: 'mystery_earring',
        kind: 'mystery',
        itemType: 'earring',
        name: '耳環',
        description: '幸運增幅 5%~20%',
        imageSrc: `${SHOP_ASSET_ROOT}/item/Earring.png`,
        baseCost: 260
    }),
    Object.freeze({
        id: 'mystery_iv_drip',
        kind: 'mystery',
        itemType: 'iv_drip',
        name: '點滴',
        description: '每 10 秒回復 1% HP',
        imageSrc: `${SHOP_ASSET_ROOT}/item/IV_Drip.png`,
        baseCost: 240
    }),
    Object.freeze({
        id: 'mystery_unknown_potion',
        kind: 'mystery',
        itemType: 'unknown_potion',
        oneShot: true,
        name: '不知名的藥',
        description: '一次性隨機效果',
        imageSrc: `${SHOP_ASSET_ROOT}/item/Unknown_Potion.png`,
        baseCost: 210
    }),
    Object.freeze({
        id: 'mystery_substitute',
        kind: 'mystery',
        itemType: 'substitute',
        oneShot: true,
        name: '替身',
        description: '抵擋一次致死',
        imageSrc: `${SHOP_ASSET_ROOT}/item/Substitute.png`,
        baseCost: 280
    }),
    Object.freeze({
        id: 'mystery_vip_card',
        kind: 'mystery',
        itemType: 'vip_card',
        name: 'VIP 貴賓卡',
        description: '所有購物 8 折',
        imageSrc: `${SHOP_ASSET_ROOT}/item/VIP_Card.png`,
        baseCost: 300
    }),
    Object.freeze({
        id: 'mystery_weapon_exchange',
        kind: 'mystery',
        itemType: 'weapon_exchange',
        oneShot: true,
        name: '武器交換',
        description: '同武器隨機升降階',
        imageSrc: `${SHOP_ASSET_ROOT}/item/Weapon_Exchange.png`,
        baseCost: 260
    }),
    Object.freeze({
        id: 'mystery_robbery',
        kind: 'mystery',
        itemType: 'robbery',
        oneShot: true,
        name: '搶劫',
        description: '免費拿一件並封鎖神秘商人',
        imageSrc: `${SHOP_ASSET_ROOT}/item/Robbery.png`,
        baseCost: 0
    })
]);

export const RESERVED_NORMAL_SHOP_ASSETS = Object.freeze([
    Object.freeze({
        id: 'reserved_scroll',
        name: 'Scroll',
        reserved: true,
        imageSrc: `${SHOP_ASSET_ROOT}/normal_shop/Scroll.png`
    }),
    Object.freeze({
        id: 'reserved_spellbook',
        name: 'Spellbook',
        reserved: true,
        imageSrc: `${SHOP_ASSET_ROOT}/normal_shop/Spellbook.png`
    })
]);

export const SKILL_ITEM_MAP = Object.freeze(
    MAGIC_SKILL_ITEMS.reduce((acc, item) => {
        acc[item.skillId] = item;
        return acc;
    }, {})
);

export const MYSTERY_ITEM_MAP = Object.freeze(
    MYSTERY_ITEMS.reduce((acc, item) => {
        acc[item.itemType] = item;
        return acc;
    }, {})
);

function pad2(value) {
    return String(value).padStart(2, '0');
}

function randomIndex(max, rng) {
    if (!Number.isFinite(max) || max <= 0) return 0;
    return Math.floor(rng() * max);
}

function randomRange(min, max, rng = Math.random) {
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin;
    return safeMin + (rng() * (safeMax - safeMin));
}

function sampleWithoutReplacement(pool, count, rng = Math.random) {
    const list = [...pool];
    for (let i = list.length - 1; i > 0; i -= 1) {
        const j = randomIndex(i + 1, rng);
        const temp = list[i];
        list[i] = list[j];
        list[j] = temp;
    }
    return list.slice(0, Math.max(0, Math.min(count, list.length)));
}

function weightedPick(pool, rng = Math.random) {
    const totalWeight = pool.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
    if (totalWeight <= 0) return pool[0];
    let roll = rng() * totalWeight;
    for (const entry of pool) {
        roll -= Math.max(0, Number(entry.weight) || 0);
        if (roll <= 0) return entry;
    }
    return pool[pool.length - 1];
}

function randomWeaponCard(slotIndex, rng = Math.random) {
    const weaponTypeIds = Object.keys(WEAPON_TYPES);
    const weaponType = weaponTypeIds[randomIndex(weaponTypeIds.length, rng)] || 'sword';
    const variant = randomIndex(WEAPON_VARIANT_COUNT, rng) + 1;
    const rarityPool = [
        { id: 'common', weight: 48 },
        { id: 'advanced', weight: 30 },
        { id: 'rare', weight: 15 },
        { id: 'epic', weight: 7 }
    ];
    const pickedRarity = weightedPick(rarityPool, rng) || rarityPool[0];
    const rarityId = pickedRarity.id;
    const rarityName = RARITY_DEFS[rarityId]?.name || rarityId;
    const elementId = pickRandomElementId({ rng });
    const baseAttack = Math.max(1, Math.round(randomRange(16, 24, rng) * (RARITY_DEFS[rarityId]?.atkMul || 1)));
    const priceBase = [120, 150, 190];
    const weaponTypeName = WEAPON_TYPES[weaponType]?.name || weaponType;
    return {
        id: `normal_weapon_${slotIndex + 1}_${weaponType}_${variant}_${rarityId}`,
        kind: 'weapon',
        name: `${rarityName}${weaponTypeName}`,
        description: `元素：${elementId} | 攻擊：${baseAttack}`,
        imageSrc: `${WEAPON_ASSET_ROOT}/${weaponType}/${weaponType}_${pad2(variant)}.png`,
        baseCost: priceBase[Math.min(slotIndex, priceBase.length - 1)],
        weaponType,
        variantIndex: variant,
        rarityId,
        elementId,
        baseAttack
    };
}

function randomArmorCard(slotIndex, rng = Math.random) {
    const imageSrc = NORMAL_SHOP_DEFENSIVE_GEAR_ASSETS[randomIndex(NORMAL_SHOP_DEFENSIVE_GEAR_ASSETS.length, rng)] || NORMAL_SHOP_DEFENSIVE_GEAR_ASSETS[0];
    const namePool = ['硬皮護甲', '符紋披風', '板甲護具', '強化護腿'];
    const damageReductionPct = Number((0.08 + (slotIndex * 0.02) + randomRange(0, 0.02, rng)).toFixed(3));
    const elementId = pickRandomElementId({ rng });
    return {
        id: `normal_armor_${slotIndex + 1}`,
        kind: 'armor',
        armorType: 'defense_gear',
        name: namePool[randomIndex(namePool.length, rng)] || '防具',
        description: `屬性：${elementId} | 常駐減傷 +${Math.round(damageReductionPct * 100)}%`,
        imageSrc,
        baseCost: 150 + (slotIndex * 20),
        damageReductionPct,
        elementId
    };
}

export function getShopModalMeta(shopId) {
    if (!SHOP_IDS.includes(shopId)) return null;
    return SHOP_MODAL_META[shopId];
}

export function getSkillItemMeta(skillId) {
    return SKILL_ITEM_MAP[skillId] || null;
}

export function buildNormalShopDisplayItems({ rng = Math.random } = {}) {
    const weapons = [0, 1, 2].map((index) => randomWeaponCard(index, rng));
    const armors = [0, 1, 2].map((index) => randomArmorCard(index, rng));
    const potions = NORMAL_SHOP_POTION_ITEMS.map((item) => ({ ...item }));
    return [...weapons, ...armors, ...potions];
}

export function buildMagicShopDisplayItems({ rng = Math.random } = {}) {
    const pickedSkills = sampleWithoutReplacement(MAGIC_SKILL_ITEMS, 4, rng).map((item) => ({ ...item }));
    const services = MAGIC_SERVICE_ITEMS.map((item) => ({ ...item }));
    return [...pickedSkills, ...services];
}

export function buildMysteryShopDisplayItems({ rng = Math.random } = {}) {
    return sampleWithoutReplacement(MYSTERY_ITEMS, 6, rng).map((item) => ({ ...item }));
}
