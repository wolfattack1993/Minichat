import { Hash, Volume2, ChevronDown, Settings, Plus, UserPlus } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

interface Channel {
  id: string;
  name: string;
  type: "text" | "voice";
}

interface ChannelSidebarProps {
  serverName: string;
  channels: Channel[];
  activeChannelId: string;
  onChannelSelect: (channelId: string) => void;
  user: any;
  onOpenSettings: () => void;
  onCreateChannel?: () => void;
}

export function ChannelSidebar({
  serverName,
  channels,
  activeChannelId,
  onChannelSelect,
  user,
  onOpenSettings,
  onCreateChannel,
}: ChannelSidebarProps) {
  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col">
      <div className="h-12 px-4 flex items-center justify-between shadow-md hover:bg-[#35373c] cursor-pointer transition-colors">
        <span className="text-white">{serverName}</span>
        <ChevronDown className="w-4 h-4 text-[#b5bac1]" />
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          <div className="mb-1">
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-0.5 text-[#949ba4] text-xs uppercase tracking-wide cursor-pointer hover:text-[#dbdee1]">
                <ChevronDown className="w-3 h-3" />
                <span>Text Channels</span>
              </div>
              <Plus 
                onClick={onCreateChannel}
                className="w-4 h-4 text-[#949ba4] hover:text-[#dbdee1] cursor-pointer" 
              />
            </div>
            {textChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded group ${
                  activeChannelId === channel.id
                    ? "bg-[#404249] text-white"
                    : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
                }`}
              >
                <Hash className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-0.5 text-[#949ba4] text-xs uppercase tracking-wide cursor-pointer hover:text-[#dbdee1]">
                <ChevronDown className="w-3 h-3" />
                <span>Voice Channels</span>
              </div>
              <Plus 
                onClick={onCreateChannel}
                className="w-4 h-4 text-[#949ba4] hover:text-[#dbdee1] cursor-pointer" 
              />
            </div>
            {voiceChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded group ${
                  activeChannelId === channel.id
                    ? "bg-[#404249] text-white"
                    : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
                }`}
              >
                <Volume2 className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

      <div className="p-2 bg-[#232428]">
        <div className="flex items-center justify-between px-2 py-2 rounded bg-[#1e1f22]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs">
              {user?.username?.slice(0, 2).toUpperCase() || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-white text-sm truncate max-w-[100px]">{user?.username || "User"}</span>
              <span className="text-[#949ba4] text-xs capitalize">{user?.status || "Online"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Settings 
              onClick={onOpenSettings}
              className="w-4 h-4 text-[#b5bac1] hover:text-[#dbdee1] cursor-pointer" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
