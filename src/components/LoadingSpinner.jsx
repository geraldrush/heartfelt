import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ label = '', size = 32, className = '' }) => (
  <div className={`flex items-center justify-center gap-3 ${className}`}>
    <motion.div
      className="rounded-full border-2 border-rose-200 border-t-rose-500"
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
    />
    {label && <span className="text-sm text-slate-500">{label}</span>}
  </div>
);

export default LoadingSpinner;
