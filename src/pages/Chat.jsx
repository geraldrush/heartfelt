// src/pages/Chat.jsx
import React, { useEffect, useState } from 'react';
import {
  createTokenRequest,
  fulfillTokenRequest,
  getTokenRequests,
  transferTokens,
} from '../utils/api.js';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [requestRecipientId, setRequestRecipientId] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [transferStatus, setTransferStatus] = useState('');

  const loadRequests = async () => {
    try {
      const data = await getTokenRequests();
      setPendingRequests(data.requests || []);
    } catch (error) {
      setPendingRequests([]);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const sendMessage = () => {
    if (!input.trim()) {
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: input.trim(), type: 'message' },
    ]);
    setInput('');
  };

  const sendTokenRequest = async () => {
    setTransferStatus('');
    const numericAmount = Number(requestAmount);

    if (!requestRecipientId) {
      setTransferStatus('Recipient ID is required.');
      return;
    }
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      setTransferStatus('Enter a valid request amount.');
      return;
    }

    try {
      await createTokenRequest({
        recipient_id: requestRecipientId,
        amount: numericAmount,
        reason: requestReason || undefined,
      });
      setRequestRecipientId('');
      setRequestAmount('');
      setRequestReason('');
      setShowRequest(false);
      setTransferStatus('Token request sent.');
      await loadRequests();
    } catch (error) {
      setTransferStatus(error.message || 'Failed to send token request.');
    }
  };

  const fulfillRequest = async (request) => {
    setTransferStatus('');
    try {
      await transferTokens({
        recipient_id: request.requester_id,
        amount: request.amount,
        message: request.reason || undefined,
      });
      await fulfillTokenRequest(request.id);
      setTransferStatus('Tokens sent successfully.');
      await loadRequests();
    } catch (error) {
      setTransferStatus(error.message || 'Token transfer failed.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-100 p-4">
      <h2 className="mb-4 text-3xl font-semibold">Chat</h2>
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <div key={request.id} className="rounded-lg bg-amber-50 p-3 text-sm text-slate-700">
              <p>
                Token Request from {request.requester_name || request.requester_id}: {request.amount}{' '}
                tokens
              </p>
              <p className="mt-1 text-xs text-slate-500">{request.reason || 'No reason provided'}</p>
              <button
                type="button"
                onClick={() => fulfillRequest(request)}
                className="mt-3 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
              >
                Send Tokens
              </button>
            </div>
          ))}
          {messages.map((msg) => (
            <div key={msg.id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p>{msg.text}</p>
            </div>
          ))}
          {messages.length === 0 && pendingRequests.length === 0 && (
            <p className="text-sm text-slate-500">Start the conversation...</p>
          )}
        </div>

        {transferStatus && (
          <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {transferStatus}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow rounded-lg border border-gray-300 p-3 focus:border-blue-400 focus:outline-none"
            />
            <button
              onClick={sendMessage}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600"
            >
              Send
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowRequest((prev) => !prev)}
            className="self-start text-sm font-semibold text-blue-600"
          >
            {showRequest ? 'Cancel token request' : 'Request Tokens'}
          </button>

          {showRequest && (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="space-y-2">
                <input
                  type="text"
                  value={requestRecipientId}
                  onChange={(event) => setRequestRecipientId(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="Recipient user ID"
                />
                <input
                  type="number"
                  min="1"
                  value={requestAmount}
                  onChange={(event) => setRequestAmount(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="Amount"
                />
                <textarea
                  value={requestReason}
                  onChange={(event) => setRequestReason(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="Why are you requesting tokens?"
                  rows="2"
                />
              </div>
              <button
                type="button"
                onClick={sendTokenRequest}
                className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Send Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
