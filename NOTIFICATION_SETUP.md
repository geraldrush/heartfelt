# Notification System Setup Guide

## Overview
Your notification system is now set up! Users will receive notifications for:
- Connection requests
- New messages (can be extended)
- Token requests (can be extended)

## What Was Added

### Backend
1. **Database**: Already had notifications table (migration 0016)
2. **API Routes**: `/api/notifications` endpoints for fetching and marking as read
3. **Integration**: Connection requests now create notifications automatically

### Frontend
1. **API Functions** (`src/utils/api.js`):
   - `getNotifications()` - Fetch user notifications
   - `markNotificationAsRead(id)` - Mark notification as read
   - `getUnreadNotificationCount()` - Get unread count

2. **Custom Hook** (`src/hooks/useNotifications.js`):
   - Manages notification state
   - Handles fetching and marking as read
   - Supports real-time updates

3. **Components**:
   - `NotificationBell.jsx` - Bell icon with unread badge and dropdown
   - `NotificationsPage.jsx` - Full page view of all notifications

4. **WebSocket Integration**:
   - Updated `useWebSocket.js` to handle notification messages
   - Supports real-time notification delivery

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. The `date-fns` package was added for date formatting.

## Usage

### Display Notification Bell
The notification bell is already added to the StoryFeed header (desktop view). To add it elsewhere:

```jsx
import { NotificationBell } from '../components/NotificationBell';

<NotificationBell />
```

### Access Notifications Page
Navigate to `/notifications` to see all notifications.

### Send Notifications from Backend
Use the `createNotification` helper:

```javascript
import { createNotification } from './routes/notifications.js';

await createNotification(db, {
  user_id: 'user-id',
  type: 'message', // or 'connection_request', 'token_request', 'system'
  title: 'New Message',
  message: 'You have a new message from John',
  data: { connectionId: 'conn-123' } // Optional JSON data
});
```

## Extending the System

### Add More Notification Types

1. **Backend** - Update the notification type in the database schema if needed
2. **Frontend** - Update `NotificationBell.jsx` and `NotificationsPage.jsx` to handle new types

### Real-time Notifications via WebSocket

To broadcast notifications in real-time, update `ChatRoom.js`:

```javascript
// In ChatRoom.js, add a method to broadcast notifications
broadcastNotification(userId, notification) {
  this.sendToUser(userId, {
    type: 'notification',
    ...notification
  });
}
```

Then in your route handlers, after creating a notification:

```javascript
// Get the Durable Object and broadcast
const notificationData = {
  id: notificationId,
  type: 'connection_request',
  title: 'New Connection Request',
  message: `${sender.full_name} sent you a connection request`,
  created_at: new Date().toISOString()
};

// Broadcast via WebSocket if user is online
// (This requires access to the Durable Object instance)
```

### Add to Mobile Bottom Navigation

Update `BottomNavigation.jsx` to include notifications:

```jsx
const navItems = [
  { path: '/stories', icon: FaHeart, label: 'Stories' },
  { path: '/notifications', icon: FaBell, label: 'Alerts' }, // Add this
  { path: '/connections', icon: FaComments, label: 'Chats' },
  // ... rest
];
```

## Testing

1. Send a connection request to another user
2. Check that a notification appears in the bell icon
3. Click the notification to navigate to the relevant page
4. Verify the notification is marked as read

## Next Steps

Consider adding:
- Push notifications (using service workers)
- Email notifications for important events
- Notification preferences (let users choose what to be notified about)
- Batch notifications (group similar notifications)
