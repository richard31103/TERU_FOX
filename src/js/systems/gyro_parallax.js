export function createGyroParallaxSystem({
    charImages,
    bgEl,
    bgSplashEl,
    moneyPopupEl,
    getSceneId,
    sceneFightId,
    getMoneyFocusActive,
    getCharFocusX,
    getCharFocusY,
    getFightObjectPosition,
    moneyFocusXPct,
    moneyFocusYPct,
    mobileMoneyCharacterShiftPx = 0,
    mobileMoneyPopupShiftPx = -200,
    applyFightTailPivot
}) {
    if (!window.DeviceOrientationEvent) {
        return { start: () => { }, isStarted: () => false };
    }

    const MAX_SHIFT = 10;
    const SMOOTH = 0.07;
    const BG_SHIFT_RATIO = 0.4;
    const BG_MAX_SHIFT_PX = 6;

    let baseGamma = null;
    let baseBeta = null;
    let targetX = 0;
    let targetY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let started = false;
    let starting = false;
    let rafStarted = false;
    let orientationEvents = 0;

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function onOrientation(e) {
        orientationEvents += 1;
        const gamma = e.gamma != null ? e.gamma : 0;
        const beta = e.beta != null ? e.beta : 0;
        if (baseGamma === null) {
            baseGamma = gamma;
            baseBeta = beta;
            return;
        }
        const dg = clamp(gamma - baseGamma, -40, 40);
        const db = clamp(beta - baseBeta, -20, 20);
        targetX = (dg / 25) * MAX_SHIFT;
        targetY = (db / 20) * MAX_SHIFT;
    }

    function tick() {
        smoothX = lerp(smoothX, targetX, SMOOTH);
        smoothY = lerp(smoothY, targetY, SMOOTH);

        const sceneId = getSceneId();
        const isFightScene = sceneId === sceneFightId;
        const moneyFocusActive = getMoneyFocusActive();
        const charFocusShiftX = moneyFocusActive ? mobileMoneyCharacterShiftPx : 0;
        const moneyPopupShiftX = moneyFocusActive ? mobileMoneyPopupShiftPx : 0;
        const charShiftX = smoothX + charFocusShiftX;
        const charShiftY = smoothY;

        const bgShiftX = sceneId === 'bed'
            ? clamp(charShiftX, -MAX_SHIFT, MAX_SHIFT)
            : clamp(smoothX * BG_SHIFT_RATIO, -BG_MAX_SHIFT_PX, BG_MAX_SHIFT_PX) + charFocusShiftX;
        const bgShiftY = sceneId === 'bed'
            ? clamp(charShiftY, -MAX_SHIFT, MAX_SHIFT)
            : clamp(smoothY * BG_SHIFT_RATIO, -BG_MAX_SHIFT_PX, BG_MAX_SHIFT_PX);
        const bgPos = `calc(50% + ${bgShiftX.toFixed(2)}px) calc(50% + ${bgShiftY.toFixed(2)}px)`;

        if (bgEl) bgEl.style.backgroundPosition = bgPos;
        if (bgSplashEl) bgSplashEl.style.backgroundPosition = bgPos;

        const baseX = isFightScene
            ? `${(getFightObjectPosition().x * 100).toFixed(2)}%`
            : getCharFocusX();
        const baseY = isFightScene
            ? `${(getFightObjectPosition().y * 100).toFixed(2)}%`
            : getCharFocusY();

        const effectiveShiftX = isFightScene ? 0 : charShiftX;
        const effectiveShiftY = isFightScene ? 0 : charShiftY;
        const px = `calc(${baseX} + ${effectiveShiftX.toFixed(2)}px)`;
        const py = `calc(${baseY} + ${effectiveShiftY.toFixed(2)}px)`;

        for (const img of charImages) {
            img.style.objectPosition = `${px} ${py}`;
        }

        if (isFightScene && typeof applyFightTailPivot === 'function') {
            applyFightTailPivot();
        }

        if (moneyPopupEl) {
            moneyPopupEl.style.objectPosition = `calc(${moneyFocusXPct} + ${moneyPopupShiftX.toFixed(2)}px) ${moneyFocusYPct}`;
        }

        requestAnimationFrame(tick);
    }

    function ensureTick() {
        if (rafStarted) return;
        rafStarted = true;
        requestAnimationFrame(tick);
    }

    function attachOrientation() {
        window.addEventListener('deviceorientation', onOrientation, { passive: true });
        ensureTick();
        setTimeout(() => {
            if (orientationEvents === 0) {
                console.warn('[GYRO] deviceorientation did not fire. Check browser permissions/settings.');
            }
        }, 1200);
    }

    function removeStartListeners(startGyro) {
        document.removeEventListener('pointerdown', startGyro);
        document.removeEventListener('touchstart', startGyro);
        document.removeEventListener('click', startGyro);
    }

    async function startGyro() {
        if (started || starting) return;
        starting = true;
        try {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const state = await DeviceOrientationEvent.requestPermission();
                if (state !== 'granted') {
                    console.warn('[GYRO] permission not granted:', state);
                    return;
                }
            }
            started = true;
            removeStartListeners(startGyro);
            attachOrientation();
        } catch (err) {
            console.warn('[GYRO] start failed:', err);
        } finally {
            starting = false;
        }
    }

    function start() {
        document.addEventListener('pointerdown', startGyro, { passive: true });
        document.addEventListener('touchstart', startGyro, { passive: true });
        document.addEventListener('click', startGyro);
    }

    return {
        start,
        isStarted: () => started
    };
}
