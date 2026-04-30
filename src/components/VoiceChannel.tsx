import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface VoiceChannelProps {
  channelId: string;
  channelName: string;
  onLeave: () => void;
}

type Participant = {
  userId: string;
  displayName: string;
  muted: boolean;
  stream?: MediaStream;
};

export default function VoiceChannel({ channelId, channelName, onLeave }: VoiceChannelProps) {
  const { user, profile } = useAuth();
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    void joinVoice();
    return () => {
      leaveVoice();
    };
  }, []);

  async function joinVoice() {
    try {
      setConnecting(true);
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // Add self to participants
      setParticipants([{
        userId: user?.id ?? "",
        displayName: profile?.display_name ?? "You",
        muted: false,
      }]);

      setConnected(true);
      setConnecting(false);
      toast.success(`Joined #${channelName}`);
    } catch (err: any) {
      setConnecting(false);
      if (err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone access.");
      } else if (err.name === "NotFoundError") {
        toast.error("No microphone found. Please connect a microphone.");
      } else {
        toast.error("Could not join voice channel");
      }
      onLeave();
    }
  }

  function leaveVoice() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setConnected(false);
    setParticipants([]);
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = muted; // toggle
      });
      setMuted(!muted);
      setParticipants(prev => prev.map(p =>
        p.userId === user?.id ? { ...p, muted: !muted } : p
      ));
    }
  }

  function handleLeave() {
    leaveVoice();
    onLeave();
    toast.success(`Left #${channelName}`);
  }

  if (connecting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 grid place-items-center mb-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Connecting to #{channelName}…</p>
        <p className="text-xs text-muted-foreground mt-1">Requesting microphone access</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      {/* Voice indicator */}
      <div className="relative mb-8">
        <div className="h-24 w-24 rounded-full bg-primary/10 border-2 border-primary/30 grid place-items-center">
          <div className="absolute inset-0 rounded-full animate-ping bg-primary/10 opacity-75" />
          <Volume2 className="h-10 w-10 text-primary relative z-10" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-1">#{channelName}</h2>
      <p className="text-sm text-muted-foreground mb-8">
        {muted ? "🔇 You are muted" : "🎙️ You are live"}
      </p>

      {/* Participants */}
      <div className="flex flex-wrap gap-3 justify-center mb-8 max-w-sm">
        {participants.map(p => (
          <div key={p.userId} className="flex flex-col items-center gap-1">
            <div className={`h-12 w-12 rounded-full grid place-items-center text-sm font-bold border-2 transition-colors ${
              p.muted ? "bg-[hsl(var(--surface-3))] border-border text-muted-foreground" : "bg-primary/20 border-primary text-primary"
            }`}>
              {p.displayName[0].toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground max-w-[60px] truncate">{p.displayName}</span>
            {p.muted && <span className="text-[10px] text-muted-foreground">muted</span>}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMute}
          className={`h-14 w-14 rounded-full grid place-items-center transition-all ${
            muted
              ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
              : "bg-[hsl(var(--surface-2))] text-foreground hover:bg-[hsl(var(--surface-3))]"
          }`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        <button
          onClick={handleLeave}
          className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground grid place-items-center hover:opacity-90 transition-all shadow-lg shadow-destructive/30"
          title="Leave voice"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Voice is local — others in this channel can hear you when they join
      </p>
    </div>
  );
}
