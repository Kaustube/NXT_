/**
 * Notification sounds via Web Audio API — no external files needed.
 * Each sound is a short synthesized tone.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  volume: number,
  fadeOut = true,
) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    const vol = (volume / 100) * 0.4; // cap at 0.4 to avoid harsh sounds
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // AudioContext may be blocked before user interaction — silently ignore
  }
}

function playSequence(
  notes: { freq: number; delay: number; duration: number }[],
  type: OscillatorType,
  volume: number,
) {
  try {
    const ctx = getCtx();
    notes.forEach(({ freq, delay, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      const vol = (volume / 100) * 0.35;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    });
  } catch {
    // silently ignore
  }
}

/** Soft two-note chime for DMs */
export function playDmSound(volume = 80) {
  playSequence(
    [
      { freq: 880, delay: 0, duration: 0.15 },
      { freq: 1100, delay: 0.12, duration: 0.2 },
    ],
    "sine",
    volume,
  );
}

/** Three-note ascending ding for server messages */
export function playChannelSound(volume = 80) {
  playSequence(
    [
      { freq: 660, delay: 0, duration: 0.12 },
      { freq: 784, delay: 0.1, duration: 0.12 },
      { freq: 988, delay: 0.2, duration: 0.18 },
    ],
    "triangle",
    volume,
  );
}

/** Warm pop for friend requests */
export function playFriendRequestSound(volume = 80) {
  playTone(523, "sine", 0.08, volume, false);
  setTimeout(() => playTone(659, "sine", 0.18, volume), 80);
}

/** Cheerful two-tone for accepted requests */
export function playFriendAcceptedSound(volume = 80) {
  playSequence(
    [
      { freq: 523, delay: 0, duration: 0.1 },
      { freq: 659, delay: 0.09, duration: 0.1 },
      { freq: 784, delay: 0.18, duration: 0.22 },
    ],
    "sine",
    volume,
  );
}

export type NotifSoundType =
  | "dm"
  | "channel_message"
  | "friend_request"
  | "friend_accepted"
  | "admin_broadcast";

export function playNotificationSound(type: NotifSoundType, volume = 80) {
  switch (type) {
    case "dm":
      playDmSound(volume);
      break;
    case "channel_message":
    case "admin_broadcast":
      playChannelSound(volume);
      break;
    case "friend_request":
      playFriendRequestSound(volume);
      break;
    case "friend_accepted":
      playFriendAcceptedSound(volume);
      break;
    default:
      break;
  }
}
