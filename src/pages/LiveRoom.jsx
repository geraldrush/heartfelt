import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Peer from 'peerjs';
import { getLiveRoom, joinLiveRoom, leaveLiveRoom, getMessages, transferTokens } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const giftOptions = [5, 10, 20, 50];

const LiveRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinRequested, setJoinRequested] = useState(false);
  const [joinInProgress, setJoinInProgress] = useState(false);
  const [peerReady, setPeerReady] = useState(false);

  const peerRef = useRef(null);
  const peerRoleRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatListRef = useRef(null);

  const isHost = room?.host_id === user?.id;
  const hostPeerId = room?.host_id;

  const { sendMessage } = useWebSocket({
    connectionId: roomId,
    onMessage: (data) => {
      setMessages((prev) => [...prev, data]);
    }
  });

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const data = await getLiveRoom(roomId);
        setRoom(data.room);
        setViewerCount(data.room?.viewer_count ?? 0);
        if (data.room?.host_id !== user?.id) {
          const joinResult = await joinLiveRoom(roomId);
          if (joinResult.success) {
            setHasJoined(true);
          }
        }
      } catch (err) {
        setError(err.message || 'Unable to load live room.');
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [roomId, user?.id]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await getMessages(roomId, { limit: 50, offset: 0 });
        const ordered = [...(data.messages || [])].reverse();
        setMessages(ordered);
      } catch (err) {
        // ignore
      }
    };
    if (roomId) {
      loadMessages();
    }
  }, [roomId]);

  useEffect(() => {
    if (showChat && chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages, showChat]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    if (localStream) {
      localStreamRef.current = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      const playAttempt = remoteVideoRef.current.play();
      if (playAttempt?.catch) {
        playAttempt.catch((err) => {
          console.warn('[Live] Remote video autoplay blocked:', err);
        });
      }
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!user?.id || !room?.host_id) return;

    const desiredRole = isHost ? 'host' : 'viewer';
    if (peerRef.current && peerRoleRef.current === desiredRole) {
      return;
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
      setPeerReady(false);
    }

    const peer = new Peer(isHost ? user.id : undefined, {
      host: '0.peerjs.com',
      secure: true,
      port: 443,
      path: '/',
      debug: 2
    });

    peer.on('open', () => {
      peerRef.current = peer;
      peerRoleRef.current = desiredRole;
      setPeerReady(true);
      console.log('[Live] Peer open:', peer.id, 'role:', desiredRole);
    });
    peer.on('error', (err) => {
      console.error('[Live] Peer error:', err);
      setError(err?.message || 'Peer connection error.');
    });
    peer.on('disconnected', () => {
      console.warn('[Live] Peer disconnected');
      setPeerReady(false);
    });
    peer.on('close', () => {
      console.warn('[Live] Peer closed');
      setPeerReady(false);
    });

    if (isHost) {
      peer.on('call', async (incoming) => {
        console.log('[Live] Incoming call from:', incoming.peer);
        try {
          let stream = localStreamRef.current;
          if (!stream) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            localStreamRef.current = stream;
          }
          incoming.answer(stream);
          setIsLive(true);
        } catch (err) {
          console.error('Failed to answer viewer call:', err);
        }
      });
    } else {
      peer.on('call', (incoming) => {
        console.log('[Live] Incoming host stream');
        incoming.answer(new MediaStream());
        incoming.on('stream', (stream) => {
          setRemoteStream(stream);
        });
        incoming.on('error', (err) => {
          console.error('[Live] Incoming call error:', err);
          setError(err?.message || 'Live stream error.');
        });
      });
    }

    return () => {
      peer.destroy();
      peerRef.current = null;
      setPeerReady(false);
    };
  }, [user?.id, room?.host_id, isHost]);

  const handleStartLive = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsLive(true);
    } catch (err) {
      setError(err.message || 'Camera permission required to go live.');
    }
  };

  const attemptJoinHost = useCallback(() => {
    if (isHost || joinInProgress) return;
    if (!hostPeerId) {
      setError('Host is not ready yet.');
      return;
    }
    if (!peerReady || !peerRef.current) {
      return;
    }
    try {
      setJoinInProgress(true);
      setHasJoined(true);
      const emptyStream = new MediaStream();
      const call = peerRef.current.call(hostPeerId, emptyStream);
      call.on('stream', (stream) => {
        setRemoteStream(stream);
        setJoinInProgress(false);
      });
      call.on('error', (err) => {
        console.error('Join live error:', err);
        setError(err?.message || 'Unable to join live stream.');
        setHasJoined(false);
        setJoinInProgress(false);
      });
      call.on('close', () => {
        setJoinInProgress(false);
      });
      window.setTimeout(() => {
        if (!remoteStream && joinRequested && peerRef.current) {
          try {
            console.warn('[Live] Retrying peer call...');
            const retryCall = peerRef.current.call(hostPeerId, new MediaStream());
            retryCall.on('stream', (stream) => setRemoteStream(stream));
          } catch (err) {
            console.error('[Live] Retry call failed:', err);
          }
        }
      }, 4000);
    } catch (err) {
      console.error('Join live error:', err);
      setError(err.message || 'Unable to join live stream.');
      setHasJoined(false);
      setJoinInProgress(false);
    }
  }, [hostPeerId, isHost, joinInProgress, peerReady, remoteStream, joinRequested]);

  useEffect(() => {
    if (joinRequested && peerReady) {
      attemptJoinHost();
    }
  }, [joinRequested, peerReady, attemptJoinHost]);

  const handleJoinLive = () => {
    setJoinRequested(true);
    attemptJoinHost();
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const content = chatInput.trim();
    const tempId = crypto.randomUUID();
    
    // Add message to UI immediately
    const newMessage = {
      id: tempId,
      sender_id: user?.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    
    // Send via WebSocket
    sendMessage(content, tempId);
    setChatInput('');
  };

  const handleSendGift = async (amount) => {
    if (!room?.host_id) return;
    try {
      await transferTokens({ recipient_id: room.host_id, amount, message: 'Live gift' });
      const tempId = crypto.randomUUID();
      const giftMessage = `🎁 ${user?.full_name || 'Viewer'} sent ${amount} tokens`;
      sendMessage(giftMessage, tempId);
    } catch (err) {
      setError(err.message || 'Failed to send gift.');
    }
  };

  const handleLeave = async () => {
    try {
      await leaveLiveRoom(roomId);
    } catch {}
    navigate('/live');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <LoadingSpinner label="Loading live room..." />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white">
      <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={handleLeave}
          className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold"
        >
          Back
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Live Room</p>
          <p className="text-sm font-semibold">{room?.title}</p>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
          👥 {viewerCount}
        </span>
        <button
          type="button"
          onClick={() => setShowChat((prev) => !prev)}
          className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800"
        >
          {showChat ? 'Hide Chat' : 'Show Chat'}
        </button>
      </div>

      {error && (
        <div className="absolute top-20 left-1/2 z-30 -translate-x-1/2 rounded-full bg-red-600 px-4 py-2 text-xs">
          {error}
        </div>
      )}

      <video
        ref={isHost ? localVideoRef : remoteVideoRef}
        autoPlay
        playsInline
        muted={isHost}
        className="h-full w-full object-cover"
      />

      {isHost && !isLive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <button
            type="button"
            onClick={handleStartLive}
            className="premium-button"
          >
            Start Live
          </button>
        </div>
      )}

      {!isHost && !hasJoined && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40">
          <button
            type="button"
            onClick={handleJoinLive}
            className="rounded-full text-white px-8 py-4 text-lg font-bold hover:scale-105 transition-transform cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #27AE60, #F39C12)' }}
          >
            Join Live
          </button>
        </div>
      )}

      {showChat && (
        <div className="absolute left-4 right-4 bottom-8 z-20 h-[33vh] rounded-2xl bg-black/40 backdrop-blur-sm p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white">
              Live Chat
            </p>
            <span className="text-[11px] text-white/80">{room?.title}</span>
          </div>
          <div
            ref={chatListRef}
            className="h-[calc(100%-80px)] overflow-y-auto space-y-2 pr-1 text-sm"
          >
            {messages.length === 0 ? (
              <p className="text-white/60 text-xs">Be the first to say hi.</p>
            ) : (
              messages.slice(-50).map((msg) => {
                const isSender = msg.sender_id === user?.id;
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

          <div className="mt-2 flex items-center gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-2 text-xs text-white placeholder:text-white/60 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
            />
            <button
              type="button"
              onClick={handleSendChat}
              className="rounded-full text-white px-3 py-2 text-xs font-semibold hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #E74C3C, #F39C12)' }}
            >
              Send
            </button>
          </div>

          {!isHost && (
            <div className="mt-2">
              <p className="text-[11px] uppercase tracking-wide text-white/80 mb-1">
                Send a gift
              </p>
              <div className="flex flex-wrap gap-2">
                {giftOptions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleSendGift(amount)}
                    className="rounded-full text-white px-3 py-1.5 text-[11px] font-semibold hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #F39C12, #E74C3C)' }}
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

export default LiveRoom;
