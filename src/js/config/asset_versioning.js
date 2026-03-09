const DEV_VERSION_QUERY_KEY = '__devv';
const IMAGE_ASSET_RE = /^assets\/images\/.+\.(png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i;
const FORCE_MODE_STORAGE_KEY = 'dev_asset_versioning';

function canUseWindow() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function readForceMode() {
    if (!canUseWindow() || !window.localStorage) return '';
    try {
        const mode = String(window.localStorage.getItem(FORCE_MODE_STORAGE_KEY) || '').trim().toLowerCase();
        if (mode === 'on' || mode === 'off') return mode;
    } catch (_err) {
        // Ignore storage access issues.
    }
    return '';
}

function isLikelyLocalDevHost(hostname) {
    if (!hostname) return false;
    const host = String(hostname).toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
    if (host.endsWith('.local')) return true;
    return false;
}

function isLikelyVercelPreviewHost(hostname) {
    if (!hostname) return false;
    const host = String(hostname).toLowerCase();
    return host.endsWith('.vercel.app') && host.includes('-git-');
}

function detectDevAssetVersioning() {
    const forceMode = readForceMode();
    if (forceMode === 'on') return true;
    if (forceMode === 'off') return false;
    if (!canUseWindow()) return false;
    const hostname = window.location?.hostname || '';
    return isLikelyLocalDevHost(hostname) || isLikelyVercelPreviewHost(hostname);
}

function createVersionToken() {
    return `dev-${Date.now().toString(36)}`;
}

function hasQueryKey(assetPath, key) {
    const qIndex = assetPath.indexOf('?');
    if (qIndex < 0) return false;
    const hashIndex = assetPath.indexOf('#', qIndex + 1);
    const queryText = hashIndex >= 0 ? assetPath.slice(qIndex + 1, hashIndex) : assetPath.slice(qIndex + 1);
    const params = new URLSearchParams(queryText);
    return params.has(key);
}

function appendVersionQuery(assetPath, token) {
    if (!assetPath || !token) return assetPath;
    if (hasQueryKey(assetPath, DEV_VERSION_QUERY_KEY)) return assetPath;
    const hashIndex = assetPath.indexOf('#');
    const hashText = hashIndex >= 0 ? assetPath.slice(hashIndex) : '';
    const noHashText = hashIndex >= 0 ? assetPath.slice(0, hashIndex) : assetPath;
    const qIndex = noHashText.indexOf('?');
    const basePath = qIndex >= 0 ? noHashText.slice(0, qIndex) : noHashText;
    const queryText = qIndex >= 0 ? noHashText.slice(qIndex + 1) : '';
    const params = new URLSearchParams(queryText);
    params.set(DEV_VERSION_QUERY_KEY, token);
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ''}${hashText}`;
}

function rewriteSrcsetValue(srcsetText) {
    if (typeof srcsetText !== 'string' || srcsetText.trim() === '') return srcsetText;
    return srcsetText
        .split(',')
        .map((entry) => {
            const trimmed = entry.trim();
            if (!trimmed) return trimmed;
            const firstSpaceIdx = trimmed.search(/\s/);
            if (firstSpaceIdx < 0) return withAssetVersion(trimmed);
            const urlPart = trimmed.slice(0, firstSpaceIdx);
            const descriptorPart = trimmed.slice(firstSpaceIdx).trim();
            const rewritten = withAssetVersion(urlPart);
            return descriptorPart ? `${rewritten} ${descriptorPart}` : rewritten;
        })
        .join(', ');
}

export const DEV_ASSET_VERSIONING_ENABLED = detectDevAssetVersioning();
const DEV_ASSET_VERSION_TOKEN = DEV_ASSET_VERSIONING_ENABLED ? createVersionToken() : '';

export function withAssetVersion(assetPath) {
    if (typeof assetPath !== 'string') return assetPath;
    if (!DEV_ASSET_VERSIONING_ENABLED) return assetPath;
    if (!IMAGE_ASSET_RE.test(assetPath)) return assetPath;
    return appendVersionQuery(assetPath, DEV_ASSET_VERSION_TOKEN);
}

export function applyDevAssetVersionToDom(doc = document) {
    if (!DEV_ASSET_VERSIONING_ENABLED || !doc || typeof doc.querySelectorAll !== 'function') return;

    const imageEls = doc.querySelectorAll('img[src^="assets/images/"]');
    imageEls.forEach((imgEl) => {
        const src = imgEl.getAttribute('src') || '';
        const nextSrc = withAssetVersion(src);
        if (nextSrc !== src) imgEl.setAttribute('src', nextSrc);
    });

    const sourceEls = doc.querySelectorAll('source[srcset]');
    sourceEls.forEach((sourceEl) => {
        const srcset = sourceEl.getAttribute('srcset') || '';
        const nextSrcset = rewriteSrcsetValue(srcset);
        if (nextSrcset !== srcset) sourceEl.setAttribute('srcset', nextSrcset);
    });

    const bgMainAsset = withAssetVersion('assets/images/scenes/default/bg-main.jpg');
    const bgEl = doc.getElementById('bg');
    const bgSplashEl = doc.getElementById('bg-splash');
    if (bgEl) bgEl.style.backgroundImage = `url("${bgMainAsset}")`;
    if (bgSplashEl) bgSplashEl.style.backgroundImage = `url("${bgMainAsset}")`;
}
