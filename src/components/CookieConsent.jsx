import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl p-4 md:p-6"
        >
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">Cookie Notice</h3>
              <p className="text-sm text-gray-600">
                We use cookies to enhance your experience, analyze site traffic, and personalize content. By clicking "Accept", you consent to our use of cookies.{' '}
                <a href="/privacy-policy" className="text-orange-600 hover:underline">Learn more</a>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                className="px-6 py-2 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-sm font-semibold hover:scale-105 transition-transform"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
