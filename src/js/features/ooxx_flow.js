export function createOOXXFlow({ transitionEngine }) {
    function begin(label) {
        return transitionEngine.beginOOXXTransition(label);
    }

    function end(token, label) {
        transitionEngine.endOOXXTransition(token, label);
    }

    function cancel(reason) {
        transitionEngine.cancelOOXXTransitions(reason);
    }

    return {
        begin,
        end,
        cancel
    };
}
