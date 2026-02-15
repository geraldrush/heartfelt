import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const InsufficientTokensModal = ({ isOpen, onClose, requiredTokens = 5, action = 'perform this action' }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Insufficient Tokens</h3>
          <p className="text-sm text-gray-600">
            You need {requiredTokens} token{requiredTokens !== 1 ? 's' : ''} to {action}. Top up your balance to continue.
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => {
              onClose();
              navigate('/tokens');
            }}
            className="w-full py-3 bg-gradient-to-r from-[#E74C3C] to-[#F39C12] text-white rounded-2xl font-semibold shadow-lg hover:scale-105 transition-transform"
          >
            Top Up Tokens
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default InsufficientTokensModal;
