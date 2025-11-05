import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";

interface MessageProps {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isNewDay?: boolean;
}

export function Message({ author, avatar, content, timestamp, isNewDay }: MessageProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="hover:bg-[#2e3035] px-4 py-2 group">
      {isNewDay && (
        <div className="flex items-center gap-4 mb-4">
          <Separator className="flex-1 bg-[#3f4147]" />
          <span className="text-[#949ba4] text-xs">{timestamp.split(" ")[0]}</span>
          <Separator className="flex-1 bg-[#3f4147]" />
        </div>
      )}
      <div className="flex gap-4">
        <Avatar className="w-10 h-10 mt-0.5">
          <AvatarImage src={avatar} />
          <AvatarFallback className="bg-[#5865f2] text-white">
            {getInitials(author)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-white hover:underline cursor-pointer">{author}</span>
            <span className="text-[#949ba4] text-xs">{timestamp.split(" ").slice(1).join(" ")}</span>
          </div>
          <div className="text-[#dbdee1] break-words">{content}</div>
        </div>
      </div>
    </div>
  );
}
