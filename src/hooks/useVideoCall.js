import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { requestVideoCall } from '../utils/api';

export const useVideoCall = (userId, connectionId, recipientId, externalPeer = null) => {
  const [peer, setPeer] = useState(externalPeer);
  const [call, setCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const localStreamRef = useRef(null);

  const resetCallState = () => {
    setCall(null);
    setIncomingCall(null);
    setRemoteStream(null);
    setIsCallActive(false);
  };

  const attachCallHandlers = (activeCall) => {
    if (!activeCall) return;
    activeCall.on('close', () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      resetCallState();
    });
    activeCall.on('error', () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      resetCallState();
    });
  };

  useEffect(() => {
    if (externalPeer) {
      setPeer(externalPeer);
      
      const handleIncomingCall = (incomingCall) => {
        // Store incoming call; answer only after explicit user action
        setIncomingCall(incomingCall);
      };
      
      externalPeer.on('call', handleIncomingCall);
      
      return () => {
        externalPeer.off('call', handleIncomingCall);
        localStreamRef.current?.getTracks().forEach(track => track.stop());
      };
    }
  }, [externalPeer]);

  const startCall = async (remotePeerId) => {
    try {
      if (!peer) {
        throw new Error('Peer connection not ready. Please wait and try again.');
      }
      
      const result = await requestVideoCall(connectionId, recipientId);
      setTokenBalance(result.new_balance);
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      
      const outgoingCall = peer.call(remotePeerId, stream);
      
      outgoingCall.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        setIsCallActive(true);
      });
      attachCallHandlers(outgoingCall);
      
      setCall(outgoingCall);
      return result;
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      incomingCall.answer(stream);
      
      incomingCall.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        setIsCallActive(true);
      });
      attachCallHandlers(incomingCall);
      
      setCall(incomingCall);
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  };

  const endCall = () => {
    call?.close();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    resetCallState();
  };

  return {
    startCall,
    answerCall,
    endCall,
    isCallActive,
    localStream: localStreamRef.current,
    remoteStream,
    tokenBalance,
    incomingCall
  };
};
