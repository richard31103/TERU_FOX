export function createChoiceController({ choicePanelEl, chapterBadgeEl }) {
    const choiceButtons = Array.from(choicePanelEl?.querySelectorAll('.choice-btn') || []);

    function show() {
        choicePanelEl?.classList.add('visible');
        if (chapterBadgeEl) {
            chapterBadgeEl.style.opacity = '0';
            chapterBadgeEl.style.pointerEvents = 'none';
        }
    }

    function hide() {
        choicePanelEl?.classList.remove('visible');
        if (chapterBadgeEl) {
            chapterBadgeEl.style.opacity = '1';
            chapterBadgeEl.style.pointerEvents = 'auto';
        }
    }

    function clearPressedState() {
        for (const btn of choiceButtons) {
            btn.classList.remove('is-pressed');
        }
    }

    return {
        choiceButtons,
        show,
        hide,
        clearPressedState
    };
}
