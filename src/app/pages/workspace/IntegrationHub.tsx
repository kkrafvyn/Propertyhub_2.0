import { useEffect, useState, type ReactNode } from 'react';
import { RefreshCw, CheckCircle2, TrendingUp, Zap, Lock, Building2, Search, Globe } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { mlsIntegrationService } from '../../../lib/mls-integration.service';
import { leadAggregationService } from '../../../lib/lead-aggregation.service';
import { PlatformIntegrationsPanel } from '../../components/workspace/PlatformIntegrationsPanel';
import { DeveloperApiStudio } from '../../components/workspace/DeveloperApiStudio';
import { LeadManagement } from './LeadManagement';
import { toast } from 'sonner';

interface MLSIntegration {
  provider: 'mls' | 'zillow' | 'realtor';
  configured: boolean;
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

  useEffect(() => {
    loadIntegrations();
  }, [organizationId]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      
      // Fetch integrations and sync history
      const statuses = await mlsIntegrationService.getProviderStatuses(organizationId);
      const history = await mlsIntegrationService.getSyncHistory(organizationId);
      const listingCounts = await mlsIntegrationService.getExternalListingCounts(organizationId);
      
      const integrationsList: MLSIntegration[] = statuses.map((status) => ({
        provider: status.provider,
        configured: status.configured,
        listingCount: listingCounts[status.provider] || 0,
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
      await loadIntegrations();
      toast.success("Listing sync completed.");
    } catch (error) {
      console.error(`Sync failed for ${provider}:`, error);
      toast.error(error instanceof Error ? error.message : "Listing sync failed.");
    } finally {
      setSyncing(null);
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
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Integration Hub</h1>
          <p className="text-ink-secondary mt-1">
            Connect to MLS, Zillow, and Realtor.com to sync listings and aggregate leads
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Provider keys are managed securely on the server and are never entered or returned in the browser.
          </p>
        </div>
      </div>

      <PlatformIntegrationsPanel />

      <DeveloperApiStudio organizationId={organizationId} />

      {/* Metrics Cards */}
      {leadMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 border-surface-border bg-surface">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink-secondary text-sm font-medium">Total Leads</p>
                <p className="text-3xl font-bold text-ink">{leadMetrics.totalLeads}</p>
              </div>
              <TrendingUp className="text-blue-500" size={32} />
            </div>
          </Card>

          <Card className="p-6 border-surface-border bg-surface">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink-secondary text-sm font-medium">New Leads</p>
                <p className="text-3xl font-bold text-ink">{leadMetrics.newLeads}</p>
              </div>
              <Zap className="text-yellow-500" size={32} />
            </div>
          </Card>

          <Card className="p-6 border-surface-border bg-surface">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink-secondary text-sm font-medium">Conversion Rate</p>
                <p className="text-3xl font-bold text-ink">{leadMetrics.conversionRate.toFixed(1)}%</p>
              </div>
              <CheckCircle2 className="text-green-500" size={32} />
            </div>
          </Card>

          <Card className="p-6 border-surface-border bg-surface">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink-secondary text-sm font-medium">Top Source</p>
                <p className="text-xl font-bold text-ink capitalize">{leadMetrics.topSource}</p>
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
          isActive={integrations.some(i => i.provider === 'mls' && i.configured)}
          listingCount={integrations.find(i => i.provider === 'mls')?.listingCount || 0}
          onSync={() => handleSync('mls')}
          isSyncing={syncing === 'mls'}
          logo={
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="h-6 w-6" />
            </div>
          }
        />

        {/* Zillow */}
        <IntegrationCard
          provider="zillow"
          name="Zillow"
          description="Aggregate listings from Zillow database"
          isActive={integrations.some(i => i.provider === 'zillow' && i.configured)}
          listingCount={integrations.find(i => i.provider === 'zillow')?.listingCount || 0}
          onSync={() => handleSync('zillow')}
          isSyncing={syncing === 'zillow'}
          logo={
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Search className="h-6 w-6" />
            </div>
          }
        />

        {/* Realtor.com */}
        <IntegrationCard
          provider="realtor"
          name="Realtor.com"
          description="Sync listings from Realtor.com marketplace"
          isActive={integrations.some(i => i.provider === 'realtor' && i.configured)}
          listingCount={integrations.find(i => i.provider === 'realtor')?.listingCount || 0}
          onSync={() => handleSync('realtor')}
          isSyncing={syncing === 'realtor'}
          logo={
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Globe className="h-6 w-6" />
            </div>
          }
        />
      </div>

      {/* Sync History */}
      <Card className="p-6 border-surface-border bg-surface">
        <h2 className="text-xl font-bold mb-4 text-ink">Recent Sync History</h2>
        <div className="overflow-x-auto" role="region" aria-label="Recent integration sync history" tabIndex={0}>
          <table className="w-full">
            <thead className="border-b border-surface-border">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-ink-secondary">Provider</th>
                <th className="text-left py-3 px-4 font-semibold text-ink-secondary">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-ink-secondary">Synced</th>
                <th className="text-left py-3 px-4 font-semibold text-ink-secondary">Failed</th>
                <th className="text-left py-3 px-4 font-semibold text-ink-secondary">Completed</th>
              </tr>
            </thead>
            <tbody>
              {syncHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-muted">
                    No sync history yet
                  </td>
                </tr>
              ) : (
                syncHistory.slice(0, 10).map(job => (
                  <tr key={job.id} className="border-b border-surface-border hover:bg-surface-hover">
                    <td className="py-3 px-4">
                      <span className="font-medium text-ink capitalize">{job.provider}</span>
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

      <LeadManagement organizationId={organizationId} />

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
  listingCount,
  onSync,
  isSyncing,
  logo,
}: {
  provider: 'mls' | 'zillow' | 'realtor';
  name: string;
  description: string;
  isActive: boolean;
  listingCount: number;
  onSync: () => void;
  isSyncing: boolean;
  logo: ReactNode;
}) {
  return (
    <Card className="p-6 border-surface-border bg-surface flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>{logo}</div>
          {isActive && (
            <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">Connected</Badge>
          )}
        </div>

      <h3 className="text-lg font-bold text-ink mb-2">{name}</h3>
      <p className="text-ink-secondary text-sm mb-4">{description}</p>

        {isActive && (
          <div className="mb-4 p-3 bg-surface-subtle border border-surface-border rounded text-sm">
            <p className="text-ink-secondary">
              Synced listings: <span className="font-medium text-ink">{listingCount}</span>
            </p>
          </div>
        )}
      </div>

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
          </>
        ) : (
          <div className="w-full rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
            Configure the provider API key and feed URL in the server environment.
          </div>
        )}
      </div>
    </Card>
  );
}
