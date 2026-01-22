import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from 'react-use-gesture';
import { triggerHaptic } from '../utils/haptics';

const FilterDrawer = ({ isOpen, onClose, children, title, onApply, onClear }) => {
  const [dragY, setDragY] = React.useState(0);

  const bind = useDrag(({ down, movement: [, my], velocity: [, vy] }) => {
    if (window.innerWidth >= 768) return; // Only on mobile
    if (my > 0) {
      setDragY(down ? my : 0);
      if (!down && (my > 100 || vy > 0.5)) {
        triggerHaptic('medium');
        onClose();
      }
    }
  });

  useEffect(() => {
    if (isOpen) {
      triggerHaptic('light');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleApply = () => {
    triggerHaptic('medium');
    onApply();
  };

  const handleClear = () => {
    triggerHaptic('medium');
    onClear();
  };

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Drawer Container */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 md:relative md:bottom-auto glass-card rounded-t-3xl md:rounded-3xl max-h-[85vh] md:max-h-none overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-4"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ 
              y: window.innerWidth < 768 ? dragY : 0,
              opacity: 1
            }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 300 
            }}
            {...(window.innerWidth < 768 ? bind() : {})}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-title"
          >
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 id="filter-title" className="text-xl font-semibold text-slate-900">
                {title}
              </h2>
              <button
                onClick={handleClose}
                className="glass-card rounded-full w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-black/10 transition-colors"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <motion.div
              className="px-6 overflow-y-auto flex-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              {children}
            </motion.div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row gap-3 p-6 pt-4">
              <button
                onClick={handleApply}
                className="premium-button flex-1"
              >
                Apply Filters
              </button>
              <button
                onClick={handleClear}
                className="glass-card rounded-xl px-6 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex-1 sm:flex-none"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FilterDrawer;