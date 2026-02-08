import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterChip from './FilterChip';

const ActiveFilters = ({ filters, onRemoveFilter, onClearAll, count, floating = false, topOffsetClass = '' }) => {
  if (count === 0) return null;

  const getFilterChips = () => {
    const chips = [];

    if (filters.age_min || filters.age_max) {
      const min = filters.age_min || '18';
      const max = filters.age_max || '65';
      chips.push({
        key: 'age',
        label: 'Age',
        value: `${min}-${max}`,
        onRemove: () => {
          onRemoveFilter('age_min');
          onRemoveFilter('age_max');
        }
      });
    }

    if (filters.gender) {
      chips.push({
        key: 'gender',
        label: 'Gender',
        value: filters.gender,
        onRemove: () => onRemoveFilter('gender')
      });
    }

    if (filters.race) {
      chips.push({
        key: 'race',
        label: 'Race',
        value: filters.race,
        onRemove: () => onRemoveFilter('race')
      });
    }

    if (filters.religion) {
      chips.push({
        key: 'religion',
        label: 'Religion',
        value: filters.religion,
        onRemove: () => onRemoveFilter('religion')
      });
    }

    if (filters.nationality) {
      chips.push({
        key: 'nationality',
        label: 'Nationality',
        value: filters.nationality,
        onRemove: () => onRemoveFilter('nationality')
      });
    }

    if (filters.max_distance_km && filters.max_distance_km !== 100) {
      chips.push({
        key: 'distance',
        label: 'Distance',
        value: `${filters.max_distance_km}km`,
        onRemove: () => onRemoveFilter('max_distance_km')
      });
    }

    return chips;
  };

  const chips = getFilterChips();

  const containerClass = floating
    ? `fixed left-0 right-0 z-40 px-4 ${topOffsetClass} pointer-events-none md:static md:mt-0 md:mb-4 md:px-0 md:pointer-events-auto`
    : 'relative mt-20 md:mt-0 mb-4';

  return (
    <div
      className={containerClass}
      aria-live="polite"
      aria-label={`${count} filters active`}
    >
      <div
        className={`mx-auto flex gap-2 overflow-x-auto pb-2 scrollbar-hide ${floating ? 'max-w-md pointer-events-auto md:max-w-none' : ''}`}
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain'
        }}
      >
        <AnimatePresence>
          {chips.map((chip, index) => (
            <motion.div
              key={chip.key}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <FilterChip
                label={chip.label}
                value={chip.value}
                onRemove={chip.onRemove}
                variant="default"
              />
            </motion.div>
          ))}
          
          {/* Clear All Chip */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: chips.length * 0.05 }}
          >
            <FilterChip
              label="Clear"
              value="All"
              onRemove={onClearAll}
              variant="primary"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Fade gradient for scroll indication */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  );
};

export default React.memo(ActiveFilters);
