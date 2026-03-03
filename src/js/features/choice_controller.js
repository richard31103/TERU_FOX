import { getChoiceConfirmDelayMs, getChoiceStaggerStepMs } from '../ui/ui_feedback.js';

export function createChoiceController({ choicePanelEl, chapterBadgeEl }) {
    const choiceButtons = Array.from(choicePanelEl?.querySelectorAll('.choice-btn') || []);

    function getVisibleChoiceButtons() {
        return choiceButtons.filter((btn) => btn.style.display !== 'none');
    }

    function clearAnimationState() {
        for (const btn of choiceButtons) {
            btn.classList.remove('choice-entering', 'choice-entered', 'choice-picked', 'choice-dimmed');
            btn.style.removeProperty('--choice-stagger-delay');
        }
    }

    function show() {
        choicePanelEl?.classList.add('visible');
        clearAnimationState();
        if (chapterBadgeEl) {
            chapterBadgeEl.style.opacity = '0';
            chapterBadgeEl.style.pointerEvents = 'none';
        }
    }

    function hide() {
        choicePanelEl?.classList.remove('visible');
        clearAnimationState();
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

    function animateChoiceIn() {
        const visibleButtons = getVisibleChoiceButtons();
        if (!visibleButtons.length) return Promise.resolve();

        const staggerStepMs = getChoiceStaggerStepMs();
        visibleButtons.forEach((btn, index) => {
            btn.classList.remove('choice-picked', 'choice-dimmed', 'choice-entered');
            btn.classList.add('choice-entering');
            btn.style.setProperty('--choice-stagger-delay', `${index * staggerStepMs}ms`);
        });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                visibleButtons.forEach((btn) => {
                    btn.classList.add('choice-entered');
                    btn.classList.remove('choice-entering');
                });
            });
        });
        return Promise.resolve();
    }

    function animateChoicePick(slotIndex) {
        const selectedBtn = choiceButtons[slotIndex];
        if (!selectedBtn || selectedBtn.style.display === 'none') {
            return Promise.resolve();
        }
        clearPressedState();
        choiceButtons.forEach((btn, index) => {
            btn.classList.remove('choice-entering', 'choice-entered');
            btn.classList.toggle('choice-picked', index === slotIndex);
            btn.classList.toggle('choice-dimmed', index !== slotIndex && btn.style.display !== 'none');
        });
        const delayMs = getChoiceConfirmDelayMs();
        if (delayMs <= 0) return Promise.resolve();
        return new Promise((resolve) => {
            setTimeout(resolve, delayMs);
        });
    }

    return {
        choiceButtons,
        show,
        hide,
        clearPressedState,
        animateChoiceIn,
        animateChoicePick
    };
}
