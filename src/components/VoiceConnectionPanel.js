import { Volume2, PhoneOff, Mic, MicOff, Headphones, VolumeX } from "lucide-react";
import { Button } from "./ui/button";

interface VoiceConnectionPanelProps {
  channelName: string;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDisconnect: () => void;
}

export function VoiceConnectionPanel({
  channelName,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onDisconnect,
}: VoiceConnectionPanelProps) {
  return (
    <div className="bg-[#1e1f22] border-t border-[#26272b] p-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Volume2 className="w-4 h-4 text-[#3ba55d] flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[#3ba55d] text-xs truncate">Voice Connected</div>
            <div className="text-white text-xs truncate">{channelName}</div>
          </div>
        </div>
        <Button
          onClick={onDisconnect}
          variant="ghost"
          size="icon"
          className="w-6 h-6 flex-shrink-0 hover:bg-[#ed4245] hover:text-white"
        >
          <PhoneOff className="w-3 h-3" />
        </Button>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          onClick={onToggleMute}
          variant="ghost"
          size="icon"
          className={`w-8 h-8 ${
            isMuted
              ? "bg-[#ed4245] text-white hover:bg-[#c03537]"
              : "hover:bg-[#35373c] text-[#b5bac1]"
          }`}
        >
          {isMuted ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>
        
        <Button
          onClick={onToggleDeafen}
          variant="ghost"
          size="icon"
          className={`w-8 h-8 ${
            isDeafened
              ? "bg-[#ed4245] text-white hover:bg-[#c03537]"
              : "hover:bg-[#35373c] text-[#b5bac1]"
          }`}
        >
          {isDeafened ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Headphones className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
