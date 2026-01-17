import React, { useMemo } from 'react';
import { useDrag } from 'react-use-gesture';
import { animated, useSpring } from 'react-spring';
import { motion } from 'framer-motion';
import { FaArrowUp, FaHeart, FaTimes } from 'react-icons/fa';

const AnimatedMotionDiv = animated(motion.div);
const SWIPE_THRESHOLD = 150;

const CardStack = ({ items, onSwipeLeft, onSwipeRight, onSwipeUp, renderCard, onCardClick }) => {
  const [{ x, y, rot, scale }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rot: 0,
    scale: 1,
    config: { tension: 300, friction: 30 },
  }));

  const bind = useDrag(({ down, movement: [mx, my] }) => {
    if (down) {
      api.start({ x: mx, y: my, rot: mx / 15, scale: 1.02, immediate: true });
      return;
    }

    const swipeRight = mx > SWIPE_THRESHOLD;
    const swipeLeft = mx < -SWIPE_THRESHOLD;
    const swipeUp = my < -SWIPE_THRESHOLD;

    if (swipeRight || swipeLeft || swipeUp) {
      const toX = swipeRight ? 500 : swipeLeft ? -500 : 0;
      const toY = swipeUp ? -500 : 0;
      api.start({
        x: toX,
        y: toY,
        rot: mx / 10,
        scale: 1,
        immediate: false,
        onRest: () => {
          const topItem = items[0];
          if (topItem) {
            if (swipeRight && onSwipeRight) {
              onSwipeRight(topItem);
            } else if (swipeLeft && onSwipeLeft) {
              onSwipeLeft(topItem);
            } else if (swipeUp && onSwipeUp) {
              onSwipeUp(topItem);
            }
          }
          api.start({ x: 0, y: 0, rot: 0, scale: 1, immediate: true });
        },
      });
    } else {
      api.start({ x: 0, y: 0, rot: 0, scale: 1, immediate: false });
    }
  });

  const visibleCards = useMemo(() => items.slice(0, 3), [items]);

  if (visibleCards.length === 0) {
    return null;
  }

  return (
    <div className="relative h-[520px] w-full max-w-md">
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
              <AnimatedMotionDiv
                key={item.story_id || item.id}
                drag
                dragElastic={0.2}
                dragListener={false}
                {...bind()}
                onClick={() => onCardClick?.(item)}
                style={{ x, y, rotate: rot, scale }}
                className="absolute inset-0 cursor-grab select-none"
              >
                <motion.div
                  className="relative h-full w-full overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-2xl"
                  whileTap={{ scale: 0.98 }}
                >
                  <animated.div
                    className="pointer-events-none absolute inset-0 z-10 flex items-start justify-start rounded-[32px] bg-emerald-500/20 p-4 text-emerald-600"
                    style={{ opacity: x.to((val) => (val > 30 ? Math.min(val / 150, 1) : 0)) }}
                  >
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
                      <FaHeart />
                      Connect
                    </div>
                  </animated.div>
                  <animated.div
                    className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-[32px] bg-rose-500/20 p-4 text-rose-600"
                    style={{ opacity: x.to((val) => (val < -30 ? Math.min(Math.abs(val) / 150, 1) : 0)) }}
                  >
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
                      <FaTimes />
                      Pass
                    </div>
                  </animated.div>
                  <animated.div
                    className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center rounded-[32px] pb-6 text-amber-600"
                    style={{ opacity: y.to((val) => (val < -30 ? Math.min(Math.abs(val) / 150, 1) : 0)) }}
                  >
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">
                      <FaArrowUp />
                      View Profile
                    </div>
                  </animated.div>
                  {renderCard(item)}
                </motion.div>
              </AnimatedMotionDiv>
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
