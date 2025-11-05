import { Hash, Send, Plus, Smile, Gift } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Message } from "./Message";
import { useState } from "react";

interface ChatMessage {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isNewDay?: boolean;
}

interface ChatAreaProps {
  channelName: string;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
}

export function ChatArea({ channelName, messages, onSendMessage }: ChatAreaProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338]">
      <div className="h-12 px-4 flex items-center shadow-md border-b border-[#26272b]">
        <Hash className="w-6 h-6 text-[#80848e] mr-2" />
        <span className="text-white">{channelName}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-4">
          {messages.map((message) => (
            <Message key={message.id} {...message} />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-2 bg-[#383a40] rounded-lg px-4 py-3">
            <button type="button" className="text-[#b5bac1] hover:text-[#dbdee1]">
              <Plus className="w-6 h-6" />
            </button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Message #${channelName}`}
              className="flex-1 bg-transparent border-0 text-[#dbdee1] placeholder:text-[#6d6f78] focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            <div className="flex items-center gap-2">
              <button type="button" className="text-[#b5bac1] hover:text-[#dbdee1]">
                <Gift className="w-5 h-5" />
              </button>
              <button type="button" className="text-[#b5bac1] hover:text-[#dbdee1]">
                <Smile className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
