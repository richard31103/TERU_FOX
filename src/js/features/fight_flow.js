export function createFightFlowFx({ characterContainerEl, damageNumberEl, redFlashEl }) {
    function clearVisualFx() {
        characterContainerEl?.classList.remove('fight-hit-shake');
        damageNumberEl?.classList.remove('show');
        redFlashEl?.classList.remove('flash');
    }

    function playHitShake() {
        if (!characterContainerEl) return;
        characterContainerEl.classList.remove('fight-hit-shake');
        void characterContainerEl.offsetWidth;
        characterContainerEl.classList.add('fight-hit-shake');
    }

    function playDamagePop(text = '-20') {
        if (!damageNumberEl) return;
        damageNumberEl.textContent = text;
        damageNumberEl.classList.remove('show');
        void damageNumberEl.offsetWidth;
        damageNumberEl.classList.add('show');
    }

    function playRedFlash() {
        if (!redFlashEl) return;
        redFlashEl.classList.remove('flash');
        void redFlashEl.offsetWidth;
        redFlashEl.classList.add('flash');
    }

    return {
        clearVisualFx,
        playHitShake,
        playDamagePop,
        playRedFlash
    };
}
