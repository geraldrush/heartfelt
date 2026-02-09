import { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../hooks/useVideoCall';

const VideoCall = ({ userId, connectionId, remotePeerId, onClose, tokenBalance: initialBalance, peer, isIncoming = false }) => {
  const { startCall, answerCall, endCall, isCallActive, localStream, remoteStream, tokenBalance, incomingCall } = useVideoCall(userId, connectionId, remotePeerId, peer);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const requestPermissions = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      const message =
        err?.name === 'NotAllowedError'
          ? 'Camera and microphone permission denied. Please allow access in your browser settings and try again.'
          : err?.name === 'NotFoundError'
          ? 'No camera or microphone found on this device.'
          : err?.message || 'Unable to access camera or microphone.';
      setPermissionError(message);
      return false;
    }
  };

  const handleStartCall = async () => {
    setIsStarting(true);
    setError(null);
    const granted = await requestPermissions();
    if (!granted) {
      setIsStarting(false);
      return;
    }
    
    try {
      await startCall(remotePeerId);
    } catch (err) {
      setError(err.message || 'Failed to start call');
    } finally {
      setIsStarting(false);
    }
  };

  const handleAnswerCall = async () => {
    setIsStarting(true);
    setError(null);
    const granted = await requestPermissions();
    if (!granted) {
      setIsStarting(false);
      return;
    }
    try {
      await answerCall();
    } catch (err) {
      setError(err.message || 'Failed to answer call');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndCall = () => {
    endCall();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Remote video (full screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      
      {/* Local video (small corner) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-4 right-4 w-32 h-48 rounded-lg shadow-lg object-cover"
      />
      
      {/* Token balance */}
      {tokenBalance !== null && (
        <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
          🪙 {tokenBalance} tokens
        </div>
      )}
      
      {/* Permission message */}
      {permissionError && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white px-6 py-3 rounded-lg text-center max-w-sm">
          {permissionError}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        {!isCallActive && (
          <button
            onClick={isIncoming || incomingCall ? handleAnswerCall : handleStartCall}
            disabled={isStarting || (isIncoming && !incomingCall)}
            className="bg-green-600 text-white px-6 py-3 rounded-full font-semibold disabled:opacity-50"
          >
            {isStarting ? 'Starting...' : (isIncoming || incomingCall) ? 'Answer Call' : 'Start Call'}
          </button>
        )}
        <button
          onClick={handleEndCall}
          className="bg-red-600 text-white px-6 py-3 rounded-full font-semibold"
        >
          End Call
        </button>
      </div>
      
      {isIncoming && !incomingCall && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-xs">
          Waiting for caller to connect…
        </div>
      )}
    </div>
  );
};

export default VideoCall;
