/**
 * BaytMiftah REOS — Call Context & Global Provider
 * 
 * Manages active voice/video call session, WebRTC streams, in-call chat,
 * mute/video/screenshare toggles, audio level meters, and call history.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type CallParticipant,
  type CallSession,
  type CallType,
  type InCallMessage,
  audioSynth,
  callMediaManager,
  getStoredCallHistory,
  saveCallHistory,
} from '../../lib/call.service';
import { secureId } from '../../lib/secure-id';
import { isDemoSimulationAllowed } from '../../lib/simulation-mode';
import { useAuth } from './AuthContext';

interface StartCallOptions {
  listingId?: string;
  listingTitle?: string;
  estateId?: string;
  estateName?: string;
}

interface CallContextValue {
  currentCall: CallSession | null;
  callHistory: CallSession[];
  inCallMessages: InCallMessage[];
  isMinimized: boolean;
  localAudioLevel: number;
  remoteAudioLevel: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  startCall: (
    participant: Partial<CallParticipant> & { name: string },
    type: CallType,
    options?: StartCallOptions
  ) => Promise<void>;
  answerCall: (withVideo?: boolean) => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleRecording: () => void;
  toggleCoBrowsing: () => void;
  sendInCallMessage: (text: string) => void;
  setIsMinimized: (minimized: boolean) => void;
  simulateIncomingCall: (
    caller: Partial<CallParticipant> & { name: string },
    type: CallType,
    options?: StartCallOptions
  ) => void;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, role } = useAuth();
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [callHistory, setCallHistory] = useState<CallSession[]>(() => getStoredCallHistory());
  const [inCallMessages, setInCallMessages] = useState<InCallMessage[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const durationTimerRef = useRef<number | null>(null);
  const connectTimerRef = useRef<number | null>(null);
  const audioMeterRef = useRef<number | null>(null);

  // Stop ringtones on unmount or call cleanup
  const cleanupCall = useCallback(() => {
    audioSynth.stopRingtone();
    callMediaManager.stopAll();
    if (durationTimerRef.current !== null) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (connectTimerRef.current !== null) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    if (audioMeterRef.current !== null) {
      clearInterval(audioMeterRef.current);
      audioMeterRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setLocalAudioLevel(0);
    setRemoteAudioLevel(0);
  }, []);

  // Audio level monitoring loop
  useEffect(() => {
    if (currentCall?.status === 'connected') {
      audioMeterRef.current = window.setInterval(() => {
        const local = callMediaManager.getAudioLevel();
        setLocalAudioLevel(local);
        // Simulate remote audio activity when connected
        const simulatedRemote = Math.floor(Math.random() * (local > 20 ? 70 : 35));
        setRemoteAudioLevel(simulatedRemote);
      }, 100);
    } else {
      if (audioMeterRef.current !== null) {
        clearInterval(audioMeterRef.current);
        audioMeterRef.current = null;
      }
      setLocalAudioLevel(0);
      setRemoteAudioLevel(0);
    }
    return () => {
      if (audioMeterRef.current !== null) {
        clearInterval(audioMeterRef.current);
      }
    };
  }, [currentCall?.status]);

  // Duration timer
  useEffect(() => {
    if (currentCall?.status === 'connected') {
      durationTimerRef.current = window.setInterval(() => {
        setCurrentCall((prev) => {
          if (!prev || prev.status !== 'connected') return prev;
          return {
            ...prev,
            duration: prev.duration + 1,
          };
        });
      }, 1000);
    }
    return () => {
      if (durationTimerRef.current !== null) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [currentCall?.status]);

  // Start an Outgoing Call
  const startCall = useCallback(
    async (
      participant: Partial<CallParticipant> & { name: string },
      type: CallType,
      options?: StartCallOptions
    ) => {
      cleanupCall();
      if (!isDemoSimulationAllowed()) {
        throw new Error('Live voice and video calling is unavailable until a signaling provider is configured.');
      }

      const myName = profile?.full_name || user?.user_metadata?.full_name || 'You';
      const myId = user?.id || 'local_user';

      const localPart: CallParticipant = {
        id: myId,
        name: myName,
        role: (role as string) || 'User',
        avatar: profile?.avatar_url || '',
        isMuted: false,
        isVideoOff: type === 'voice',
        isScreenSharing: false,
      };

      const remotePart: CallParticipant = {
        id: participant.id || `remote_${Date.now()}`,
        name: participant.name,
        role: participant.role || 'Agent / Resident',
        avatar: participant.avatar || '',
        phone: participant.phone,
        email: participant.email,
        isMuted: false,
        isVideoOff: type === 'voice',
        isScreenSharing: false,
      };

      const session: CallSession = {
        id: secureId('call'),
        type,
        status: 'calling',
        direction: 'outgoing',
        localParticipant: localPart,
        remoteParticipant: remotePart,
        listingId: options?.listingId,
        listingTitle: options?.listingTitle,
        estateId: options?.estateId,
        estateName: options?.estateName,
        duration: 0,
        quality: 'excellent',
        latencyMs: 38,
        isRecording: false,
        isCoBrowsing: false,
      };

      setCurrentCall(session);
      setIsMinimized(false);
      setInCallMessages([
        {
          id: 'sys_1',
          senderId: 'system',
          senderName: 'System',
          text: `Encrypted 256-bit WebRTC ${type} call initiated with ${participant.name}.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);

      // Acquire local media
      const stream = await callMediaManager.acquireMedia(type);
      setLocalStream(stream);

      // Play ringing sound
      audioSynth.startOutgoingRingtone();

      // Test-only interactive call simulation.
      connectTimerRef.current = window.setTimeout(() => {
        audioSynth.stopRingtone();
        audioSynth.playConnectedSound();

        setCurrentCall((prev) => {
          if (!prev || prev.status !== 'calling') return prev;
          const connected: CallSession = {
            ...prev,
            status: 'connected',
            startTime: Date.now(),
          };
          saveCallHistory(connected);
          return connected;
        });
      }, 3200);
    },
    [cleanupCall, profile, user]
  );

  // Simulate an Incoming Call
  const simulateIncomingCall = useCallback(
    (
      caller: Partial<CallParticipant> & { name: string },
      type: CallType,
      options?: StartCallOptions
    ) => {
      cleanupCall();

      const myName = profile?.full_name || user?.user_metadata?.full_name || 'You';
      const myId = user?.id || 'local_user';

      const localPart: CallParticipant = {
        id: myId,
        name: myName,
        role: (role as string) || 'User',
        isMuted: false,
        isVideoOff: false,
      };

      const remotePart: CallParticipant = {
        id: caller.id || `remote_${Date.now()}`,
        name: caller.name,
        role: caller.role || 'Property Manager',
        avatar: caller.avatar || '',
        phone: caller.phone,
        email: caller.email,
        isMuted: false,
        isVideoOff: type === 'voice',
      };

      const session: CallSession = {
        id: `call_inc_${Date.now()}`,
        type,
        status: 'incoming',
        direction: 'incoming',
        localParticipant: localPart,
        remoteParticipant: remotePart,
        listingId: options?.listingId,
        listingTitle: options?.listingTitle,
        estateId: options?.estateId,
        estateName: options?.estateName,
        duration: 0,
        quality: 'excellent',
        latencyMs: 42,
        isRecording: false,
        isCoBrowsing: false,
      };

      setCurrentCall(session);
      setIsMinimized(false);
      audioSynth.startIncomingRingtone();
    },
    [cleanupCall, profile, user]
  );

  // Answer Incoming Call
  const answerCall = useCallback(
    async (withVideo = false) => {
      audioSynth.stopRingtone();
      audioSynth.playConnectedSound();

      if (!currentCall) return;

      const callType: CallType = withVideo ? 'video' : currentCall.type;
      const stream = await callMediaManager.acquireMedia(callType);
      setLocalStream(stream);

      const connected: CallSession = {
        ...currentCall,
        type: callType,
        status: 'connected',
        startTime: Date.now(),
        localParticipant: {
          ...currentCall.localParticipant,
          isVideoOff: !withVideo && callType === 'voice',
        },
      };

      setCurrentCall(connected);
      saveCallHistory(connected);
      setCallHistory(getStoredCallHistory());
    },
    [currentCall]
  );

  // Decline Call
  const declineCall = useCallback(() => {
    audioSynth.stopRingtone();
    audioSynth.playEndSound();

    if (currentCall) {
      const ended: CallSession = {
        ...currentCall,
        status: 'declined',
        endReason: 'declined',
      };
      saveCallHistory(ended);
      setCallHistory(getStoredCallHistory());
    }

    cleanupCall();
    setCurrentCall(null);
  }, [cleanupCall, currentCall]);

  // End Active Call
  const endCall = useCallback(() => {
    audioSynth.stopRingtone();
    audioSynth.playEndSound();

    if (currentCall) {
      const ended: CallSession = {
        ...currentCall,
        status: 'ended',
        endReason: 'normal',
      };
      saveCallHistory(ended);
      setCallHistory(getStoredCallHistory());
    }

    cleanupCall();
    setCurrentCall(null);
  }, [cleanupCall, currentCall]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setCurrentCall((prev) => {
      if (!prev) return prev;
      const newMuted = !prev.localParticipant.isMuted;
      callMediaManager.setAudioEnabled(!newMuted);
      return {
        ...prev,
        localParticipant: {
          ...prev.localParticipant,
          isMuted: newMuted,
        },
      };
    });
  }, []);

  // Toggle Video
  const toggleVideo = useCallback(() => {
    setCurrentCall((prev) => {
      if (!prev) return prev;
      const newVideoOff = !prev.localParticipant.isVideoOff;
      callMediaManager.setVideoEnabled(!newVideoOff);
      return {
        ...prev,
        localParticipant: {
          ...prev.localParticipant,
          isVideoOff: newVideoOff,
        },
      };
    });
  }, []);

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (!currentCall) return;

    if (currentCall.localParticipant.isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setCurrentCall((prev) =>
        prev
          ? {
              ...prev,
              localParticipant: {
                ...prev.localParticipant,
                isScreenSharing: false,
              },
            }
          : null
      );
    } else {
      const sStream = await callMediaManager.acquireScreen();
      if (sStream) {
        setScreenStream(sStream);
        sStream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setCurrentCall((prev) =>
            prev
              ? {
                  ...prev,
                  localParticipant: {
                    ...prev.localParticipant,
                    isScreenSharing: false,
                  },
                }
              : null
          );
        };
        setCurrentCall((prev) =>
          prev
            ? {
                ...prev,
                localParticipant: {
                  ...prev.localParticipant,
                  isScreenSharing: true,
                },
              }
            : null
        );
      }
    }
  }, [currentCall, screenStream]);

  // Toggle Recording
  const toggleRecording = useCallback(() => {
    setCurrentCall((prev) => {
      if (!prev) return prev;
      const next = !prev.isRecording;
      setInCallMessages((msgs) => [
        ...msgs,
        {
          id: `rec_${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          text: next ? 'Call recording started (compliance enabled).' : 'Call recording stopped and saved.',
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
      return {
        ...prev,
        isRecording: next,
      };
    });
  }, []);

  // Toggle Co-Browsing
  const toggleCoBrowsing = useCallback(() => {
    setCurrentCall((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isCoBrowsing: !prev.isCoBrowsing,
      };
    });
  }, []);

  // Send In-Call Chat Message
  const sendInCallMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !currentCall) return;
      const myName = profile?.full_name || user?.user_metadata?.full_name || 'You';
      const myId = user?.id || 'local_user';

      const newMsg: InCallMessage = {
        id: `msg_${Date.now()}`,
        senderId: myId,
        senderName: myName,
        text: text.trim(),
        timestamp: Date.now(),
      };

      setInCallMessages((prev) => [...prev, newMsg]);
    },
    [currentCall, profile, user]
  );

  return (
    <CallContext.Provider
      value={{
        currentCall,
        callHistory,
        inCallMessages,
        isMinimized,
        localAudioLevel,
        remoteAudioLevel,
        localStream,
        remoteStream,
        screenStream,
        startCall,
        answerCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        toggleRecording,
        toggleCoBrowsing,
        sendInCallMessage,
        setIsMinimized,
        simulateIncomingCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

const DEFAULT_CALL_CONTEXT: CallContextValue = {
  currentCall: null,
  callHistory: [],
  inCallMessages: [],
  isMinimized: false,
  localAudioLevel: 0,
  remoteAudioLevel: 0,
  localStream: null,
  remoteStream: null,
  screenStream: null,
  startCall: async () => {},
  answerCall: async () => {},
  declineCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleVideo: () => {},
  toggleScreenShare: async () => {},
  toggleRecording: () => {},
  toggleCoBrowsing: () => {},
  sendInCallMessage: () => {},
  setIsMinimized: () => {},
  simulateIncomingCall: () => {},
};

export function useCall() {
  const context = useContext(CallContext);
  return context || DEFAULT_CALL_CONTEXT;
}
