import React from 'react';
import { createRoot } from 'react-dom/client';
import { TowerApp } from './TowerApp.jsx';
import './styles.css';

const rootEl = document.getElementById('app');
const root = createRoot(rootEl);

root.render(
    <React.StrictMode>
        <TowerApp
            lang="tw"
            onExit={() => {}}
            playSound={() => {}}
            shakeScreen={() => {}}
        />
    </React.StrictMode>
);
