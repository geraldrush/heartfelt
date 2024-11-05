import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

const SentRequests = () => {
  const [sentRequests, setSentRequests] = useState([
    { id: 1, username: 'Alice123' },
    { id: 2, username: 'Bob456' },
    { id: 3, username: 'Charlie789' },
  ]);

  const navigate = useNavigate();

  const handleCancelRequest = (id) => {
    // Logic to cancel the request (e.g., send a request to the backend)
    setSentRequests(sentRequests.filter(request => request.id !== id));
    console.log(`Canceled request to user ID: ${id}`);
  };

  const handleNavigateToStory = (username) => {
    navigate(`/stories/${username}`); // Redirect to the user's story page
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 text-white p-4">
      <h1 className="text-3xl md:text-5xl font-bold mb-4">Sent Connection Requests</h1>

      {sentRequests.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 w-full max-w-lg">
          {sentRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white text-blue-500 flex flex-col items-center p-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
            >
              <div className="flex items-center w-full cursor-pointer" onClick={() => handleNavigateToStory(request.username)}>
                <FontAwesomeIcon icon={faUserCircle} className="text-3xl mr-4" />
                <div className="flex-1">
                  <p className="text-lg font-semibold">{request.username}</p>
                </div>
              </div>

              <div className="flex justify-around w-full mt-4 space-x-2">
                <button
                  onClick={() => handleCancelRequest(request.id)}
                  className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors flex items-center"
                >
                  <FontAwesomeIcon icon={faTrashAlt} className="mr-1" /> Cancel Request
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-lg">You have no sent connection requests.</p>
      )}

      <footer className="mt-10 w-full text-center">
        <p className="text-sm">© {new Date().getFullYear()} Heartfelt Connections. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SentRequests;
