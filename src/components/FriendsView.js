import { useState, useEffect } from "react";
import { Users, UserPlus, Check, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface FriendsViewProps {
  onStartDM: (userId: string, username: string) => void;
}

export function FriendsView({ onStartDM }: FriendsViewProps) {
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [userIdToAdd, setUserIdToAdd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/friends`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        // Load user details for friends
        const friendsList = await Promise.all(
          data.friends.friends.map(async (userId: string) => {
            const userRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/users/${userId}`,
              {
                headers: {
                  Authorization: `Bearer ${publicAnonKey}`,
                },
              }
            );
            const userData = await userRes.json();
            return userData.user;
          })
        );

        const pendingList = await Promise.all(
          data.friends.pending.map(async (userId: string) => {
            const userRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/users/${userId}`,
              {
                headers: {
                  Authorization: `Bearer ${publicAnonKey}`,
                },
              }
            );
            const userData = await userRes.json();
            return userData.user;
          })
        );

        setFriends(friendsList.filter(Boolean));
        setPending(pendingList.filter(Boolean));
      }
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const handleAddFriend = async () => {
    if (!userIdToAdd.trim()) return;

    setLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/friends/add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId: userIdToAdd }),
        }
      );

      if (response.ok) {
        setUserIdToAdd("");
        loadFriends();
      }
    } catch (error) {
      console.error("Error adding friend:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriend = async (userId: string) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/friends/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (response.ok) {
        loadFriends();
      }
    } catch (error) {
      console.error("Error accepting friend:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-[#23a559]";
      case "idle":
        return "bg-[#f0b232]";
      case "dnd":
        return "bg-[#f23f43]";
      default:
        return "bg-[#80848e]";
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338]">
      <div className="h-12 px-4 flex items-center shadow-md border-b border-[#26272b]">
        <Users className="w-6 h-6 text-[#80848e] mr-2" />
        <span className="text-white">Friends</span>
      </div>

      <div className="p-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-[#1e1f22] mb-4">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1]">
              All Friends
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1]">
              Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="data-[state=active]:bg-[#5865f2] data-[state=active]:text-white text-[#23a559]">
              Add Friend
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-[#2e3035] border border-[#3f4147]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-[#5865f2] text-white">
                            {getInitials(friend.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#313338] ${getStatusColor(
                            friend.status
                          )}`}
                        />
                      </div>
                      <div>
                        <div className="text-white">{friend.username}</div>
                        <div className="text-[#949ba4] text-sm capitalize">{friend.status}</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => onStartDM(friend.id, friend.username)}
                      variant="ghost"
                      size="sm"
                      className="text-[#b5bac1] hover:text-white"
                    >
                      Message
                    </Button>
                  </div>
                ))}
                {friends.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-[#6d6f78] mx-auto mb-3" />
                    <p className="text-[#949ba4]">No friends yet</p>
                    <p className="text-[#6d6f78] text-sm mt-1">
                      Add friends to start chatting!
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pending">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-2">
                {pending.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-[#2e3035] border border-[#3f4147]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-[#5865f2] text-white">
                          {getInitials(friend.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-white">{friend.username}</div>
                        <div className="text-[#949ba4] text-sm">Friend request</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptFriend(friend.id)}
                        size="sm"
                        className="bg-[#23a559] hover:bg-[#1a8245] text-white"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#f23f43] hover:text-white hover:bg-[#f23f43]"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {pending.length === 0 && (
                  <div className="text-center py-12">
                    <UserPlus className="w-16 h-16 text-[#6d6f78] mx-auto mb-3" />
                    <p className="text-[#949ba4]">No pending requests</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="add">
            <div className="max-w-xl">
              <div className="bg-[#2b2d31] p-4 rounded-lg">
                <h3 className="text-white mb-2">Add Friend</h3>
                <p className="text-[#b5bac1] text-sm mb-4">
                  You can add a friend with their User ID.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={userIdToAdd}
                    onChange={(e) => setUserIdToAdd(e.target.value)}
                    placeholder="Enter User ID"
                    className="bg-[#1e1f22] border-[#1e1f22] text-white flex-1"
                  />
                  <Button
                    onClick={handleAddFriend}
                    disabled={loading || !userIdToAdd.trim()}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
                  >
                    Send Request
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
