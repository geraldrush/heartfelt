import React from 'react';
import { motion } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';

const FilterChip = ({ label, value, onRemove, variant = 'default' }) => {
  const handleRemove = () => {
    triggerHaptic('light');
    onRemove();
  };

  const baseClasses = "glass-card rounded-full px-3 py-2 flex items-center gap-2 text-xs";
  const variantClasses = variant === 'primary' 
    ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700"
    : "text-slate-700";

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
    >
      <span className="font-medium">{label}:</span>
      <span className="font-semibold">{value}</span>
      <button
        onClick={handleRemove}
        className="ml-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors text-xs"
        style={{ minWidth: '44px', minHeight: '44px' }}
        aria-label={`Remove ${label} filter`}
      >
        ✕
      </button>
    </motion.div>
  );
};

export default React.memo(FilterChip);