import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useDrag } from 'react-use-gesture';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { getStoryImages } from '../utils/api.js';
import LoadingSpinner from './LoadingSpinner.jsx';

const ImageGalleryViewer = ({ storyId, initialImageUrl, onClose, isOpen = true }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState([initialImageUrl]);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState({ x: 0 });

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await getStoryImages(storyId);
        const additionalImages = response.images?.map(img => img.blurred_url) || [];
        const allImages = [initialImageUrl, ...additionalImages.filter(url => url !== initialImageUrl)];
        setImages(allImages);
      } catch (error) {
        console.error('Failed to fetch story images:', error);
        setImages([initialImageUrl]);
      } finally {
        setLoading(false);
      }
    };

    if (storyId) {
      fetchImages();
    }
  }, [storyId, initialImageUrl]);

  useEffect(() => {
    // Preload adjacent images
    if (images.length > 1) {
      const preloadIndexes = [
        currentIndex - 1,
        currentIndex + 1,
      ].filter(i => i >= 0 && i < images.length);

      preloadIndexes.forEach(index => {
        const img = new Image();
        img.src = images[index];
      });
    }
  }, [currentIndex, images]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, currentIndex, images.length]);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const bind = useDrag(({ down, movement: [mx], tap }) => {
    if (tap) return;
    
    if (down) {
      setDragState({ x: mx });
      return;
    }

    const swipeThreshold = 100;
    if (mx > swipeThreshold && currentIndex > 0) {
      handlePrevious();
    } else if (mx < -swipeThreshold && currentIndex < images.length - 1) {
      handleNext();
    }
    
    setDragState({ x: 0 });
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black backdrop-blur-sm touch-none"
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 z-10 glass-card rounded-full w-12 h-12 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <FaTimes />
      </button>

      {/* Navigation Arrows */}
      {images.length > 1 && currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute top-1/2 left-4 transform -translate-y-1/2 hidden md:flex glass-card rounded-full w-12 h-12 items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <FaChevronLeft />
        </button>
      )}

      {images.length > 1 && currentIndex < images.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute top-1/2 right-4 transform -translate-y-1/2 hidden md:flex glass-card rounded-full w-12 h-12 items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <FaChevronRight />
        </button>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-[calc(2rem+env(safe-area-inset-bottom,0px))] left-1/2 transform -translate-x-1/2 glass-card rounded-full px-4 py-2 text-white text-sm font-semibold">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Image Container */}
      <div
        {...bind()}
        className="flex items-center justify-center h-full w-full p-4 touch-none"
      >
        {loading ? (
          <LoadingSpinner label="Loading images..." />
        ) : (
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Story image ${currentIndex + 1}`}
            loading="lazy"
            decoding="async"
            className="max-h-[80vh] md:max-h-[90vh] max-w-[90vw] w-full object-contain transition-opacity duration-300"
            style={{
              backgroundColor: '#1a1a1a',
              opacity: 0,
            }}
            animate={{ x: dragState.x, opacity: 1 }}
            transition={{ duration: 0.3 }}
            onLoad={(e) => {
              e.target.style.opacity = '1';
            }}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';
              e.target.style.opacity = '0.5';
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

export default ImageGalleryViewer;