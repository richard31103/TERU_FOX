import React from 'react';

function pct(current, max) {
    if (max <= 0) return 0;
    const ratio = (current / max) * 100;
    return Math.max(0, Math.min(100, ratio));
}

export function HealthBar({ label, current, max }) {
    const ratio = pct(current, max);
    const isLow = ratio <= 30;
    const barClass = isLow
        ? 'tower-hp-fill tower-hp-fill-low tower-hp-low'
        : 'tower-hp-fill';

    return (
        <div className="tower-hp-block tw-w-full">
            <div className="tower-hp-label-row tw-mb-1 tw-flex tw-items-center tw-justify-between tw-text-xs tw-text-slate-200">
                <span>{label}</span>
                <span>{Math.max(0, Math.round(current))} / {Math.max(0, Math.round(max))}</span>
            </div>
            <div className="tower-hp-track tw-w-full tw-overflow-hidden">
                <div
                    className={`${barClass} tw-h-full tw-transition-all tw-duration-300`}
                    style={{ width: `${ratio}%` }}
                />
            </div>
        </div>
    );
}
