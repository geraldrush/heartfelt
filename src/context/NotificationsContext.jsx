import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead } from '../utils/api';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications({ limit: 50 });
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read_at) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    addNotification,
  }), [notifications, unreadCount, loading, fetchNotifications, fetchUnreadCount, markAsRead, addNotification]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};
