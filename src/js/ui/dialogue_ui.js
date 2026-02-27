export function bindDialogueUI(root = document) {
    const refs = {
        dialogueText: root.getElementById("dialogue-text"),
        speakerPlate: root.getElementById("speaker-plate"),
        dialogueArea: root.getElementById("dialogue-area"),
        choicePanel: root.getElementById("choice-panel"),
        chapterBadge: root.getElementById("chapter-badge"),
    };

    function showChoiceMode() {
        refs.dialogueArea?.classList.add("choices-mode");
        refs.choicePanel?.classList.add("visible");
        if (refs.chapterBadge) {
            refs.chapterBadge.style.opacity = "0";
            refs.chapterBadge.style.pointerEvents = "none";
        }
    }

    function hideChoiceMode() {
        refs.dialogueArea?.classList.remove("choices-mode");
        refs.choicePanel?.classList.remove("visible");
        if (refs.chapterBadge) {
            refs.chapterBadge.style.opacity = "1";
            refs.chapterBadge.style.pointerEvents = "auto";
        }
    }

    function renderChoiceTexts(title, choices = []) {
        const titleEl = root.querySelector(".choice-label");
        if (titleEl) titleEl.textContent = title || "";
        const choiceNodes = root.querySelectorAll(".choice-btn .choice-text");
        choiceNodes.forEach((el, i) => {
            el.textContent = choices[i] || "";
        });
    }

    return {
        refs,
        showChoiceMode,
        hideChoiceMode,
        renderChoiceTexts,
    };
}
