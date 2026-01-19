/**
 * Trigger haptic feedback if supported by the device
 * @param {string} type - 'light', 'medium', 'heavy', 'success', 'warning', 'error'
 */
export const triggerHaptic = (type = 'light') => {
  // Check if Vibration API is supported
  if (!navigator.vibrate) return;

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [30, 100, 30, 100, 30],
  };

  const pattern = patterns[type] || patterns.light;
  navigator.vibrate(pattern);
};

/**
 * Cancel any ongoing vibration
 */
export const cancelHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate(0);
  }
};