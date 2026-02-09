import { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../hooks/useVideoCall';

const VideoCall = ({
  userId,
  connectionId,
  remotePeerId,
  onClose,
  tokenBalance: initialBalance,
  peer,
  isIncoming = false,
  messages = [],
  onSendMessage,
  onSendGift,
  giftOptions = [],
  otherUserName = 'Host'
}) => {
  const { startCall, answerCall, endCall, isCallActive, localStream, remoteStream, tokenBalance, incomingCall } = useVideoCall(userId, connectionId, remotePeerId, peer);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [showChat, setShowChat] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const chatListRef = useRef(null);
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

  useEffect(() => {
    if (showChat && chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages, showChat]);

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

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    onSendMessage?.(chatInput.trim());
    setChatInput('');
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

      {/* Live Chat Overlay */}
      <div className="absolute right-4 top-4 z-20">
        <button
          type="button"
          onClick={() => setShowChat((prev) => !prev)}
          className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow"
        >
          {showChat ? 'Hide Chat' : 'Show Chat'}
        </button>
      </div>

      {showChat && (
        <div className="absolute right-4 bottom-28 top-16 z-20 w-[min(320px,80vw)] rounded-2xl bg-black/60 p-3 text-white backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Live Chat
            </p>
            <span className="text-[11px] text-white/60">with {otherUserName}</span>
          </div>
          <div
            ref={chatListRef}
            className="h-[45vh] overflow-y-auto space-y-2 pr-1 text-sm"
          >
            {messages.length === 0 ? (
              <p className="text-white/60 text-xs">No messages yet.</p>
            ) : (
              messages.slice(-50).map((msg) => {
                const isSender = msg.sender_id === userId;
                return (
                  <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                      isSender ? 'bg-emerald-500/90' : 'bg-white/10'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/60 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
            />
            <button
              type="button"
              onClick={handleChatSend}
              className="rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800"
            >
              Send
            </button>
          </div>

          {giftOptions.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wide text-white/60 mb-2">
                Send a gift
              </p>
              <div className="flex flex-wrap gap-2">
                {giftOptions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => onSendGift?.(amount)}
                    className="rounded-full bg-amber-400/90 px-3 py-1.5 text-[11px] font-semibold text-slate-900"
                  >
                    🎁 {amount}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoCall;
