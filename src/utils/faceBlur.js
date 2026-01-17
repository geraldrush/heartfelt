import '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

let modelPromise;

export const loadBlazeFaceModel = async () => {
  if (!modelPromise) {
    modelPromise = blazeface.load();
  }
  return modelPromise;
};

const fileToImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.readAsDataURL(file);
  });

export const detectAndBlurFaces = async (imageFile) => {
  try {
    const model = await loadBlazeFaceModel();
    const img = await fileToImage(imageFile);
    const predictions = await model.estimateFaces(img, false);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return { blob: imageFile, facesDetected: 0 };
    }

    ctx.drawImage(img, 0, 0);

    if (predictions.length > 0) {
      predictions.forEach((prediction) => {
        const [x, y] = prediction.topLeft;
        const [x2, y2] = prediction.bottomRight;
        const width = Math.max(0, x2 - x);
        const height = Math.max(0, y2 - y);

        ctx.filter = 'blur(20px)';
        ctx.drawImage(img, x, y, width, height, x, y, width, height);
        ctx.filter = 'none';
      });
    }

    const blob = await new Promise((resolve) =>
      canvas.toBlob((result) => resolve(result), imageFile.type)
    );

    return {
      blob: blob || imageFile,
      facesDetected: predictions.length,
    };
  } catch (error) {
    return { blob: imageFile, facesDetected: 0, error };
  }
};
