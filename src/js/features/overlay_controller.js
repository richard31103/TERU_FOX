export function bindOverlayController(root, handlers) {
    function handleClick(event) {
        const actionEl = event.target.closest('[data-action]');
        if (!actionEl) return;

        const action = actionEl.dataset.action;
        if (!action) return;

        if (action === 'stop-propagation') {
            event.stopPropagation();
            return;
        }

        const fn = handlers[action];
        if (typeof fn === 'function') {
            fn({ event, actionEl });
        }
    }

    function handleInput(event) {
        const actionEl = event.target.closest('[data-action]');
        if (!actionEl) return;
        const action = actionEl.dataset.action;
        if (!action) return;

        const fn = handlers[action];
        if (typeof fn === 'function') {
            fn({ event, actionEl });
        }
    }

    root.addEventListener('click', handleClick);
    root.addEventListener('input', handleInput);

    return () => {
        root.removeEventListener('click', handleClick);
        root.removeEventListener('input', handleInput);
    };
}
