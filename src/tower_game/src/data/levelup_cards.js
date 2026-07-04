export const LEVELUP_REROLL_COST = 50;

export const LEVELUP_CARD_DEFS = Object.freeze({
    safety_airbag: Object.freeze({
        id: 'safety_airbag',
        kind: 'base',
        name: '安全氣囊',
        shortEffect: 'Miss 時 Combo 只 -1',
        description: '空包彈不再直接斷到 0，改為只扣 1 層 Combo。',
        uiClass: 'tw-border-cyan-400/70 tw-bg-cyan-950/35 tw-text-cyan-100'
    }),
    thorn_armor: Object.freeze({
        id: 'thorn_armor',
        kind: 'base',
        name: '荊棘反甲',
        shortEffect: 'Miss 受擊時反彈 30%',
        description: '空包彈挨打時，反彈怪物本次攻擊傷害的 30%。',
        uiClass: 'tw-border-sky-400/70 tw-bg-sky-950/35 tw-text-sky-100'
    }),
    potion_apprentice: Object.freeze({
        id: 'potion_apprentice',
        kind: 'base',
        name: '醫藥學徒',
        shortEffect: '補血藥效果 +20%',
        description: '所有補血藥的回復量額外提升 20% 最大生命。',
        uiClass: 'tw-border-emerald-400/70 tw-bg-emerald-950/35 tw-text-emerald-100'
    }),
    resilient_physique: Object.freeze({
        id: 'resilient_physique',
        kind: 'base',
        name: '堅韌體魄',
        shortEffect: '免疫毒/燃，承傷 +10%',
        description: '不再受到中毒與燃燒，但直接傷害提高 10%。',
        uiClass: 'tw-border-teal-400/70 tw-bg-teal-950/35 tw-text-teal-100'
    }),
    elemental_absorption: Object.freeze({
        id: 'elemental_absorption',
        kind: 'base',
        name: '屬性吸收',
        shortEffect: '三同非武器治癒 +10%',
        description: '治癒之泉回復由 10% 提升為 20%。',
        uiClass: 'tw-border-cyan-400/70 tw-bg-cyan-950/35 tw-text-cyan-100'
    }),
    lucky_coin: Object.freeze({
        id: 'lucky_coin',
        kind: 'base',
        name: '幸運金幣',
        shortEffect: '金幣 20% 視為武器屬性',
        description: '每個金幣圖案有 20% 機率同時算作武器屬性。',
        uiClass: 'tw-border-amber-400/80 tw-bg-amber-950/45 tw-text-amber-100'
    }),
    fair_trade: Object.freeze({
        id: 'fair_trade',
        kind: 'base',
        name: '等價交換',
        shortEffect: '武器圖案 +10%，金幣 -5%',
        description: '拉霸機中武器屬性出現率提高 10%，金幣出現率降低 5%。',
        uiClass: 'tw-border-violet-400/70 tw-bg-violet-950/35 tw-text-violet-100'
    }),
    afterimage_interference: Object.freeze({
        id: 'afterimage_interference',
        kind: 'base',
        name: '殘影干涉',
        shortEffect: '2 武器時 15% 升級三連',
        description: '轉出 2 個武器屬性時，15% 機率強制修正為 3 連武器。',
        uiClass: 'tw-border-indigo-400/70 tw-bg-indigo-950/35 tw-text-indigo-100'
    }),
    pity_master: Object.freeze({
        id: 'pity_master',
        kind: 'base',
        name: '保底達人',
        shortEffect: '全異轉軸保底點 +1',
        description: '轉出三個不同非金幣圖案時，保底點數改為 +2。',
        uiClass: 'tw-border-fuchsia-400/70 tw-bg-fuchsia-950/35 tw-text-fuchsia-100'
    }),
    pure_arming: Object.freeze({
        id: 'pure_arming',
        kind: 'base',
        name: '純粹武裝',
        shortEffect: '同屬防具時機率 +5%',
        description: '若防具屬性與武器屬性相同，該武器屬性出現率再提高 5%。',
        uiClass: 'tw-border-slate-300/70 tw-bg-slate-900/45 tw-text-slate-100'
    }),
    last_stand: Object.freeze({
        id: 'last_stand',
        kind: 'base',
        name: '破釜沉舟',
        shortEffect: 'HP < 30% 時傷害 x1.5',
        description: '低血量時所有最終傷害提升 50%。',
        uiClass: 'tw-border-rose-400/70 tw-bg-rose-950/35 tw-text-rose-100'
    }),
    full_hp_frenzy: Object.freeze({
        id: 'full_hp_frenzy',
        kind: 'base',
        name: '滿血狂熱',
        shortEffect: '滿血暴率 +20%',
        description: '生命值維持滿血時，額外獲得 20% 暴擊率。',
        uiClass: 'tw-border-orange-400/70 tw-bg-orange-950/35 tw-text-orange-100'
    }),
    combo_breakthrough: Object.freeze({
        id: 'combo_breakthrough',
        kind: 'base',
        name: '連擊突破',
        shortEffect: 'Combo 3+ 追加真傷',
        description: 'Combo 3 層以上時，每超過 1 層額外附加敵人當前生命 10% 真傷。',
        uiClass: 'tw-border-red-500/70 tw-bg-red-950/35 tw-text-red-100'
    }),
    giant_slayer: Object.freeze({
        id: 'giant_slayer',
        kind: 'base',
        name: '巨人殺手',
        shortEffect: '對 Boss 傷害 +20%',
        description: '對 Boss 的最終傷害提高 20%。',
        uiClass: 'tw-border-yellow-400/70 tw-bg-yellow-950/35 tw-text-yellow-100'
    }),
    all_in_gamble: Object.freeze({
        id: 'all_in_gamble',
        kind: 'base',
        name: '孤注一擲',
        shortEffect: 'Miss 後下次三連 x2',
        description: '空包彈挨打後，下次若轉出 3 武器屬性，該次傷害額外 x2。',
        uiClass: 'tw-border-rose-500/75 tw-bg-rose-950/45 tw-text-rose-100'
    }),
    greedy_hand: Object.freeze({
        id: 'greedy_hand',
        kind: 'base',
        name: '貪婪之手',
        shortEffect: '過關金幣 +30%',
        description: '擊敗怪物後獲得的基礎金幣提升 30%。',
        uiClass: 'tw-border-amber-500/80 tw-bg-amber-950/45 tw-text-amber-100'
    }),
    vip_member: Object.freeze({
        id: 'vip_member',
        kind: 'base',
        name: 'VIP 會員',
        shortEffect: '商店永久 8 折',
        description: '所有商店商品售價額外打 8 折。',
        uiClass: 'tw-border-lime-400/70 tw-bg-lime-950/35 tw-text-lime-100'
    }),
    toxin_conversion: Object.freeze({
        id: 'toxin_conversion',
        kind: 'base',
        name: '毒素轉換',
        shortEffect: '中毒時 2 連屬改為回血',
        description: '中毒狀態下轉出 2 武器屬時，不再造成傷害，改為等值回復。',
        uiClass: 'tw-border-green-400/70 tw-bg-green-950/35 tw-text-green-100'
    }),
    charm_extension: Object.freeze({
        id: 'charm_extension',
        kind: 'base',
        name: '魅惑擴展',
        shortEffect: '魅惑門檻提升到 20%',
        description: '魅惑目標的血量門檻由 10% 提升為 20%。',
        uiClass: 'tw-border-pink-400/70 tw-bg-pink-950/35 tw-text-pink-100'
    }),
    time_distortion: Object.freeze({
        id: 'time_distortion',
        kind: 'base',
        name: '時間扭曲',
        shortEffect: '自動轉軸 0.7 秒停一軸',
        description: '開啟自動拉霸時，停軸速度由 1 秒縮短至 0.7 秒。',
        uiClass: 'tw-border-blue-400/70 tw-bg-blue-950/35 tw-text-blue-100'
    })
});

export const LEVELUP_CARD_LIST = Object.freeze(Object.values(LEVELUP_CARD_DEFS));
export const LEVELUP_CARD_IDS = Object.freeze(
    Object.entries(LEVELUP_CARD_DEFS).reduce((acc, [key, def]) => {
        acc[key] = def.id;
        return acc;
    }, {})
);

export function getLevelUpCardById(cardId) {
    return LEVELUP_CARD_DEFS[cardId] || null;
}

export function drawLevelUpCandidates(count = 3, rng = Math.random) {
    const pool = [...LEVELUP_CARD_LIST];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = pool[i];
        pool[i] = pool[j];
        pool[j] = tmp;
    }
    return pool.slice(0, Math.max(1, Math.min(count, pool.length)));
}
