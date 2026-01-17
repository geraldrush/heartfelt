import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const TokenSparkle = ({ value, className = '' }) => {
  const previous = useRef(value);
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    if (previous.current === value) {
      return;
    }
    previous.current = value;

    const nextSparkles = Array.from({ length: 5 }, () => ({
      id: `${Date.now()}-${Math.random()}`,
      top: Math.floor(Math.random() * 28) - 6,
      left: Math.floor(Math.random() * 28) - 6,
    }));
    setSparkles(nextSparkles);

    const timeout = setTimeout(() => {
      setSparkles([]);
    }, 700);

    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <motion.span
        key={value}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        {value}
      </motion.span>
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className="absolute h-2 w-2 rounded-full bg-amber-300 opacity-80 animate-sparkle"
          style={{ top: sparkle.top, left: sparkle.left }}
        />
      ))}
    </span>
  );
};

export default TokenSparkle;
