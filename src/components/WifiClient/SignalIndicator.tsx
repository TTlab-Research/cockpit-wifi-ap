import React from 'react';

interface SignalIndicatorProps {
    signal: number;
}

function getSignalClass (signal: number, barThreshold: number): string {
    if (signal < barThreshold) return 'wifi-signal-bar wifi-signal-bar--weak';
    if (signal < 50) return 'wifi-signal-bar wifi-signal-bar--fair';
    return 'wifi-signal-bar';
}

export const SignalIndicator: React.FC<SignalIndicatorProps> = ({ signal }) => {
    const bars = [
        { height: 5, threshold: 1 },
        { height: 9, threshold: 25 },
        { height: 13, threshold: 50 },
        { height: 17, threshold: 75 }
    ];

    return (
        <span className='wifi-signal-container' title={`${signal}%`}>
            {bars.map((bar, i) => (
                <span
                    key={i}
                    className={signal >= bar.threshold ? getSignalClass(signal, bar.threshold) : 'wifi-signal-bar wifi-signal-bar--weak'}
                    style={{
                        height: `${bar.height}px`,
                        opacity: signal >= bar.threshold ? 1 : 0.3
                    }}
                />
            ))}
        </span>
    );
};
