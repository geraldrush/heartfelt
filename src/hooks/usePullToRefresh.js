import { useEffect, useRef, useState } from 'react';

export const usePullToRefresh = (onRefresh, threshold = 80) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isAtTop = false;

    const handleTouchStart = (e) => {
      if (container.scrollTop === 0) {
        isAtTop = true;
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (!isAtTop || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      
      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (!isAtTop || isRefreshing) return;
      
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setPullDistance(0);
      isAtTop = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, isRefreshing, pullDistance]);

  return { containerRef, isRefreshing, pullDistance };
};