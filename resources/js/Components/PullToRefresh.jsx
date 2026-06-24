import { useRef } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

export default function PullToRefresh({
    children,
    className = '',
    contentClassName = '',
    disabled = false,
    useWindowScroll = false,
    onRefresh,
    isDarkMode = false,
}) {
    const scrollRef = useRef(null);
    const { pullDistance, isRefreshing, isReady } = usePullToRefresh({
        scrollRef,
        disabled,
        useWindowScroll,
        onRefresh,
    });

    const showIndicator = pullDistance > 0 || isRefreshing;
    const indicatorOffset = Math.max(8, pullDistance - 36);

    const indicatorShell = isDarkMode
        ? 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200'
        : 'bg-white/95 border-zinc-200 text-zinc-600';
    const indicatorAccent = isReady || isRefreshing ? 'text-violet-500' : '';

    const contentStyle = {
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        transition: pullDistance === 0 && !isRefreshing ? 'transform 0.2s ease-out' : 'none',
    };

    return (
        <div
            ref={useWindowScroll ? undefined : scrollRef}
            className={`relative ${className}`}
        >
            {showIndicator && (
                <div
                    className="absolute left-0 right-0 z-20 flex justify-center pointer-events-none"
                    style={{ top: indicatorOffset }}
                    aria-hidden="true"
                >
                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-sm backdrop-blur-sm ${indicatorShell}`}>
                        {isRefreshing ? (
                            <Loader2 className={`w-4 h-4 animate-spin ${indicatorAccent}`} />
                        ) : (
                            <ArrowDown
                                className={`w-4 h-4 transition-transform duration-150 ${indicatorAccent}`}
                                style={{ transform: `rotate(${isReady ? 180 : 0}deg)` }}
                            />
                        )}
                        <span className="text-[10px] font-bold">
                            {isRefreshing ? 'Memuat ulang...' : isReady ? 'Lepas untuk refresh' : 'Tarik untuk refresh'}
                        </span>
                    </div>
                </div>
            )}

            <div className={contentClassName} style={contentStyle}>
                {children}
            </div>
        </div>
    );
}
