import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings,
  TrendingUp,
  Zap,
  Lock,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { mlsIntegrationService } from '../../../lib/mls-integration.service';
import { leadAggregationService } from '../../../lib/lead-aggregation.service';

interface MLSIntegration {
  id: string;
  provider: 'mls' | 'zillow' | 'realtor';
  isActive: boolean;
  syncFrequency: 'hourly' | 'daily' | 'weekly';
  lastSyncAt?: string;
  listingCount: number;
}

interface SyncJob {
  id: string;
  provider: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  listingsSync: number;
  listingsFailed: number;
  completedAt?: string;
}

interface LeadMetrics {
  totalLeads: number;
  newLeads: number;
  conversionRate: number;
  topSource: string;
}

export function IntegrationHub({ organizationId, workspaceBasePath }: {
  organizationId: string;
  workspaceBasePath: string;
}) {
  const [integrations, setIntegrations] = useState<MLSIntegration[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncJob[]>([]);
  const [leadMetrics, setLeadMetrics] = useState<LeadMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAddIntegration, setShowAddIntegration] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'mls' | 'zillow' | 'realtor' | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, [organizationId]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      
      // Fetch integrations and sync history
      const creds = await mlsIntegrationService.getMLSCredentials(organizationId);
      const history = await mlsIntegrationService.getSyncHistory(organizationId);
      
      // Transform credentials to integrations
      const integrationsList: MLSIntegration[] = creds.map((c: any) => ({
        id: c.id,
        provider: c.provider,
        isActive: c.is_active,
        syncFrequency: c.sync_frequency,
        lastSyncAt: c.last_sync_at,
        listingCount: 0, // Would fetch from external_listings count
      }));

      setIntegrations(integrationsList);
      setSyncHistory(history);

      // Fetch lead metrics
      const leads = await leadAggregationService.getLeads(organizationId, undefined, 1000);
      const sourceAnalytics = await leadAggregationService.getLeadAnalyticsBySource(organizationId);
      
      if (sourceAnalytics.length > 0) {
        const topSource = sourceAnalytics.reduce((a, b) => 
          a.convertedLeads > b.convertedLeads ? a : b
        );
        
        setLeadMetrics({
          totalLeads: leads.length,
          newLeads: leads.filter(l => l.status === 'new').length,
          conversionRate: topSource.conversionRate * 100,
          topSource: topSource.source,
        });
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (provider: 'mls' | 'zillow' | 'realtor') => {
    try {
      setSyncing(provider);
      await mlsIntegrationService.syncListingsFromProvider(organizationId, provider);
      
      // Reload data
      await loadIntegrations();
      
      // Show success message (toast)
      console.log(`${provider} sync completed`);
    } catch (error) {
      console.error(`Sync failed for ${provider}:`, error);
    } finally {
      setSyncing(null);
    }
  };

  const handleAddIntegration = async (apiKey: string, apiSecret?: string) => {
    if (!selectedProvider) return;

    try {
      await mlsIntegrationService.saveMLSCredentials(
        organizationId,
        selectedProvider,
        {
          apiKey,
          apiSecret,
          syncFrequency: 'daily',
        }
      );

      setShowAddIntegration(false);
      setSelectedProvider(null);
      await loadIntegrations();
    } catch (error) {
      console.error('Failed to add integration:', error);
    }
  };

  const handleDeleteIntegration = async (id: string, provider: string) => {
    if (!confirm(`Remove ${provider} integration?`)) return;

    try {
      await mlsIntegrationService.deleteMLSCredentials(organizationId, provider);
      await loadIntegrations();
    } catch (error) {
      console.error('Failed to delete integration:', error);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integration Hub</h1>
          <p className="text-gray-600 mt-1">
            Connect to MLS, Zillow, and Realtor.com to sync listings and aggregate leads
          </p>
        </div>
        <Button
          onClick={() => setShowAddIntegration(true)}
          className="gap-2"
        >
          <Plus size={20} />
          Add Integration
        </Button>
      </div>

      {/* Metrics Cards */}
      {leadMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900">{leadMetrics.totalLeads}</p>
              </div>
              <TrendingUp className="text-blue-500" size={32} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">New Leads</p>
                <p className="text-3xl font-bold text-gray-900">{leadMetrics.newLeads}</p>
              </div>
              <Zap className="text-yellow-500" size={32} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900">{leadMetrics.conversionRate.toFixed(1)}%</p>
              </div>
              <CheckCircle2 className="text-green-500" size={32} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Top Source</p>
                <p className="text-xl font-bold text-gray-900 capitalize">{leadMetrics.topSource}</p>
              </div>
              <Lock className="text-purple-500" size={32} />
            </div>
          </Card>
        </div>
      )}

      {/* Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MLS */}
        <IntegrationCard
          provider="mls"
          name="MLS Network"
          description="Connect to your local MLS network to sync active listings"
          isActive={integrations.some(i => i.provider === 'mls' && i.isActive)}
          lastSync={integrations.find(i => i.provider === 'mls')?.lastSyncAt}
          onSync={() => handleSync('mls')}
          onRemove={() => {
            const mls = integrations.find(i => i.provider === 'mls');
            if (mls) handleDeleteIntegration(mls.id, 'mls');
          }}
          onAdd={() => {
            setSelectedProvider('mls');
            setShowAddIntegration(true);
          }}
          isSyncing={syncing === 'mls'}
          logo="🏠"
        />

        {/* Zillow */}
        <IntegrationCard
          provider="zillow"
          name="Zillow"
          description="Aggregate listings from Zillow database"
          isActive={integrations.some(i => i.provider === 'zillow' && i.isActive)}
          lastSync={integrations.find(i => i.provider === 'zillow')?.lastSyncAt}
          onSync={() => handleSync('zillow')}
          onRemove={() => {
            const zillow = integrations.find(i => i.provider === 'zillow');
            if (zillow) handleDeleteIntegration(zillow.id, 'zillow');
          }}
          onAdd={() => {
            setSelectedProvider('zillow');
            setShowAddIntegration(true);
          }}
          isSyncing={syncing === 'zillow'}
          logo="🔍"
        />

        {/* Realtor.com */}
        <IntegrationCard
          provider="realtor"
          name="Realtor.com"
          description="Sync listings from Realtor.com marketplace"
          isActive={integrations.some(i => i.provider === 'realtor' && i.isActive)}
          lastSync={integrations.find(i => i.provider === 'realtor')?.lastSyncAt}
          onSync={() => handleSync('realtor')}
          onRemove={() => {
            const realtor = integrations.find(i => i.provider === 'realtor');
            if (realtor) handleDeleteIntegration(realtor.id, 'realtor');
          }}
          onAdd={() => {
            setSelectedProvider('realtor');
            setShowAddIntegration(true);
          }}
          isSyncing={syncing === 'realtor'}
          logo="🌐"
        />
      </div>

      {/* Sync History */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Recent Sync History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Provider</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Synced</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Failed</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Completed</th>
              </tr>
            </thead>
            <tbody>
              {syncHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No sync history yet
                  </td>
                </tr>
              ) : (
                syncHistory.slice(0, 10).map(job => (
                  <tr key={job.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium capitalize">{job.provider}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-green-600 font-medium">{job.listingsSync}</td>
                    <td className="py-3 px-4 text-red-600 font-medium">{job.listingsFailed}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {job.completedAt ? new Date(job.completedAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Integration Modal */}
      {showAddIntegration && (
        <AddIntegrationModal
          provider={selectedProvider}
          onClose={() => {
            setShowAddIntegration(false);
            setSelectedProvider(null);
          }}
          onSubmit={handleAddIntegration}
        />
      )}
    </div>
  );
}

/**
 * Integration Card Component
 */
function IntegrationCard({
  provider,
  name,
  description,
  isActive,
  lastSync,
  onSync,
  onRemove,
  onAdd,
  isSyncing,
  logo,
}: {
  provider: 'mls' | 'zillow' | 'realtor';
  name: string;
  description: string;
  isActive: boolean;
  lastSync?: string;
  onSync: () => void;
  onRemove: () => void;
  onAdd: () => void;
  isSyncing: boolean;
  logo: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl">{logo}</div>
        {isActive && (
          <Badge className="bg-green-100 text-green-800">Connected</Badge>
        )}
      </div>

      <h3 className="text-lg font-bold mb-2">{name}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>

      {isActive && (
        <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
          <p className="text-gray-600">
            Last sync: <span className="font-medium">
              {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
            </span>
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {isActive ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              className="gap-2 flex-1"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="text-red-600 gap-2"
            >
              <Trash2 size={16} />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="gap-2 w-full"
          >
            <Plus size={16} />
            Connect
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * Add Integration Modal
 */
function AddIntegrationModal({
  provider,
  onClose,
  onSubmit,
}: {
  provider: 'mls' | 'zillow' | 'realtor' | null;
  onClose: () => void;
  onSubmit: (apiKey: string, apiSecret?: string) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(apiKey, apiSecret);
    } finally {
      setLoading(false);
    }
  };

  if (!provider) return null;

  const providerInfo: Record<string, { name: string; docs: string; requiresSecret: boolean }> = {
    mls: {
      name: 'MLS Network',
      docs: 'https://mlsglobal.com/docs',
      requiresSecret: true,
    },
    zillow: {
      name: 'Zillow API',
      docs: 'https://www.zillow.com/api/docs',
      requiresSecret: false,
    },
    realtor: {
      name: 'Realtor.com API',
      docs: 'https://api.realtor.com/docs',
      requiresSecret: false,
    },
  };

  const info = providerInfo[provider];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-4">Add {info.name} Integration</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your API key"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {info.requiresSecret && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Secret
              </label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Your API secret"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <p className="text-sm text-gray-600">
            Don't have an API key? <a href={info.docs} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Get it here
            </a>
          </p>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
