import React from 'react';
import { motion } from 'framer-motion';

const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.3, ease: 'easeInOut', delay }}
  >
    {children}
  </motion.div>
);

export default FadeIn;
