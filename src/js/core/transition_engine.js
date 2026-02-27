const TRANSITION_CANCELLED = "TRANSITION_CANCELLED";

function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createTransitionEngine({ curtainEl, logPrefix = "TRANSITION" }) {
    if (!curtainEl) {
        throw new Error("Transition engine requires curtainEl");
    }

    let token = 0;
    let locked = false;

    function log(activeToken, phase, detail) {
        const ts = new Date().toISOString();
        const msg = detail ? `${phase} | ${detail}` : phase;
        console.log(`[${logPrefix}][${ts}][token:${activeToken}] ${msg}`);
    }

    function ensureToken(activeToken) {
        if (activeToken !== token) {
            throw new Error(TRANSITION_CANCELLED);
        }
    }

    function setCurtainInstant(visible) {
        curtainEl.style.transition = "none";
        curtainEl.style.opacity = visible ? "1" : "0";
        curtainEl.style.pointerEvents = visible ? "all" : "none";
        void curtainEl.offsetWidth;
        curtainEl.style.transition = "";
    }

    function cancelTransition(reason = "cancel") {
        token += 1;
        locked = false;
        setCurtainInstant(false);
        log(token, "cancel", reason);
    }

    async function animateOpacity({ activeToken, toVisible, durationMs, phase }) {
        const targetOpacity = toVisible ? 1 : 0;
        const fromOpacity = toVisible ? 0 : 1;

        ensureToken(activeToken);
        log(activeToken, `${phase} start`, `duration=${durationMs}ms`);

        if (durationMs <= 0) {
            setCurtainInstant(toVisible);
            log(activeToken, `${phase} end`, "reason=instant");
            return;
        }

        const currentOpacity = Number.parseFloat(getComputedStyle(curtainEl).opacity);
        if (!Number.isNaN(currentOpacity) && Math.abs(currentOpacity - targetOpacity) < 0.01) {
            curtainEl.style.transition = "none";
            curtainEl.style.opacity = String(fromOpacity);
            curtainEl.style.pointerEvents = "all";
            void curtainEl.offsetWidth;
        }

        await new Promise((resolve) => {
            let settled = false;
            const cleanup = (reason) => {
                if (settled) return;
                settled = true;
                curtainEl.removeEventListener("transitionend", onEnd);
                curtainEl.style.pointerEvents = toVisible ? "all" : "none";
                log(activeToken, `${phase} end`, `reason=${reason}`);
                resolve();
            };
            const onEnd = (e) => {
                if (e.target === curtainEl && e.propertyName === "opacity") {
                    cleanup("transitionend");
                }
            };

            curtainEl.addEventListener("transitionend", onEnd);
            curtainEl.style.pointerEvents = "all";
            curtainEl.style.transition = `opacity ${durationMs}ms ease`;
            requestAnimationFrame(() => {
                curtainEl.style.opacity = String(targetOpacity);
            });

            setTimeout(() => cleanup("timeout"), durationMs + 220);
        });

        ensureToken(activeToken);
    }

    async function runCurtainTransition(
        { id, fadeInMs, holdMs, fadeOutMs, onBlack, token: forcedToken },
        { allowWhenLocked = false } = {}
    ) {
        if (locked && !allowWhenLocked) {
            return { ok: false, cancelled: true, reason: "locked" };
        }

        locked = true;
        const activeToken = typeof forcedToken === "number" ? forcedToken : token + 1;
        if (typeof forcedToken !== "number") token = activeToken;

        log(activeToken, `${id || "transition"} begin`);

        try {
            ensureToken(activeToken);
            await animateOpacity({
                activeToken,
                toVisible: true,
                durationMs: fadeInMs,
                phase: `${id || "transition"} fade-in`,
            });
            ensureToken(activeToken);

            if (typeof onBlack === "function") {
                log(activeToken, `${id || "transition"} on-black start`);
                await onBlack(activeToken);
                log(activeToken, `${id || "transition"} on-black end`);
                ensureToken(activeToken);
            }

            log(activeToken, `${id || "transition"} hold start`, `${holdMs}ms`);
            await waitMs(holdMs);
            ensureToken(activeToken);
            log(activeToken, `${id || "transition"} hold end`);

            await animateOpacity({
                activeToken,
                toVisible: false,
                durationMs: fadeOutMs,
                phase: `${id || "transition"} fade-out`,
            });
            ensureToken(activeToken);

            return { ok: true, cancelled: false, token: activeToken };
        } catch (err) {
            if (err && err.message === TRANSITION_CANCELLED) {
                return { ok: false, cancelled: true, token: activeToken };
            }
            throw err;
        } finally {
            if (token === activeToken) {
                locked = false;
                log(activeToken, `${id || "transition"} end`);
            }
        }
    }

    function getState() {
        return { token, locked };
    }

    return {
        runCurtainTransition,
        cancelTransition,
        setCurtainInstant,
        getState,
        TRANSITION_CANCELLED,
    };
}
