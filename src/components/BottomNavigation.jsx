import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaHeart, FaComments, FaTachometerAlt, FaBroadcastTower, FaUser } from 'react-icons/fa';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/stories', icon: FaHeart, label: 'Stories' },
    { path: '/live', icon: FaBroadcastTower, label: 'Live' },
    { path: '/connections', icon: FaComments, label: 'Chats' },
    { path: '/landing', icon: FaTachometerAlt, label: 'Dashboard' },
    { path: '/profile', icon: FaUser, label: 'Profile' },
  ];

  const getSearchParams = () => {
    try {
      return new URLSearchParams(location.search);
    } catch {
      return new URLSearchParams();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const searchParams = getSearchParams();
          const isActive = location.pathname === path || (path === '/stories' && location.pathname === '/stories' && searchParams.has('filters') && label === 'Stories');
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
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
