/**
 * BaytMiftah REOS — Active Call Floating Bar (Minimized Mode)
 * 
 * Appears when an active call is minimized, allowing the user to
 * navigate property listings, documents, or ledger while speaking.
 */

import React from 'react';
import {
  Maximize2,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  ShieldCheck,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ActiveCallBar() {
  const {
    currentCall,
    isMinimized,
    setIsMinimized,
    toggleMute,
    toggleVideo,
    endCall,
    localAudioLevel,
  } = useCall();

  if (!currentCall || !isMinimized || currentCall.status !== 'connected') {
    return null;
  }

  const { remoteParticipant, localParticipant, duration, type } = currentCall;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-full border border-emerald-500/30 bg-slate-950/90 px-4 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Live Pulsing Dot & Avatar */}
      <div className="relative flex items-center justify-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-950/80 ring-2 ring-emerald-500/60 font-semibold text-xs text-emerald-400">
          {remoteParticipant.name.charAt(0).toUpperCase()}
        </div>
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
      </div>

      {/* Name, Role & Live Duration */}
      <div className="flex flex-col pr-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white max-w-[120px] truncate">
            {remoteParticipant.name}
          </span>
          <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-mono font-medium text-emerald-300">
            {formatDuration(duration)}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />
          HD {type === 'video' ? 'Video' : 'Voice'} Call
        </span>
      </div>

      {/* Audio Waveform Activity */}
      <div className="flex items-center gap-0.5 h-4 px-1">
        {[0.4, 0.8, 1.0, 0.6, 0.9].map((multiplier, i) => {
          const height = Math.max(3, Math.min(16, (localAudioLevel / 100) * 16 * multiplier));
          return (
            <span
              key={i}
              className="w-0.5 rounded-full bg-emerald-400 transition-all duration-75"
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>

      {/* Quick Controls */}
      <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
        <button
          type="button"
          onClick={toggleMute}
          title={localParticipant.isMuted ? 'Unmute' : 'Mute'}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
            localParticipant.isMuted
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {localParticipant.isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </button>

        {type === 'video' && (
          <button
            type="button"
            onClick={toggleVideo}
            title={localParticipant.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              localParticipant.isVideoOff
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {localParticipant.isVideoOff ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          title="Expand Call"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={endCall}
          title="End Call"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 transition ml-0.5"
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
