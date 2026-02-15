import React from 'react';
import { motion } from 'framer-motion';

const GlobalVideoCallModal = ({ callerName, onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Incoming Video Call</h3>
          <p className="text-base text-gray-600">{callerName} is calling you</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onDecline}
            className="flex-1 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:scale-105 transition-transform"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:scale-105 transition-transform"
          >
            Accept
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default GlobalVideoCallModal;
