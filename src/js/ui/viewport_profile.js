const PHONE_MAX_WIDTH = 480;
const TABLET_MAX_WIDTH = 1024;
const SHORT_HEIGHT_MAX = 699;
const REGULAR_HEIGHT_MAX = 899;

function getAspectTier(width, height) {
    const safeWidth = Math.max(1, Number(width) || 1);
    const safeHeight = Math.max(1, Number(height) || 1);
    const ratio = safeWidth / safeHeight;
    if (ratio <= 0.5) return "ultra-tall";
    if (ratio <= 0.62) return "tall";
    if (ratio <= 0.9) return "regular";
    if (ratio <= 1.35) return "wide";
    return "ultra-wide";
}

export function computeViewportProfile({ width, height, isCoarsePointer }) {
    const safeWidth = Math.max(1, Number(width) || 1);
    const safeHeight = Math.max(1, Number(height) || 1);
    const coarse = Boolean(isCoarsePointer);
    const orientation = safeHeight >= safeWidth ? "portrait" : "landscape";

    let deviceTier = "desktop";
    if (safeWidth <= PHONE_MAX_WIDTH) {
        deviceTier = "phone";
    } else if (safeWidth <= TABLET_MAX_WIDTH && coarse) {
        deviceTier = "tablet";
    }

    let heightTier = "tall";
    if (safeHeight <= SHORT_HEIGHT_MAX) {
        heightTier = "short";
    } else if (safeHeight <= REGULAR_HEIGHT_MAX) {
        heightTier = "regular";
    }

    return {
        width: safeWidth,
        height: safeHeight,
        isCoarsePointer: coarse,
        orientation,
        deviceTier,
        heightTier,
        aspectTier: getAspectTier(safeWidth, safeHeight)
    };
}

export function applyViewportProfile(gameContainerEl, profile) {
    if (!gameContainerEl || !profile) return;
    gameContainerEl.dataset.deviceTier = profile.deviceTier;
    gameContainerEl.dataset.orientation = profile.orientation;
    gameContainerEl.dataset.heightTier = profile.heightTier;
    gameContainerEl.dataset.aspectTier = profile.aspectTier;
    gameContainerEl.style.setProperty("--vpw", `${profile.width}px`);
    gameContainerEl.style.setProperty("--vph", `${profile.height}px`);
}
