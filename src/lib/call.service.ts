/**
 * BaytMiftah REOS — Real-Time Voice & Video Calling Service
 * 
 * Provides WebRTC peer-to-peer audio/video streaming, screen sharing,
 * Web Audio API synthesized ringtones & sound effects, audio level meters,
 * call state machine, and Ghana telecom (Cellular / WhatsApp) fallback dialing.
 */

import { supabase } from './supabase';

export type CallType = 'voice' | 'video';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'incoming'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'declined'
  | 'missed';

export interface CallParticipant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  phone?: string;
  email?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  audioLevel?: number; // 0 - 100
}

export interface CallSession {
  id: string;
  type: CallType;
  status: CallStatus;
  direction: 'incoming' | 'outgoing';
  remoteParticipant: CallParticipant;
  localParticipant: CallParticipant;
  listingId?: string;
  listingTitle?: string;
  estateId?: string;
  estateName?: string;
  startTime?: number;
  duration: number; // in seconds
  quality: 'excellent' | 'good' | 'poor';
  latencyMs: number;
  isRecording: boolean;
  isCoBrowsing: boolean;
  endReason?: 'normal' | 'declined' | 'missed' | 'failed' | 'network_error';
}

export interface InCallMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

// ─── Web Audio API Sound Synthesizer ──────────────────────────────────────────
// Synthesizes pleasant ringtones & call beeps with zero external MP3 dependencies

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: number | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play outgoing call ringing tone (harmonic Ghanaian / ITU standard ring)
   */
  startOutgoingRingtone() {
    this.stopRingtone();
    const playTone = () => {
      const ctx = this.getContext();
      if (!ctx) return;
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime); // 440 Hz
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, ctx.currentTime); // 480 Hz

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.3);
        osc2.stop(ctx.currentTime + 1.3);
      } catch (e) {
        console.warn('Ringtone playback error:', e);
      }
    };

    playTone();
    this.ringtoneInterval = window.setInterval(playTone, 3000);
  }

  /**
   * Play incoming call pleasant chime
   */
  startIncomingRingtone() {
    this.stopRingtone();
    const playChime = () => {
      const ctx = this.getContext();
      if (!ctx) return;
      try {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + i * 0.12;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.6);
        });
      } catch (e) {
        console.warn('Incoming chime error:', e);
      }
    };

    playChime();
    this.ringtoneInterval = window.setInterval(playChime, 2200);
  }

  stopRingtone() {
    if (this.ringtoneInterval !== null) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  playConnectedSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  playEndSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }
}

export const audioSynth = new AudioSynthesizer();

// ─── Call History Storage ───────────────────────────────────────────────────

const STORAGE_KEY = 'baytmiftah_call_history';

export function getStoredCallHistory(): CallSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCallHistory(session: CallSession) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredCallHistory();
    const updated = [session, ...existing.filter((s) => s.id !== session.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save call history:', e);
  }
}

// ─── Direct Telecom Dialer Utilities (Ghana Mobile Networks) ────────────────

export function buildCellularCallUrl(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}

export function buildWhatsAppCallUrl(phoneNumber: string, message?: string): string {
  const cleaned = phoneNumber.replace(/[^\d]/g, '');
  const base = `https://wa.me/${cleaned}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}

// ─── WebRTC Media Stream Helper ─────────────────────────────────────────────

export class CallMediaManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioCtx: AudioContext | null = null;

  async acquireMedia(type: CallType): Promise<MediaStream | null> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.warn('getUserMedia not supported in this environment');
      return null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          type === 'video'
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              }
            : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.setupAudioAnalyser(this.localStream);
      return this.localStream;
    } catch (err) {
      console.warn('Could not acquire user media:', err);
      return null;
    }
  }

  async acquireScreen(): Promise<MediaStream | null> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      return null;
    }

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      return this.screenStream;
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
      return null;
    }
  }

  private setupAudioAnalyser(stream: MediaStream) {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioCtx = new AudioCtx();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.audioAnalyser = this.audioCtx.createAnalyser();
      this.audioAnalyser.fftSize = 64;
      source.connect(this.audioAnalyser);
    } catch {}
  }

  getAudioLevel(): number {
    if (!this.audioAnalyser) return 0;
    const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
    this.audioAnalyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(100, Math.round((avg / 255) * 100));
  }

  setAudioEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  setVideoEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  stopAll() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.audioAnalyser = null;
  }
}

export const callMediaManager = new CallMediaManager();
