import React, { useMemo } from 'react';
import { useDrag } from 'react-use-gesture';
import { motion } from 'framer-motion';
import { FaArrowUp, FaHeart, FaTimes } from 'react-icons/fa';
import { triggerHaptic } from '../../utils/haptics.js';

const SWIPE_THRESHOLD = 150;

const CardStack = ({ items, onSwipeLeft, onSwipeRight, onSwipeUp, renderCard, onCardClick, disabled = false }) => {
  const [dragState, setDragState] = React.useState({ x: 0, y: 0, rot: 0, scale: 1 });
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    setIsVisible(true);
  }, [items]);

  const bind = useDrag(({ down, movement: [mx, my], tap }) => {
    if (disabled) return; // Prevent gestures when disabled
    if (tap) return; // Ignore tap events
    
    if (down) {
      // Light haptic on drag start
      if (Math.abs(mx) > 10 || Math.abs(my) > 10) {
        triggerHaptic('light');
      }
      setDragState({ x: mx, y: my, rot: mx / 15, scale: 1.02 });
      return;
    }

    const swipeLeft = mx < -SWIPE_THRESHOLD;  // Pass
    const swipeRight = mx > SWIPE_THRESHOLD;  // Connect
    const swipeUp = my < -SWIPE_THRESHOLD;

    if (swipeRight || swipeLeft || swipeUp) {
      // Medium haptic on successful swipe
      triggerHaptic('medium');
      const toX = swipeLeft ? -500 : swipeRight ? 500 : 0;
      const toY = swipeUp ? -500 : 0;
      setDragState({ x: toX, y: toY, rot: mx / 10, scale: 1 });
      
      setTimeout(() => {
        const topItem = items[0];
        if (topItem) {
          if (swipeLeft && onSwipeLeft) {
            onSwipeLeft(topItem);  // Pass
          } else if (swipeRight && onSwipeRight) {
            onSwipeRight(topItem);  // Connect
          } else if (swipeUp && onSwipeUp) {
            onSwipeUp(topItem);
          }
        }
        setDragState({ x: 0, y: 0, rot: 0, scale: 1 });
      }, 300);
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
                {...(!disabled ? bind() : {})}
                onClick={() => onCardClick?.(item)}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ x: dragState.x, y: dragState.y, rotate: dragState.rot, scale: dragState.scale, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 cursor-grab select-none"
              >
                <motion.div
                  className="relative h-full w-full overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-2xl"
                  whileTap={{ scale: 0.98 }}
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
                    className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-[32px] bg-emerald-500/20 p-4 text-emerald-600"
                    animate={{ opacity: dragState.x > 30 ? Math.min(dragState.x / 150, 1) : 0 }}
                  >
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
                      <FaHeart />
                      Connect
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
