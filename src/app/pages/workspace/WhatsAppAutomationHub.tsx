/**
 * BaytMiftah REOS — WhatsApp Business Automation Hub
 * 
 * Central control room for automated WhatsApp tenant communication:
 * - Live Concierge Bot Simulator (Interactive state machine)
 * - 1-Click WhatsApp Dispatchers (Gate passes, MoMo rent invoices, artisan work orders)
 * - Automated Broadcast Queues (Estate power/water notices, rent billing cycles)
 */

import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  CreditCard,
  Wrench,
  Users,
  Copy,
  ExternalLink,
  Bot,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  Zap,
  PhoneCall,
  BellRing,
  Link2,
  Radio,
  Hash,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  whatsappBusinessBotService,
  type WhatsAppGatePassParams,
  type WhatsAppRentInvoiceParams,
  type WhatsAppMaintenanceDispatchParams,
} from '../../../lib/whatsapp-business-bot.service';
import {
  whatsappGroupBotService,
  type WhatsAppGroupChannel,
  type WhatsAppInboundMessage,
} from '../../../lib/whatsapp-group-bot.service';
import { isDemoSimulationAllowed } from '../../../lib/simulation-mode';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  quickReplies?: string[];
}

export function WhatsAppAutomationHub({ organizationId }: { organizationId?: string }) {
  const allowSimulator = isDemoSimulationAllowed();
  const [activeTab, setActiveTab] = useState<'dispatcher' | 'simulator' | 'broadcast' | 'groups'>('dispatcher');
  const [activeDispatcher, setActiveDispatcher] = useState<'gate_pass' | 'rent_invoice' | 'maintenance'>('gate_pass');

  // Gate Pass Form State
  const [gatePassForm, setGatePassForm] = useState<WhatsAppGatePassParams>({
    recipientPhone: '',
    recipientName: '',
    visitorName: '',
    pinCode: '',
    validUntil: '',
    estateName: '',
    unitNumber: '',
    qrCodeUrl: '',
  });

  // Rent Invoice Form State
  const [rentInvoiceForm, setRentInvoiceForm] = useState<WhatsAppRentInvoiceParams>({
    recipientPhone: '',
    tenantName: '',
    unitName: '',
    amountGHS: 0,
    dueDate: '',
    momoPaymentUrl: '',
    ussdShortcode: '',
    estateName: '',
  });

  // Maintenance Dispatch Form State
  const [maintenanceForm, setMaintenanceForm] = useState<WhatsAppMaintenanceDispatchParams>({
    recipientPhone: '',
    tenantName: '',
    ticketId: '',
    category: '',
    artisanName: '',
    artisanPhone: '',
    scheduledTime: '',
    estateName: '',
  });

  // Bot Simulator State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_0',
      sender: 'bot',
      text: `🏢 *Welcome to BaytMiftah Estate Concierge!*\nHow can we assist you today? Reply with a number:\n\n1️⃣ *Check Rent Balance & Pay (MoMo)*\n2️⃣ *Generate Visitor Gate Pass*\n3️⃣ *Report Maintenance Defect*\n4️⃣ *Check Active Ticket Status*\n5️⃣ *Speak with Estate Manager*`,
      timestamp: 'Just now',
      quickReplies: ['1. Rent Balance', '2. Gate Pass', '3. Maintenance', '5. Support'],
    },
  ]);
  const [simInput, setSimInput] = useState('');

  const [linkedGroups, setLinkedGroups] = useState<WhatsAppGroupChannel[]>([]);
  const [inboundMessages, setInboundMessages] = useState<WhatsAppInboundMessage[]>([]);
  const [groupLinkForm, setGroupLinkForm] = useState({ groupId: '', groupName: '', respondWithoutMention: false });
  const [groupSimInput, setGroupSimInput] = useState('');
  const [groupSimSignDemo, setGroupSimSignDemo] = useState(true);
  const [groupSimLog, setGroupSimLog] = useState<Array<{ user: string; bot?: string; skipped?: boolean }>>([]);
  const webhookUrl = whatsappGroupBotService.getWebhookUrl();

  useEffect(() => {
    if (!organizationId) return;
    void whatsappGroupBotService.listGroups(organizationId).then(setLinkedGroups).catch(() => setLinkedGroups([]));
    void whatsappGroupBotService.listInboundMessages(organizationId).then(setInboundMessages).catch(() => setInboundMessages([]));
  }, [organizationId]);

  const handleLinkGroup = async () => {
    if (!organizationId || !groupLinkForm.groupId.trim() || !groupLinkForm.groupName.trim()) {
      toast.error('Group ID and name are required.');
      return;
    }
    try {
      const linked = await whatsappGroupBotService.linkGroup({
        organizationId,
        groupId: groupLinkForm.groupId.trim(),
        groupName: groupLinkForm.groupName.trim(),
        respondWithoutMention: groupLinkForm.respondWithoutMention,
      });
      setLinkedGroups((prev) => [linked, ...prev.filter((g) => g.id !== linked.id)]);
      setGroupLinkForm({ groupId: '', groupName: '', respondWithoutMention: false });
      toast.success('WhatsApp group linked to BaytMiftah bot.');
    } catch (err: any) {
      toast.error(err.message || 'Unable to link group.');
    }
  };

  const handleGroupSimSend = () => {
    if (!groupSimInput.trim()) return;
    void (async () => {
      const demoContext = groupSimSignDemo
        ? {
            pendingLeaseSignUrl: 'https://app.baytmiftah.com/sign/demo-token-abc',
            pendingLeaseDocumentName: 'Residential lease — Unit 4B',
            jurisdictionLabel: 'Greater Accra, Ghana',
          }
        : {};

      const result = organizationId
        ? await whatsappGroupBotService.simulateGroupMessageLive({
            organizationId,
            text: groupSimInput,
            senderPhone: '233244123456',
            ...demoContext,
          })
        : whatsappGroupBotService.simulateGroupMessage({
            text: groupSimInput,
            senderPhone: '233244123456',
            context: {
              tenantUserId: 'demo-tenant',
              tenantName: 'Demo Tenant',
              unitLabel: '4B',
              estateName: 'Cantonments Luxury Suites',
              currency: 'GHS',
              outstandingMinor: 650000,
              paymentUrl: 'https://app.baytmiftah.com/app/payments',
              ...demoContext,
            },
          });

      if (!result.responded) {
        setGroupSimLog((prev) => [...prev, { user: groupSimInput, skipped: true }]);
      } else {
        setGroupSimLog((prev) => [...prev, { user: groupSimInput, bot: result.bot.replyMessage }]);
      }
      setGroupSimInput('');
    })();
  };

  // Generated template preview
  const currentPreviewText = () => {
    switch (activeDispatcher) {
      case 'gate_pass':
        return whatsappBusinessBotService.formatGatePassMessage(gatePassForm);
      case 'rent_invoice':
        return whatsappBusinessBotService.formatRentInvoiceMessage(rentInvoiceForm);
      case 'maintenance':
        return whatsappBusinessBotService.formatMaintenanceDispatchMessage(maintenanceForm);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(currentPreviewText());
    toast.success('WhatsApp message template copied to clipboard!');
  };

  const handleOpenWhatsApp = () => {
    const phone =
      activeDispatcher === 'gate_pass'
        ? gatePassForm.recipientPhone
        : activeDispatcher === 'rent_invoice'
        ? rentInvoiceForm.recipientPhone
        : maintenanceForm.recipientPhone;

    const url = whatsappBusinessBotService.buildDirectChatUrl(phone, currentPreviewText());
    if (!url) {
      toast.error('Invalid recipient phone number.');
      return;
    }
    window.open(url, '_blank');
    toast.success('Opening WhatsApp Web / Mobile Client...');
  };

  const handleSendSimMessage = (textToSend?: string) => {
    const text = textToSend || simInput;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: 'Just now',
    };

    const botRes = whatsappBusinessBotService.processIncomingMessage('233244123456', text);
    const botMsg: ChatMessage = {
      id: `bot_${Date.now() + 1}`,
      sender: 'bot',
      text: botRes.replyMessage,
      timestamp: 'Just now',
      quickReplies: botRes.quickReplies,
    };

    setChatMessages((prev) => [...prev, userMsg, botMsg]);
    setSimInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-surface-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-ink">WhatsApp Business Hub</h1>
              <p className="text-sm text-ink-secondary">
                Automated gate passes, MoMo rent payment notices, and 24/7 AI tenant concierge.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Cloud API Active
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-border pb-2">
        <button
          onClick={() => setActiveTab('dispatcher')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'dispatcher'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
          }`}
        >
          <Send className="w-4 h-4" />
          1-Click Dispatch Studio
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
          }`}
          style={allowSimulator ? undefined : { display: 'none' }}
        >
          <Bot className="w-4 h-4" />
          Tenant Bot Simulator
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'broadcast'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
          }`}
        >
          <BellRing className="w-4 h-4" />
          Broadcast Automation Queue
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          Group Bot
        </button>
      </div>

      {/* Tab 1: 1-Click Dispatch Studio */}
      {activeTab === 'dispatcher' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Form */}
          <div className="lg:col-span-6 space-y-4">
            {/* Dispatch Type Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveDispatcher('gate_pass')}
                className={`p-3 rounded-xl border text-left transition ${
                  activeDispatcher === 'gate_pass'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-surface-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1" />
                <p className="text-xs font-bold text-ink">Gate Pass</p>
                <p className="text-[11px] text-ink-muted">Access PIN & QR</p>
              </button>

              <button
                onClick={() => setActiveDispatcher('rent_invoice')}
                className={`p-3 rounded-xl border text-left transition ${
                  activeDispatcher === 'rent_invoice'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-surface-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-500 mb-1" />
                <p className="text-xs font-bold text-ink">Rent & MoMo</p>
                <p className="text-[11px] text-ink-muted">Invoice Link</p>
              </button>

              <button
                onClick={() => setActiveDispatcher('maintenance')}
                className={`p-3 rounded-xl border text-left transition ${
                  activeDispatcher === 'maintenance'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-surface-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <Wrench className="w-5 h-5 text-amber-500 mb-1" />
                <p className="text-xs font-bold text-ink">Maintenance</p>
                <p className="text-[11px] text-ink-muted">Artisan Dispatch</p>
              </button>
            </div>

            {/* Form Fields */}
            <Card className="p-5 border-surface-border bg-surface">
              {activeDispatcher === 'gate_pass' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Visitor Gate Pass Parameters
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Tenant Name</label>
                      <input
                        type="text"
                        value={gatePassForm.recipientName}
                        onChange={(e) => setGatePassForm({ ...gatePassForm, recipientName: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Tenant WhatsApp</label>
                      <input
                        type="text"
                        value={gatePassForm.recipientPhone}
                        onChange={(e) => setGatePassForm({ ...gatePassForm, recipientPhone: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Visitor Name</label>
                      <input
                        type="text"
                        value={gatePassForm.visitorName}
                        onChange={(e) => setGatePassForm({ ...gatePassForm, visitorName: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Unit / Suite</label>
                      <input
                        type="text"
                        value={gatePassForm.unitNumber}
                        onChange={(e) => setGatePassForm({ ...gatePassForm, unitNumber: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeDispatcher === 'rent_invoice' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    Rent Invoice & MoMo Payment Link
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Tenant Name</label>
                      <input
                        type="text"
                        value={rentInvoiceForm.tenantName}
                        onChange={(e) => setRentInvoiceForm({ ...rentInvoiceForm, tenantName: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Tenant WhatsApp</label>
                      <input
                        type="text"
                        value={rentInvoiceForm.recipientPhone}
                        onChange={(e) => setRentInvoiceForm({ ...rentInvoiceForm, recipientPhone: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Amount Due (GHS)</label>
                      <input
                        type="number"
                        value={rentInvoiceForm.amountGHS}
                        onChange={(e) => setRentInvoiceForm({ ...rentInvoiceForm, amountGHS: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Due Date</label>
                      <input
                        type="text"
                        value={rentInvoiceForm.dueDate}
                        onChange={(e) => setRentInvoiceForm({ ...rentInvoiceForm, dueDate: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeDispatcher === 'maintenance' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-500" />
                    Maintenance Artisan Dispatch
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Tenant Name</label>
                      <input
                        type="text"
                        value={maintenanceForm.tenantName}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, tenantName: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Ticket ID</label>
                      <input
                        type="text"
                        value={maintenanceForm.ticketId}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, ticketId: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Assigned Artisan</label>
                      <input
                        type="text"
                        value={maintenanceForm.artisanName}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, artisanName: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink-secondary">Artisan Phone</label>
                      <input
                        type="text"
                        value={maintenanceForm.artisanPhone}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, artisanPhone: e.target.value })}
                        className="w-full bg-input-background border border-border rounded-lg px-3 py-1.5 text-xs text-ink outline-none mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-surface-border mt-4">
                <Button
                  onClick={handleCopyMessage}
                  variant="outline"
                  className="flex-1 gap-2 border-surface-border text-ink"
                >
                  <Copy className="w-4 h-4" />
                  Copy Text
                </Button>
                <Button
                  onClick={handleOpenWhatsApp}
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Send via WhatsApp
                </Button>
              </div>
            </Card>
          </div>

          {/* Live Phone Preview */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-sm bg-[#0b141a] rounded-[36px] border-4 border-gray-800 p-4 shadow-2xl relative overflow-hidden flex flex-col h-[520px]">
              {/* WhatsApp Header */}
              <div className="bg-[#202c33] -mx-4 -mt-4 px-4 py-3 flex items-center gap-3 border-b border-gray-700">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  BM
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-100 leading-tight">BaytMiftah REOS</p>
                  <p className="text-[10px] text-emerald-400">Official Business Account</p>
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                <div className="bg-[#005c4b] text-gray-100 rounded-2xl rounded-tl-sm p-3 text-xs leading-relaxed max-w-[90%] shadow whitespace-pre-line font-mono">
                  {currentPreviewText()}
                </div>
              </div>

              {/* Input bar */}
              <div className="bg-[#202c33] -mx-4 -mb-4 px-4 py-3 flex items-center gap-2 border-t border-gray-700">
                <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-xs text-gray-400">
                  Type a message
                </div>
                <button
                  onClick={handleOpenWhatsApp}
                  className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tenant Bot Simulator */}
      {allowSimulator && activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 border-surface-border bg-surface">
              <h3 className="text-base font-bold text-ink flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-emerald-500" />
                Interactive Concierge Rules
              </h3>
              <p className="text-xs text-ink-secondary mb-4 leading-relaxed">
                The BaytMiftah WhatsApp Bot runs an automated 24/7 rule-based state machine. Test simulated tenant inquiries on the right.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-between">
                  <span className="font-semibold text-ink">Type &quot;1&quot; or &quot;Rent&quot;</span>
                  <Badge variant="outline" className="text-[10px] text-blue-500">Rent Balance & MoMo</Badge>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-between">
                  <span className="font-semibold text-ink">Type &quot;2&quot; or &quot;Gate&quot;</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-500">Instant Access PIN</Badge>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-between">
                  <span className="font-semibold text-ink">Type &quot;3&quot; or &quot;Leak&quot;</span>
                  <Badge variant="outline" className="text-[10px] text-amber-500">Artisan Dispatch</Badge>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-between">
                  <span className="font-semibold text-ink">Type &quot;5&quot; or &quot;Help&quot;</span>
                  <Badge variant="outline" className="text-[10px] text-purple-500">Manager Handoff</Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Chat Simulator Canvas */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-md bg-[#0b141a] rounded-3xl border-4 border-gray-800 p-4 shadow-2xl flex flex-col h-[560px]">
              {/* Header */}
              <div className="bg-[#202c33] -mx-4 -mt-4 px-4 py-3 flex items-center gap-3 border-b border-gray-700">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  BM
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-100">BaytMiftah Concierge Bot</p>
                  <p className="text-[10px] text-emerald-400">Online 24/7</p>
                </div>
                <button
                  onClick={() => setChatMessages([chatMessages[0]])}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Reset
                </button>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl text-xs max-w-[85%] whitespace-pre-line shadow ${
                        msg.sender === 'user'
                          ? 'bg-[#005c4b] text-white rounded-tr-sm'
                          : 'bg-[#202c33] text-gray-100 rounded-tl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.quickReplies && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.quickReplies.map((qr) => (
                          <button
                            key={qr}
                            onClick={() => handleSendSimMessage(qr)}
                            className="bg-[#2a3942] hover:bg-[#374955] text-emerald-400 text-[11px] font-semibold px-2.5 py-1 rounded-full transition"
                          >
                            {qr}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendSimMessage();
                }}
                className="bg-[#202c33] -mx-4 -mb-4 px-4 py-3 flex items-center gap-2 border-t border-gray-700"
              >
                <input
                  type="text"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  placeholder="Type a message (e.g. 1, gate, leak)..."
                  className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Broadcast Automation Queue */}
      {activeTab === 'broadcast' && (
        <Card className="p-6 border-surface-border bg-surface">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-ink">Scheduled Estate Broadcasts</h3>
              <p className="text-xs text-ink-secondary">
                Automated bulk WhatsApp dispatch to all registered tenants and owners.
              </p>
            </div>
            <Button size="sm" className="bg-primary text-primary-foreground gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Schedule New Broadcast
            </Button>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <CreditCard className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Monthly Rent Invoices Cycle</p>
                  <p className="text-xs text-ink-secondary">Triggers 25th of every month at 9:00 AM (24 Tenants)</p>
                </div>
              </div>
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                Active Recurring
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Wrench className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Borehole & Water Tank Maintenance Notice</p>
                  <p className="text-xs text-ink-secondary">Scheduled for this Saturday at 7:00 AM</p>
                </div>
              </div>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Scheduled
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5 space-y-4">
            <Card className="p-5 border-surface-border bg-surface space-y-4">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-500" />
                Connection & setup
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Add your BaytMiftah WhatsApp Business number to any resident or estate group. In your WhatsApp setup, enter the connection URL below and enable <strong>messages</strong>.
              </p>
              <div className="rounded-lg bg-surface-subtle border border-surface-border p-3 text-xs font-mono break-all">
                {webhookUrl}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(webhookUrl);
                  toast.success('Connection URL copied.');
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> Copy connection URL
              </Button>
              <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
                <li>Add the business number to your WhatsApp group as a participant.</li>
                <li>Tenants type <strong>@BaytMiftah menu</strong> or <strong>/bm 1</strong> for rent, gate pass, etc.</li>
                <li>Copy the <strong>Group ID</strong> from the live feed below and link it here.</li>
              </ol>
            </Card>

            <Card className="p-5 border-surface-border bg-surface space-y-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Link group manually
              </h3>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Group ID (from inbound feed)"
                value={groupLinkForm.groupId}
                onChange={(e) => setGroupLinkForm({ ...groupLinkForm, groupId: e.target.value })}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Group name (e.g. East Legon Block A)"
                value={groupLinkForm.groupName}
                onChange={(e) => setGroupLinkForm({ ...groupLinkForm, groupName: e.target.value })}
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={groupLinkForm.respondWithoutMention}
                  onChange={(e) => setGroupLinkForm({ ...groupLinkForm, respondWithoutMention: e.target.checked })}
                />
                Respond to all group messages (no @mention required)
              </label>
              <Button size="sm" onClick={() => void handleLinkGroup()} disabled={!organizationId}>
                Link group
              </Button>
            </Card>

            <Card className="p-5 border-surface-border bg-surface">
              <h3 className="text-sm font-bold mb-3">Linked groups ({linkedGroups.length})</h3>
              {linkedGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">No groups linked yet. Messages from new groups connect automatically on first message.</p>
              ) : (
                <div className="space-y-2">
                  {linkedGroups.map((group) => (
                    <div key={group.id} className="rounded-lg border p-3 text-xs">
                      <p className="font-semibold">{group.group_name || group.group_id}</p>
                      <p className="text-muted-foreground font-mono truncate">{group.group_id}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{group.is_active ? 'Active' : 'Paused'}</Badge>
                        {group.respond_without_mention ? <Badge variant="secondary">All messages</Badge> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="xl:col-span-7 space-y-4">
            <Card className="p-5 border-surface-border bg-surface">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                <Radio className="w-4 h-4 text-emerald-500" />
                Live inbound messages
              </h3>
              {inboundMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground">No messages yet. Send a test message in your linked WhatsApp group.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {inboundMessages.map((msg) => (
                    <div key={msg.id} className="rounded-lg border p-3 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold">{msg.sender_name || msg.sender_phone}</span>
                        <span className="text-muted-foreground">{new Date(msg.received_at).toLocaleString()}</span>
                      </div>
                      {msg.is_group ? <Badge variant="outline" className="mt-1">Group {msg.group_id?.slice(-8)}</Badge> : null}
                      <p className="mt-2">{msg.message_text}</p>
                      {msg.bot_replied && msg.bot_reply_text ? (
                        <p className="mt-2 text-emerald-700 whitespace-pre-line bg-emerald-50 rounded p-2">{msg.bot_reply_text}</p>
                      ) : (
                        <p className="mt-2 text-muted-foreground italic">No bot reply (mention required)</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {allowSimulator ? (
            <Card className="p-5 border-surface-border bg-surface">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4" />
                Group message simulator
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Test how the bot responds when tagged in a group. Try <strong>@BaytMiftah menu</strong>, <strong>/bm 2</strong>, or <strong>/bm 6</strong> for lease signing.
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <input
                  type="checkbox"
                  checked={groupSimSignDemo}
                  onChange={(e) => setGroupSimSignDemo(e.target.checked)}
                />
                Simulate pending lease sign lookup (command 6)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {groupSimLog.map((entry, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <p className="text-right bg-[#005c4b]/10 rounded p-2">{entry.user}</p>
                    {entry.skipped ? (
                      <p className="text-muted-foreground italic pl-2">Bot ignored (no mention)</p>
                    ) : entry.bot ? (
                      <p className="bg-surface-subtle rounded p-2 whitespace-pre-line">{entry.bot}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  placeholder="@BaytMiftah menu"
                  value={groupSimInput}
                  onChange={(e) => setGroupSimInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGroupSimSend()}
                />
                <Button size="sm" onClick={handleGroupSimSend}>Send</Button>
              </div>
            </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
