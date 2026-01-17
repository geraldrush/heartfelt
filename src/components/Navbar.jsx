// src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext.jsx';
import { getUnreadCounts } from '../utils/api.js';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    let intervalId;

    const loadUnread = async () => {
      try {
        const data = await getUnreadCounts();
        const total = (data.counts || []).reduce(
          (sum, item) => sum + Number(item.unread_count || 0),
          0
        );
        setUnreadTotal(total);
      } catch (error) {
        setUnreadTotal(0);
      }
    };

    if (user) {
      loadUnread();
      intervalId = setInterval(loadUnread, 30000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Brand Name */}
        <Link to="/" className="text-2xl font-bold text-blue-500">
          Heartfelt Connections
        </Link>

        {/* Hamburger Icon for Mobile */}
        <button
          className="text-gray-700 md:hidden focus:outline-none"
          onClick={toggleMenu}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            ></path>
          </svg>
        </button>

        {/* Links for Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          <Link to="/" className="text-gray-700 hover:text-blue-500 transition">Home</Link>
          <Link to="/create-profile" className="text-gray-700 hover:text-blue-500 transition">Create Profile</Link>
          <Link to="/stories" className="text-gray-700 hover:text-blue-500 transition">Story Feed</Link>
          <Link to="/connections" className="relative text-gray-700 hover:text-blue-500 transition">
            <FontAwesomeIcon icon={faComments} className="mr-2" />
            Chat
            {unreadTotal > 0 && (
              <span className="absolute -right-3 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                {unreadTotal}
              </span>
            )}
          </Link>
          {user && (
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="text-sm text-gray-600">
                <div className="font-semibold text-gray-800">{user.full_name || user.email}</div>
                <div className="text-xs text-gray-500">Tokens: {user.token_balance ?? 0}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-500"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-md">
          <Link to="/" onClick={toggleMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Home</Link>
          <Link to="/create-profile" onClick={toggleMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Create Profile</Link>
          <Link to="/stories" onClick={toggleMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Story Feed</Link>
          <Link to="/connections" onClick={toggleMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-200">
            Chat
            {unreadTotal > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                {unreadTotal}
              </span>
            )}
          </Link>
          {user && (
            <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
              <div className="font-semibold text-gray-800">{user.full_name || user.email}</div>
              <div className="text-xs text-gray-500">Tokens: {user.token_balance ?? 0}</div>
              <button
                type="button"
                onClick={() => {
                  toggleMenu();
                  handleLogout();
                }}
                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-500"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
