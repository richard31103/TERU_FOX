const IMAGE_ASSET_RE = /\.(png|jpe?g|webp|gif)(?:[?#].*)?$/i;

function isImageAsset(src) {
    return typeof src === 'string' && IMAGE_ASSET_RE.test(src);
}

function decodeObjectUrl(objectUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let settled = false;

        const finish = (ok, err) => {
            if (settled) return;
            settled = true;
            img.onload = null;
            img.onerror = null;
            if (ok) resolve();
            else reject(err || new Error('Image decode failed'));
        };

        const onLoaded = () => {
            if (typeof img.decode === 'function') {
                img.decode().then(() => finish(true)).catch(() => finish(true));
                return;
            }
            finish(true);
        };

        img.onload = onLoaded;
        img.onerror = () => finish(false, new Error('Image decode failed'));
        img.src = objectUrl;

        if (img.complete) {
            if (img.naturalWidth > 0) onLoaded();
            else finish(false, new Error('Image decode failed'));
        }
    });
}

export function createImageAssetStore({
    concurrency = 4,
    retryCount = 2,
    timeoutMs = 12000
} = {}) {
    const safeConcurrency = Math.max(1, Math.floor(Number(concurrency) || 1));
    const safeRetryCount = Math.max(0, Math.floor(Number(retryCount) || 0));
    const safeTimeoutMs = Math.max(1000, Math.floor(Number(timeoutMs) || 1000));

    const entries = new Map();
    const inFlight = new Map();
    const failed = new Set();
    const pendingListeners = new Set();
    let pendingCount = 0;

    function emitPending() {
        pendingListeners.forEach((listener) => {
            try {
                listener(pendingCount);
            } catch (_err) {
                // Ignore listener failures so loading pipeline is not interrupted.
            }
        });
    }

    function increasePending() {
        pendingCount += 1;
        emitPending();
    }

    function decreasePending() {
        pendingCount = Math.max(0, pendingCount - 1);
        emitPending();
    }

    async function fetchAndDecode(assetKey) {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timeoutHandle = setTimeout(() => {
            if (controller) controller.abort();
        }, safeTimeoutMs);

        try {
            const response = await fetch(assetKey, {
                signal: controller ? controller.signal : undefined
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} for ${assetKey}`);
            }
            const blob = await response.blob();
            if (!blob || blob.size <= 0) {
                throw new Error(`Empty asset payload: ${assetKey}`);
            }
            const objectUrl = URL.createObjectURL(blob);
            try {
                await decodeObjectUrl(objectUrl);
                return objectUrl;
            } catch (err) {
                URL.revokeObjectURL(objectUrl);
                throw err;
            }
        } finally {
            clearTimeout(timeoutHandle);
        }
    }

    async function ensureWithRetry(assetKey) {
        let lastError = null;
        for (let attempt = 0; attempt <= safeRetryCount; attempt += 1) {
            try {
                const objectUrl = await fetchAndDecode(assetKey);
                return { ok: true, assetKey, objectUrl };
            } catch (err) {
                lastError = err;
            }
        }
        return { ok: false, assetKey, error: lastError || new Error(`Failed to load ${assetKey}`) };
    }

    function ensure(assetKey) {
        if (!isImageAsset(assetKey)) {
            return Promise.resolve({
                ok: false,
                assetKey,
                error: new Error(`Unsupported asset type: ${assetKey}`)
            });
        }

        const existing = entries.get(assetKey);
        if (existing && existing.status === 'ready' && existing.objectUrl) {
            return Promise.resolve({ ok: true, assetKey, objectUrl: existing.objectUrl, cached: true });
        }

        const activeRequest = inFlight.get(assetKey);
        if (activeRequest) return activeRequest;

        const task = (async () => {
            increasePending();
            try {
                const result = await ensureWithRetry(assetKey);
                if (result.ok) {
                    const prev = entries.get(assetKey);
                    if (prev && prev.status === 'ready' && prev.objectUrl && prev.objectUrl !== result.objectUrl) {
                        URL.revokeObjectURL(prev.objectUrl);
                    }
                    entries.set(assetKey, { status: 'ready', objectUrl: result.objectUrl });
                    failed.delete(assetKey);
                    return { ok: true, assetKey, objectUrl: result.objectUrl };
                }
                entries.set(assetKey, { status: 'failed', error: result.error });
                failed.add(assetKey);
                return { ok: false, assetKey, error: result.error };
            } finally {
                inFlight.delete(assetKey);
                decreasePending();
            }
        })();

        inFlight.set(assetKey, task);
        return task;
    }

    async function ensureMany(assetKeys, onProgress) {
        const uniqueAssets = Array.from(new Set((assetKeys || []).filter(isImageAsset)));
        const total = uniqueAssets.length;
        if (total === 0) {
            return { ok: true, failedAssets: [] };
        }

        let loaded = 0;
        const failedAssets = [];
        const queue = [...uniqueAssets];
        const workers = Array.from({ length: Math.min(safeConcurrency, total) }, async () => {
            while (queue.length > 0) {
                const assetKey = queue.shift();
                if (!assetKey) continue;
                const result = await ensure(assetKey);
                loaded += 1;
                if (!result.ok) failedAssets.push(assetKey);
                if (typeof onProgress === 'function') {
                    try {
                        onProgress({
                            loaded,
                            total,
                            assetKey,
                            failed: !result.ok
                        });
                    } catch (_err) {
                        // Ignore progress callback failures.
                    }
                }
            }
        });

        await Promise.all(workers);
        return { ok: failedAssets.length === 0, failedAssets };
    }

    function resolve(assetKey) {
        const existing = entries.get(assetKey);
        if (!existing || existing.status !== 'ready') return null;
        return existing.objectUrl || null;
    }

    function has(assetKey) {
        return Boolean(resolve(assetKey));
    }

    function subscribePending(listener) {
        if (typeof listener !== 'function') return () => { };
        pendingListeners.add(listener);
        try {
            listener(pendingCount);
        } catch (_err) {
            // Ignore listener failures.
        }
        return () => {
            pendingListeners.delete(listener);
        };
    }

    function getPendingCount() {
        return pendingCount;
    }

    function getFailed() {
        return Array.from(failed);
    }

    function dispose() {
        entries.forEach((entry) => {
            if (entry && entry.status === 'ready' && entry.objectUrl) {
                URL.revokeObjectURL(entry.objectUrl);
            }
        });
        entries.clear();
        failed.clear();
        inFlight.clear();
        pendingCount = 0;
        emitPending();
    }

    return {
        ensure,
        ensureMany,
        resolve,
        has,
        subscribePending,
        getPendingCount,
        getFailed,
        dispose
    };
}
