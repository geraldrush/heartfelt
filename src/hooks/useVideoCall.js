import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { requestVideoCall } from '../utils/api';

export const useVideoCall = (userId, connectionId, recipientId) => {
  const [peer, setPeer] = useState(null);
  const [call, setCall] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    const newPeer = new Peer(userId, {
      host: 'peerjs-server.herokuapp.com',
      secure: true,
      port: 443
    });

    newPeer.on('open', () => {
      console.log('Peer connected:', userId);
      setPeer(newPeer);
    });

    newPeer.on('call', (incomingCall) => {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStreamRef.current = stream;
          incomingCall.answer(stream);
          
          incomingCall.on('stream', (remoteStream) => {
            setRemoteStream(remoteStream);
            setIsCallActive(true);
          });
          
          setCall(incomingCall);
        });
    });

    return () => {
      newPeer?.destroy();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [userId]);

  const startCall = async (remotePeerId) => {
    try {
      const result = await requestVideoCall(connectionId, recipientId);
      setTokenBalance(result.new_balance);
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      
      const outgoingCall = peer.call(remotePeerId, stream);
      
      outgoingCall.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        setIsCallActive(true);
      });
      
      setCall(outgoingCall);
      return result;
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  };

  const endCall = () => {
    call?.close();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    setCall(null);
    setRemoteStream(null);
    setIsCallActive(false);
  };

  return {
    startCall,
    endCall,
    isCallActive,
    localStream: localStreamRef.current,
    remoteStream,
    tokenBalance
  };
};
