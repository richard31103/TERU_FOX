export function createAssetPreloader({ assets, loadingFillEl, loadingTextEl, loadingContainerEl, startBtnEl }) {
    let loadedAssetsCount = 0;
    let ready = false;
    let failedAssets = [];

    function updateLoaderProgress(totalCount = assets.length) {
        loadedAssetsCount += 1;
        const safeTotal = Math.max(totalCount, 1);
        const pct = Math.min(100, Math.floor((loadedAssetsCount / safeTotal) * 100));
        if (loadingFillEl) loadingFillEl.style.width = `${pct}%`;
        if (loadingTextEl) loadingTextEl.textContent = `Loading Assets... ${pct}%`;
    }

    function finalizeReady() {
        ready = true;
        setTimeout(() => {
            if (loadingContainerEl) loadingContainerEl.style.display = 'none';
            if (startBtnEl) {
                startBtnEl.style.display = 'block';
                startBtnEl.disabled = false;
            }
        }, 400);
    }

    function loadImageDecoded(src) {
        return new Promise((resolve) => {
            const img = new Image();
            let settled = false;

            const finish = (ok) => {
                if (settled) return;
                settled = true;
                resolve({ src, ok });
            };

            const finalize = () => {
                if (typeof img.decode === 'function') {
                    img.decode().catch(() => { }).finally(() => finish(true));
                    return;
                }
                finish(true);
            };

            img.onload = finalize;
            img.onerror = () => finish(false);
            img.src = src;

            if (img.complete) {
                if (img.naturalWidth > 0) finalize();
                else finish(false);
            }
        });
    }

    async function start() {
        ready = false;
        failedAssets = [];
        loadedAssetsCount = 0;

        if (startBtnEl) {
            startBtnEl.style.display = 'none';
            startBtnEl.disabled = true;
        }

        const imageAssets = Array.from(new Set(assets.filter((src) => /\.(png|jpe?g|webp|gif)$/i.test(src))));
        const totalCount = imageAssets.length;
        if (totalCount === 0) {
            updateLoaderProgress(1);
            finalizeReady();
            return { ok: true, failedAssets };
        }

        const results = await Promise.all(
            imageAssets.map(async (src) => {
                const result = await loadImageDecoded(src);
                updateLoaderProgress(totalCount);
                return result;
            })
        );

        failedAssets = results.filter((r) => !r.ok).map((r) => r.src);
        if (failedAssets.length > 0) {
            if (loadingTextEl) loadingTextEl.textContent = `Failed to load ${failedAssets.length} image(s). Please refresh.`;
            return { ok: false, failedAssets };
        }

        finalizeReady();
        return { ok: true, failedAssets };
    }

    function isReady() {
        return ready;
    }

    function getFailedAssets() {
        return [...failedAssets];
    }

    return {
        start,
        isReady,
        getFailedAssets
    };
}
