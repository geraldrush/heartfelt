# Token-Based Video Calls - Complete Setup

## Overview
Your dating app now has **token-based video calling** with notifications:
- **Request a call**: Costs 10 tokens
- **Accept a call**: FREE
- **Notifications**: Automatic alerts for incoming calls

## Features Implemented

### ✅ Backend
1. **Video call request endpoint** (`/api/chat/video-call-request`)
   - Deducts 10 tokens from caller
   - Creates notification for recipient
   - Returns updated token balance

2. **Notification system**
   - Stores video call notifications in database
   - Type: `video_call_request`
   - Includes caller info and connection details

### ✅ Frontend
1. **Video call button** in chat page
   - Shows token cost (10 tokens)
   - Disabled if insufficient tokens
   - Deducts tokens on click

2. **Incoming call modal**
   - Appears when receiving call notification
   - Shows caller name
   - Accept (FREE) or Decline buttons

3. **Video call interface**
   - Full-screen remote video
   - Small local video in corner
   - Token balance display
   - End call button

## How It Works

### Requesting a Call (Costs 10 Tokens)
1. User clicks "📹 Call" button in chat
2. System checks token balance (needs ≥10)
3. Deducts 10 tokens from caller
4. Creates notification for recipient
5. Opens video call interface
6. Establishes peer-to-peer connection

### Accepting a Call (FREE)
1. Recipient sees notification
2. Modal appears: "Incoming Video Call"
3. Click "Accept (Free)" - no tokens charged
4. Video call starts immediately

## Installation

```bash
npm install
```

## Usage

The video call button is already integrated in `Chat.jsx`. Users will see:
- **📹 Call** button next to Request button
- Disabled if balance < 10 tokens
- Alert if insufficient tokens

## Token Economics

- **Connection Request**: 5 tokens
- **Video Call Request**: 10 tokens
- **Accept Video Call**: FREE
- **Message**: FREE

## Notifications

Video call notifications appear in:
1. **Notification bell** (top of page)
2. **In-chat modal** (immediate popup)
3. **Notifications page** (`/notifications`)

## Testing

1. **Setup**: Ensure both users have tokens
2. **Caller**: Click "📹 Call" button (costs 10 tokens)
3. **Recipient**: See incoming call modal
4. **Accept**: Click "Accept (Free)" button
5. **Call**: Video should connect peer-to-peer

## Cost Structure

### For Your Business
- **Infrastructure**: $0 (peer-to-peer video)
- **Signaling**: $0 (free PeerJS server)
- **Bandwidth**: $0 (users' internet)

### For Users
- **Request call**: 10 tokens (~$0.50-$1.00)
- **Accept call**: FREE
- **Call duration**: Unlimited, no extra cost

## Revenue Model

If 1 token = $0.10:
- Video call request = $1.00
- 100 video calls = $100 revenue
- Zero infrastructure costs = 100% profit margin

## Next Steps

1. **Test the system**:
   - Create two test accounts
   - Give them tokens
   - Test video calling

2. **Customize pricing**:
   - Adjust token cost in `chat.js` (line with `const cost = 10`)
   - Update UI text to match

3. **Add features**:
   - Call duration tracking
   - Call history
   - Screen sharing (premium)
   - Group calls (higher cost)

## Troubleshooting

**"Insufficient tokens" error**:
- User needs at least 10 tokens
- Direct them to `/tokens` page

**Video won't connect**:
- Check camera/microphone permissions
- Check firewall settings
- May need TURN server for restrictive networks

**Notification not appearing**:
- Check WebSocket connection
- Verify notification bell is visible
- Check browser console for errors

## Security

- ✅ Token balance verified before deduction
- ✅ Notifications only sent to authorized users
- ✅ Video is peer-to-peer encrypted
- ✅ No video data touches your servers
- ✅ Transaction history tracked

## Browser Support

- ✅ Chrome/Edge (desktop & mobile)
- ✅ Firefox (desktop & mobile)  
- ✅ Safari (desktop & iOS)
- ✅ Opera

## Summary

Your dating app now has a complete video calling system:
- **Monetized**: 10 tokens per call request
- **Fair**: Accepting calls is free
- **Notified**: Automatic alerts for incoming calls
- **Free infrastructure**: Peer-to-peer = $0 costs
- **Scalable**: Unlimited users, unlimited calls
