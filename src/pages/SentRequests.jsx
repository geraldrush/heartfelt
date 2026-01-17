// src/pages/SentRequests.jsx
import React, { useState } from 'react';

const SentRequests = () => {
  // Sample data for sent requests
  const [sentRequests, setSentRequests] = useState([
    { id: 1, username: 'UserA', gender: 'Female', age: 23, status: 'Pending' },
    { id: 2, username: 'UserB', gender: 'Male', age: 30, status: 'Pending' },
    { id: 3, username: 'UserC', gender: 'Non-Binary', age: 28, status: 'Pending' },
  ]);

  // Function to cancel a sent request
  const cancelRequest = (id) => {
    setSentRequests(sentRequests.filter(request => request.id !== id));
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">Sent Connection Requests</h1>

      {/* Request List */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-4">
        {sentRequests.length > 0 ? (
          sentRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between border-b border-gray-300 py-2">
              <div className="flex flex-col">
                <span className="font-semibold">{request.username}</span>
                <span className="text-gray-600">{request.gender}, {request.age} years old</span>
                <span className="text-gray-500">{request.status}</span>
              </div>
              <button
                onClick={() => cancelRequest(request.id)}
                className="bg-red-500 text-white py-1 px-4 rounded hover:bg-red-600 transition"
                title="Cancel Request"
                aria-label={`Cancel request to ${request.username}`}
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No sent requests yet.</p>
        )}
      </div>
    </div>
  );
};

export default SentRequests;
