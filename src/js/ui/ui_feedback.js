const CHOICE_CONFIRM_DELAY_MS = 110;
const CHOICE_STAGGER_STEP_MS = 40;

export function isReducedMotionPreferred(win = window) {
    return Boolean(
        win?.matchMedia
        && win.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}

export function getChoiceConfirmDelayMs(win = window) {
    if (isReducedMotionPreferred(win)) return 0;
    return CHOICE_CONFIRM_DELAY_MS;
}

export function getChoiceStaggerStepMs(win = window) {
    if (isReducedMotionPreferred(win)) return 0;
    return CHOICE_STAGGER_STEP_MS;
}

export function triggerSoftVibration(pattern = 12, nav = navigator) {
    if (!nav || typeof nav.vibrate !== "function") return false;
    try {
        return nav.vibrate(pattern);
    } catch (_err) {
        return false;
    }
}
