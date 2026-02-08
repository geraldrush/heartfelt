import React, { useMemo, useCallback } from 'react';
import { useDrag } from 'react-use-gesture';
import { motion } from 'framer-motion';
import { FaArrowUp, FaTimes, FaUndoAlt } from 'react-icons/fa';

const SWIPE_THRESHOLD = 150;
const SWIPE_BACK_THRESHOLD = 120;

const CardStack = ({ items, onSwipeLeft, onSwipeRight, onSwipeUp, renderCard, onCardClick, disabled = false }) => {
  const [dragState, setDragState] = React.useState({ x: 0, y: 0, rot: 0, scale: 1 });
  const [isAnimating, setIsAnimating] = React.useState(false);

  const bind = useDrag(({ down, movement, cancel }) => {
    if (disabled || isAnimating) return;
    const [mx, my] = Array.isArray(movement) ? movement : [0, 0];
    
    if (down) {
      setDragState({ x: mx, y: my, rot: mx / 15, scale: 1.02 });
      return;
    }

    const swipeLeft = mx < -SWIPE_THRESHOLD;
    const swipeRight = mx > SWIPE_THRESHOLD;
    const swipeUp = my < -SWIPE_THRESHOLD;
    const swipeBack = mx > SWIPE_BACK_THRESHOLD;

    if (swipeBack && onSwipeRight) {
      // Treat swipe-right as undo/back (no vibration)
      onSwipeRight(items[0]);
      setDragState({ x: 0, y: 0, rot: 0, scale: 1 });
      return;
    }

    if (swipeRight || swipeLeft || swipeUp) {
      if (isAnimating) return;
      setIsAnimating(true);
      const toX = swipeLeft ? -500 : swipeRight ? 500 : 0;
      const toY = swipeUp ? -500 : 0;
      setDragState({ x: toX, y: toY, rot: mx / 10, scale: 1 });

      const topItem = items[0];
      const direction = swipeLeft ? 'left' : swipeRight ? 'right' : 'up';
      window.setTimeout(() => {
        if (topItem) {
          if (direction === 'left' && onSwipeLeft) {
            onSwipeLeft(topItem);
          } else if (direction === 'right' && onSwipeRight) {
            onSwipeRight(topItem);
          } else if (direction === 'up' && onSwipeUp) {
            onSwipeUp(topItem);
          }
        }
        setDragState({ x: 0, y: 0, rot: 0, scale: 1 });
        setIsAnimating(false);
      }, 220);
    } else {
      setDragState({ x: 0, y: 0, rot: 0, scale: 1 });
    }
  });

  const visibleCards = useMemo(() => items.slice(0, 3), [items]);

  if (visibleCards.length === 0) {
    return null;
  }

  return (
    <div className="relative h-[calc(100dvh-180px)] md:h-[520px] w-full max-w-md mx-auto">
      {visibleCards
        .slice()
        .reverse()
        .map((item, index) => {
          const position = visibleCards.length - 1 - index;
          const isTop = position === 0;
          const scaleValue = 1 - position * 0.05;
          const yOffset = position * 12;

          if (isTop) {
            return (
              <motion.div
                key={item.story_id || item.id}
                {...(!disabled && !isAnimating ? bind() : {})}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ 
                  x: dragState.x, 
                  y: dragState.y, 
                  rotate: dragState.rot, 
                  scale: dragState.scale, 
                  opacity: 1 
                }}
                transition={{ duration: isAnimating ? 0.25 : 0.15, ease: 'easeOut' }}
                className="absolute inset-0 cursor-grab select-none touch-none"
                style={{ pointerEvents: isAnimating ? 'none' : 'auto' }}
              >
                <motion.div
                  className="relative h-full w-full overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-2xl"
                  whileTap={!isAnimating ? { scale: 0.98 } : {}}
                >
                  <motion.div
                    className="pointer-events-none absolute inset-0 z-10 flex items-start justify-start rounded-[32px] bg-rose-500/20 p-4 text-rose-600"
                    animate={{ opacity: dragState.x < -30 ? Math.min(Math.abs(dragState.x) / 150, 1) : 0 }}
                  >
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
                      <FaTimes />
                      Pass
                    </div>
                  </motion.div>
                  <motion.div
                    className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-[32px] bg-slate-500/20 p-4 text-slate-700"
                    animate={{ opacity: dragState.x > 30 ? Math.min(dragState.x / 150, 1) : 0 }}
                  >
                    <div className="flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold">
                      <FaUndoAlt />
                      Undo
                    </div>
                  </motion.div>
                  <motion.div
                    className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center rounded-[32px] pb-6 text-amber-600"
                    animate={{ opacity: dragState.y < -30 ? Math.min(Math.abs(dragState.y) / 150, 1) : 0 }}
                  >
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
                      <FaArrowUp />
                      View Profile
                    </div>
                  </motion.div>
                  {renderCard(item)}
                </motion.div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={item.story_id || item.id}
              className="absolute inset-0 overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-xl"
              animate={{ scale: scaleValue, y: yOffset }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {renderCard(item)}
            </motion.div>
          );
        })}
    </div>
  );
};

export default CardStack;
