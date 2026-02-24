import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/shared/api/ws";

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isMuted: boolean;
  isSpeaker: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * Manages WebRTC PeerConnection lifecycle for voice calls.
 * Handles offer/answer/ICE exchange through Socket.IO.
 */
export function useWebRTC(callId: string | null) {
  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isConnected: false,
    isMuted: false,
    isSpeaker: false,
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  /** Create PeerConnection and set up event handlers */
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const socket = getSocket();

    pc.onicecandidate = (event) => {
      if (event.candidate && callId) {
        socket?.emit("call:ice-candidate", {
          callId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setState((prev) => ({ ...prev, remoteStream }));
      }
    };

    pc.onconnectionstatechange = () => {
      const connected =
        pc.connectionState === "connected" || pc.iceConnectionState === "connected";
      setState((prev) => ({ ...prev, isConnected: connected }));
    };

    pcRef.current = pc;
    return pc;
  }, [callId]);

  /** Start local audio and connect */
  const connect = useCallback(async () => {
    const socket = getSocket();
    if (!socket || !callId) return;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn("[WebRTC] mediaDevices not available (requires HTTPS)");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, localStream: stream }));

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Listen for remote offer
      socket.on("call:offer", async (data: { sdp: RTCSessionDescriptionInit }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:answer", { callId, sdp: answer });
      });

      // Listen for ICE candidates from remote
      socket.on("call:ice-candidate", async (data: { candidate: RTCIceCandidateInit }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("[WebRTC] Failed to add ICE candidate:", err);
        }
      });
    } catch (err) {
      console.error("[WebRTC] Failed to get user media:", err);
    }
  }, [callId, createPeerConnection]);

  /** Disconnect and clean up */
  const disconnect = useCallback(() => {
    const socket = getSocket();
    socket?.off("call:offer");
    socket?.off("call:ice-candidate");

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    setState({
      localStream: null,
      remoteStream: null,
      isConnected: false,
      isMuted: false,
      isSpeaker: false,
    });
  }, []);

  /** Toggle mute */
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
    }
  }, []);

  /** Toggle speaker (no-op on web, just state) */
  const toggleSpeaker = useCallback(() => {
    setState((prev) => ({ ...prev, isSpeaker: !prev.isSpeaker }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    toggleMute,
    toggleSpeaker,
  };
}
