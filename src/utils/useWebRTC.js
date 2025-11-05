import { useEffect, useRef, useState, useCallback } from "react";
import { projectId } from "./supabase/info";

interface Participant {
  userId: string;
  username: string;
  isMuted: boolean;
  isDeafened: boolean;
  hasVideo: boolean;
  isSpeaking?: boolean;
}

interface UseWebRTCProps {
  channelId: string;
  accessToken: string;
  currentUserId: string;
  onParticipantsChange?: (participants: Participant[]) => void;
}

export function useWebRTC({
  channelId,
  accessToken,
  currentUserId,
  onParticipantsChange,
}: UseWebRTCProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pollIntervalRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Get local media stream
  const getLocalStream = useCallback(async (video = false) => {
    try {
      console.log("Requesting microphone access with constraints:", {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video ? { width: 1280, height: 720 } : false,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video ? { width: 1280, height: 720 } : false,
      });

      console.log("Successfully obtained media stream with tracks:", stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      localStreamRef.current = stream;

      // Set up audio analysis for speaking detection
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioSource = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      audioSource.connect(analyserRef.current);

      return stream;
    } catch (err: any) {
      console.error("Detailed error getting local stream:", {
        name: err.name,
        message: err.message,
        constraint: err.constraint,
        stack: err.stack
      });
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("PERMISSION_DENIED");
      } else if (err.name === "NotFoundError") {
        setError("NO_DEVICE");
      } else if (err.name === "NotReadableError") {
        setError("DEVICE_IN_USE");
      } else {
        setError("UNKNOWN_ERROR");
      }
      throw err;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(
    (userId: string) => {
      const pc = new RTCPeerConnection(iceServers);

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle incoming tracks
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        remoteStreamsRef.current.set(userId, remoteStream);

        // Create audio element to play remote audio
        let audioElement = audioElementsRef.current.get(userId);
        if (!audioElement) {
          audioElement = new Audio();
          audioElement.autoplay = true;
          audioElementsRef.current.set(userId, audioElement);
        }
        audioElement.srcObject = remoteStream;
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/signal`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  targetUserId: userId,
                  signal: {
                    type: "candidate",
                    candidate: event.candidate,
                  },
                }),
              }
            );
          } catch (err) {
            console.error("Error sending ICE candidate:", err);
          }
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${userId}: ${pc.connectionState}`);
      };

      peerConnectionsRef.current.set(userId, pc);
      return pc;
    },
    [channelId, accessToken]
  );

  // Send offer to peer
  const sendOffer = useCallback(
    async (userId: string) => {
      const pc = createPeerConnection(userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/signal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            targetUserId: userId,
            signal: {
              type: "offer",
              sdp: offer.sdp,
            },
          }),
        }
      );
    },
    [channelId, accessToken, createPeerConnection]
  );

  // Handle received signals
  const handleSignal = useCallback(
    async (signal: any) => {
      const { fromUserId, signal: signalData } = signal;

      if (signalData.type === "offer") {
        const pc = createPeerConnection(fromUserId);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: signalData.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/signal`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              targetUserId: fromUserId,
              signal: {
                type: "answer",
                sdp: answer.sdp,
              },
            }),
          }
        );
      } else if (signalData.type === "answer") {
        const pc = peerConnectionsRef.current.get(fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: signalData.sdp }));
        }
      } else if (signalData.type === "candidate") {
        const pc = peerConnectionsRef.current.get(fromUserId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      }
    },
    [channelId, accessToken, createPeerConnection]
  );

  // Poll for signals and participants
  const pollSignalsAndParticipants = useCallback(async () => {
    try {
      // Fetch signals
      const signalsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/signals`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const signalsData = await signalsRes.json();
      if (signalsData.signals) {
        for (const signal of signalsData.signals) {
          await handleSignal(signal);
        }
      }

      // Fetch participants
      const participantsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/participants`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const participantsData = await participantsRes.json();
      if (participantsData.participants) {
        setParticipants(participantsData.participants);
        onParticipantsChange?.(participantsData.participants);

        // Establish connections with new participants
        for (const participant of participantsData.participants) {
          if (participant.userId !== currentUserId && !peerConnectionsRef.current.has(participant.userId)) {
            // Only send offer if we're the "older" user (to avoid double connections)
            if (currentUserId < participant.userId) {
              await sendOffer(participant.userId);
            }
          }
        }

        // Remove connections for participants who left
        const participantIds = participantsData.participants.map((p: Participant) => p.userId);
        for (const [userId, pc] of peerConnectionsRef.current.entries()) {
          if (!participantIds.includes(userId)) {
            pc.close();
            peerConnectionsRef.current.delete(userId);
            remoteStreamsRef.current.delete(userId);
            const audioElement = audioElementsRef.current.get(userId);
            if (audioElement) {
              audioElement.srcObject = null;
              audioElementsRef.current.delete(userId);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error polling:", err);
    }
  }, [channelId, accessToken, currentUserId, handleSignal, sendOffer, onParticipantsChange]);

  // Join voice channel
  const joinVoiceChannel = useCallback(async () => {
    try {
      setError(null);
      await getLocalStream(hasVideo);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            isMuted,
            isDeafened,
            hasVideo,
          }),
        }
      );

      if (response.ok) {
        setIsConnected(true);
        setError(null);

        // Start polling
        pollSignalsAndParticipants();
        pollIntervalRef.current = window.setInterval(pollSignalsAndParticipants, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to join voice channel");
      }
    } catch (err: any) {
      console.error("Error joining voice channel:", err);
      // Don't override permission errors from getLocalStream
      if (!error) {
        setError(err.message || "Failed to join voice channel");
      }
    }
  }, [channelId, accessToken, isMuted, isDeafened, hasVideo, getLocalStream, pollSignalsAndParticipants, error]);

  // Leave voice channel
  const leaveVoiceChannel = useCallback(async () => {
    try {
      // Stop polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      // Close all peer connections
      for (const [userId, pc] of peerConnectionsRef.current.entries()) {
        pc.close();
      }
      peerConnectionsRef.current.clear();
      remoteStreamsRef.current.clear();

      // Stop audio elements
      for (const [userId, audioElement] of audioElementsRef.current.entries()) {
        audioElement.srcObject = null;
      }
      audioElementsRef.current.clear();

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // Notify server
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/leave`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setIsConnected(false);
    } catch (err) {
      console.error("Error leaving voice channel:", err);
    }
  }, [channelId, accessToken]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !newMuted;
      }
    }

    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/state`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isMuted: newMuted }),
      }
    );
  }, [isMuted, channelId, accessToken]);

  // Toggle deafen
  const toggleDeafen = useCallback(async () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);

    // Mute local audio when deafened
    if (newDeafened) {
      setIsMuted(true);
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
        }
      }
    }

    // Mute/unmute all remote audio elements
    for (const audioElement of audioElementsRef.current.values()) {
      audioElement.muted = newDeafened;
    }

    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/state`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isDeafened: newDeafened, isMuted: newDeafened ? true : isMuted }),
      }
    );
  }, [isDeafened, isMuted, channelId, accessToken]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const newHasVideo = !hasVideo;
    setHasVideo(newHasVideo);

    if (newHasVideo) {
      // Add video track
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
        }

        // Add to all peer connections
        for (const pc of peerConnectionsRef.current.values()) {
          pc.addTrack(videoTrack, localStreamRef.current!);
        }
      } catch (err) {
        console.error("Error enabling video:", err);
        return;
      }
    } else {
      // Remove video track
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach((track) => {
          track.stop();
          localStreamRef.current?.removeTrack(track);
        });
      }
    }

    await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/voice/channels/${channelId}/state`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ hasVideo: newHasVideo }),
      }
    );
  }, [hasVideo, channelId, accessToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveVoiceChannel();
    };
  }, []);

  return {
    isConnected,
    isMuted,
    isDeafened,
    hasVideo,
    participants,
    error,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    localStream: localStreamRef.current,
    remoteStreams: remoteStreamsRef.current,
  };
}
