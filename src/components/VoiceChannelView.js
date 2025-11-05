import { Volume2, Mic, MicOff, Headphones, VolumeX, Video, VideoOff, Monitor, MonitorOff, PhoneOff } from "lucide-react";
import { useWebRTC } from "../utils/useWebRTC";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

interface VoiceChannelViewProps {
  channelId: string;
  channelName: string;
  accessToken: string;
  currentUserId: string;
  currentUsername: string;
}

export function VoiceChannelView({
  channelId,
  channelName,
  accessToken,
  currentUserId,
  currentUsername,
}: VoiceChannelViewProps) {
  const [participants, setParticipants] = useState<any[]>([]);

  const {
    isConnected,
    isMuted,
    isDeafened,
    hasVideo,
    error,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    localStream,
    remoteStreams,
  } = useWebRTC({
    channelId,
    accessToken,
    currentUserId,
    onParticipantsChange: setParticipants,
  });

  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [isWebRTCSupported, setIsWebRTCSupported] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>("");

  // Check WebRTC support
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsWebRTCSupported(false);
    }
  }, []);

  // Check microphone permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        let info = `Browser: ${navigator.userAgent.split(' ').slice(-2).join(' ')}\n`;
        info += `Protocol: ${window.location.protocol}\n`;
        
        // Check if permissions API is available
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            info += `Permission API State: ${result.state}\n`;
            setPermissionStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'unknown');
            
            // Listen for permission changes
            result.onchange = () => {
              setPermissionStatus(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'unknown');
            };
          } catch (permErr) {
            info += `Permission API Error: ${permErr}\n`;
          }
        } else {
          info += `Permission API: Not available\n`;
        }
        
        // Check for devices
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(d => d.kind === 'audioinput');
          info += `Audio Input Devices: ${audioInputs.length}\n`;
          audioInputs.forEach((device, i) => {
            info += `  ${i + 1}. ${device.label || 'Unnamed device'}\n`;
          });
        }
        
        setDiagnosticInfo(info);
        console.log("Voice Chat Diagnostics:\n" + info);
      } catch (err) {
        // Permissions API not available or not supported for microphone
        console.log("Permissions API not available:", err);
      }
    };
    
    checkPermission();
  }, []);

  // Request permission explicitly
  const requestPermission = async () => {
    setIsCheckingPermission(true);
    setIsJoining(true);
    try {
      console.log("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone permission granted, tracks:", stream.getTracks().map(t => t.label));
      // Stop the stream immediately - we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus("granted");
      // Now join the channel
      await joinVoiceChannel();
    } catch (err: any) {
      console.error("Permission request failed:", {
        name: err.name,
        message: err.message,
        constraint: err.constraint
      });
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionStatus("denied");
      }
    } finally {
      setIsCheckingPermission(false);
      setIsJoining(false);
    }
  };

  const handleJoinVoice = async () => {
    setIsJoining(true);
    try {
      await joinVoiceChannel();
    } finally {
      setIsJoining(false);
    }
  };

  // Detect speaking based on audio levels
  useEffect(() => {
    if (!isConnected || !localStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const source = audioContext.createMediaStreamSource(localStream);
    source.connect(analyser);

    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      if (average > 20 && !isMuted) {
        setSpeakingUsers((prev) => new Set(prev).add(currentUserId));
      } else {
        setSpeakingUsers((prev) => {
          const next = new Set(prev);
          next.delete(currentUserId);
          return next;
        });
      }
    };

    const interval = setInterval(checkAudioLevel, 100);

    return () => {
      clearInterval(interval);
      audioContext.close();
    };
  }, [isConnected, localStream, isMuted, currentUserId]);

  return (
    <div className="flex-1 flex flex-col bg-[#313338]">
      {/* Header */}
      <div className="h-12 px-4 flex items-center shadow-md border-b border-[#26272b]">
        <Volume2 className="w-6 h-6 text-[#80848e] mr-2" />
        <span className="text-white">{channelName}</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {!isConnected ? (
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-[#404249] flex items-center justify-center mx-auto mb-4">
              <Volume2 className="w-10 h-10 text-[#b5bac1]" />
            </div>
            <h3 className="text-white text-xl mb-2">Voice Channel</h3>
            <p className="text-[#b5bac1] mb-6">
              Join the voice channel to start talking with others
            </p>
            
            {!isWebRTCSupported && (
              <div className="mb-6 p-4 bg-[#ed4245] bg-opacity-10 border border-[#ed4245] rounded-lg">
                <p className="text-[#ed4245] mb-2">Voice Chat Not Supported</p>
                <p className="text-[#b5bac1] text-sm">
                  Your browser doesn't support WebRTC voice chat. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
                </p>
              </div>
            )}
            
            {permissionStatus === "denied" && (
              <div className="mb-6 p-4 bg-[#ed4245] bg-opacity-10 border border-[#ed4245] rounded-lg">
                <p className="text-[#ed4245] mb-2">Microphone Access Denied</p>
                <p className="text-[#b5bac1] text-sm mb-3">
                  You've blocked microphone access. To use voice chat:
                </p>
                <ol className="text-left text-[#b5bac1] text-sm space-y-1 mb-3">
                  <li>1. Click the lock/info icon in your browser's address bar</li>
                  <li>2. Find "Microphone" permissions</li>
                  <li>3. Change it to "Allow"</li>
                  <li>4. Refresh the page</li>
                </ol>
                <Button
                  onClick={() => setPermissionStatus("unknown")}
                  variant="outline"
                  className="mt-2 bg-[#404249] hover:bg-[#4f545c] text-white border-[#404249]"
                  size="sm"
                >
                  I've already granted permission - try again
                </Button>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-4 bg-[#ed4245] bg-opacity-10 border border-[#ed4245] rounded-lg">
                <p className="text-[#ed4245] mb-2">
                  {error === "PERMISSION_DENIED" && "Microphone Permission Blocked"}
                  {error === "NO_DEVICE" && "No Microphone Found"}
                  {error === "DEVICE_IN_USE" && "Microphone Already In Use"}
                  {error === "UNKNOWN_ERROR" && "Voice Chat Error"}
                </p>
                <p className="text-[#b5bac1] text-sm mb-3">
                  {error === "PERMISSION_DENIED" && "Your browser is blocking microphone access. Try these steps:"}
                  {error === "NO_DEVICE" && "No microphone was detected. Please connect a microphone and try again."}
                  {error === "DEVICE_IN_USE" && "Your microphone is being used by another application. Please close other apps using your microphone."}
                  {error === "UNKNOWN_ERROR" && "An unexpected error occurred while accessing your microphone."}
                </p>
                {error === "PERMISSION_DENIED" && (
                  <ol className="text-left text-[#b5bac1] text-sm space-y-1 mb-3 list-decimal list-inside">
                    <li>Click the lock/camera icon in your browser's address bar</li>
                    <li>Set Microphone to "Allow"</li>
                    <li>Refresh the page completely (Ctrl+Shift+R or Cmd+Shift+R)</li>
                    <li>If that doesn't work, try a different browser or incognito/private mode</li>
                  </ol>
                )}
                <Button
                  onClick={() => {
                    setPermissionStatus("unknown");
                    // Force a complete reload to reset permission state
                    window.location.reload();
                  }}
                  variant="outline"
                  className="mt-2 bg-[#404249] hover:bg-[#4f545c] text-white border-[#404249]"
                  size="sm"
                >
                  Refresh Page
                </Button>
              </div>
            )}
            
            {permissionStatus === "granted" && (
              <p className="text-[#3ba55d] text-sm mb-4 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3ba55d]"></span>
                Microphone access granted
              </p>
            )}
            
            <Button
              onClick={permissionStatus === "granted" ? handleJoinVoice : requestPermission}
              disabled={isJoining || isCheckingPermission || !isWebRTCSupported}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Joining...
                </span>
              ) : isCheckingPermission ? (
                "Checking..."
              ) : !isWebRTCSupported ? (
                "Not Supported"
              ) : (
                "Join Voice"
              )}
            </Button>
            
            {permissionStatus === "unknown" && (
              <p className="text-[#949ba4] text-xs mt-4">
                You'll be asked to allow microphone access
              </p>
            )}
            
            {typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && (
              <div className="mt-4 p-3 bg-[#faa81a] bg-opacity-10 border border-[#faa81a] rounded">
                <p className="text-[#faa81a] text-xs">
                  ⚠️ Voice chat requires HTTPS. It may not work on HTTP connections.
                </p>
              </div>
            )}
            
            {diagnosticInfo && (
              <details className="mt-4 text-left">
                <summary className="text-[#949ba4] text-xs cursor-pointer hover:text-white">
                  Show diagnostic information
                </summary>
                <pre className="mt-2 p-3 bg-[#1e1f22] rounded text-[#b5bac1] text-xs overflow-auto">
                  {diagnosticInfo}
                </pre>
              </details>
            )}
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            {/* Video Grid (if video enabled) */}
            {hasVideo && localStream && (
              <div className="mb-8">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Local video */}
                  <div className="relative bg-[#1e1f22] rounded-lg overflow-hidden aspect-video">
                    <video
                      ref={(el) => {
                        if (el) el.srcObject = localStream;
                      }}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-[#111214] bg-opacity-80 px-2 py-1 rounded text-white text-sm">
                      {currentUsername} (You)
                    </div>
                  </div>

                  {/* Remote videos */}
                  {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                    const participant = participants.find(p => p.userId === userId);
                    return (
                      <div key={userId} className="relative bg-[#1e1f22] rounded-lg overflow-hidden aspect-video">
                        <video
                          ref={(el) => {
                            if (el) el.srcObject = stream;
                          }}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 bg-[#111214] bg-opacity-80 px-2 py-1 rounded text-white text-sm">
                          {participant?.username || "Unknown"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Participants List */}
            <div className="bg-[#2b2d31] rounded-lg p-4 mb-6">
              <div className="text-[#949ba4] text-xs uppercase tracking-wide mb-3">
                In Voice — {participants.length}
              </div>
              
              <div className="space-y-2">
                {participants.map((participant) => {
                  const isSpeaking = speakingUsers.has(participant.userId);
                  const isCurrentUser = participant.userId === currentUserId;

                  return (
                    <div
                      key={participant.userId}
                      className={`flex items-center gap-3 p-2 rounded transition-colors ${
                        isSpeaking ? "bg-[#404249]" : ""
                      }`}
                    >
                      <div className="relative">
                        <div className={`w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs ${
                          isSpeaking ? "ring-2 ring-green-500" : ""
                        }`}>
                          {participant.username?.slice(0, 2).toUpperCase() || "U"}
                        </div>
                        {isSpeaking && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#2b2d31] flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>

                      <span className="flex-1 text-[#dbdee1]">
                        {participant.username} {isCurrentUser && "(You)"}
                      </span>

                      <div className="flex items-center gap-1">
                        {participant.isMuted && (
                          <MicOff className="w-4 h-4 text-[#ed4245]" />
                        )}
                        {participant.isDeafened && (
                          <VolumeX className="w-4 h-4 text-[#ed4245]" />
                        )}
                        {participant.hasVideo && (
                          <Video className="w-4 h-4 text-[#3ba55d]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={toggleMute}
                variant="outline"
                size="icon"
                className={`w-12 h-12 rounded-full ${
                  isMuted
                    ? "bg-[#ed4245] hover:bg-[#c03537] border-[#ed4245]"
                    : "bg-[#404249] hover:bg-[#4f545c] border-[#404249]"
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-white" />
                )}
              </Button>

              <Button
                onClick={toggleDeafen}
                variant="outline"
                size="icon"
                className={`w-12 h-12 rounded-full ${
                  isDeafened
                    ? "bg-[#ed4245] hover:bg-[#c03537] border-[#ed4245]"
                    : "bg-[#404249] hover:bg-[#4f545c] border-[#404249]"
                }`}
              >
                {isDeafened ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Headphones className="w-5 h-5 text-white" />
                )}
              </Button>

              <Button
                onClick={toggleVideo}
                variant="outline"
                size="icon"
                className={`w-12 h-12 rounded-full ${
                  hasVideo
                    ? "bg-[#3ba55d] hover:bg-[#2d7d46] border-[#3ba55d]"
                    : "bg-[#404249] hover:bg-[#4f545c] border-[#404249]"
                }`}
              >
                {hasVideo ? (
                  <Video className="w-5 h-5 text-white" />
                ) : (
                  <VideoOff className="w-5 h-5 text-white" />
                )}
              </Button>

              <Button
                onClick={async () => {
                  if (!isScreenSharing) {
                    try {
                      const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
                        video: { cursor: "always" },
                        audio: false,
                      });
                      setIsScreenSharing(true);
                      
                      // Screen sharing stopped by user clicking browser's stop button
                      screenStream.getVideoTracks()[0].onended = () => {
                        setIsScreenSharing(false);
                      };
                    } catch (err) {
                      console.error("Error sharing screen:", err);
                    }
                  } else {
                    setIsScreenSharing(false);
                  }
                }}
                variant="outline"
                size="icon"
                className={`w-12 h-12 rounded-full ${
                  isScreenSharing
                    ? "bg-[#3ba55d] hover:bg-[#2d7d46] border-[#3ba55d]"
                    : "bg-[#404249] hover:bg-[#4f545c] border-[#404249]"
                }`}
              >
                {isScreenSharing ? (
                  <Monitor className="w-5 h-5 text-white" />
                ) : (
                  <MonitorOff className="w-5 h-5 text-white" />
                )}
              </Button>

              <Button
                onClick={leaveVoiceChannel}
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full bg-[#ed4245] hover:bg-[#c03537] border-[#ed4245]"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </Button>
            </div>

            <p className="text-center text-[#949ba4] text-sm mt-4">
              {isScreenSharing 
                ? "Screen sharing active - click the monitor icon to stop" 
                : "Click the microphone icon to " + (isMuted ? "unmute" : "mute")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
