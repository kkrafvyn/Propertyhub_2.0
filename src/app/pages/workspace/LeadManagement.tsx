import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Send, Filter, Star, Archive, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { leadAggregationService } from '../../../lib/lead-aggregation.service';

interface Lead {
  id: string;
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  source: 'mls' | 'zillow' | 'realtor' | 'internal' | 'website' | 'referral';
  quality_score: number;
  lead_score: number;
  status: 'new' | 'contacted' | 'qualified' | 'viewing_scheduled' | 'negotiation' | 'won' | 'lost';
  message?: string;
  requested_timeframe?: string;
  interested_price?: number;
  assigned_to?: string;
  tags: string[];
  created_at: string;
}

export function LeadManagement({ organizationId }: {
  organizationId: string;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'leadScore' | 'createdAt' | 'quality'>('leadScore');
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);

  useEffect(() => {
    loadLeads();
  }, [organizationId]);

  useEffect(() => {
    filterAndSortLeads();
  }, [leads, filterStatus, filterSource, sortBy]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await leadAggregationService.getLeads(organizationId, undefined, 100);
      setLeads(data);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortLeads = () => {
    let result = [...leads];

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(l => l.status === filterStatus);
    }

    // Filter by source
    if (filterSource !== 'all') {
      result = result.filter(l => l.source === filterSource);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'leadScore') return b.lead_score - a.lead_score;
      if (sortBy === 'quality') return b.quality_score - a.quality_score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredLeads(result);
  };

  const handleStatusChange = async (leadId: string, status: Lead['status']) => {
    try {
      await leadAggregationService.updateLeadStatus(leadId, status);
      const updatedLeads = leads.map(l => 
        l.id === leadId ? { ...l, status } : l
      );
      setLeads(updatedLeads);
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status });
      }
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const handleSendFollowUp = async (leadId: string) => {
    if (!followUpMessage.trim()) return;

    try {
      setSendingFollowUp(true);
      await leadAggregationService.sendFollowUp(leadId, followUpMessage);
      toast.success("Follow-up sent.");
      setFollowUpMessage('');
      setSelectedLead(null);
      await loadLeads();
    } catch (error) {
      console.error('Failed to send follow-up:', error);
      toast.error(error instanceof Error ? error.message : "Unable to send follow-up.");
    } finally {
      setSendingFollowUp(false);
    }
  };

  const getSourceBadgeColor = (source: string) => {
    const colors: Record<string, string> = {
      mls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
      zillow: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
      realtor: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300',
      internal: 'bg-surface-subtle text-ink-secondary',
      website: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
      referral: 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300',
    };
    return colors[source] || 'bg-surface-subtle text-ink-secondary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'contacted':
        return <Send size={16} className="text-blue-500" />;
      case 'qualified':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'viewing_scheduled':
        return <Clock size={16} className="text-purple-500" />;
      case 'won':
        return <Star size={16} className="text-yellow-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Leads List */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-6 border-surface-border bg-surface">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-ink">Leads ({filteredLeads.length})</h2>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter size={16} />
              Filter
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-2">Status</label>
              <NativeSelectControl
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background text-ink outline-none"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="viewing_scheduled">Viewing Scheduled</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </NativeSelectControl>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-2">Source</label>
              <NativeSelectControl
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background text-ink outline-none"
              >
                <option value="all">All Sources</option>
                <option value="mls">MLS</option>
                <option value="zillow">Zillow</option>
                <option value="realtor">Realtor.com</option>
                <option value="internal">Internal</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
              </NativeSelectControl>
            </div>
          </div>

          {/* Leads List */}
          <div className="space-y-2">
            {filteredLeads.length === 0 ? (
              <div className="py-8 text-center text-ink-muted">
                No leads found
              </div>
            ) : (
              filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedLead?.id === lead.id
                      ? 'border-primary bg-primary/10'
                      : 'border-surface-border hover:border-border hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(lead.status)}
                        <h3 className="font-semibold text-ink">{lead.lead_name}</h3>
                        <Badge className={getSourceBadgeColor(lead.source)}>
                          {lead.source.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-ink-secondary">{lead.lead_email}</p>
                      <p className="text-sm text-ink-secondary">{lead.lead_phone}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-ink">
                        Score: {lead.lead_score}
                      </div>
                      <div className="text-xs text-ink-muted">
                        Quality: {lead.quality_score}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-ink-muted">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                    <Badge variant="secondary" className="capitalize">
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Lead Details */}
      {selectedLead && (
        <Card className="p-6 h-fit sticky top-6 border-surface-border bg-surface">
          <h3 className="text-xl font-bold mb-4 text-ink">{selectedLead.lead_name}</h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-ink-secondary">Email</label>
              <p className="font-medium text-ink break-all">{selectedLead.lead_email}</p>
            </div>

            <div>
              <label className="text-sm text-ink-secondary">Phone</label>
              <p className="font-medium text-ink">{selectedLead.lead_phone}</p>
            </div>

            <div>
              <label className="text-sm text-ink-secondary">Source</label>
              <Badge className={getSourceBadgeColor(selectedLead.source)}>
                {selectedLead.source}
              </Badge>
            </div>

            <div>
              <label className="text-sm text-ink-secondary">Status</label>
              <NativeSelectControl
                value={selectedLead.status}
                onChange={(e) => handleStatusChange(selectedLead.id, e.target.value as Lead['status'])}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm mt-1 bg-input-background text-ink outline-none"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="viewing_scheduled">Viewing Scheduled</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </NativeSelectControl>
            </div>

            {selectedLead.requested_timeframe && (
              <div>
                <label className="text-sm text-ink-secondary">Timeframe</label>
                <p className="font-medium text-ink">{selectedLead.requested_timeframe}</p>
              </div>
            )}

            {selectedLead.interested_price && (
              <div>
                <label className="text-sm text-ink-secondary">Interested Price</label>
                <p className="font-medium text-ink">
                  ${selectedLead.interested_price.toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm text-ink-secondary">Scores</label>
              <div className="flex gap-4 mt-2">
                <div>
                  <p className="text-2xl font-bold text-ink">{selectedLead.lead_score}</p>
                  <p className="text-xs text-ink-muted">Lead Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink">{selectedLead.quality_score}</p>
                  <p className="text-xs text-ink-muted">Quality</p>
                </div>
              </div>
            </div>
          </div>

          {selectedLead.message && (
            <div className="mb-6 p-3 bg-surface-subtle border border-surface-border rounded">
              <p className="text-sm text-ink-secondary">Message:</p>
              <p className="text-sm text-ink mt-2">{selectedLead.message}</p>
            </div>
          )}

          {/* Follow-up */}
          <div className="space-y-2 border-t border-surface-border pt-4">
            <label className="text-sm font-medium text-ink">Send Follow-up</label>
            <Textarea
              value={followUpMessage}
              onChange={(e) => setFollowUpMessage(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background text-ink focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={() => handleSendFollowUp(selectedLead.id)}
              disabled={!followUpMessage.trim() || sendingFollowUp}
              className="w-full gap-2"
            >
              <Send size={16} />
              {sendingFollowUp ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
