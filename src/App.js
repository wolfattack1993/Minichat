import { useState, useEffect } from "react";
import { getSupabaseClient } from "./utils/supabase/client";
import { projectId, publicAnonKey } from "./utils/supabase/info";
import { AuthPage } from "./components/AuthPage";
import { ServerSidebar } from "./components/ServerSidebar";
import { ChannelSidebar } from "./components/ChannelSidebar";
import { ChatArea } from "./components/ChatArea";
import { VoiceChannelView } from "./components/VoiceChannelView";
import { MemberList } from "./components/MemberList";
import { DMSidebar } from "./components/DMSidebar";
import { FriendsView } from "./components/FriendsView";
import { UserSettings } from "./components/UserSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [view, setView] = useState<"servers" | "dms">("servers");
  const [servers, setServers] = useState<any[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [dmConversations, setDmConversations] = useState<any[]>([]);
  const [activeDMUserId, setActiveDMUserId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<any[]>([]);

  const [showFriends, setShowFriends] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");
  const [connectedVoiceChannel, setConnectedVoiceChannel] = useState<{id: string; name: string} | null>(null);

  const supabase = getSupabaseClient();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadServers();
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (activeServerId && activeServerId !== "dms") {
      loadChannels(activeServerId);
    }
  }, [activeServerId]);

  useEffect(() => {
    if (activeChannelId) {
      loadMessages(activeChannelId);
    }
  }, [activeChannelId]);

  useEffect(() => {
    if (activeDMUserId) {
      loadDMMessages(activeDMUserId);
    }
  }, [activeDMUserId]);

  const checkAuth = async () => {
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");

    if (token && userId) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (user && !error) {
          setAccessToken(token);
          setIsAuthenticated(true);
          await loadCurrentUser(token);
        } else {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("userId");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
      }
    }
  };

  const loadCurrentUser = async (token: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleAuthSuccess = async (userId: string, token: string) => {
    setAccessToken(token);
    setIsAuthenticated(true);
    await loadCurrentUser(token);
  };

  const loadServers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/servers`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setServers(data.servers || []);
        if (data.servers?.length > 0 && !activeServerId) {
          setActiveServerId(data.servers[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading servers:", error);
    }
  };

  const loadChannels = async (serverId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/servers/${serverId}/channels`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setChannels(data.channels || []);
        if (data.channels?.length > 0) {
          setActiveChannelId(data.channels[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading channels:", error);
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/channels/${channelId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        // Transform messages to include author info
        const messagesWithAuthors = await Promise.all(
          (data.messages || []).map(async (msg: any) => {
            const userRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/users/${msg.userId}`,
              {
                headers: {
                  Authorization: `Bearer ${publicAnonKey}`,
                },
              }
            );
            const userData = await userRes.json();
            return {
              id: msg.id,
              author: userData.user?.username || "Unknown",
              content: msg.content,
              timestamp: new Date(msg.timestamp).toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
            };
          })
        );
        setMessages(messagesWithAuthors);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadDMMessages = async (otherUserId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/dms/${otherUserId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        const messagesWithAuthors = await Promise.all(
          (data.messages || []).map(async (msg: any) => {
            const userRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/users/${msg.senderId}`,
              {
                headers: {
                  Authorization: `Bearer ${publicAnonKey}`,
                },
              }
            );
            const userData = await userRes.json();
            return {
              id: msg.id,
              author: userData.user?.username || "Unknown",
              content: msg.content,
              timestamp: new Date(msg.timestamp).toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
            };
          })
        );
        setDmMessages(messagesWithAuthors);
      }
    } catch (error) {
      console.error("Error loading DM messages:", error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChannelId || !accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/channels/${activeChannelId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (response.ok) {
        loadMessages(activeChannelId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSendDM = async (content: string) => {
    if (!activeDMUserId || !accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/dms/${activeDMUserId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (response.ok) {
        loadDMMessages(activeDMUserId);
      }
    } catch (error) {
      console.error("Error sending DM:", error);
    }
  };

  const handleCreateServer = async () => {
    if (!newServerName.trim() || !accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/servers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name: newServerName }),
        }
      );

      if (response.ok) {
        setNewServerName("");
        setShowCreateServer(false);
        loadServers();
      }
    } catch (error) {
      console.error("Error creating server:", error);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !activeServerId || !accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/servers/${activeServerId}/channels`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name: newChannelName, type: newChannelType }),
        }
      );

      if (response.ok) {
        setNewChannelName("");
        setNewChannelType("text");
        setShowCreateChannel(false);
        if (activeServerId) {
          loadChannels(activeServerId);
        }
      }
    } catch (error) {
      console.error("Error creating channel:", error);
    }
  };

  const handleShowDMs = () => {
    setView("dms");
    setActiveServerId("dms");
    setShowFriends(false);
  };

  const handleSelectServer = (serverId: string) => {
    setView("servers");
    setActiveServerId(serverId);
    setShowFriends(false);
  };

  const handleStartDM = (userId: string, username: string) => {
    setActiveDMUserId(userId);
    setShowFriends(false);
    
    // Add to conversations if not already there
    if (!dmConversations.find(c => c.userId === userId)) {
      setDmConversations([...dmConversations, { userId, username, status: "online" }]);
    }
  };

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  const activeServer = servers.find((s) => s.id === activeServerId);
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeDMUser = dmConversations.find((c) => c.userId === activeDMUserId);

  return (
    <div className="size-full flex bg-[#313338]">
      <ServerSidebar
        servers={servers}
        activeServerId={activeServerId || ""}
        onServerSelect={handleSelectServer}
        onShowDMs={handleShowDMs}
        onCreateServer={() => setShowCreateServer(true)}
      />

      {view === "dms" ? (
        <>
          <DMSidebar
            conversations={dmConversations}
            activeConversationId={activeDMUserId}
            onSelectConversation={(userId) => {
              setActiveDMUserId(userId);
              setShowFriends(false);
            }}
            onShowFriends={() => {
              setShowFriends(true);
              setActiveDMUserId(null);
            }}
          />

          {showFriends ? (
            <FriendsView onStartDM={handleStartDM} />
          ) : activeDMUser ? (
            <ChatArea
              channelName={activeDMUser.username}
              messages={dmMessages}
              onSendMessage={handleSendDM}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#313338]">
              <div className="text-center">
                <p className="text-[#b5bac1] text-lg">Select a conversation or view your friends</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {activeServer && (
            <ChannelSidebar
              serverName={activeServer.name}
              channels={channels}
              activeChannelId={activeChannelId || ""}
              onChannelSelect={setActiveChannelId}
              user={currentUser}
              onOpenSettings={() => setShowSettings(true)}
              onCreateChannel={() => setShowCreateChannel(true)}
            />
          )}

          {activeChannel ? (
            activeChannel.type === "voice" ? (
              <VoiceChannelView
                channelId={activeChannel.id}
                channelName={activeChannel.name}
                accessToken={accessToken || ""}
                currentUserId={currentUser?.id || ""}
                currentUsername={currentUser?.username || "User"}
              />
            ) : (
              <ChatArea
                channelName={activeChannel.name}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#313338]">
              <div className="text-center">
                <p className="text-[#b5bac1] text-lg">Select a channel to start chatting</p>
              </div>
            </div>
          )}

          {activeServerId && activeServerId !== "dms" && (
            <MemberList members={members} />
          )}
        </>
      )}

      {showSettings && currentUser && (
        <UserSettings
          user={currentUser}
          onClose={() => setShowSettings(false)}
          onUpdateUser={(updatedUser) => {
            setCurrentUser(updatedUser);
            setShowSettings(false);
          }}
        />
      )}

      <Dialog open={showCreateServer} onOpenChange={setShowCreateServer}>
        <DialogContent className="bg-[#313338] border-[#1e1f22]">
          <DialogHeader>
            <DialogTitle className="text-white">Create a Server</DialogTitle>
            <DialogDescription className="text-[#b5bac1]">
              Give your new server a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="server-name" className="text-[#b5bac1] text-xs uppercase">
                Server Name
              </Label>
              <Input
                id="server-name"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="My Awesome Server"
                className="bg-[#1e1f22] border-[#1e1f22] text-white mt-2"
              />
            </div>
            <Button
              onClick={handleCreateServer}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              Create Server
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className="bg-[#313338] border-[#1e1f22]">
          <DialogHeader>
            <DialogTitle className="text-white">Create Channel</DialogTitle>
            <DialogDescription className="text-[#b5bac1]">
              Create a new text or voice channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#b5bac1] text-xs uppercase mb-2 block">
                Channel Type
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setNewChannelType("text")}
                  className={`flex-1 ${
                    newChannelType === "text"
                      ? "bg-[#5865f2] hover:bg-[#4752c4]"
                      : "bg-[#1e1f22] hover:bg-[#2b2d31] text-[#b5bac1]"
                  }`}
                >
                  # Text
                </Button>
                <Button
                  type="button"
                  onClick={() => setNewChannelType("voice")}
                  className={`flex-1 ${
                    newChannelType === "voice"
                      ? "bg-[#5865f2] hover:bg-[#4752c4]"
                      : "bg-[#1e1f22] hover:bg-[#2b2d31] text-[#b5bac1]"
                  }`}
                >
                  🔊 Voice
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="channel-name" className="text-[#b5bac1] text-xs uppercase">
                Channel Name
              </Label>
              <Input
                id="channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder={newChannelType === "text" ? "general-chat" : "voice-lobby"}
                className="bg-[#1e1f22] border-[#1e1f22] text-white mt-2"
              />
            </div>
            <Button
              onClick={handleCreateChannel}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              Create Channel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
