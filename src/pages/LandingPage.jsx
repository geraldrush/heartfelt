// src/pages/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserFriends, faUserCheck, faUsers, faCoins } from '@fortawesome/free-solid-svg-icons';

const LandingPage = () => {
  const userData = {
    username: "randUser", // Shortened username for cleaner display
    sentRequests: 5,
    receivedRequests: 3,
    totalConnections: 10,
    tokenBalance: 200,
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 text-white text-center p-4">
      <h1 className="text-3xl md:text-5xl font-bold mb-4">Welcome, {userData.username}!</h1>

      <div className="grid grid-cols-2 gap-4 mb-6 w-full max-w-lg">
        <Link to="/sent-requests" className="bg-white text-blue-500 flex items-center justify-center p-4 rounded-lg shadow-md hover:bg-gray-100 transition">
          <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
          <span className="text-lg">{userData.sentRequests}</span>
        </Link>
        <Link to="/received-requests" className="bg-white text-blue-500 flex items-center justify-center p-4 rounded-lg shadow-md hover:bg-gray-100 transition">
          <FontAwesomeIcon icon={faUserFriends} className="mr-2" />
          <span className="text-lg">{userData.receivedRequests}</span>
        </Link>
        <Link to="/connections" className="bg-white text-blue-500 flex items-center justify-center p-4 rounded-lg shadow-md hover:bg-gray-100 transition">
          <FontAwesomeIcon icon={faUsers} className="mr-2" />
          <span className="text-lg">{userData.totalConnections}</span>
        </Link>
        <Link to="/profile" className="bg-white text-blue-500 flex items-center justify-center p-4 rounded-lg shadow-md hover:bg-gray-100 transition">
          <FontAwesomeIcon icon={faCoins} className="mr-2" />
          <span className="text-lg">{userData.tokenBalance}</span>
        </Link>
      </div>

      <div className="flex flex-col space-y-4 w-full max-w-lg">
        <Link to="/stories" className="bg-white text-blue-500 py-3 rounded-lg shadow-md hover:bg-gray-100 transition text-center">
          Explore Stories
        </Link>
        <Link to="/profile" className="bg-white text-blue-500 py-3 rounded-lg shadow-md hover:bg-gray-100 transition text-center">
          View User Profile
        </Link>
      </div>

      <footer className="mt-10">
        <p className="text-sm">© {new Date().getFullYear()} Heartfelt Connections. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
