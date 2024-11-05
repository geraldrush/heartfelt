import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

const ReceivedRequests = () => {
  const [requests, setRequests] = useState([
    { id: 1, username: 'Alice123' },
    { id: 2, username: 'Bob456' },
    { id: 3, username: 'Charlie789' },
  ]);

  const handleAccept = (id) => {
    // Logic to accept the request (e.g., send a request to the backend)
    setRequests(requests.filter(request => request.id !== id));
    console.log(`Accepted request from user ID: ${id}`);
  };

  const handleDecline = (id) => {
    // Logic to decline the request (e.g., send a request to the backend)
    setRequests(requests.filter(request => request.id !== id));
    console.log(`Declined request from user ID: ${id}`);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 text-white p-4">
      <h1 className="text-3xl md:text-5xl font-bold mb-4">Received Connection Requests</h1>

      {requests.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 w-full max-w-lg">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white text-blue-500 flex flex-col items-center p-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
            >
              <div className="flex items-center w-full">
                <FontAwesomeIcon icon={faUserCircle} className="text-3xl mr-4" />
                <div className="flex-1">
                  <p className="text-lg font-semibold">{request.username}</p>
                </div>
              </div>

              <div className="flex justify-around w-full mt-4 space-x-2">
                <button
                  onClick={() => handleAccept(request.id)}
                  className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
                >
                  <FontAwesomeIcon icon={faCheck} className="mr-1" /> Accept
                </button>
                <button
                  onClick={() => handleDecline(request.id)}
                  className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors flex items-center"
                >
                  <FontAwesomeIcon icon={faTimes} className="mr-1" /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-lg">You have no connection requests.</p>
      )}

      <footer className="mt-10 w-full text-center">
        <p className="text-sm">© {new Date().getFullYear()} Heartfelt Connections. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ReceivedRequests;
