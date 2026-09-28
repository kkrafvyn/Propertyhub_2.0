import React, { useState, useEffect } from "react";
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Code2,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/badge";
import {
  developerApiService,
  type ApiKeyRecord,
  type WebhookSubscription,
  type ApiKeyScope,
  type WebhookEventType,
} from "../../../lib/developer-api.service";

export function DeveloperApiStudio({ organizationId }: { organizationId: string }) {
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks" | "docs">("keys");
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookDesc, setWebhookDesc] = useState("");
  const [generatedWebhookSecret, setGeneratedWebhookSecret] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    const [keys, hooks] = await Promise.all([
      developerApiService.listApiKeys(organizationId),
      developerApiService.listWebhooks(organizationId),
    ]);
    setApiKeys(keys);
    setWebhooks(hooks);
  };

  useEffect(() => {
    void loadData();
  }, [organizationId]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const scopes: ApiKeyScope[] = [
      "properties:read",
      "work_orders:read",
      "finance:read",
      "accounting:sync",
    ];

    const { fullSecretKey } = await developerApiService.createApiKey(
      newKeyName,
      scopes,
      organizationId
    );

    setGeneratedKey(fullSecretKey);
    setNewKeyName("");
    await loadData();
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action is irreversible.")) return;
    await developerApiService.revokeApiKey(keyId);
    await loadData();
    setActionSuccessMsg("API Key revoked.");
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;

    const events: WebhookEventType[] = [
      "payment.received",
      "work_order.completed",
      "lease.expiring",
    ];

    const created = await developerApiService.registerWebhook(
      webhookUrl,
      webhookDesc || "Custom Webhook Endpoint",
      events,
      organizationId
    );

    setGeneratedWebhookSecret(created.secret);
    setWebhookUrl("");
    setWebhookDesc("");
    await loadData();
    setActionSuccessMsg("Webhook registered successfully.");
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleDeleteWebhook = async (whId: string) => {
    if (!confirm("Delete this webhook subscription?")) return;
    await developerApiService.deleteWebhook(whId);
    await loadData();
    setActionSuccessMsg("Webhook subscription deleted.");
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleRotateWebhookSecret = async (whId: string) => {
    if (!confirm("Rotate this webhook secret? The previous secret will stop working immediately.")) return;
    const secret = await developerApiService.rotateWebhookSecret(whId);
    setGeneratedWebhookSecret(secret);
    await loadData();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 border-surface-border bg-surface shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-ink">Developer API & Webhooks Engine</h2>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
                REST & HMAC v1.0
              </Badge>
            </div>
            <p className="text-xs text-ink-secondary mt-0.5">
              Connect external accounting ERPs (QuickBooks, Sage, SAP), IoT sub-meters, and build custom webhooks.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("keys")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "keys"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-subtle text-ink-secondary hover:text-ink"
              }`}
            >
              API Keys ({apiKeys.length})
            </button>
            <button
              onClick={() => setActiveTab("webhooks")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "webhooks"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-subtle text-ink-secondary hover:text-ink"
              }`}
            >
              Webhooks ({webhooks.length})
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "docs"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-subtle text-ink-secondary hover:text-ink"
              }`}
            >
              REST Docs
            </button>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {actionSuccessMsg}
          </div>
        )}

        {/* 1. API Keys Tab */}
        {activeTab === "keys" && (
          <div className="space-y-6">
            {generatedKey && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  Save Your API Key Now (It will not be displayed again):
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedKey}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-surface border border-surface-border text-ink rounded-lg select-all"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(generatedKey)}
                    className="h-8 text-xs gap-1 bg-primary text-primary-foreground"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateKey} className="flex gap-2">
              <input
                type="text"
                placeholder="Key Name (e.g. QuickBooks Live Sync, Mobile App Key)..."
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 px-4 py-2 text-xs rounded-xl bg-surface-subtle border border-surface-border text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="submit" className="text-xs gap-1.5 bg-primary text-primary-foreground">
                <Plus className="w-3.5 h-3.5" />
                Generate Key
              </Button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle text-ink-secondary font-semibold border-b border-surface-border">
                  <tr>
                    <th className="p-3">Key Name</th>
                    <th className="p-3">Key Token</th>
                    <th className="p-3">Scopes</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-surface-hover transition">
                      <td className="p-3 font-semibold text-ink">{key.name}</td>
                      <td className="p-3 font-mono text-ink-muted">{key.secretKeyMasked}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] border-surface-border">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] ${
                            key.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          }`}
                        >
                          {key.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {key.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevokeKey(key.id)}
                            className="h-6 px-2 text-[10px] text-rose-500 hover:bg-rose-500/10 border-rose-500/20"
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Webhooks Tab */}
        {activeTab === "webhooks" && (
          <div className="space-y-6">
            {generatedWebhookSecret && (
              <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 space-y-2">
                <p className="text-xs font-semibold text-ink">Webhook secret, shown once</p>
                <code className="block break-all text-xs text-ink">{generatedWebhookSecret}</code>
                <Button size="sm" variant="outline" onClick={() => setGeneratedWebhookSecret(null)}>Dismiss</Button>
              </div>
            )}
            <form onSubmit={handleRegisterWebhook} className="space-y-3 p-4 rounded-xl bg-surface-subtle border border-surface-border">
              <p className="text-xs font-bold text-ink">Register Webhook Endpoint</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="url"
                  placeholder="https://your-server.com/api/webhooks..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                  className="px-3 py-2 text-xs rounded-lg bg-surface border border-surface-border text-ink"
                />
                <input
                  type="text"
                  placeholder="Description (e.g. SAP General Ledger Connector)..."
                  value={webhookDesc}
                  onChange={(e) => setWebhookDesc(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg bg-surface border border-surface-border text-ink"
                />
              </div>
              <Button type="submit" size="sm" className="text-xs bg-primary text-primary-foreground">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Register Endpoint
              </Button>
            </form>

            <div className="space-y-3">
              {webhooks.map((wh) => (
                <div key={wh.id} className="p-4 rounded-xl bg-surface-subtle border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Webhook className="w-4 h-4 text-primary" />
                      <span className="text-xs font-mono font-bold text-ink">{wh.url}</span>
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        {wh.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-ink-secondary mt-1">{wh.description}</p>
                    <p className="text-[10px] font-mono text-ink-muted mt-0.5">Secret: {wh.secretMaskedPrefix || "whsec_••••••"}•••••••• (rotate to replace)</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleRotateWebhookSecret(wh.id)}
                      className="h-7 text-xs border-surface-border text-ink"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Rotate secret
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteWebhook(wh.id)}
                      className="h-7 px-2 text-rose-500 border-rose-500/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. REST API Docs Tab */}
        {activeTab === "docs" && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-2">
              <p className="font-bold text-ink">Authentication</p>
              <p className="text-ink-secondary">Pass your API key in the HTTP Header:</p>
              <pre className="p-2 rounded bg-surface border border-surface-border font-mono text-[11px] text-primary">
                Authorization: Bearer bm_live_...
              </pre>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-1.5">
                <Badge className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20">GET</Badge>
                <p className="font-mono font-bold text-ink">/api/v1/properties</p>
                <p className="text-ink-secondary text-[11px]">List all managed estate properties & occupancy rates.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-1.5">
                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">POST</Badge>
                <p className="font-mono font-bold text-ink">/api/v1/work-orders</p>
                <p className="text-ink-secondary text-[11px]">Create a maintenance work order and trigger contractor RFQs.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-1.5">
                <Badge className="text-[10px] bg-purple-500/10 text-purple-500 border-purple-500/20">POST</Badge>
                <p className="font-mono font-bold text-ink">/api/v1/submeter/readings</p>
                <p className="text-ink-secondary text-[11px]">Batch ingest IoT smart water & power meter consumption.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-1.5">
                <Badge className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">POST</Badge>
                <p className="font-mono font-bold text-ink">/api/v1/accounting/sync</p>
                <p className="text-ink-secondary text-[11px]">Synchronize journal entries & Pay Angels MoMo settlements into QuickBooks/Sage/SAP.</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
