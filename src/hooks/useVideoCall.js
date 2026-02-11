import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, createLocalTracks } from 'livekit-client';
import { requestLiveKitToken } from '../utils/api';

export const useVideoCall = (userId, connectionId) => {
  const roomRef = useRef(null);
  const localTracksRef = useRef([]);
  const remoteStreamRef = useRef(new MediaStream());
  const [incomingCall, setIncomingCall] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);

  const resetCallState = () => {
    setIncomingCall(false);
    setIsCallActive(false);
    setRemoteStream(null);
    setLocalStream(null);
  };

  const stopLocalTracks = () => {
    localTracksRef.current.forEach((track) => track.stop());
    localTracksRef.current = [];
  };

  const disconnectRoom = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
  };

  const cleanupRoom = () => {
    stopLocalTracks();
    disconnectRoom();
    remoteStreamRef.current = new MediaStream();
    resetCallState();
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
        setIncomingCall(true);
        setIsCallActive(true);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        remoteStreamRef.current.removeTrack(track.mediaStreamTrack);
        syncRemoteStream();
      }
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      setIncomingCall(true);
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      if (room.remoteParticipants.size === 0) {
        setIncomingCall(false);
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      cleanupRoom();
    });
  };

  const connectToRoom = async () => {
    if (roomRef.current) {
      return roomRef.current;
    }

    if (!connectionId) {
      throw new Error('Missing connection ID.');
    }

    const { token, url } = await requestLiveKitToken({
      room_id: connectionId,
      room_type: 'connection',
      name: userId ? `user-${userId}` : undefined
    });

    const room = new Room({ adaptiveStream: true, dynacast: true });
    attachRoomHandlers(room);
    await room.connect(url, token);
    roomRef.current = room;
    return room;
  };

  const startCall = async () => {
    try {
      const room = await connectToRoom();
      const tracks = await createLocalTracks({ audio: true, video: true });
      localTracksRef.current = tracks;
      tracks.forEach((track) => room.localParticipant.publishTrack(track));
      setLocalStream(new MediaStream(tracks.map((track) => track.mediaStreamTrack)));
      setIsCallActive(true);
      return null;
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  };

  const answerCall = async () => {
    try {
      const room = await connectToRoom();
      const tracks = await createLocalTracks({ audio: true, video: true });
      localTracksRef.current = tracks;
      tracks.forEach((track) => room.localParticipant.publishTrack(track));
      setLocalStream(new MediaStream(tracks.map((track) => track.mediaStreamTrack)));
      setIsCallActive(true);
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  };

  const endCall = () => {
    cleanupRoom();
  };

  useEffect(() => {
    return () => {
      cleanupRoom();
    };
  }, []);

  return {
    startCall,
    answerCall,
    endCall,
    isCallActive,
    localStream,
    remoteStream,
    tokenBalance,
    incomingCall
  };
};
