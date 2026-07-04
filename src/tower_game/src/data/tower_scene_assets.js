const TOWER_BACKGROUND_ROOT = 'assets/images/minigames/tower/backgrounds';

export const BG_NAMING_RULE = Object.freeze({
    pattern: 'bg_{scope}_{theme}_v{nn}.{ext}',
    scopes: Object.freeze(['global', 'class', 'gacha', 'battle', 'shop', 'boss']),
    themeFormat: 'lowercase snake_case',
    versionFormat: '2-digit number (01, 02, ...)',
    example: 'bg_battle_abyss_v02.jpg'
});

const GLOBAL_BG = `${TOWER_BACKGROUND_ROOT}/bg_global_tower_main_v01.jpg`;

export const TOWER_SCENE_ASSETS = Object.freeze({
    global: Object.freeze({
        main: GLOBAL_BG
    }),
    class: Object.freeze({
        main: GLOBAL_BG
    }),
    gacha: Object.freeze({
        main: GLOBAL_BG
    }),
    battle: Object.freeze({
        main: GLOBAL_BG
    }),
    shop: Object.freeze({
        main: GLOBAL_BG
    }),
    boss: Object.freeze({
        main: GLOBAL_BG
    })
});

function resolveSceneScope({ phase, inShop, isBoss }) {
    if (inShop) return 'shop';
    if (isBoss) return 'boss';
    if (phase === 'class') return 'class';
    if (phase === 'gacha') return 'gacha';
    if (phase === 'battle') return 'battle';
    return 'global';
}

export function resolveTowerSceneBackground({ phase = 'class', inShop = false, isBoss = false } = {}) {
    const scope = resolveSceneScope({ phase, inShop, isBoss });
    return TOWER_SCENE_ASSETS[scope]?.main || TOWER_SCENE_ASSETS.global.main || '';
}

