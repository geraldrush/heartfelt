# Video Call Fix - Caller Can't See Video

## Issues Found and Fixed

### 1. **Undefined Parameter Bug** (CRITICAL)
**Location:** `src/components/VideoCall.jsx` line 86
**Problem:** `startCall(remotePeerId)` was called with undefined `remotePeerId` variable
**Fix:** Changed to `startCall()` - no parameter needed

### 2. **useEffect Hook Order Issue**
**Location:** `src/components/VideoCall.jsx` lines 46-58
**Problem:** useEffect was trying to call `handleStartCall()` and `handleAnswerCall()` before they were defined
**Fix:** Moved function definitions before the useEffect hook

### 3. **Missing Error Logging**
**Problem:** Errors were caught but not logged to console, making debugging difficult
**Fix:** Added comprehensive console.error logging in both UI and hook

### 4. **No Visual Feedback During Connection**
**Problem:** Users couldn't tell if the call was connecting or stuck
**Fix:** Added loading spinner with "Connecting..." message

### 5. **Added Debug Logging**
**Location:** `src/hooks/useVideoCall.js` and `src/components/VideoCall.jsx`
**Purpose:** Track the entire video call flow:
- Room connection
- Track creation
- Track publishing
- Stream attachment to video elements

## How to Test

1. Open browser console (F12)
2. Start a video call
3. Look for these log messages:
   ```
   [VideoCall UI] handleStartCall triggered
   [VideoCall UI] Calling startCall...
   [VideoCall] Starting call...
   [VideoCall] Room connected, creating local tracks...
   [VideoCall] Local tracks created: 2
   [VideoCall] Publishing track: video
   [VideoCall] Publishing track: audio
   [VideoCall] Local stream created with tracks: 2
   [VideoCall] Call started successfully
   [VideoCall UI] Attaching local stream to video element
   ```

4. If you see errors, they will now be clearly logged with context

## Root Cause

The main issue was the undefined `remotePeerId` parameter causing the `startCall()` function to fail silently. This prevented the caller's local video tracks from being created and published to the LiveKit room.

## Backend Configuration

Verified that LiveKit is properly configured in `backend/.dev.vars`:
- ✅ LIVEKIT_API_KEY
- ✅ LIVEKIT_API_SECRET  
- ✅ LIVEKIT_URL

## Next Steps

If video still doesn't show after these fixes:
1. Check browser console for the new debug logs
2. Verify camera/microphone permissions are granted
3. Check LiveKit server status at https://live.afrodate.co.za
4. Test with different browsers (Chrome, Firefox, Safari)
5. Check network connectivity (firewall, NAT, etc.)
