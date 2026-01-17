// src/pages/Connections.jsx
import React, { useEffect, useState } from 'react';
import { getTokenBalance, transferTokens } from '../utils/api.js';

const Connections = () => {
  const [connections] = useState([]);
  const [activeConnectionId, setActiveConnectionId] = useState(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const data = await getTokenBalance();
        setBalance(data.balance);
      } catch (error) {
        setBalance(null);
      }
    };
    loadBalance();
  }, []);

  const handleTransfer = async (event, recipientId) => {
    event.preventDefault();
    setStatus('');
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setStatus('Enter a valid amount.');
      return;
    }

    if (balance !== null && numericAmount > balance) {
      setStatus('Amount exceeds your balance.');
      return;
    }

    try {
      await transferTokens({
        recipient_id: recipientId,
        amount: numericAmount,
        message: message || undefined,
      });
      setStatus('Tokens sent successfully.');
      setAmount('');
      setMessage('');
      const data = await getTokenBalance();
      setBalance(data.balance);
      setActiveConnectionId(null);
    } catch (error) {
      setStatus(error.message || 'Transfer failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900">Your Connections</h1>
        <p className="mt-2 text-sm text-slate-600">
          Send tokens to people you are connected with.
        </p>

        {connections.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-6 text-sm text-slate-500 shadow">
            You have no connections yet.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {connections.map((connection) => (
              <div key={connection.id} className="rounded-2xl bg-white p-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {connection.name}
                    </p>
                    <p className="text-xs text-slate-500">{connection.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveConnectionId((prev) =>
                        prev === connection.id ? null : connection.id
                      )
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Send Tokens
                  </button>
                </div>

                {activeConnectionId === connection.id && (
                  <form
                    onSubmit={(event) => handleTransfer(event, connection.id)}
                    className="mt-4 space-y-3"
                  >
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                      placeholder="Amount"
                    />
                    <input
                      type="text"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                      placeholder="Message (optional)"
                    />
                    {status && (
                      <p className="text-xs text-slate-500">{status}</p>
                    )}
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Confirm Transfer
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Connections;
