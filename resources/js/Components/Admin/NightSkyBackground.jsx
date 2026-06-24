import { useMemo } from 'react';

export default function NightSkyBackground() {
    // Generate static random configuration for 60 stars to avoid layout shifts on re-renders.
    const stars = useMemo(() => {
        const list = [];
        const speeds = ['star-twinkle-slow', 'star-twinkle-medium', 'star-twinkle-fast'];
        for (let i = 0; i < 60; i++) {
            list.push({
                id: i,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 85}%`, // Keep stars in the upper 85% of the panel
                size: `${0.8 + Math.random() * 1.8}px`,
                opacity: 0.15 + Math.random() * 0.75,
                animationClass: speeds[i % speeds.length],
            });
        }
        return list;
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none bg-gradient-to-b from-[#0b0f17] via-[#0e1420] to-[#080b11]">
            {/* Stars */}
            {stars.map((star) => (
                <div
                    key={star.id}
                    className={`absolute rounded-full bg-white ${star.animationClass}`}
                    style={{
                        left: star.left,
                        top: star.top,
                        width: star.size,
                        height: star.size,
                        opacity: star.opacity,
                        boxShadow: parseFloat(star.size) > 1.8 ? '0 0 4px rgba(255, 255, 255, 0.7)' : 'none',
                    }}
                />
            ))}

            {/* Meteors (Shooting Stars) */}
            <div
                className="absolute w-20 h-[1.5px] bg-gradient-to-r from-white to-transparent origin-left meteor-1"
                style={{
                    top: '8%',
                    right: '12%',
                }}
            />
            <div
                className="absolute w-24 h-[1.5px] bg-gradient-to-r from-white to-transparent origin-left meteor-2"
                style={{
                    top: '25%',
                    right: '35%',
                }}
            />
            <div
                className="absolute w-20 h-[1.5px] bg-gradient-to-r from-white to-transparent origin-left meteor-3"
                style={{
                    top: '5%',
                    right: '55%',
                }}
            />

            {/* Comet */}
            <div
                className="absolute w-28 h-[2.5px] bg-gradient-to-r from-transparent via-blue-300/40 to-white rounded-full shadow-[0_0_8px_rgba(147,197,253,0.55)] origin-left comet-glow"
                style={{
                    top: '12%',
                    left: '5%',
                }}
            />

            {/* Fluffy drifting clouds (SVG) */}
            <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden pointer-events-none select-none">
                <svg
                    viewBox="0 0 150 70"
                    preserveAspectRatio="none"
                    className="absolute w-[280px] h-[85px] text-blue-200 fill-current cloud-drift-slow"
                    style={{ bottom: '8%', left: '0', opacity: 0.05, filter: 'blur(4px)' }}
                >
                    <path d="M25 40 a20 20 0 0 1 20 -20 a25 25 0 0 1 45 5 a20 20 0 0 1 20 5 a15 15 0 0 1 0 30 l-85 0 a20 20 0 0 1 0 -20 z" />
                </svg>

                <svg
                    viewBox="0 0 150 70"
                    preserveAspectRatio="none"
                    className="absolute w-[360px] h-[100px] text-blue-300 fill-current cloud-drift-medium"
                    style={{ bottom: '15%', left: '0', opacity: 0.03, filter: 'blur(6px)' }}
                >
                    <path d="M25 40 a20 20 0 0 1 20 -20 a25 25 0 0 1 45 5 a20 20 0 0 1 20 5 a15 15 0 0 1 0 30 l-85 0 a20 20 0 0 1 0 -20 z" />
                </svg>
            </div>
        </div>
    );
}
