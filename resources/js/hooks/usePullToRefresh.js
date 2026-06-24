import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

const PULL_THRESHOLD = 68;
const MAX_PULL = 108;

function isTouchDevice() {
    if (typeof window === 'undefined') {
        return false;
    }

    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function readScrollTop(scrollElement) {
    if (scrollElement) {
        return scrollElement.scrollTop;
    }

    return window.scrollY || document.documentElement.scrollTop || 0;
}

export function usePullToRefresh({
    scrollRef,
    disabled = false,
    useWindowScroll = false,
    onRefresh,
}) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const pullDistanceRef = useRef(0);
    const touchStartYRef = useRef(0);
    const isPullingRef = useRef(false);
    const isRefreshingRef = useRef(false);

    const getScrollElement = useCallback(() => (
        useWindowScroll ? null : scrollRef?.current ?? null
    ), [scrollRef, useWindowScroll]);

    const runRefresh = useCallback(async () => {
        if (disabled || isRefreshingRef.current) {
            return;
        }

        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD * 0.75);
        pullDistanceRef.current = PULL_THRESHOLD * 0.75;

        try {
            if (onRefresh) {
                await onRefresh();
            } else {
                await new Promise((resolve) => {
                    router.reload({
                        preserveScroll: true,
                        onFinish: () => resolve(),
                    });
                });
            }
        } finally {
            isRefreshingRef.current = false;
            setIsRefreshing(false);
            setPullDistance(0);
            pullDistanceRef.current = 0;
        }
    }, [disabled, onRefresh]);

    const handleTouchStart = useCallback((event) => {
        if (disabled || isRefreshingRef.current || !isTouchDevice()) {
            return;
        }

        if (readScrollTop(getScrollElement()) > 0) {
            isPullingRef.current = false;
            return;
        }

        touchStartYRef.current = event.touches[0].clientY;
        isPullingRef.current = true;
    }, [disabled, getScrollElement]);

    const handleTouchMove = useCallback((event) => {
        if (!isPullingRef.current || disabled || isRefreshingRef.current) {
            return;
        }

        if (readScrollTop(getScrollElement()) > 0) {
            isPullingRef.current = false;
            setPullDistance(0);
            pullDistanceRef.current = 0;
            return;
        }

        const deltaY = event.touches[0].clientY - touchStartYRef.current;
        if (deltaY <= 0) {
            setPullDistance(0);
            pullDistanceRef.current = 0;
            return;
        }

        event.preventDefault();

        const distance = Math.min(MAX_PULL, deltaY * 0.5);
        setPullDistance(distance);
        pullDistanceRef.current = distance;
    }, [disabled, getScrollElement]);

    const handleTouchEnd = useCallback(() => {
        if (!isPullingRef.current || disabled || isRefreshingRef.current) {
            return;
        }

        isPullingRef.current = false;

        if (pullDistanceRef.current >= PULL_THRESHOLD) {
            runRefresh();
            return;
        }

        setPullDistance(0);
        pullDistanceRef.current = 0;
    }, [disabled, runRefresh]);

    useEffect(() => {
        if (disabled || !isTouchDevice()) {
            return undefined;
        }

        const element = useWindowScroll ? null : scrollRef?.current;
        if (!useWindowScroll && !element) {
            return undefined;
        }

        const target = useWindowScroll ? window : element;
        const touchOptions = { passive: false };

        target.addEventListener('touchstart', handleTouchStart, touchOptions);
        target.addEventListener('touchmove', handleTouchMove, touchOptions);
        target.addEventListener('touchend', handleTouchEnd);
        target.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            target.removeEventListener('touchstart', handleTouchStart, touchOptions);
            target.removeEventListener('touchmove', handleTouchMove, touchOptions);
            target.removeEventListener('touchend', handleTouchEnd);
            target.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [
        disabled,
        useWindowScroll,
        scrollRef,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    ]);

    const isReady = pullDistance >= PULL_THRESHOLD;

    return {
        pullDistance,
        isRefreshing,
        isReady,
    };
}
