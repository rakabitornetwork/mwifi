export default function SidebarMountain({ isDarkMode }) {
    return (
        <div className="w-full shrink-0 relative overflow-hidden h-20 select-none pointer-events-none mt-auto">
            <svg
                viewBox="0 0 224 80"
                className="w-full h-full"
                preserveAspectRatio="none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="lightSkyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9"/>
                        <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.5"/>
                    </linearGradient>
                    <linearGradient id="darkSkyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0f172a" stopOpacity="0.75"/>
                        <stop offset="100%" stopColor="#1e293b" stopOpacity="0.3"/>
                    </linearGradient>
                </defs>

                {/* Sky background */}
                <rect
                    width="224"
                    height="80"
                    fill={isDarkMode ? "url(#darkSkyGrad)" : "url(#lightSkyGrad)"}
                />

                {/* Night sky features (Dark Mode only) */}
                {isDarkMode && (
                    <>
                        {/* Crescent Moon */}
                        <path
                            d="M185,15 A7,7 0 1,0 193,23 A5.5,5.5 0 1,1 185,15 Z"
                            fill="#fef08a"
                            opacity="0.9"
                            className="animate-pulse"
                            style={{ animationDuration: '4s' }}
                        />
                        {/* Stars */}
                        <circle cx="20" cy="18" r="0.75" fill="#fff" opacity="0.4" className="animate-pulse" style={{ animationDuration: '2s' }} />
                        <circle cx="75" cy="12" r="0.5" fill="#fff" opacity="0.6" />
                        <circle cx="110" cy="22" r="0.75" fill="#fff" opacity="0.5" className="animate-pulse" style={{ animationDuration: '3s' }} />
                        <circle cx="140" cy="10" r="0.5" fill="#fff" opacity="0.4" />
                    </>
                )}

                {/* Day features (Light Mode only) */}
                {!isDarkMode && (
                    <>
                        {/* Soft glowing sun */}
                        <circle cx="180" cy="22" r="9" fill="#f59e0b" opacity="0.15" />
                        <circle cx="180" cy="22" r="6" fill="#fbbf24" />
                    </>
                )}

                {/* Mountain Paths */}
                {/* Back Mountain Range */}
                <path
                    d="M0 80 L0 52 L42 22 L88 56 L140 18 L188 50 L224 36 L224 80 Z"
                    fill={isDarkMode ? 'rgba(30, 41, 59, 0.35)' : 'rgba(165, 180, 252, 0.55)'}
                    stroke={isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)'}
                    strokeWidth="0.5"
                />

                {/* Middle Mountain Range */}
                <path
                    d="M0 80 L0 60 L32 40 L78 32 L120 58 L162 36 L224 54 L224 80 Z"
                    fill={isDarkMode ? 'rgba(15, 23, 42, 0.55)' : 'rgba(74, 117, 89, 0.7)'}
                    stroke={isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)'}
                    strokeWidth="0.5"
                />

                {/* Foreground Mountain Range */}
                <path
                    d="M0 80 L0 68 L24 55 L58 48 L100 65 L145 48 L190 62 L224 58 L224 80 Z"
                    fill={isDarkMode ? 'rgba(3, 7, 18, 0.8)' : 'rgba(46, 82, 57, 0.85)'}
                    stroke={isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.15)'}
                    strokeWidth="0.5"
                />

                {/* Tiny Pine Trees in Foreground */}
                <polygon points="18,69 21,63 24,69" fill={isDarkMode ? 'rgba(52, 211, 153, 0.4)' : '#166534'} />
                <polygon points="22,72 25,66 28,72" fill={isDarkMode ? 'rgba(52, 211, 153, 0.55)' : '#15803d'} />
                
                <polygon points="52,62 55,56 58,62" fill={isDarkMode ? 'rgba(52, 211, 153, 0.4)' : '#166534'} />
                <polygon points="56,64 59,58 62,64" fill={isDarkMode ? 'rgba(52, 211, 153, 0.55)' : '#15803d'} />

                <polygon points="138,64 141,58 144,64" fill={isDarkMode ? 'rgba(52, 211, 153, 0.4)' : '#166534'} />
                <polygon points="142,66 145,60 148,66" fill={isDarkMode ? 'rgba(52, 211, 153, 0.55)' : '#15803d'} />

                <polygon points="182,73 185,67 188,73" fill={isDarkMode ? 'rgba(52, 211, 153, 0.4)' : '#166534'} />
                <polygon points="186,75 189,69 192,75" fill={isDarkMode ? 'rgba(52, 211, 153, 0.55)' : '#15803d'} />
            </svg>
        </div>
    );
}
