import React from 'react';
import { createRoot } from 'react-dom/client';
import { TowerApp } from './TowerApp.jsx';
import './styles.css';

let activeRoot = null;
let activeRootEl = null;

export function mountTowerGame({
    rootEl,
    lang = 'tw',
    onExit = () => {},
    playSound = () => {},
    shakeScreen = () => {}
} = {}) {
    if (!rootEl) {
        throw new Error('mountTowerGame requires rootEl.');
    }

    if (!activeRoot || activeRootEl !== rootEl) {
        if (activeRoot) activeRoot.unmount();
        activeRoot = createRoot(rootEl);
        activeRootEl = rootEl;
    }

    activeRoot.render(
        <React.StrictMode>
            <TowerApp
                lang={lang}
                onExit={onExit}
                playSound={playSound}
                shakeScreen={shakeScreen}
            />
        </React.StrictMode>
    );
}

export function unmountTowerGame() {
    if (!activeRoot) return;
    activeRoot.unmount();
    activeRoot = null;
    activeRootEl = null;
}

if (typeof window !== 'undefined') {
    window.__TERU_TOWER_GAME__ = {
        mountTowerGame,
        unmountTowerGame
    };
}
