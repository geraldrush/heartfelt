import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({
  message,
  type = 'error',
  onClose,
  duration = 5000,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
  const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] ${bgColor} text-white px-6 py-3 rounded-xl shadow-lg max-w-sm mx-4`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 text-white/80 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-3 flex items-center gap-2">
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30"
            >
              {secondaryLabel}
            </button>
          )}
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default Toast;
