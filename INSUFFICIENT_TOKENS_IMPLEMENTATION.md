# Insufficient Tokens Modal Implementation Guide

## Component Created
`src/components/InsufficientTokensModal.jsx` - Reusable modal component

## Usage Pattern

```javascript
import InsufficientTokensModal from '../components/InsufficientTokensModal.jsx';

// In component state
const [showTopUpModal, setShowTopUpModal] = useState(false);

// In try-catch when calling API
try {
  await someApiCall();
} catch (err) {
  if (err.status === 402) {
    setShowTopUpModal(true);
  } else {
    setError(err.message);
  }
}

// In JSX
<InsufficientTokensModal
  isOpen={showTopUpModal}
  onClose={() => setShowTopUpModal(false)}
  requiredTokens={5}
  action="perform this action"
/>
```

## Files That Need Updates

### 1. ✅ LiveRooms.jsx (DONE)
- Create live room: 5 tokens
- Join live room: 5 tokens

### 2. StoryFeed.jsx
- Send connection request: 5 tokens
- Add modal for `sendConnectionRequest` catch block

### 3. TokensPage.jsx  
- Transfer tokens: Variable amount
- Add modal for `transferTokens` catch block

### 4. ReceivedRequests.jsx
- Accept connection request: 3 tokens
- Add modal for `acceptConnectionRequest` catch block

### 5. LiveRoom.jsx (if exists)
- Send tokens during live: Variable amount
- Add modal for token sending feature

### 6. Chat/Messages components
- Send tokens during chat: Variable amount
- Add modal for token sending feature

## Backend Token Costs (Already Implemented)

| Action | Cost | Status |
|--------|------|--------|
| Send connection request | 5 tokens | ✅ Implemented |
| Accept connection request | 3 tokens | ✅ Implemented |
| Create live room | 5 tokens | ✅ Implemented |
| Join live room | 5 tokens | ✅ Implemented |
| Transfer tokens | Variable | ✅ Check only |

## Implementation Steps

For each file:

1. Import the modal component
2. Add state: `const [showTopUpModal, setShowTopUpModal] = useState(false);`
3. Update error handling to check for 402 status
4. Add modal JSX with appropriate props
5. Test the flow

## Example Implementation

```javascript
// 1. Import
import InsufficientTokensModal from '../components/InsufficientTokensModal.jsx';

// 2. State
const [showTopUpModal, setShowTopUpModal] = useState(false);

// 3. Error handling
const handleSendRequest = async () => {
  try {
    await sendConnectionRequest({ receiver_id: userId });
    // Success handling
  } catch (err) {
    if (err.status === 402) {
      setShowTopUpModal(true);
    } else {
      setError(err.message);
    }
  }
};

// 4. JSX
<InsufficientTokensModal
  isOpen={showTopUpModal}
  onClose={() => setShowTopUpModal(false)}
  requiredTokens={5}
  action="send a connection request"
/>
```

## Token Cost Messages

- Connection request: "send a connection request"
- Accept request: "accept this connection request"
- Create live: "create a live room"
- Join live: "join this live room"
- Transfer tokens: "transfer tokens"
- Send tokens in chat: "send tokens"
