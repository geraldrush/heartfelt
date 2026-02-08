import { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../hooks/useVideoCall';

const VideoCall = ({ userId, connectionId, remotePeerId, onClose, tokenBalance: initialBalance }) => {
  const { startCall, endCall, isCallActive, localStream, remoteStream, tokenBalance } = useVideoCall(userId, connectionId, remotePeerId);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
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

  const handleStartCall = async () => {
    setIsStarting(true);
    setError(null);
    
    try {
      await startCall(remotePeerId);
    } catch (err) {
      setError(err.message || 'Failed to start call');
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
            onClick={handleStartCall}
            disabled={isStarting}
            className="bg-green-600 text-white px-6 py-3 rounded-full font-semibold disabled:opacity-50"
          >
            {isStarting ? 'Starting...' : 'Start Call'}
          </button>
        )}
        <button
          onClick={handleEndCall}
          className="bg-red-600 text-white px-6 py-3 rounded-full font-semibold"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
