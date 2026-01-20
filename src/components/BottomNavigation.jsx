import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaHeart, FaComments, FaCoins, FaUser } from 'react-icons/fa';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/landing', icon: FaHome, label: 'Home' },
    { path: '/stories', icon: FaHeart, label: 'Stories' },
    { path: '/connections', icon: FaComments, label: 'Chats' },
    { path: '/tokens', icon: FaCoins, label: 'Tokens' },
    { path: '/profile', icon: FaUser, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                isActive 
                  ? 'text-purple-600 bg-purple-50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;