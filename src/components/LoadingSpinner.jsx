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

// Shimmer effect for loading states
export const ShimmerBox = ({ className = '', width = 'w-full', height = 'h-4' }) => (
  <div className={`${width} ${height} bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded ${className}`} />
);

// Skeleton components for different content types
export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white rounded-xl p-4 space-y-3 ${className}`}>
    <ShimmerBox height="h-6" width="w-3/4" />
    <ShimmerBox height="h-4" width="w-full" />
    <ShimmerBox height="h-4" width="w-2/3" />
    <div className="flex gap-2 mt-4">
      <ShimmerBox height="h-8" width="w-20" className="rounded-full" />
      <ShimmerBox height="h-8" width="w-24" className="rounded-full" />
    </div>
  </div>
);

export const ImagePlaceholder = ({ className = '', aspectRatio = 'aspect-square' }) => (
  <div className={`${aspectRatio} bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center ${className}`}>
    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
  </div>
);

export default LoadingSpinner;
