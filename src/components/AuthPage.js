import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { getSupabaseClient } from "../utils/supabase/client";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface AuthPageProps {
  onAuthSuccess: (userId: string, accessToken: string) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = getSupabaseClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-941c2de5/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, username, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("userId", data.user.id);
      onAuthSuccess(data.user.id, data.accessToken);
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (!data.session) {
        throw new Error("No session created");
      }

      localStorage.setItem("accessToken", data.session.access_token);
      localStorage.setItem("userId", data.user.id);
      onAuthSuccess(data.user.id, data.session.access_token);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="size-full flex items-center justify-center bg-[#313338]">
      <Card className="w-full max-w-md bg-[#2b2d31] border-[#1e1f22]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-white">Welcome Back!</CardTitle>
          <CardDescription className="text-center text-[#b5bac1]">
            We're so excited to see you again!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#1e1f22]">
              <TabsTrigger value="login" className="data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1]">
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1]">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-[#b5bac1] text-xs uppercase">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-[#1e1f22] border-[#1e1f22] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-[#b5bac1] text-xs uppercase">
                    Password
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#1e1f22] border-[#1e1f22] text-white"
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white"
                >
                  {loading ? "Logging in..." : "Log In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-[#b5bac1] text-xs uppercase">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-[#1e1f22] border-[#1e1f22] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-[#b5bac1] text-xs uppercase">
                    Username
                  </Label>
                  <Input
                    id="signup-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-[#1e1f22] border-[#1e1f22] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-[#b5bac1] text-xs uppercase">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#1e1f22] border-[#1e1f22] text-white"
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white"
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
