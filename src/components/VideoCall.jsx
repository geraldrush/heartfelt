import { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../hooks/useVideoCall';

const VideoCall = ({
  userId,
  connectionId,
  onClose,
  tokenBalance: initialBalance,
  isIncoming = false,
  messages = [],
  onSendMessage,
  onSendGift,
  giftOptions = [],
  otherUserName = 'Host',
  autoStart = false,
  autoAnswer = false
}) => {
  const { startCall, answerCall, endCall, isCallActive, localStream, remoteStream, tokenBalance, incomingCall } = useVideoCall(userId, connectionId);
  const displayBalance = tokenBalance ?? initialBalance;
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

  useEffect(() => {
    if (isCallActive || isStarting) {
      return;
    }
    if (isIncoming) {
      if (autoAnswer) {
        handleAnswerCall();
      }
      return;
    }
    if (autoStart) {
      handleStartCall();
    }
  }, [autoAnswer, autoStart, incomingCall, isIncoming, isCallActive, isStarting]);

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
      {displayBalance !== null && (
        <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
          🪙 {displayBalance} tokens
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
        <button
          onClick={handleEndCall}
          className="p-3 rounded-full hover:scale-110 transition-transform" style={{ background: 'linear-gradient(135deg, #E74C3C, #2C3E50)' }}
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
          </svg>
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
        <div className="absolute left-4 right-4 bottom-28 z-20 h-[33vh] rounded-2xl bg-black/40 backdrop-blur-sm p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white">
              Live Chat
            </p>
            <span className="text-[11px] text-white/80">with {otherUserName}</span>
          </div>
          <div
            ref={chatListRef}
            className="h-[calc(100%-80px)] overflow-y-auto space-y-2 pr-1 text-sm"
          >
            {messages.length === 0 ? (
              <p className="text-white/60 text-xs">No messages yet.</p>
            ) : (
              messages.slice(-50).map((msg) => {
                const isSender = msg.sender_id === userId;
                return (
                  <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-md ${
                      isSender ? 'text-white' : 'bg-white/20 text-white backdrop-blur-sm'
                    }`}
                    style={isSender ? { background: 'linear-gradient(135deg, #E74C3C, #F39C12)' } : {}}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {giftOptions.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] uppercase tracking-wide text-white/80 mb-1">
                Send a gift
              </p>
              <div className="flex flex-wrap gap-2">
                {giftOptions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => onSendGift?.(amount)}
                    className="rounded-full text-white px-3 py-1.5 text-[11px] font-semibold hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #F39C12, #E74C3C)' }}
                  >
                    🎁 {amount}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-2 text-xs text-white placeholder:text-white/60 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
            />
            <button
              type="button"
              onClick={handleChatSend}
              className="rounded-full text-white px-3 py-2 text-xs font-semibold hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #E74C3C, #F39C12)' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
