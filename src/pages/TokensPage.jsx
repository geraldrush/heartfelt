// src/pages/TokensPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowUp, faCoins } from '@fortawesome/free-solid-svg-icons';
import {
  getPaymentStatus,
  getTokenBalance,
  getTokenHistory,
  getTokenPackages,
  initiatePayment,
  transferTokens,
} from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const TokensPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const loadBalance = async () => {
    const data = await getTokenBalance();
    setBalance(data.balance);
  };

  const loadHistory = async (nextOffset = 0, append = false) => {
    const data = await getTokenHistory({ limit: 50, offset: nextOffset });
    setTransactions((prev) => (append ? [...prev, ...data.transactions] : data.transactions));
    setOffset(nextOffset + data.transactions.length);
    setHasMore(data.transactions.length === 50);
  };

  const loadPackages = async () => {
    setPackagesLoading(true);
    try {
      const data = await getTokenPackages();
      setPackages(data.packages || []);
    } finally {
      setPackagesLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError('');
      try {
        await Promise.all([loadBalance(), loadHistory(0, false), loadPackages()]);
      } catch (err) {
        setError(err.message || 'Failed to load token data.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const paymentId = params.get('id');

    if (payment === 'success' && paymentId) {
      setPaymentStatus('Verifying payment...');
      getPaymentStatus(paymentId)
        .then(async (data) => {
          if (data.status === 'completed') {
            setPaymentStatus('Payment completed. Tokens have been added.');
            await Promise.all([loadBalance(), loadHistory(0, false)]);
          } else {
            setPaymentStatus(`Payment status: ${data.status}.`);
          }
        })
        .catch((err) => {
          setPaymentStatus(err.message || 'Failed to verify payment.');
        })
        .finally(() => {
          navigate('/tokens', { replace: true });
        });
    }

    if (payment === 'cancelled') {
      setPaymentStatus('Payment cancelled.');
      navigate('/tokens', { replace: true });
    }
  }, [location.search, navigate]);

  const handleLoadMore = async () => {
    try {
      await loadHistory(offset, true);
    } catch (err) {
      setError(err.message || 'Failed to load more transactions.');
    }
  };

  const handleTransfer = async (event) => {
    event.preventDefault();
    setTransferStatus('');
    const numericAmount = Number(amount);

    if (!recipientId) {
      setTransferStatus('Recipient ID is required.');
      return;
    }

    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      setTransferStatus('Enter a valid token amount.');
      return;
    }

    if (balance !== null && numericAmount > balance) {
      setTransferStatus('Amount exceeds your current balance.');
      return;
    }

    try {
      await transferTokens({
        recipient_id: recipientId,
        amount: numericAmount,
        message: message || undefined,
      });
      setRecipientId('');
      setAmount('');
      setMessage('');
      setTransferStatus('Transfer sent successfully.');
      await Promise.all([loadBalance(), loadHistory(0, false)]);
      setShowTransfer(false);
    } catch (err) {
      setTransferStatus(err.message || 'Transfer failed.');
    }
  };

  const handleBuyTokens = async () => {
    if (!selectedPackage) {
      setPaymentError('Select a package to continue.');
      return;
    }

    setPaymentLoading(true);
    setPaymentError('');

    try {
      const response = await initiatePayment({ package_id: selectedPackage.id });
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = response.payment_url;

      Object.entries(response.payment_data).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setPaymentError(err.message || 'Failed to start payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const summary = useMemo(() => {
    const latest = transactions[0];
    return latest ? `Last transaction ${latest.amount > 0 ? '+' : ''}${latest.amount} tokens` : 'No transactions yet.';
  }, [transactions]);

  const bestValueId = useMemo(() => {
    if (packages.length === 0) {
      return null;
    }
    return packages.reduce((best, current) => {
      if (!best || current.amount > best.amount) {
        return current;
      }
      return best;
    }, null)?.id;
  }, [packages]);

  return (
    <div className="mobile-container pull-to-refresh bg-gradient-to-br from-rose-100 via-pink-50 to-peach-100 px-4 py-10 pb-[calc(100px+env(safe-area-inset-bottom,0px))] md:pb-28 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Token Wallet</h1>
            <p className="mt-2 text-sm text-rose-900/70">{summary}</p>
          </div>
          <div className="rounded-2xl bg-white/20 px-6 py-4 text-center">
            <FontAwesomeIcon icon={faCoins} className="mb-2 text-2xl text-rose-600" />
            <p className="text-xs uppercase tracking-[0.2em] text-rose-900/60">Balance</p>
            <p className="mt-1 text-2xl font-semibold">
              {loading ? '...' : balance ?? 0}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {paymentStatus && (
          <div className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm text-slate-700">
            {paymentStatus}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Transaction History</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBuyModal(true)}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow hover:bg-rose-50"
            >
              Buy Tokens
            </button>
            <button
              type="button"
              onClick={() => setShowTransfer(true)}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow hover:bg-rose-50"
            >
              Transfer Tokens
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white text-slate-700 shadow">
          {/* Mobile Card Layout */}
          <div className="md:hidden">
            {loading ? (
              <div className="px-4 py-6 text-center">
                <LoadingSpinner label="Loading..." />
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">No transactions yet.</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="border-b border-slate-100 px-4 py-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={tx.amount > 0 ? faArrowDown : faArrowUp}
                        className={tx.amount > 0 ? 'text-emerald-500' : 'text-red-500'}
                      />
                      <span className="font-medium text-sm">{tx.transaction_type}</span>
                    </div>
                    <span className={`font-semibold ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div>{new Date(tx.created_at).toLocaleDateString()}</div>
                    <div>{tx.description || '—'}</div>
                    <div>Balance: {tx.balance_after}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Desktop Table Layout */}
          <div className="hidden md:block">
            <div className="grid grid-cols-5 gap-2 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
              <span>Date</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Description</span>
              <span>Balance</span>
            </div>
            {loading ? (
              <div className="px-4 py-6 text-center">
                <LoadingSpinner label="Loading..." />
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">No transactions yet.</div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="grid grid-cols-5 gap-2 border-b border-slate-100 px-4 py-3 text-sm"
                >
                  <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={tx.amount > 0 ? faArrowDown : faArrowUp}
                      className={tx.amount > 0 ? 'text-emerald-500' : 'text-red-500'}
                    />
                    {tx.transaction_type}
                  </span>
                  <span className={tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                  <span>{tx.description || '—'}</span>
                  <span>{tx.balance_after}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {hasMore && !loading && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow hover:bg-rose-50"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {showTransfer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-slate-700 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Send Tokens</h3>
              <button
                type="button"
                onClick={() => setShowTransfer(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleTransfer} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Recipient User ID</label>
                <input
                  value={recipientId}
                  onChange={(event) => setRecipientId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
                  placeholder="UUID"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
                  placeholder="Enter token amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
                  placeholder="Add a note"
                  rows="3"
                />
              </div>
              {transferStatus && (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {transferStatus}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                Send Tokens
              </button>
            </form>
          </div>
        </div>
      )}

      {showBuyModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 text-slate-700 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Buy Tokens</h3>
              <button
                type="button"
                onClick={() => {
                  setShowBuyModal(false);
                  setSelectedPackage(null);
                  setPaymentError('');
                }}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            {packagesLoading ? (
              <div className="mt-6 text-sm text-slate-500">Loading packages...</div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {packages.map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id;
                  const isBestValue = bestValueId === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackage(pkg)}
                      className={`relative rounded-2xl border px-4 py-5 text-left transition ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-slate-200 hover:border-rose-200'
                      }`}
                    >
                      {isBestValue && (
                        <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                          Best Value
                        </span>
                      )}
                      <p className="text-sm font-semibold text-slate-500">Tokens</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {pkg.amount}
                      </p>
                      <p className="mt-3 text-sm text-slate-500">Price</p>
                      <p className="text-lg font-semibold text-slate-900">
                        R{(pkg.price_cents / 100).toFixed(2)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {paymentError && (
              <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {paymentError}
              </div>
            )}

            <button
              type="button"
              onClick={handleBuyTokens}
              disabled={!selectedPackage || paymentLoading}
              className="mt-6 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              {paymentLoading ? 'Redirecting to Payfast...' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokensPage;
