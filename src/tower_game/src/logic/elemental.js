export const ELEMENT_DEFS = {
    water: {
        id: 'water',
        name: '水',
        emoji: '💧',
        uiClass: 'tw-border-cyan-300/70 tw-bg-cyan-950/50 tw-text-cyan-100'
    },
    fire: {
        id: 'fire',
        name: '火',
        emoji: '🔥',
        uiClass: 'tw-border-rose-300/70 tw-bg-rose-950/50 tw-text-rose-100'
    },
    plant: {
        id: 'plant',
        name: '植',
        emoji: '🌿',
        uiClass: 'tw-border-emerald-300/70 tw-bg-emerald-950/50 tw-text-emerald-100'
    },
    
};

export const ELEMENT_IDS = Object.keys(ELEMENT_DEFS);

export const STATUS_DEFS = {
    poison: { id: 'poison', name: '中毒', emoji: '☠️', uiClass: 'tw-border-lime-300/70 tw-bg-lime-950/45 tw-text-lime-100' },
    burn: { id: 'burn', name: '燃燒', emoji: '🔥', uiClass: 'tw-border-rose-300/70 tw-bg-rose-950/45 tw-text-rose-100' },
    freeze: { id: 'freeze', name: '冰凍', emoji: '🧊', uiClass: 'tw-border-sky-300/70 tw-bg-sky-950/45 tw-text-sky-100' }
};

const ELEMENT_ADVANTAGE = {
    water: 'fire',
    fire: 'plant',
    plant: 'water'
};

const DEFAULT_STATUS = Object.freeze({
    poison: 0,
    burn: 0,
    freeze: 0
});

const POISON_TURN_COUNT = 2;
const BURN_TURN_COUNT = 2;
const FREEZE_TURN_COUNT = 1;

export function createEmptyStatus() {
    return {
        poison: 0,
        burn: 0,
        freeze: 0
    };
}

function clampTurnCount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.floor(parsed));
}

export function normalizeStatus(status = DEFAULT_STATUS) {
    return {
        poison: clampTurnCount(status.poison),
        burn: clampTurnCount(status.burn),
        freeze: clampTurnCount(status.freeze)
    };
}

export function pickRandomElementId({ exclude = [], rng = Math.random } = {}) {
    const blocked = new Set(Array.isArray(exclude) ? exclude : []);
    const pool = ELEMENT_IDS.filter((id) => !blocked.has(id));
    if (!pool.length) return ELEMENT_IDS[0] || 'water';
    const raw = Math.floor(rng() * pool.length);
    const idx = Math.max(0, Math.min(pool.length - 1, raw));
    return pool[idx];
}

export function getElementMatchup(attackerElementId, defenderElementId) {
    const attacker = ELEMENT_DEFS[attackerElementId] ? attackerElementId : null;
    const defender = ELEMENT_DEFS[defenderElementId] ? defenderElementId : null;
    if (!attacker || !defender || attacker === defender) {
        return { multiplier: 1, relation: 'neutral' };
    }
    if (ELEMENT_ADVANTAGE[attacker] === defender) {
        return { multiplier: 1.2, relation: 'advantage' };
    }
    if (ELEMENT_ADVANTAGE[defender] === attacker) {
        return { multiplier: 0.8, relation: 'disadvantage' };
    }
    return { multiplier: 1, relation: 'neutral' };
}

export function activeStatusEntries(status = DEFAULT_STATUS) {
    const normalized = normalizeStatus(status);
    return Object.keys(STATUS_DEFS)
        .filter((id) => normalized[id] > 0)
        .map((id) => ({ ...STATUS_DEFS[id], turns: normalized[id] }));
}

export function resolvePoisonTick(status = DEFAULT_STATUS, currentHp = 1) {
    const nextStatus = normalizeStatus(status);
    if (nextStatus.poison <= 0) return { nextStatus, damage: 0 };
    const hp = Math.max(1, Number(currentHp) || 1);
    const damage = Math.max(1, Math.round(hp * 0.05));
    nextStatus.poison = Math.max(0, nextStatus.poison - 1);
    return { nextStatus, damage };
}

export function resolveElementalOnHit({
    attackerElementId,
    attackerStatus = DEFAULT_STATUS,
    defenderStatus = DEFAULT_STATUS
} = {}) {
    const nextAttackerStatus = normalizeStatus(attackerStatus);
    const nextDefenderStatus = normalizeStatus(defenderStatus);
    let hitDamageMultiplier = 1;
    const reactionNotes = [];
    const effectNotes = [];
    const attackerElement = ELEMENT_DEFS[attackerElementId] ? attackerElementId : null;
    const defenderBurning = nextDefenderStatus.burn > 0;
    const defenderFrozen = nextDefenderStatus.freeze > 0;

    if (attackerElement === 'water') {
        if (defenderBurning) {
            nextDefenderStatus.burn = Math.max(0, nextDefenderStatus.burn - 1);
            hitDamageMultiplier *= 1.15;
            reactionNotes.push('滅火');
        }
        nextDefenderStatus.freeze = Math.max(nextDefenderStatus.freeze, FREEZE_TURN_COUNT);
        effectNotes.push('冰凍');
    }

    if (attackerElement === 'fire') {
        if (defenderFrozen) {
            nextDefenderStatus.freeze = 0;
            hitDamageMultiplier *= 1.2;
            reactionNotes.push('融冰');
        }
        nextDefenderStatus.burn = Math.max(nextDefenderStatus.burn, BURN_TURN_COUNT);
        effectNotes.push('燃燒');
    }

    if (attackerElement === 'plant') {
        nextDefenderStatus.poison = Math.max(nextDefenderStatus.poison, POISON_TURN_COUNT);
        effectNotes.push('中毒');
    }

    return {
        attackerElementId: attackerElement,
        nextAttackerStatus,
        nextDefenderStatus,
        hitDamageMultiplier,
        lifestealRate: attackerElement === 'plant' ? 0.2 : 0,
        reactionNotes,
        effectNotes
    };
}
