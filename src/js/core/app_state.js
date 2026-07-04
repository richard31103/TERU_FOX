export const GAME_STATES = Object.freeze({
    TITLE: "TITLE",
    DIALOGUE: "DIALOGUE",
    CHOICE: "CHOICE",
    TRANSITION: "TRANSITION",
    OOXX: "OOXX",
    TOWER: "TOWER",
    RESULT: "RESULT",
    DEATH: "DEATH",
});

const ALLOWED = Object.freeze({
    TITLE: new Set(["DIALOGUE", "TRANSITION"]),
    DIALOGUE: new Set(["CHOICE", "DEATH", "TRANSITION", "TITLE", "TOWER"]),
    CHOICE: new Set(["DIALOGUE", "TRANSITION", "OOXX", "TOWER"]),
    TRANSITION: new Set(["DIALOGUE", "OOXX", "RESULT", "TITLE", "DEATH", "TOWER"]),
    OOXX: new Set(["RESULT", "TRANSITION", "TITLE"]),
    TOWER: new Set(["DIALOGUE", "TRANSITION", "TITLE"]),
    RESULT: new Set(["TRANSITION", "TITLE"]),
    DEATH: new Set(["TRANSITION", "TITLE"]),
});

export class AppStateMachine {
    constructor(initialState = GAME_STATES.TITLE) {
        this.current = initialState;
        this.listeners = new Set();
    }

    getState() {
        return this.current;
    }

    canTransition(nextState) {
        const allowed = ALLOWED[this.current];
        if (!allowed) return false;
        return allowed.has(nextState) || nextState === this.current;
    }

    transition(nextState, meta = {}) {
        if (!this.canTransition(nextState)) {
            throw new Error(`Invalid transition: ${this.current} -> ${nextState}`);
        }
        const prev = this.current;
        this.current = nextState;
        for (const listener of this.listeners) {
            listener({ prev, next: nextState, meta });
        }
    }

    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}
