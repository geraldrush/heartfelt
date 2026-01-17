import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaHeart } from 'react-icons/fa';

const HeartAnimation = ({ trigger = 0 }) => {
  const [bursts, setBursts] = useState([]);

  useEffect(() => {
    if (!trigger) {
      return undefined;
    }

    const id = `${Date.now()}-${Math.random()}`;
    const hearts = Array.from({ length: 4 }, () => ({
      id: `${id}-${Math.random()}`,
      offsetX: Math.floor(Math.random() * 80) - 40,
      delay: Math.random() * 0.1,
      size: 18 + Math.floor(Math.random() * 10),
    }));

    setBursts((prev) => [...prev, { id, hearts }]);

    const timeout = setTimeout(() => {
      setBursts((prev) => prev.filter((burst) => burst.id !== id));
    }, 900);

    return () => clearTimeout(timeout);
  }, [trigger]);

  return (
    <div className="pointer-events-none absolute inset-0">
      {bursts.map((burst) => (
        <React.Fragment key={burst.id}>
          {burst.hearts.map((heart) => (
            <motion.span
              key={heart.id}
              className="absolute left-1/2 top-1/2 text-pink-500"
              style={{ marginLeft: heart.offsetX }}
              initial={{ opacity: 0, scale: 0, y: 0 }}
              animate={{ opacity: [1, 1, 0], scale: [0.8, 1.5, 1.8], y: -100 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: heart.delay }}
            >
              <FaHeart size={heart.size} className="text-rose-500" />
            </motion.span>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default HeartAnimation;
