/**
 * BaytMiftah REOS — WhatsApp Business Automation Hub
 * 
 * Central control room for automated WhatsApp tenant communication:
 * - 1-Click WhatsApp Dispatchers (Gate passes, MoMo rent invoices, artisan work orders)
 * - Group bot linking, inbound feed, and broadcast queues
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
import { usePlatformFeatures } from '../../context/PlatformFeaturesContext';
import { whatsappOutboundService } from '../../../lib/whatsapp-outbound.service';
import { WHATSAPP_GROUP_RESIDENT_COMMANDS } from '../../../lib/whatsapp-group-bot-core';

export function WhatsAppAutomationHub({ organizationId }: { organizationId?: string }) {
  const { flags } = usePlatformFeatures();
  const [activeTab, setActiveTab] = useState<'dispatcher' | 'broadcast' | 'groups'>('dispatcher');
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

  const [linkedGroups, setLinkedGroups] = useState<WhatsAppGroupChannel[]>([]);
  const [inboundMessages, setInboundMessages] = useState<WhatsAppInboundMessage[]>([]);
  const [groupLinkForm, setGroupLinkForm] = useState({ groupId: '', groupName: '', respondWithoutMention: false });
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

  const dispatcherRecipientPhone = () =>
    activeDispatcher === 'gate_pass'
      ? gatePassForm.recipientPhone
      : activeDispatcher === 'rent_invoice'
        ? rentInvoiceForm.recipientPhone
        : maintenanceForm.recipientPhone;

  const handleOpenWhatsApp = () => {
    const phone = dispatcherRecipientPhone();
    const url = whatsappBusinessBotService.buildDirectChatUrl(phone, currentPreviewText());
    if (!url) {
      toast.error('Invalid recipient phone number.');
      return;
    }
    window.open(url, '_blank');
    toast.success('Opening WhatsApp Web / Mobile Client...');
  };

  const handleSendViaCloud = () => {
    const phone = dispatcherRecipientPhone().trim();
    const message = currentPreviewText();
    if (!organizationId) {
      toast.error('Select a workspace organization first.');
      return;
    }
    if (!phone) {
      toast.error('Recipient phone is required for Cloud API send.');
      return;
    }
    void whatsappOutboundService
      .sendMessage({ organizationId, to: phone, message })
      .then(() => toast.success('Message sent via WhatsApp Cloud API.'))
      .catch((err: Error) => toast.error(err.message || 'Cloud send failed. Check Meta secrets and org integration.'));
  };

  if (!flags.whatsapp) {
    return (
      <Card className="p-8">
        <h2 className="text-lg font-semibold">WhatsApp is disabled</h2>
        <p className="text-sm text-muted-foreground mt-2">
          A platform administrator has turned off WhatsApp features for this environment.
        </p>
      </Card>
    );
  }

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

              <div className="flex flex-col gap-2 pt-4 border-t border-surface-border mt-4">
                <div className="flex gap-3">
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
                    variant="outline"
                    className="flex-1 gap-2 border-surface-border text-ink"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open wa.me
                  </Button>
                </div>
                <Button
                  onClick={handleSendViaCloud}
                  disabled={!organizationId}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  Send via Cloud API
                </Button>
                <p className="text-[11px] text-ink-muted">
                  Cloud send uses the <code className="text-[10px]">send-whatsapp</code> edge function and your org&apos;s
                  WhatsApp Business integration (Meta <code className="text-[10px]">WHATSAPP_*</code> secrets).
                </p>
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

      {/* Tab 2: Broadcast Automation Queue */}
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
                <li>In Meta Developer Console, set webhook URL above with verify token <strong>WHATSAPP_VERIFY_TOKEN</strong>.</li>
                <li>Add your WhatsApp Business number to the resident group.</li>
                <li>Residents without the app tag the bot or use <strong>/bm</strong> — see commands below.</li>
                <li>Copy the <strong>Group ID</strong> from the live feed and link it here (optional rename).</li>
              </ol>
              <div className="rounded-lg border border-surface-border p-3 space-y-2">
                <p className="text-xs font-semibold text-ink">What residents can type in groups</p>
                <ul className="text-xs text-ink-secondary space-y-1.5">
                  {WHATSAPP_GROUP_RESIDENT_COMMANDS.map((cmd) => (
                    <li key={cmd.example}>
                      <code className="text-[11px] bg-surface-subtle px-1 rounded">{cmd.example}</code>
                      {' — '}
                      {cmd.summary}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-ink-muted pt-1">
                  Maintenance tickets appear under <strong>Workspace → Maintenance</strong> when the sender&apos;s phone
                  matches a tenant. Otherwise managers get an in-app escalation alert.
                </p>
              </div>
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
          </div>
        </div>
      )}
    </div>
  );
}
