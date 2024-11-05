import React, { useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faCommentDots, faPhone, faBan } from '@fortawesome/free-solid-svg-icons';

const ConnectionsPage = () => {
  const [connections] = useState([
    { id: 1, username: 'JaneDoe', connectedAt: '2024-10-15', isOnline: true },
    { id: 2, username: 'JohnSmith', connectedAt: '2024-10-20', isOnline: false },
    { id: 3, username: 'AlexLee', connectedAt: '2024-10-25', isOnline: true },
  ]);
  const navigate = useNavigate();

  const handleChat = (username) => {
    navigate(`/chat/${username}`);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 text-white p-4">
      <h1 className="text-3xl md:text-5xl font-bold mb-4">Your Connections</h1>

      {connections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="bg-white text-blue-500 flex flex-col items-center p-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
            >
              <div className="flex items-center w-full">
                <FontAwesomeIcon icon={faUserCircle} className="text-3xl mr-4" />
                <div className="flex-1">
                  <p className="text-lg font-semibold">{connection.username}</p>
                  <p className="text-sm text-gray-500">
                    {connection.isOnline ? (
                      <span className="text-green-500">Online</span>
                    ) : (
                      <span className="text-red-500">Offline</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">Connected on: {new Date(connection.connectedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex justify-around w-full mt-4 space-x-2">
                <button onClick={() => handleChat(connection.username)} className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors">
                  <FontAwesomeIcon icon={faCommentDots} /> Chat
                </button>
                <button className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors">
                  <FontAwesomeIcon icon={faPhone} /> Call
                </button>
                <button className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors">
                  <FontAwesomeIcon icon={faBan} /> Block
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-lg">You have no connections yet.</p>
      )}

      <footer className="mt-10 w-full text-center">
        <p className="text-sm">© {new Date().getFullYear()} Heartfelt Connections. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ConnectionsPage;
