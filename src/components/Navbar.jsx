// src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import { FaComments, FaFire, FaHome, FaPlusCircle, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { getUnreadCounts } from '../utils/api.js';
import TokenSparkle from './animations/TokenSparkle.jsx';

const MotionLink = motion.create(Link);

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/connections' && location.pathname.startsWith('/chat')) {
      return true;
    }
    return location.pathname === path;
  };

  const desktopLinkClass = (path) =>
    `transition ${isActive(path) ? 'text-rose-500' : 'text-gray-700 hover:text-rose-500'}`;

  const mobileItems = [
    { to: '/landing', label: 'Home', icon: FaHome },
    { to: '/stories', label: 'Feed', icon: FaFire },
    { to: '/create-profile', label: 'Create', icon: FaPlusCircle },
    { to: '/connections', label: 'Chat', icon: FaComments, badge: unreadTotal },
    { to: '/profile', label: 'Profile', icon: FaUser },
  ];

  return (
    <>
      <nav className="hidden bg-white shadow-md md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/landing" className="text-2xl font-bold text-rose-500">
            Heartfelt Connections
          </Link>

          <div className="flex items-center space-x-4">
            <Link to="/landing" className={desktopLinkClass('/landing')}>
              Home
            </Link>
            <Link to="/create-profile" className={desktopLinkClass('/create-profile')}>
              Create Profile
            </Link>
            <Link to="/stories" className={desktopLinkClass('/stories')}>
              Story Feed
            </Link>
            <Link to="/connections" className={`relative ${desktopLinkClass('/connections')}`}>
              <FontAwesomeIcon icon={faComments} className="mr-2" />
              Chat
              {unreadTotal > 0 && (
                <span className="absolute -right-3 -top-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                  {unreadTotal}
                </span>
              )}
            </Link>
            {user && (
              <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
                <div className="text-sm text-gray-600">
                  <div className="font-semibold text-gray-800">
                    {user.full_name || user.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    Tokens:{' '}
                    <TokenSparkle value={user.token_balance ?? 0} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-rose-300 hover:text-rose-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-12px_30px_rgba(15,23,42,0.08)] md:hidden"
      >
        <div
          className="flex items-center justify-around px-4 pt-3"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <MotionLink
                key={item.label}
                to={item.to}
                whileTap={{ scale: 0.95 }}
                className={`relative flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                  active ? 'bg-rose-100 text-rose-500' : 'text-slate-500'
                }`}
              >
                <Icon className="text-lg" />
                {item.label}
                {item.badge > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                    {item.badge}
                  </span>
                )}
              </MotionLink>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
};

export default Navbar;
