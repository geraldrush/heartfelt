import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const StickyNav = ({ title, tokenBalance, showTokens = true, showNotifications = true }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const { logout } = useAuth();

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/', { replace: true });
    }
  };

  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <button 
            type="button" 
            onClick={() => setShowMenu(!showMenu)} 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#E74C3C] to-[#F39C12] bg-clip-text text-transparent">
            {title}
          </h1>
          
          <div className="flex items-center gap-3">
            {showTokens && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full px-3 py-1.5">
                <span className="text-lg">🪙</span>
                <span className="text-sm font-bold text-amber-700">
                  {tokenBalance === null ? '...' : tokenBalance}
                </span>
              </div>
            )}
            {showNotifications && <NotificationBell />}
          </div>
        </div>
      </div>

      {/* Menu Drawer */}
      {showMenu && (
        <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setShowMenu(false)}>
          <div 
            className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-[#E74C3C] to-[#F39C12]">
              <h2 className="font-bold text-lg text-white">Menu</h2>
              <button 
                onClick={() => setShowMenu(false)} 
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <nav className="p-4 space-y-2">
              <button 
                onClick={() => { navigate('/stories'); setShowMenu(false); }} 
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-[#E74C3C]/10 hover:to-[#F39C12]/10 font-medium transition-colors flex items-center gap-3"
              >
                <span className="text-xl">🏠</span>
                <span>Home</span>
              </button>
              
              <button 
                onClick={() => { navigate('/profile'); setShowMenu(false); }} 
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-[#E74C3C]/10 hover:to-[#F39C12]/10 font-medium transition-colors flex items-center gap-3"
              >
                <span className="text-xl">👤</span>
                <span>Profile</span>
              </button>
              
              <button 
                onClick={() => { navigate('/connections'); setShowMenu(false); }} 
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-[#E74C3C]/10 hover:to-[#F39C12]/10 font-medium transition-colors flex items-center gap-3"
              >
                <span className="text-xl">💬</span>
                <span>Connections</span>
              </button>
              
              <button 
                onClick={() => { navigate('/live'); setShowMenu(false); }} 
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-[#E74C3C]/10 hover:to-[#F39C12]/10 font-medium transition-colors flex items-center gap-3"
              >
                <span className="text-xl">🎥</span>
                <span>Live Rooms</span>
              </button>
              
              <button 
                onClick={() => { navigate('/tokens'); setShowMenu(false); }} 
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-[#E74C3C]/10 hover:to-[#F39C12]/10 font-medium transition-colors flex items-center gap-3"
              >
                <span className="text-xl">🪙</span>
                <span>Tokens</span>
              </button>
              
              <div className="pt-4 mt-4 border-t border-gray-200">
                <button 
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 font-medium transition-colors flex items-center gap-3 text-red-600"
                >
                  <span className="text-xl">🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default StickyNav;
