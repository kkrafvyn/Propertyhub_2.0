/**
 * BaytMiftah REOS — Incoming Call Banner & Ringing Overlay
 * 
 * Displays incoming voice/video call notification with caller avatar,
 * property/estate context, and instant Answer Voice / Answer Video / Decline.
 */

import React from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  Building2,
  MapPin,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { buildWhatsAppCallUrl } from '../../../lib/call.service';

export function IncomingCallBanner() {
  const { currentCall, answerCall, declineCall } = useCall();

  if (!currentCall || currentCall.status !== 'incoming') {
    return null;
  }

  const { remoteParticipant, type, listingTitle, estateName } = currentCall;

  return (
    <div className="fixed inset-x-0 top-6 z-[10000] flex justify-center px-4 pointer-events-auto">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-emerald-500/40 bg-slate-950/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-6 duration-300">
        <div className="flex items-start justify-between">
          {/* Caller Details */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950/80 ring-2 ring-emerald-500/50 text-xl font-bold text-emerald-300">
                {remoteParticipant.name.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Incoming {type === 'video' ? 'Video' : 'Voice'} Call
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  E2EE
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {remoteParticipant.name}
              </h3>
              <p className="text-xs text-slate-400">
                {remoteParticipant.role} {remoteParticipant.phone ? `· ${remoteParticipant.phone}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Property or Estate Context if available */}
        {(listingTitle || estateName) && (
          <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
            {listingTitle ? (
              <>
                <Building2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Regarding: {listingTitle}</span>
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Estate: {estateName}</span>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-between gap-3">
          {/* Decline */}
          <button
            type="button"
            onClick={declineCall}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600/90 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-rose-600 active:scale-95"
          >
            <PhoneOff className="h-4 w-4" />
            Decline
          </button>

          {/* Quick WhatsApp Reply if phone available */}
          {remoteParticipant.phone && (
            <a
              href={buildWhatsAppCallUrl(remoteParticipant.phone, "Hi, I'm currently busy. I will call you back shortly via BaytMiftah.")}
              target="_blank"
              rel="noreferrer"
              onClick={declineCall}
              className="flex items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-3 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-900/50"
              title="Reply with WhatsApp message"
            >
              <MessageSquare className="h-4 w-4 text-emerald-400" />
            </a>
          )}

          {/* Answer Voice */}
          <button
            type="button"
            onClick={() => void answerCall(false)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/50 transition hover:bg-emerald-500 active:scale-95"
          >
            <Phone className="h-4 w-4" />
            Answer Voice
          </button>

          {/* Answer Video */}
          <button
            type="button"
            onClick={() => void answerCall(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-xs font-bold text-white shadow-lg shadow-teal-900/50 transition hover:from-emerald-500 hover:to-teal-500 active:scale-95"
          >
            <Video className="h-4 w-4" />
            Answer Video
          </button>
        </div>
      </div>
    </div>
  );
}
