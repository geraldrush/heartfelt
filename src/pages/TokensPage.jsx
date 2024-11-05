// src/pages/TokensPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TokensPage = () => {
  const [tokenAmount, setTokenAmount] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [requestUsername, setRequestUsername] = useState('');
  const navigate = useNavigate();

  const handleTopUp = () => {
    // Logic to top up tokens, e.g., call an API
    console.log(`Topping up ${tokenAmount} tokens...`);
    // Reset amount after topping up
    setTokenAmount('');
  };

  const handleSendTokens = () => {
    // Logic to send tokens, e.g., call an API
    console.log(`Sending ${tokenAmount} tokens to ${recipientUsername}...`);
    // Reset input fields after sending tokens
    setTokenAmount('');
    setRecipientUsername('');
  };

  const handleRequestTokens = () => {
    // Logic to request tokens, e.g., call an API
    console.log(`Requesting ${tokenAmount} tokens from ${requestUsername}...`);
    // Reset input fields after requesting tokens
    setTokenAmount('');
    setRequestUsername('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 text-white text-center p-4">
      <h1 className="text-3xl md:text-5xl font-bold mb-4">Manage Your Tokens</h1>

      <div className="bg-white text-blue-500 p-6 rounded-lg shadow-md w-full max-w-lg mb-6">
        <h2 className="text-2xl font-semibold mb-4">Top Up Tokens</h2>
        <input
          type="number"
          value={tokenAmount}
          onChange={(e) => setTokenAmount(e.target.value)}
          placeholder="Enter amount to top up"
          className="p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 mb-4"
        />
        <button
          onClick={handleTopUp}
          className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
        >
          Top Up
        </button>
      </div>

      <div className="bg-white text-blue-500 p-6 rounded-lg shadow-md w-full max-w-lg mb-6">
        <h2 className="text-2xl font-semibold mb-4">Send Tokens</h2>
        <input
          type="number"
          value={tokenAmount}
          onChange={(e) => setTokenAmount(e.target.value)}
          placeholder="Enter amount to send"
          className="p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 mb-4"
        />
        <input
          type="text"
          value={recipientUsername}
          onChange={(e) => setRecipientUsername(e.target.value)}
          placeholder="Enter recipient username"
          className="p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 mb-4"
        />
        <button
          onClick={handleSendTokens}
          className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
        >
          Send Tokens
        </button>
      </div>

      <div className="bg-white text-blue-500 p-6 rounded-lg shadow-md w-full max-w-lg mb-6">
        <h2 className="text-2xl font-semibold mb-4">Request Tokens</h2>
        <input
          type="number"
          value={tokenAmount}
          onChange={(e) => setTokenAmount(e.target.value)}
          placeholder="Enter amount to request"
          className="p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 mb-4"
        />
        <input
          type="text"
          value={requestUsername}
          onChange={(e) => setRequestUsername(e.target.value)}
          placeholder="Enter user to request from"
          className="p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 mb-4"
        />
        <button
          onClick={handleRequestTokens}
          className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
        >
          Request Tokens
        </button>
      </div>

      <footer className="mt-10">
        <p className="text-sm">© {new Date().getFullYear()} Heartfelt Connections. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default TokensPage;
