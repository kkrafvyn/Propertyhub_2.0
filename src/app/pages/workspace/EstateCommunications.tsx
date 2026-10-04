import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
/**
 * BaytMiftah REOS — Estate Communications & Omnichannel Calling Hub
 * 
 * Enterprise communication center connecting WebRTC HD Voice/Video Calls,
 * Virtual Estate Townhalls, Ghana SMS Gateways (Hubtel/Arkesel), WhatsApp Business,
 * Email, and In-App Push Broadcasts with delivery audit trails.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  Phone,
  Video,
  MessageSquare,
  Radio,
  Send,
  Users,
  ShieldCheck,
  CheckCheck,
  Clock,
  Building2,
  Sparkles,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  ExternalLink,
  Plus,
  RefreshCw,
  Zap,
  Sliders,
  Bell,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Droplet,
  Shield,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import {
  estateOperationsService,
  type EstateNotice,
  type ManagedEstate,
} from '../../../lib/estate-operations.service';
import { useCall } from '../../context/CallContext';
import { videoCallsAvailable, voiceCallsAvailable } from '../../../lib/communications-capabilities';
import {
  buildCellularCallUrl,
  buildWhatsAppCallUrl,
  type CallSession,
} from '../../../lib/call.service';
import { isDemoSimulationAllowed } from '../../../lib/simulation-mode';

interface CommunicationStats {
  totalNotices: number;
  totalDelivered: number;
  smsCreditsRemaining: number;
  activeVideoRooms: number;
  deliveryRate: string;
}

const PRESET_TEMPLATES = [
  {
    id: 'water_outage',
    title: 'Emergency Water Disruption',
    icon: Droplet,
    iconColor: 'text-blue-500',
    subject: 'Notice: Scheduled GWCL Water Maintenance & Tank Refill',
    body: 'Dear Residents, Please be advised that the main Ghana Water supply will undergo scheduled pipeline maintenance tomorrow between 09:00 and 15:00. The estate backup 20,000L reservoir has been primed to maintain normal pressure.',
    channels: ['in_app', 'sms', 'whatsapp'] as EstateNotice['channels'],
  },
  {
    id: 'gen_schedule',
    title: 'Standby Generator Schedule',
    icon: Zap,
    iconColor: 'text-amber-500',
    subject: 'Estate Standby Generator Operations Notice',
    body: 'Dear Residents, Due to scheduled ECG grid maintenance, the central 350kVA standby diesel generator will operate automatically from 18:00 to 23:00. Please avoid heavy industrial loads during generator hours.',
    channels: ['in_app', 'whatsapp'] as EstateNotice['channels'],
  },
  {
    id: 'security_gate',
    title: 'Security RFID Gate Protocol',
    icon: Shield,
    iconColor: 'text-emerald-500',
    subject: 'New Security Gate Protocol & QR Visitor Access',
    body: 'Security Notice: Starting Monday, all visitor entries must be pre-authorized via the BaytMiftah Resident Portal QR code or resident voice clearance. Gate guards have been instructed to enforce strict verification.',
    channels: ['in_app', 'email', 'sms'] as EstateNotice['channels'],
  },
  {
    id: 'hoa_dues',
    title: 'Quarterly Maintenance Dues',
    icon: CreditCard,
    iconColor: 'text-orange-500',
    subject: 'Reminder: Q3 Estate Service Charge & Maintenance Dues',
    body: 'Dear Property Owners and Residents, This is a gentle reminder that Q3 Estate Facility Management dues are now payable. You can settle instantly via Mobile Money (MTN MoMo/Telecel Cash) or Card via your Resident Portal.',
    channels: ['in_app', 'email', 'whatsapp'] as EstateNotice['channels'],
  },
];

export function EstateCommunications({
  organizationId,
  currentUserId,
}: {
  organizationId: string;
  currentUserId: string;
}) {
  const { startCall, simulateIncomingCall, callHistory } = useCall();
  const videoEnabled = videoCallsAvailable();
  const voiceEnabled = voiceCallsAvailable();
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'rooms' | 'call_logs' | 'gateways'>('broadcasts');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [notices, setNotices] = useState<EstateNotice[]>([]);
  const [estateId, setEstateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'owner' | 'tenant' | 'buyer'>('all');
  const [selectedChannels, setSelectedChannels] = useState<EstateNotice['channels']>(['in_app', 'whatsapp']);

  // Load estates & notices
  const load = async () => {
    try {
      setLoading(true);
      const rows = await estateOperationsService.getEstates(organizationId);
      setEstates(rows);
      setEstateId((prev) => prev || rows[0]?.id || '');
      const fetchedNotices = await estateOperationsService.getNotices(rows.map((r) => r.id));
      setNotices(fetchedNotices);
    } catch (error) {
      console.error(error);
      toast.error('Unable to load estate communications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const estateNotices = useMemo(
    () => notices.filter((notice) => (estateId ? notice.estate_id === estateId : true)),
    [notices, estateId]
  );

  const selectedEstate = useMemo(
    () => estates.find((e) => e.id === estateId),
    [estates, estateId]
  );

  const toggleChannel = (channel: EstateNotice['channels'][number]) => {
    setSelectedChannels((curr) =>
      curr.includes(channel) ? curr.filter((c) => c !== channel) : [...curr, channel]
    );
  };

  const applyTemplate = (tmpl: typeof PRESET_TEMPLATES[0]) => {
    setSubject(tmpl.subject);
    setBody(tmpl.body);
    setSelectedChannels(tmpl.channels);
    toast.success(`Applied "${tmpl.title}" template`);
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estateId || !subject.trim() || !body.trim() || selectedChannels.length === 0) {
      toast.error('Please choose an estate, subject, message body, and at least one channel.');
      return;
    }

    try {
      setSending(true);
      await estateOperationsService.sendNotice({
        estateId,
        subject,
        body,
        channels: selectedChannels,
        audienceRole: audience,
        sentBy: currentUserId,
      });
      setSubject('');
      setBody('');
      toast.success('Omnichannel notice broadcasted successfully.');
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to send notice.');
    } finally {
      setSending(false);
    }
  };

  const handleStartInstantVideoRoom = (roomName: string) => {
    void startCall(
      {
        name: roomName,
        role: 'Estate Video Conference',
      },
      'video',
      {
        estateId: selectedEstate?.id,
        estateName: selectedEstate?.name || 'Estate Conference',
      }
    );
  };

  const handleSimulateInboundCall = () => {
    simulateIncomingCall(
      {
        name: 'Kofi Mensah (Unit 402 - Tenant)',
        role: 'Resident / Tenant',
        phone: '+233 24 555 0192',
        email: 'kofi.mensah@gmail.com',
      },
      'voice',
      {
        estateId: selectedEstate?.id,
        estateName: selectedEstate?.name || 'East Legon Hills Estate',
      }
    );
    toast.info('Simulating incoming call from resident...');
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                Client Communications
              </h1>
              <p className="text-xs text-muted-foreground">
                Send notices, start video rooms, and manage client messages.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isDemoSimulationAllowed() ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulateInboundCall}
              className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            >
              <PhoneIncoming className="mr-1.5 h-3.5 w-3.5" />
              Test Inbound Call
            </Button>
          ) : null}

          {videoEnabled ? (
            <Button
              size="sm"
              onClick={() =>
                handleStartInstantVideoRoom(
                  `${selectedEstate?.name || 'Estate'} Townhall & Board Session`
                )
              }
              className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-950/20"
            >
              <Video className="mr-1.5 h-4 w-4" />
              Start Video Room
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground max-w-xs">
              Video calling is not configured for this workspace.
            </p>
          )}
        </div>
      </div>

      {/* ── Overview Metrics Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 bg-surface border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Broadcasts</span>
            <Megaphone className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-ink">{notices.length}</p>
          <span className="text-[10px] text-muted-foreground font-medium">
            Estate notices sent
          </span>
        </Card>

        <Card className="p-4 bg-surface border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Video Rooms</span>
            <Video className="h-4 w-4 text-teal-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-ink">0</p>
          <span className="text-[10px] text-muted-foreground">Start a room to go live</span>
        </Card>

        <Card className="p-4 bg-surface border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">SMS Balance</span>
            <Smartphone className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-ink">—</p>
          <span className="text-[10px] text-muted-foreground font-medium">
            Connect gateway to send SMS
          </span>
        </Card>

        <Card className="p-4 bg-surface border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">WhatsApp</span>
            <MessageSquare className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-ink">Setup</p>
          <span className="text-[10px] text-muted-foreground font-medium">
            Connect in workspace settings
          </span>
        </Card>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto min-w-0 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('broadcasts')}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'broadcasts'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle hover:text-ink'
          }`}
        >
          <Megaphone className="h-3.5 w-3.5" />
          Broadcasts & Notices
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'rooms'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle hover:text-ink'
          }`}
        >
          <Video className="h-3.5 w-3.5" />
          Live Video & Audio Rooms
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('call_logs')}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'call_logs'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle hover:text-ink'
          }`}
        >
          <Phone className="h-3.5 w-3.5" />
          Call History & Logs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gateways')}
          className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'gateways'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle hover:text-ink'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          Gateways & Providers
        </button>
      </div>

      {/* ── TAB 1: Broadcasts & Notices ───────────────────────────────── */}
      {activeTab === 'broadcasts' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Send Broadcast Form */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-5 bg-surface border-surface-border">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-emerald-500" />
                  <h3 className="font-semibold text-sm text-ink">Compose Multi-Channel Broadcast</h3>
                </div>
                <span className="text-[10px] text-muted-foreground">Instant dispatch across selected channels</span>
              </div>

              {/* Template Presets */}
              <div className="mb-4 space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Fast Ghana Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TEMPLATES.map((tmpl) => {
                    const IconComponent = tmpl.icon;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => applyTemplate(tmpl)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-ink hover:border-primary hover:bg-surface transition"
                      >
                        <IconComponent className={`h-3 w-3 ${tmpl.iconColor} shrink-0`} />
                        <span>{tmpl.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSendNotice} className="space-y-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Target Estate</label>
                    <NativeSelectControl
                      className="mt-1 w-full rounded-xl border border-border bg-input-background px-3 py-2 text-xs"
                      value={estateId}
                      onChange={(e) => setEstateId(e.target.value)}
                    >
                      <option value="">All Managed Estates</option>
                      {estates.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </NativeSelectControl>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Target Audience</label>
                    <NativeSelectControl
                      className="mt-1 w-full rounded-xl border border-border bg-input-background px-3 py-2 text-xs"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value as typeof audience)}
                    >
                      <option value="all">All Residents & Owners (Broadcast)</option>
                      <option value="tenant">Current Tenants Only</option>
                      <option value="owner">Property Owners & Landlords</option>
                      <option value="buyer">Prospective Buyers & Leads</option>
                    </NativeSelectControl>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Notice Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Scheduled Water Tank Maintenance & Electricity Update"
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Message Body</label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    placeholder="Write your clear notice. Mention dates, actions, and emergency contact numbers..."
                    className="mt-1 w-full rounded-xl border border-border bg-input-background p-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    Dispatch Channels:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['in_app', 'whatsapp', 'sms', 'email', 'push'] as EstateNotice['channels']).map(
                      (ch) => {
                        const active = selectedChannels.includes(ch);
                        return (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => toggleChannel(ch)}
                            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                              active
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'border-border bg-surface text-muted-foreground hover:bg-surface-subtle'
                            }`}
                          >
                            <CheckCircle2
                              className={`h-3 w-3 ${active ? 'text-emerald-500' : 'opacity-30'}`}
                            />
                            {ch.replace('_', ' ').toUpperCase()}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button disabled={sending} className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    {sending ? 'Queueing Broadcast...' : 'Broadcast Notice'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Delivery Audit History */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="p-5 bg-surface border-surface-border">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  <h3 className="font-semibold text-sm text-ink">Broadcast Delivery Audit</h3>
                </div>
                <span className="text-[10px] text-muted-foreground">{estateNotices.length} Recorded</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {estateNotices.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="text-xs">No previous broadcasts for this estate.</p>
                  </div>
                ) : (
                  estateNotices.map((notice) => {
                    const deliveries = notice.deliveries || [];
                    const deliveredCount = deliveries.filter((d) =>
                      ['sent', 'delivered', 'read'].includes(d.status)
                    ).length;

                    return (
                      <div
                        key={notice.id}
                        className="rounded-2xl border border-border bg-surface-subtle/50 p-3.5 space-y-2 hover:border-primary/40 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-ink line-clamp-1">{notice.subject}</h4>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(notice.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{notice.body}</p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
                          <div className="flex flex-wrap gap-1">
                            {notice.channels.map((ch) => (
                              <Badge key={ch} variant="outline" className="text-[9px] py-0">
                                {ch.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCheck className="h-3 w-3" />
                            {deliveredCount > 0 ? `${deliveredCount} Delivered` : 'Queued'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: Live Video & Audio Rooms ───────────────────────────── */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <Card className="p-8 bg-surface border-surface-border text-center space-y-3">
            <Video className="h-8 w-8 mx-auto text-muted-foreground" />
            <h3 className="font-semibold text-ink">No live video rooms</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {videoEnabled
                ? "Start a townhall or property walkthrough from the header to open an encrypted video room for this estate."
                : "Video calling is not configured for this workspace. Voice outreach can still use tel: links where phone numbers are available."}
            </p>
            {videoEnabled ? (
              <Button
                size="sm"
                onClick={() =>
                  handleStartInstantVideoRoom(
                    `${selectedEstate?.name || 'Estate'} Townhall & Board Session`
                  )
                }
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Video className="mr-1.5 h-4 w-4" />
                Start Video Room
              </Button>
            ) : null}
            {!voiceEnabled ? null : (
              <p className="text-xs text-muted-foreground">Voice: use listed contact numbers for outbound calls.</p>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 3: Call History & Communications Log ──────────────────── */}
      {activeTab === 'call_logs' && (
        <Card className="p-5 bg-surface border-surface-border">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink">Inbound & Outbound Call Log</h3>
              <p className="text-xs text-muted-foreground">
                All WebRTC voice/video calls, recordings, durations, and participant contacts.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {callHistory.length} Call Sessions
            </span>
          </div>

          {callHistory.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Phone className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-xs">No recent call records. Initiate a call from any listing or chat.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {callHistory.map((call) => (
                <div
                  key={call.id}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        call.type === 'video'
                          ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {call.direction === 'incoming' ? (
                        <PhoneIncoming className="h-4 w-4" />
                      ) : (
                        <PhoneOutgoing className="h-4 w-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-ink">{call.remoteParticipant.name}</h4>
                        <span className="rounded bg-surface-subtle px-1.5 py-0.2 text-[9px] font-medium text-muted-foreground">
                          {call.type.toUpperCase()}
                        </span>
                        {call.status === 'connected' ? (
                          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-[9px]">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px]">
                            {call.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {call.remoteParticipant.role} {call.listingTitle ? `· ${call.listingTitle}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-[11px] text-muted-foreground">
                      <p className="font-mono font-medium text-ink">
                        {Math.floor(call.duration / 60)}m {call.duration % 60}s
                      </p>
                      <p>{call.startTime ? new Date(call.startTime).toLocaleTimeString() : 'Recent'}</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void startCall(
                          {
                            name: call.remoteParticipant.name,
                            role: call.remoteParticipant.role,
                            phone: call.remoteParticipant.phone,
                          },
                          call.type
                        )
                      }
                      className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    >
                      {call.type === 'video' ? (
                        <Video className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <PhoneCall className="mr-1 h-3.5 w-3.5" />
                      )}
                      Call Back
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 4: Gateways & Providers ───────────────────────────────── */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Ghana SMS Gateway */}
          <Card className="p-5 bg-surface border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-sm text-ink">Ghana National SMS Gateway</h3>
                  <p className="text-xs text-muted-foreground">Hubtel / Arkesel / Twilio routing</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                ACTIVE
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Registered Sender ID:</span>
                <span className="font-bold font-mono text-ink">BAYTMIFTAH</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Remaining SMS Credits:</span>
                <span className="font-bold font-mono text-ink">—</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Target Networks:</span>
                <span className="text-ink">MTN Ghana, Telecel, AT Ghana</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Delivery Webhook Status:</span>
                <span className="text-muted-foreground font-semibold">Not connected</span>
              </div>
            </div>
          </Card>

          {/* WhatsApp Business Cloud API */}
          <Card className="p-5 bg-surface border-surface-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                <div>
                  <h3 className="font-bold text-sm text-ink">WhatsApp Business Cloud API</h3>
                  <p className="text-xs text-muted-foreground">Meta Business verified channel</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                VERIFIED
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">WhatsApp Business Number:</span>
                <span className="font-mono font-bold text-ink">+233 30 200 4910</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Template Quality Rating:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  High Quality (Green)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Daily Conversation Tier:</span>
                <span className="text-ink">Tier 3 (100,000 / Day)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Interactive Messages:</span>
                <span className="text-emerald-500 font-semibold">Quick Replies & Pay CTA enabled</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
