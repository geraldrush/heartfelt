import React from 'react';
import { motion } from 'framer-motion';

const EmptyState = ({ icon, title, description, actionButton }) => (
  <div className="w-full rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-peach-100 p-8 text-center shadow-sm">
    <motion.div
      className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white/80 text-rose-500 shadow"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      {icon}
    </motion.div>
    <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
    {description && (
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    )}
    {actionButton && <div className="mt-6 flex justify-center">{actionButton}</div>}
  </div>
);

export default EmptyState;
