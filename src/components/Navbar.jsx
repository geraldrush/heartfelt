// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
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
        <div className="hidden md:flex space-x-4">
          <Link to="/" className="text-gray-700 hover:text-blue-500 transition">Home</Link>
          <Link to="/create-profile" className="text-gray-700 hover:text-blue-500 transition">Create Profile</Link>
          <Link to="/stories" className="text-gray-700 hover:text-blue-500 transition">Story Feed</Link>
          <Link to="/chat" className="text-gray-700 hover:text-blue-500 transition">Chat</Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-md">
          <Link to="/" onClick={toggleMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Home</Link>
          <Link to="/create-profile" onClick={toggleMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Create Profile</Link>
          <Link to="/stories" onClick={toggleMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Story Feed</Link>
          <Link to="/chat" onClick={toggleMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Chat</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
