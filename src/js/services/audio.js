export function createAudioService({ audioCtx, bgmEl, deathSfxEl, sfxVolumeEl }) {
    let muted = false;

    function getSfxVolume() {
        return Number.parseFloat(sfxVolumeEl?.value || "100") / 100;
    }

    function ensureAudio() {
        if (audioCtx?.state === "suspended") {
            audioCtx.resume().catch(() => { });
        }
    }

    function setMuted(value) {
        muted = Boolean(value);
        if (muted) {
            bgmEl?.pause();
        } else {
            ensureAudio();
            bgmEl?.play?.().catch(() => { });
        }
        return muted;
    }

    function toggleMuted() {
        return setMuted(!muted);
    }

    function isMuted() {
        return muted;
    }

    function playDeathSfx() {
        if (muted || !deathSfxEl) return;
        deathSfxEl.volume = getSfxVolume();
        deathSfxEl.currentTime = 0;
        deathSfxEl.play().catch(() => { });
    }

    function startBgm() {
        if (muted || !bgmEl) return;
        ensureAudio();
        bgmEl.play().catch(() => { });
    }

    function stopBgm() {
        if (!bgmEl) return;
        bgmEl.pause();
    }

    return {
        ensureAudio,
        setMuted,
        toggleMuted,
        isMuted,
        playDeathSfx,
        startBgm,
        stopBgm,
        getSfxVolume,
    };
}
