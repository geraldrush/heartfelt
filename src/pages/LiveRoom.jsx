import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Room, RoomEvent, Track, createLocalTracks } from 'livekit-client';
import { getLiveRoom, joinLiveRoom, leaveLiveRoom, transferTokens, requestLiveKitToken } from '../utils/api.js';
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
  const [joinInProgress, setJoinInProgress] = useState(false);
  const [livekitUnavailable, setLivekitUnavailable] = useState(false);

  const roomRef = useRef(null);
  const localTracksRef = useRef([]);
  const remoteStreamRef = useRef(new MediaStream());
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatListRef = useRef(null);

  const isHost = room?.host_id === user?.id;

  const { sendMessage } = useWebSocket({
    connectionId: (isHost || hasJoined) ? roomId : null,
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
    if (!roomId) return;
    const interval = setInterval(async () => {
      try {
        const data = await getLiveRoom(roomId);
        setViewerCount(data.room?.viewer_count ?? 0);
      } catch {
        // ignore refresh errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    setMessages([]);
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

  const stopLocalTracks = () => {
    localTracksRef.current.forEach((track) => track.stop());
    localTracksRef.current = [];
  };

  const getIceTransportPolicy = () => {
    if (typeof navigator === 'undefined') return 'all';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return 'all';
    const isCellular = conn.type === 'cellular';
    const slowTypes = ['slow-2g', '2g', '3g', '4g'];
    const isSlow = slowTypes.includes(conn.effectiveType);
    return (isCellular || isSlow) ? 'relay' : 'all';
  };

  const disconnectLiveKit = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    remoteStreamRef.current = new MediaStream();
    setRemoteStream(null);
  };

  const syncRemoteStream = () => {
    const tracks = remoteStreamRef.current.getTracks();
    if (tracks.length === 0) {
      setRemoteStream(null);
      return;
    }
    setRemoteStream(new MediaStream(tracks));
  };

  const attachRoomHandlers = (room) => {
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        remoteStreamRef.current.addTrack(track.mediaStreamTrack);
        syncRemoteStream();
        if (!isHost) {
          setIsLive(true);
        }
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        remoteStreamRef.current.removeTrack(track.mediaStreamTrack);
        syncRemoteStream();
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      stopLocalTracks();
      disconnectLiveKit();
      setIsLive(false);
    });
  };

  const connectLiveKit = async () => {
    if (roomRef.current) {
      return roomRef.current;
    }
    if (livekitUnavailable) {
      throw new Error('Live video is temporarily unavailable. Please try again later.');
    }
    let tokenResponse;
    try {
      tokenResponse = await requestLiveKitToken({
        room_id: roomId,
        room_type: 'live',
        name: user?.full_name || (user?.id ? `user-${user.id}` : undefined)
      });
    } catch (err) {
      if (err?.message === 'LiveKit not configured') {
        setLivekitUnavailable(true);
        throw new Error('Live video is temporarily unavailable. Please try again later.');
      }
      throw err;
    }
    const { token, url } = tokenResponse;
    if (typeof token !== 'string') {
      throw new Error('Invalid LiveKit token');
    }
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      rtcConfig: { iceTransportPolicy: getIceTransportPolicy() }
    });
    attachRoomHandlers(room);
    if (typeof room.prepareConnection === 'function') {
      await room.prepareConnection(url, token);
    }
    await room.connect(url, token, { autoSubscribe: true });
    roomRef.current = room;
    return room;
  };

  const handleStartLive = async () => {
    try {
      if (livekitUnavailable) {
        setError('Live video is temporarily unavailable. Please try again later.');
        return;
      }
      const room = await connectLiveKit();
      const tracks = await createLocalTracks({ audio: true, video: true });
      localTracksRef.current = tracks;
      tracks.forEach((track) => room.localParticipant.publishTrack(track));
      setLocalStream(new MediaStream(tracks.map((track) => track.mediaStreamTrack)));
      setIsLive(true);
    } catch (err) {
      setError(err.message || 'Camera permission required to go live.');
    }
  };

  const handleJoinLive = async () => {
    if (isHost || joinInProgress) return;
    setJoinInProgress(true);
    try {
      if (livekitUnavailable) {
        setError('Live video is temporarily unavailable. Please try again later.');
        return;
      }
      if (!hasJoined) {
        const joinResult = await joinLiveRoom(roomId);
        if (joinResult?.success) {
          setHasJoined(true);
        }
      }
      await connectLiveKit();
    } catch (err) {
      console.error('Join live error:', err);
      setError(err.message || 'Unable to join live stream.');
      setHasJoined(false);
    } finally {
      setJoinInProgress(false);
    }
  };

  useEffect(() => {
    if (isHost) return;
    if (!hasJoined) return;
    connectLiveKit().catch((err) => {
      console.error('LiveKit connect error:', err);
      setError(err?.message || 'Unable to connect to live stream.');
    });
  }, [isHost, hasJoined]);

  useEffect(() => {
    return () => {
      stopLocalTracks();
      disconnectLiveKit();
    };
  }, []);

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
    stopLocalTracks();
    disconnectLiveKit();
    navigate('/live');
  };

  const handleCloseRoom = async () => {
    try {
      await leaveLiveRoom(roomId);
    } catch {}
    stopLocalTracks();
    disconnectLiveKit();
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
        {isHost ? (
          <button
            type="button"
            onClick={handleCloseRoom}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #E74C3C, #2C3E50)' }}
          >
            Close room
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold"
          >
            Back
          </button>
        )}
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
            className="premium-button disabled:opacity-60"
            disabled={livekitUnavailable}
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
            className="rounded-full text-white px-8 py-4 text-lg font-bold hover:scale-105 transition-transform cursor-pointer disabled:opacity-60"
            disabled={livekitUnavailable}
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
        </div>
      )}
    </div>
  );
};

export default LiveRoom;
