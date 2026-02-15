import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTokenBalance } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const WithdrawalPage = () => {
  const navigate = useNavigate();
  const [tokenBalance, setTokenBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountHolder: '',
    accountNumber: '',
    bankName: '',
    branchCode: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const MIN_WITHDRAWAL_TOKENS = 500;
  const TOKEN_TO_RAND = 2;

  useEffect(() => {
    getTokenBalance()
      .then(data => {
        setTokenBalance(data.balance);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const tokens = parseInt(amount);
    if (!tokens || tokens < MIN_WITHDRAWAL_TOKENS) {
      setError(`Minimum withdrawal is ${MIN_WITHDRAWAL_TOKENS} tokens (R${MIN_WITHDRAWAL_TOKENS * TOKEN_TO_RAND})`);
      return;
    }

    if (tokens > tokenBalance) {
      setError('Insufficient token balance');
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (paymentMethod === 'bank' && (!bankDetails.accountHolder || !bankDetails.accountNumber || !bankDetails.bankName || !bankDetails.branchCode)) {
      setError('Please fill in all bank details');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/tokens/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          tokens,
          payment_method: paymentMethod,
          bank_details: paymentMethod === 'bank' ? bankDetails : null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Withdrawal failed');
      }

      navigate('/tokens', { state: { message: 'Withdrawal request submitted successfully' } });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const randAmount = amount ? parseInt(amount) * TOKEN_TO_RAND : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 pb-20">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate('/tokens')} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Withdraw Tokens</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">Available Balance</p>
            <p className="text-3xl font-bold text-gray-900">{tokenBalance} tokens</p>
            <p className="text-sm text-gray-500">≈ R{tokenBalance * TOKEN_TO_RAND}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
            <p>• Minimum withdrawal: {MIN_WITHDRAWAL_TOKENS} tokens (R{MIN_WITHDRAWAL_TOKENS * TOKEN_TO_RAND})</p>
            <p>• Exchange rate: 1 token = R{TOKEN_TO_RAND}</p>
            <p>• Processing time: 3-5 business days</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-lg space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Amount (Tokens)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${MIN_WITHDRAWAL_TOKENS} tokens`}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {amount && <p className="text-sm text-gray-600 mt-1">You will receive: R{randAmount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="payment"
                  value="bank"
                  checked={paymentMethod === 'bank'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-orange-500"
                />
                <div>
                  <p className="font-medium text-gray-900">Bank Transfer</p>
                  <p className="text-sm text-gray-500">Direct deposit to your bank account</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="payment"
                  value="payfast"
                  checked={paymentMethod === 'payfast'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-orange-500"
                />
                <div>
                  <p className="font-medium text-gray-900">PayFast</p>
                  <p className="text-sm text-gray-500">Receive via PayFast payment</p>
                </div>
              </label>
            </div>
          </div>

          {paymentMethod === 'bank' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-medium text-gray-900">Bank Account Details</h3>
              <input
                type="text"
                placeholder="Account Holder Name"
                value={bankDetails.accountHolder}
                onChange={(e) => setBankDetails({...bankDetails, accountHolder: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="Account Number"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="Bank Name"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="Branch Code"
                value={bankDetails.branchCode}
                onChange={(e) => setBankDetails({...bankDetails, branchCode: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? 'Processing...' : 'Submit Withdrawal Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WithdrawalPage;
