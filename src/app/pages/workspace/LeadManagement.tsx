import { useEffect, useState } from 'react';
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
      await leadAggregationService.sendFollowUp(leadId, followUpMessage);
      setFollowUpMessage('');
      setSelectedLead(null);
      
      // Reload leads
      await loadLeads();
    } catch (error) {
      console.error('Failed to send follow-up:', error);
    }
  };

  const getSourceBadgeColor = (source: string) => {
    const colors: Record<string, string> = {
      mls: 'bg-blue-100 text-blue-800',
      zillow: 'bg-purple-100 text-purple-800',
      realtor: 'bg-orange-100 text-orange-800',
      internal: 'bg-gray-100 text-gray-800',
      website: 'bg-green-100 text-green-800',
      referral: 'bg-pink-100 text-pink-800',
    };
    return colors[source] || 'bg-gray-100 text-gray-800';
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
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Leads ({filteredLeads.length})</h2>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter size={16} />
              Filter
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="viewing_scheduled">Viewing Scheduled</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Sources</option>
                <option value="mls">MLS</option>
                <option value="zillow">Zillow</option>
                <option value="realtor">Realtor.com</option>
                <option value="internal">Internal</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
              </select>
            </div>
          </div>

          {/* Leads List */}
          <div className="space-y-2">
            {filteredLeads.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No leads found
              </div>
            ) : (
              filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    selectedLead?.id === lead.id
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(lead.status)}
                        <h3 className="font-semibold text-gray-900">{lead.lead_name}</h3>
                        <Badge className={getSourceBadgeColor(lead.source)}>
                          {lead.source.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{lead.lead_email}</p>
                      <p className="text-sm text-gray-600">{lead.lead_phone}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        Score: {lead.lead_score}
                      </div>
                      <div className="text-xs text-gray-500">
                        Quality: {lead.quality_score}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
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
        <Card className="p-6 h-fit sticky top-6">
          <h3 className="text-xl font-bold mb-4">{selectedLead.lead_name}</h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <p className="font-medium text-gray-900 break-all">{selectedLead.lead_email}</p>
            </div>

            <div>
              <label className="text-sm text-gray-600">Phone</label>
              <p className="font-medium text-gray-900">{selectedLead.lead_phone}</p>
            </div>

            <div>
              <label className="text-sm text-gray-600">Source</label>
              <Badge className={getSourceBadgeColor(selectedLead.source)}>
                {selectedLead.source}
              </Badge>
            </div>

            <div>
              <label className="text-sm text-gray-600">Status</label>
              <select
                value={selectedLead.status}
                onChange={(e) => handleStatusChange(selectedLead.id, e.target.value as Lead['status'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="viewing_scheduled">Viewing Scheduled</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {selectedLead.requested_timeframe && (
              <div>
                <label className="text-sm text-gray-600">Timeframe</label>
                <p className="font-medium text-gray-900">{selectedLead.requested_timeframe}</p>
              </div>
            )}

            {selectedLead.interested_price && (
              <div>
                <label className="text-sm text-gray-600">Interested Price</label>
                <p className="font-medium text-gray-900">
                  ${selectedLead.interested_price.toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600">Scores</label>
              <div className="flex gap-4 mt-2">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedLead.lead_score}</p>
                  <p className="text-xs text-gray-600">Lead Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedLead.quality_score}</p>
                  <p className="text-xs text-gray-600">Quality</p>
                </div>
              </div>
            </div>
          </div>

          {selectedLead.message && (
            <div className="mb-6 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Message:</p>
              <p className="text-sm text-gray-900 mt-2">{selectedLead.message}</p>
            </div>
          )}

          {/* Follow-up */}
          <div className="space-y-2 border-t pt-4">
            <label className="text-sm font-medium text-gray-700">Send Follow-up</label>
            <textarea
              value={followUpMessage}
              onChange={(e) => setFollowUpMessage(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={() => handleSendFollowUp(selectedLead.id)}
              disabled={!followUpMessage.trim()}
              className="w-full gap-2"
            >
              <Send size={16} />
              Send Message
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
