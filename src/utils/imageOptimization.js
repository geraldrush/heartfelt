// Image optimization utilities
export function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

export function createThumbnail(file, size = 150) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      canvas.width = size;
      canvas.height = size;
      
      // Calculate crop area for square thumbnail
      const minDim = Math.min(img.width, img.height);
      const x = (img.width - minDim) / 2;
      const y = (img.height - minDim) / 2;
      
      ctx.drawImage(img, x, y, minDim, minDim, 0, 0, size, size);
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

export function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  // Validate file object
  if (!file || typeof file !== 'object' || !file.type || !file.size) {
    throw new Error('Invalid file object.');
  }
  
  // Sanitize and validate file name
  if (file.name && (file.name.includes('<') || file.name.includes('>') || file.name.includes('script'))) {
    throw new Error('Invalid file name.');
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please upload a JPEG, PNG, or WebP image.');
  }
  
  if (file.size > maxSize) {
    throw new Error('Image must be smaller than 5MB.');
  }
  
  return true;
}