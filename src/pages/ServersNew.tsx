import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Lock, Globe, Hash, Copy, Check, UserPlus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Server = {
  id: string;
  name: string;
  slug: string;
  kind: 'college' | 'global' | 'group';
  description: string | null;
  is_private: boolean;
  member_count: number;
  user_role?: string;
};

export default function ServersNew() {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [publicServers, setPublicServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create group dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState("");
  const [creating, setCreating] = useState(false);
  
  // Join with code dialog
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  
  // Invite dialog
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      void loadServers();
    }
  }, [user]);

  async function loadServers() {
    setLoading(true);
    
    // Load user's servers (college + joined groups)
    const { data: myServers } = await supabase
      .from("user_servers")
      .select("*")
      .order("kind", { ascending: true })
      .order("name", { ascending: true });
    
    // Load public servers (global + public groups not joined)
    const { data: pubServers } = await supabase
      .from("servers")
      .select(`
        *,
        server_members!left(user_id)
      `)
      .in("kind", ["global", "group"])
      .eq("is_private", false)
      .order("name", { ascending: true });
    
    // Filter out servers user is already in
    const myServerIds = new Set((myServers || []).map(s => s.id));
    const availablePublic = (pubServers || [])
      .filter(s => !myServerIds.has(s.id))
      .map(s => ({
        ...s,
        member_count: s.server_members?.length || 0,
      }));
    
    setServers(myServers || []);
    setPublicServers(availablePublic);
    setLoading(false);
  }

  async function createGroupChat() {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_group_chat", {
        p_name: groupName.trim(),
        p_description: groupDescription.trim() || null,
        p_is_private: isPrivate,
        p_max_members: maxMembers ? parseInt(maxMembers) : null,
      });
      
      if (error) throw error;
      
      toast.success(`Group "${groupName}" created!`);
      setCreateDialogOpen(false);
      setGroupName("");
      setGroupDescription("");
      setIsPrivate(false);
      setMaxMembers("");
      await loadServers();
    } catch (error: any) {
      toast.error(error.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  async function joinServer(serverId: string) {
    try {
      const { error } = await supabase
        .from("server_members")
        .insert({ server_id: serverId, user_id: user!.id, role: "member" });
      
      if (error) throw error;
      
      toast.success("Joined server!");
      await loadServers();
    } catch (error: any) {
      toast.error(error.message || "Failed to join server");
    }
  }

  async function joinWithInviteCode() {
    if (!inviteCode.trim()) {
      toast.error("Enter an invite code");
      return;
    }
    
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc("join_server_with_invite", {
        p_invite_code: inviteCode.trim().toUpperCase(),
      });
      
      if (error) throw error;
      
      toast.success("Joined server!");
      setJoinDialogOpen(false);
      setInviteCode("");
      await loadServers();
    } catch (error: any) {
      toast.error(error.message || "Invalid invite code");
    } finally {
      setJoining(false);
    }
  }

  async function generateInvite(server: Server) {
    setSelectedServer(server);
    setInviteDialogOpen(true);
    
    try {
      const { data, error } = await supabase.rpc("create_server_invite", {
        p_server_id: server.id,
        p_max_uses: null,
        p_expires_in_hours: 168, // 7 days
      });
      
      if (error) throw error;
      
      setGeneratedInvite(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate invite");
      setInviteDialogOpen(false);
    }
  }

  function copyInviteCode() {
    navigator.clipboard.writeText(generatedInvite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invite code copied!");
  }

  const myCollegeServers = servers.filter(s => s.kind === "college");
  const myGroupChats = servers.filter(s => s.kind === "group");
  const globalServers = servers.filter(s => s.kind === "global");

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Servers</h1>
          <p className="text-muted-foreground mt-1">
            Your college, public servers, and group chats
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Join with Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Server with Invite Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code (e.g., ABC12345)"
                  maxLength={8}
                  className="font-mono text-center text-lg"
                />
                <Button onClick={joinWithInviteCode} disabled={joining} className="w-full">
                  {joining ? "Joining..." : "Join Server"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Group Chat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Group Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Group Name</label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="My Study Group"
                    maxLength={50}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                  <Textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="What's this group about?"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="private"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="private" className="text-sm">
                    Private (invite-only)
                  </label>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Members (optional)</label>
                  <Input
                    type="number"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    placeholder="Leave empty for unlimited"
                    min="2"
                    max="1000"
                  />
                </div>
                
                <Button onClick={createGroupChat} disabled={creating} className="w-full">
                  {creating ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="my-servers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-servers">My Servers</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
        </TabsList>

        <TabsContent value="my-servers" className="space-y-6">
          {/* College Servers */}
          {myCollegeServers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Your College
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCollegeServers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    onInvite={() => generateInvite(server)}
                    isMember
                  />
                ))}
              </div>
            </div>
          )}

          {/* Global Servers */}
          {globalServers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Public Servers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalServers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    onInvite={() => generateInvite(server)}
                    isMember
                  />
                ))}
              </div>
            </div>
          )}

          {/* Group Chats */}
          {myGroupChats.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Group Chats
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myGroupChats.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    onInvite={() => generateInvite(server)}
                    isMember
                  />
                ))}
              </div>
            </div>
          )}

          {servers.length === 0 && !loading && (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No servers yet</h3>
              <p className="text-muted-foreground mb-4">
                Join public servers or create your own group chat
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                Create Group Chat
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discover" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Discover Public Servers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicServers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onJoin={() => joinServer(server.id)}
                  isMember={false}
                />
              ))}
            </div>
            
            {publicServers.length === 0 && !loading && (
              <Card className="p-12 text-center">
                <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No public servers available to join
                </p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to {selectedServer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Share this code with others to invite them to this server
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={generatedInvite}
                readOnly
                className="font-mono text-lg text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyInviteCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This invite expires in 7 days
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServerCard({
  server,
  onJoin,
  onInvite,
  isMember,
}: {
  server: Server;
  onJoin?: () => void;
  onInvite?: () => void;
  isMember: boolean;
}) {
  return (
    <Card className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{server.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {server.kind === "college" && (
              <Badge variant="secondary" className="text-xs">
                <Hash className="h-3 w-3 mr-1" />
                College
              </Badge>
            )}
            {server.kind === "global" && (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            )}
            {server.kind === "group" && (
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Group
              </Badge>
            )}
            {server.is_private && (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {server.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {server.description}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {server.member_count} {server.member_count === 1 ? "member" : "members"}
        </span>
        
        {isMember ? (
          <div className="flex gap-2">
            {(server.user_role === "owner" || server.user_role === "admin") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onInvite}
                className="gap-1"
              >
                <UserPlus className="h-3 w-3" />
                Invite
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={`/servers/${server.slug}`}>Open</a>
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={onJoin}>
            Join
          </Button>
        )}
      </div>
    </Card>
  );
}
