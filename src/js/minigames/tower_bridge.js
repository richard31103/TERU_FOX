import { DEV_ASSET_VERSIONING_ENABLED } from '../config/asset_versioning.js';

const TOWER_BUNDLE_URL = 'assets/minigames/tower/tower-game.bundle.js';
const TOWER_STYLE_URL = 'assets/minigames/tower/tower-game.css';
const TOWER_GLOBAL_KEY = '__TERU_TOWER_GAME__';
const TOWER_BUNDLE_VERSION = 'phase53-20260717-2';
const TOWER_CACHE_QUERY_KEY = '__towerv';
const TOWER_RUNTIME_CACHE_TOKEN = DEV_ASSET_VERSIONING_ENABLED
    ? `dev-${Date.now().toString(36)}`
    : TOWER_BUNDLE_VERSION;

let towerLoadPromise = null;
let towerStyleReady = false;

function appendQueryValue(url, key, value) {
    if (!url || !key || value === undefined || value === null || value === '') return url;
    const hashIndex = url.indexOf('#');
    const hashPart = hashIndex >= 0 ? url.slice(hashIndex) : '';
    const noHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const queryIndex = noHash.indexOf('?');
    const base = queryIndex >= 0 ? noHash.slice(0, queryIndex) : noHash;
    const query = queryIndex >= 0 ? noHash.slice(queryIndex + 1) : '';
    const params = new URLSearchParams(query);
    params.set(key, String(value));
    const nextQuery = params.toString();
    return `${base}${nextQuery ? `?${nextQuery}` : ''}${hashPart}`;
}

function buildTowerStyleUrl() {
    return appendQueryValue(TOWER_STYLE_URL, TOWER_CACHE_QUERY_KEY, TOWER_RUNTIME_CACHE_TOKEN);
}

function injectTowerStyleOnce() {
    if (towerStyleReady) {
        const loaded = document.querySelector(`link[data-tower-style="1"][data-tower-style-version="${TOWER_RUNTIME_CACHE_TOKEN}"]`);
        if (loaded) return;
        towerStyleReady = false;
    }
    const existing = document.querySelector(`link[data-tower-style="1"]`);
    if (existing) {
        if (existing.dataset.towerStyleVersion === TOWER_RUNTIME_CACHE_TOKEN) {
            towerStyleReady = true;
            return;
        }
        existing.remove();
    }
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = buildTowerStyleUrl();
    linkEl.dataset.towerStyle = '1';
    linkEl.dataset.towerStyleVersion = TOWER_RUNTIME_CACHE_TOKEN;
    document.head.appendChild(linkEl);
    towerStyleReady = true;
}

function buildTowerBundleUrl(retryCount = 0) {
    let url = appendQueryValue(TOWER_BUNDLE_URL, TOWER_CACHE_QUERY_KEY, TOWER_RUNTIME_CACHE_TOKEN);
    if (retryCount > 0) {
        url = appendQueryValue(url, 'retry', Date.now());
    }
    return url;
}

function loadTowerScriptOnce(retryCount = 0) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-tower-bundle="1"]`);
        if (existing) {
            if (existing.dataset.towerBundleVersion !== TOWER_RUNTIME_CACHE_TOKEN) {
                existing.remove();
                try {
                    delete window[TOWER_GLOBAL_KEY];
                } catch (_err) {
                    // Ignore delete failures and continue with reload.
                }
                loadTowerScriptOnce(retryCount + 1).then(resolve).catch(reject);
                return;
            }
            if (window[TOWER_GLOBAL_KEY]) {
                resolve();
                return;
            }
            if (existing.dataset.towerBundleFailed === '1') {
                existing.remove();
                loadTowerScriptOnce(retryCount + 1).then(resolve).catch(reject);
                return;
            }
            if (existing.dataset.towerBundleLoaded === '1') {
                if (retryCount >= 2) {
                    reject(new Error('Tower bundle loaded but API missing.'));
                    return;
                }
                existing.remove();
                loadTowerScriptOnce(retryCount + 1).then(resolve).catch(reject);
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Tower bundle load failed.')), { once: true });
            return;
        }

        const scriptEl = document.createElement('script');
        scriptEl.src = buildTowerBundleUrl(retryCount);
        scriptEl.async = true;
        scriptEl.dataset.towerBundle = '1';
        scriptEl.dataset.towerBundleVersion = TOWER_RUNTIME_CACHE_TOKEN;
        scriptEl.onload = () => {
            scriptEl.dataset.towerBundleLoaded = '1';
            resolve();
        };
        scriptEl.onerror = () => {
            scriptEl.dataset.towerBundleFailed = '1';
            reject(new Error('Tower bundle load failed.'));
        };
        document.head.appendChild(scriptEl);
    });
}

async function ensureTowerApi() {
    if (window[TOWER_GLOBAL_KEY]) return window[TOWER_GLOBAL_KEY];
    if (!towerLoadPromise) {
        injectTowerStyleOnce();
        towerLoadPromise = loadTowerScriptOnce()
            .then(() => {
                const api = window[TOWER_GLOBAL_KEY];
                if (!api || typeof api.mountTowerGame !== 'function' || typeof api.unmountTowerGame !== 'function') {
                    throw new Error('Tower bundle API not found.');
                }
                return api;
            })
            .catch((error) => {
                towerLoadPromise = null;
                throw error;
            });
    }
    return towerLoadPromise;
}

export async function mountTowerGame(options) {
    const api = await ensureTowerApi();
    return api.mountTowerGame(options);
}

export function unmountTowerGame() {
    const api = window[TOWER_GLOBAL_KEY];
    if (!api || typeof api.unmountTowerGame !== 'function') return;
    api.unmountTowerGame();
}
