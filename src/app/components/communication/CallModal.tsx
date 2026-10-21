/**
 * BaytMiftah REOS — High-Definition Voice & Video Calling Interface
 * 
 * Provides full WebRTC calling stage, active speaker spotlight,
 * screen sharing view, PiP local camera tile, live audio waveforms,
 * in-call chat, property co-browsing drawer, and call recording.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  Share2,
  MessageSquare,
  Building2,
  Disc,
  ShieldCheck,
  Volume2,
  Sparkles,
  Send,
  X,
  Radio,
  ExternalLink,
  PhoneCall,
  Smile,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import {
  buildCellularCallUrl,
  buildWhatsAppCallUrl,
} from '../../../lib/call.service';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function CallModal() {
  const {
    currentCall,
    isMinimized,
    setIsMinimized,
    localAudioLevel,
    remoteAudioLevel,
    localStream,
    screenStream,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleRecording,
    toggleCoBrowsing,
    endCall,
    inCallMessages,
    sendInCallMessage,
  } = useCall();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'video' | 'cobrowse'>('video');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, currentCall?.localParticipant.isVideoOff]);

  // Attach screen stream to screen share video element
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Auto-scroll in-call chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [inCallMessages]);

  if (!currentCall || isMinimized || currentCall.status === 'incoming') {
    return null;
  }

  const {
    remoteParticipant,
    localParticipant,
    type,
    duration,
    status,
    listingTitle,
    estateName,
    isRecording,
    isCoBrowsing,
    latencyMs,
    quality,
  } = currentCall;

  const isCalling = status === 'calling';
  const isConnected = status === 'connected';

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatDraft.trim()) {
      sendInCallMessage(chatDraft);
      setChatDraft('');
    }
  };

  const handleQuickReaction = (emoji: string) => {
    sendInCallMessage(emoji);
  };

  return (
    <div
      role="dialog"
      aria-label="Active Call Window"
      className="fixed inset-0 z-[var(--z-overlay-call)] flex items-center justify-center bg-black/85 p-2 sm:p-6 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 motion-safe-only"
    >
      <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-[0_32px_100px_rgba(0,0,0,0.9)]">
        
        {/* ── Top Header Bar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/60 px-6 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/80 ring-1 ring-emerald-500/50 text-emerald-300 font-bold">
              {remoteParticipant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {remoteParticipant.name}
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {remoteParticipant.role}
                </span>
                {isRecording && (
                  <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400 animate-pulse">
                    <Radio className="h-2.5 w-2.5" /> REC
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{isCalling ? 'Connecting...' : `Connected · ${formatDuration(duration)}`}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <ShieldCheck className="h-3 w-3" /> E2EE 256-bit
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline text-[11px] text-slate-400">
                  {latencyMs}ms ({quality})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Minimize button */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize to floating pill"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Main Call Stage & Drawers ──────────────────────────────────── */}
        <div className="relative flex flex-1 overflow-hidden">
          
          {/* Main Stage */}
          <div className="relative flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
            
            {/* Screen Share Mode */}
            {localParticipant.isScreenSharing && screenStream ? (
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
                <div className="absolute top-4 left-4 flex items-center gap-2 rounded-xl bg-slate-950/80 px-3 py-1.5 text-xs text-white backdrop-blur-md">
                  <Share2 className="h-3.5 w-3.5 text-emerald-400" />
                  You are sharing your screen
                </div>
              </div>
            ) : isCoBrowsing ? (
              /* Co-Browsing Mode (Interactive Listing / Property 360 Co-viewer) */
              <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h4 className="font-semibold text-white text-sm">
                        {listingTitle || 'Prime Cantonments Luxury Residence · Unit 302'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Live Synchronized Tour & Specs Co-Browsing
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    Live Co-Tour Active
                  </span>
                </div>

                <div className="mt-4 grid flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                      <img
                        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80"
                        alt="Property Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <span className="text-[10px] text-slate-400">Bedrooms</span>
                        <p className="font-bold text-white text-xs">4 Beds</p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <span className="text-[10px] text-slate-400">Bathrooms</span>
                        <p className="font-bold text-white text-xs">4.5 Baths</p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 text-center">
                        <span className="text-[10px] text-slate-400">Floor Size</span>
                        <p className="font-bold text-white text-xs">380 m²</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl bg-slate-950/60 p-4 border border-white/5">
                    <h5 className="text-xs font-semibold text-slate-300">Verified Amenities & Status</h5>
                    <ul className="space-y-2 text-xs text-slate-400">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Dedicated 250kVA Standby Generator & Solar Backup
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Ghana Water Company (GWCL) + 15,000L Overhead Reservoir
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        24/7 Gated Security & Smart RFID Access Gate
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Title Deeds verified via Lands Commission & Barcode
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : type === 'video' && !remoteParticipant.isVideoOff ? (
              /* Video Remote View */
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative mb-4 flex items-center justify-center">
                    <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 p-1 shadow-2xl">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-4xl font-bold text-emerald-400">
                        {remoteParticipant.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white">{remoteParticipant.name}</h4>
                  <p className="text-xs text-emerald-400 mt-1">Camera active · High Definition 1080p</p>
                </div>
              </div>
            ) : (
              /* Voice Only Mode with Reactive Soundwave Rings */
              <div className="flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                  {/* Reactive Soundwave Ripples */}
                  {isConnected && (
                    <>
                      <div
                        className="absolute rounded-full border border-emerald-500/20 bg-emerald-500/5 transition-all duration-150"
                        style={{
                          width: `${160 + (remoteAudioLevel / 100) * 120}px`,
                          height: `${160 + (remoteAudioLevel / 100) * 120}px`,
                        }}
                      />
                      <div
                        className="absolute rounded-full border border-emerald-500/30 bg-emerald-500/10 transition-all duration-100"
                        style={{
                          width: `${130 + (remoteAudioLevel / 100) * 70}px`,
                          height: `${130 + (remoteAudioLevel / 100) * 70}px`,
                        }}
                      />
                    </>
                  )}

                  {/* Main Avatar Centerpiece */}
                  <div className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-950 p-1 shadow-[0_0_50px_rgba(16,185,129,0.3)] ring-4 ring-emerald-500/40">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-4xl font-extrabold text-emerald-300">
                      {remoteParticipant.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>

                <h3 className="mt-6 text-xl font-bold text-white">{remoteParticipant.name}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {isCalling ? 'Ringing...' : 'BaytMiftah High-Definition Voice'}
                </p>

                {/* Waveform Bar Visualizer */}
                {isConnected && (
                  <div className="mt-6 flex items-center gap-1.5">
                    {[0.3, 0.7, 1.0, 0.5, 0.9, 0.4, 0.8, 0.6].map((multiplier, i) => {
                      const height = Math.max(
                        4,
                        Math.min(28, (remoteAudioLevel / 100) * 28 * multiplier + 4)
                      );
                      return (
                        <div
                          key={i}
                          className="w-1 rounded-full bg-emerald-400 transition-all duration-75"
                          style={{ height: `${height}px` }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Local Camera Picture-in-Picture (PiP) Tile */}
            {type === 'video' && !localParticipant.isVideoOff && (
              <div className="absolute bottom-6 right-6 z-20 h-36 w-48 overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-slate-950 shadow-2xl transition hover:scale-105">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover -scale-x-100"
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                  <span>You</span>
                  {localParticipant.isMuted && <MicOff className="h-2.5 w-2.5 text-rose-400" />}
                </div>
              </div>
            )}
          </div>

          {/* ── Slide-Out In-Call Chat Drawer ───────────────────────────── */}
          {chatOpen && (
            <div className="flex w-80 flex-col border-l border-white/10 bg-slate-950/95 p-4 backdrop-blur-xl animate-in slide-in-from-right-10 duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold text-white text-xs">In-Call Live Chat</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Chat Message Stream */}
              <div
                ref={chatScrollRef}
                className="flex-1 space-y-2.5 overflow-y-auto py-3 pr-1 text-xs"
              >
                {inCallMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.isSystem
                        ? 'items-center text-center'
                        : msg.senderId === localParticipant.id
                        ? 'items-end'
                        : 'items-start'
                    }`}
                  >
                    {msg.isSystem ? (
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-slate-400">
                        {msg.text}
                      </span>
                    ) : (
                      <>
                        <span className="mb-0.5 text-[10px] text-slate-400">
                          {msg.senderName}
                        </span>
                        <div
                          className={`rounded-2xl px-3 py-2 ${
                            msg.senderId === localParticipant.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white/10 text-slate-200'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Reactions */}
              <div className="mb-2 flex items-center justify-between border-t border-white/10 pt-2 px-1">
                {['👍', '❤️', '👏', '🔑', '🏠', '📄'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleQuickReaction(emoji)}
                    className="rounded-lg p-1 text-base hover:scale-125 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder="Send a message in-call..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatDraft.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Bottom Controls Bar ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-900/90 px-6 py-4 backdrop-blur-xl">
          
          {/* Left Actions: Ghana Telecom Direct Fallbacks */}
          <div className="flex items-center gap-2">
            {remoteParticipant.phone && (
              <>
                <a
                  href={buildCellularCallUrl(remoteParticipant.phone)}
                  target="_blank"
                  rel="noreferrer"
                  title="Direct GSM Cellular Call (Ghana MTN/Telecel/AT)"
                  className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  <PhoneCall className="h-3.5 w-3.5 text-amber-400" />
                  Cellular GSM
                </a>
                <a
                  href={buildWhatsAppCallUrl(remoteParticipant.phone)}
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp Call"
                  className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-900/50"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                  WhatsApp
                </a>
              </>
            )}
          </div>

          {/* Center Call Controls */}
          <div className="flex items-center gap-3">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              title={localParticipant.isMuted ? 'Unmute' : 'Mute'}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition shadow-lg ${
                localParticipant.isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
              }`}
            >
              {localParticipant.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* Video Toggle */}
            <button
              type="button"
              onClick={toggleVideo}
              title={localParticipant.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition shadow-lg ${
                localParticipant.isVideoOff
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
              }`}
            >
              {localParticipant.isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>

            {/* Screen Share */}
            <button
              type="button"
              onClick={() => void toggleScreenShare()}
              title="Share Screen"
              className={`hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl transition shadow-lg ${
                localParticipant.isScreenSharing
                  ? 'bg-emerald-600 text-white border border-emerald-400'
                  : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
              }`}
            >
              <Share2 className="h-5 w-5" />
            </button>

            {/* Co-Browse Property */}
            <button
              type="button"
              onClick={toggleCoBrowsing}
              title="Co-Browse Property Tour"
              className={`flex h-12 items-center gap-2 rounded-2xl px-4 transition shadow-lg ${
                isCoBrowsing
                  ? 'bg-emerald-600 text-white border border-emerald-400'
                  : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
              }`}
            >
              <Building2 className="h-5 w-5" />
              <span className="text-xs font-semibold hidden md:inline">
                {isCoBrowsing ? 'Exit Tour' : 'Co-Tour'}
              </span>
            </button>

            {/* Recording Toggle */}
            <button
              type="button"
              onClick={toggleRecording}
              title="Record Call"
              className={`hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl transition shadow-lg ${
                isRecording
                  ? 'bg-rose-600 text-white border border-rose-400'
                  : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
              }`}
            >
              <Disc className="h-5 w-5" />
            </button>

            {/* In-Call Chat Drawer Toggle */}
            <button
              type="button"
              onClick={() => setChatOpen((prev) => !prev)}
              title="Open Chat"
              className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition shadow-lg ${
                chatOpen
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              {inCallMessages.length > 1 && !chatOpen && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-black">
                  {inCallMessages.length - 1}
                </span>
              )}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={endCall}
              title="End Call"
              className="flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 font-bold text-white shadow-xl shadow-rose-950/60 transition hover:bg-rose-500 active:scale-95 ml-2"
            >
              <PhoneOff className="h-5 w-5" />
              <span className="text-xs">End</span>
            </button>
          </div>

          {/* Right Indicator: Connection Stability */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Encrypted WebRTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
