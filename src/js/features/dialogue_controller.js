export function createDialogueController({ dialogueTextEl, speakerPlateEl, dialogueAreaEl }) {
    let isTyping = false;

    function setTyping(flag) {
        isTyping = Boolean(flag);
        if (dialogueTextEl) {
            dialogueTextEl.classList.toggle('is-typing', isTyping);
        }
    }

    function renderSpeaker(speaker) {
        if (speakerPlateEl) speakerPlateEl.textContent = speaker || '';
    }

    function renderText(text) {
        if (dialogueTextEl) dialogueTextEl.textContent = text || '';
    }

    function setChoiceMode(flag) {
        if (!dialogueAreaEl) return;
        dialogueAreaEl.classList.toggle('choices-mode', Boolean(flag));
    }

    return {
        isTyping: () => isTyping,
        setTyping,
        renderSpeaker,
        renderText,
        setChoiceMode
    };
}
