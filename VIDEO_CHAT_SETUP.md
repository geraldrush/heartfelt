# Free Video Chat Setup Guide (Token-Based)

## Overview
Your app now supports **token-based video calling** - users spend 10 tokens to request a video call.

## Cost Structure
- **Video Call Request**: 10 tokens per call
- **Infrastructure**: $0 (peer-to-peer, no server costs)
- **Unlimited Duration**: Once started, calls are free

## How It Works
1. User clicks "Video Call" button
2. System deducts 10 tokens from their balance
3. Video call invitation sent to other user
4. Direct peer-to-peer connection established
5. No additional charges during the call

## Installation

```bash
npm install
```

## Usage in Chat

Add video call button to your chat page:

```jsx
import { useState } from 'react';
import VideoCall from '../components/VideoCall';
import { getTokenBalance } from '../utils/api';

const ChatPage = ({ connectionId, otherUserId }) => {
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const currentUserId = 'current-user-id';

  useEffect(() => {
    getTokenBalance().then(data => setTokenBalance(data.balance));
  }, []);

  return (
    <>
      <button 
        onClick={() => setShowVideoCall(true)}
        disabled={tokenBalance < 10}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg"
      >
        📹 Video Call (10 tokens)
      </button>
      
      {tokenBalance < 10 && (
        <p className="text-red-600 text-sm">Need 10 tokens for video call</p>
      )}
      
      {showVideoCall && (
        <VideoCall
          userId={currentUserId}
          connectionId={connectionId}
          remotePeerId={otherUserId}
          tokenBalance={tokenBalance}
          onClose={() => setShowVideoCall(false)}
        />
      )}
    </>
  );
};
```

## Backend API

The backend endpoint `/api/chat/video-call-request` handles:
- Token balance verification
- Token deduction (10 tokens)
- Transaction recording
- Returns updated balance

## Notification Integration

To notify the other user about incoming calls via WebSocket:

```javascript
// After successful token deduction
const handleVideoCallRequest = async () => {
  try {
    const result = await requestVideoCall(connectionId);
    
    // Send notification via WebSocket
    sendMessage({
      type: 'video_call_invitation',
      from: currentUserId,
      to: otherUserId,
      connection_id: connectionId
    });
    
    setShowVideoCall(true);
  } catch (error) {
    alert(error.message);
  }
};
```

## Token Pricing Suggestions

- **Video Call Request**: 10 tokens (current)
- **Connection Request**: 5 tokens (existing)
- **Message**: Free (existing)
- **Token Packages**: 
  - 50 tokens = $5
  - 100 tokens = $9 (10% discount)
  - 250 tokens = $20 (20% discount)

## Revenue Model

With 10 tokens per video call:
- If 1 token = $0.10, each call = $1.00
- If 1 token = $0.05, each call = $0.50
- Adjust pricing based on your market

## Features

✅ Token-based access control
✅ Balance verification before call
✅ Automatic token deduction
✅ Transaction history tracking
✅ Peer-to-peer video (no bandwidth costs)
✅ Unlimited call duration
✅ Works on mobile and desktop

## Testing

1. Ensure user has at least 10 tokens
2. Click "Video Call" button
3. Verify tokens are deducted
4. Check transaction history
5. Test call connection

## Monetization Tips

1. **Free Tokens**: Give new users 20 free tokens to try the platform
2. **Daily Bonus**: 5 free tokens per day for active users
3. **Referral Bonus**: 50 tokens for successful referrals
4. **Premium Plans**: Unlimited video calls for $9.99/month

## Next Steps

1. Add call duration tracking
2. Add call history/logs
3. Add call quality ratings
4. Add group video calls (higher token cost)
5. Add screen sharing (premium feature)
