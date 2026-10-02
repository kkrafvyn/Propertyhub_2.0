import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { Tabs } from '../../components/ui/tabs';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Copy,
  ExternalLink,
  Shield,
  Lock,
  Coins,
  FileText,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { blockchainService, type LivePolygonTransaction } from '../../../lib/blockchain.service';
import { smartContractService } from '../../../lib/smart-contract.service';

interface VerificationRecord {
  id: string;
  transaction_hash: string;
  chain_id: number;
  block_number: number | null;
  confirmation_count: number | null;
  contract_address: string | null;
  property_id: string;
  record_type: string;
  status: string;
  verified_at: string | null;
  created_at: string | null;
}

function getExplorerUrl(chainId: number, transactionHash: string) {
  if (chainId === 80002) return `https://amoy.polygonscan.com/tx/${transactionHash}`;
  if (chainId === 137) return `https://polygonscan.com/tx/${transactionHash}`;
  return null;
}

function getNetworkName(chainId: number) {
  if (chainId === 80002) return 'Polygon Amoy';
  if (chainId === 137) return 'Polygon Mainnet';
  return `Chain ${chainId}`;
}

interface BlockchainVerificationProps {
  organizationId: string;
}

const configuredContractAddresses = [
  import.meta.env.VITE_PROPERTY_TOKEN_ADDRESS,
  import.meta.env.VITE_PROPERTY_ESCROW_ADDRESS,
  import.meta.env.VITE_PROPERTY_OWNERSHIP_ADDRESS,
  import.meta.env.VITE_PROPERTY_LEASE_ADDRESS,
  import.meta.env.VITE_VERIFICATION_REGISTRY_ADDRESS,
].filter((value): value is string => typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value));

const configuredNetwork: 'amoy' | 'mainnet' =
  import.meta.env.VITE_BLOCKCHAIN_NETWORK === 'mainnet' ? 'mainnet' : 'amoy';

export default function BlockchainVerification({ organizationId }: BlockchainVerificationProps) {
  const [verificationRecords, setVerificationRecords] = useState<VerificationRecord[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [liveTransactions, setLiveTransactions] = useState<LivePolygonTransaction[]>([]);
  const [contracts, setContracts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const contractCount = (contracts?.escrow?.length || 0) + (contracts?.ownership?.length || 0) + (contracts?.lease?.length || 0);
  const documentRecordCount = verificationRecords.filter((record) =>
    ['document', 'title_deed', 'lease_agreement', 'payment_receipt'].includes(record.record_type),
  ).length;

  useEffect(() => {
    loadBlockchainData();
  }, [organizationId]);

  const loadBlockchainData = async () => {
    setLoading(true);
    setLoadError(null);
    const [recordsResult, walletsResult, contractsResult, liveResult] = await Promise.allSettled([
      blockchainService.getOrganizationBlockchainRecords(organizationId),
      blockchainService.getOrganizationWallets(organizationId),
      smartContractService.getOrganizationContracts(organizationId),
      blockchainService.getLivePolygonTransactions(organizationId, configuredContractAddresses, configuredNetwork),
    ]);

    if (recordsResult.status === 'fulfilled') setVerificationRecords(recordsResult.value);
    if (walletsResult.status === 'fulfilled') setWallets(walletsResult.value);
    if (contractsResult.status === 'fulfilled') setContracts(contractsResult.value);
    if (liveResult.status === 'fulfilled') setLiveTransactions(liveResult.value);

    const failures = [recordsResult, walletsResult, contractsResult, liveResult].filter((result) => result.status === 'rejected');
    if (failures.length) {
      setLoadError(`${failures.length} blockchain data source${failures.length === 1 ? '' : 's'} could not be loaded.`);
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string, hash: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      finalized: { color: 'bg-blue-100 text-blue-800', icon: Shield },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 ${config.color} px-3 py-1 rounded-full text-sm font-semibold`}>
        <Icon className="w-4 h-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Live Blockchain Transactions
        </h1>
        <p className="text-muted-foreground">
          View recorded Polygon transactions, confirmations, contracts, and authorized wallets.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => void loadBlockchainData()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {loadError ? <span className="text-sm text-red-600">{loadError}</span> : null}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Verified Records</p>
              <p className="text-3xl font-semibold">{liveTransactions.length}</p>
              <p className="text-xs text-accent mt-1">Live explorer transactions</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Wallets</p>
              <p className="text-3xl font-semibold">{wallets.length}</p>
              <p className="text-xs text-accent mt-1">Connected addresses</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Coins className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Smart Contracts</p>
              <p className="text-3xl font-semibold">
                {contractCount}
              </p>
              <p className="text-xs text-accent mt-1">Deployed contracts</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Network Status</p>
              <p className="text-xl font-semibold">{verificationRecords.length ? getNetworkName(verificationRecords[0].chain_id) : 'Not connected'}</p>
              <p className="text-xs text-accent mt-1">Derived from recorded transactions</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-1 font-semibold border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`pb-4 px-1 font-semibold border-b-2 transition-colors ${
                activeTab === 'records'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Live Transactions
            </button>
            <button
              onClick={() => setActiveTab('wallets')}
              className={`pb-4 px-1 font-semibold border-b-2 transition-colors ${
                activeTab === 'wallets'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Wallets
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`pb-4 px-1 font-semibold border-b-2 transition-colors ${
                activeTab === 'contracts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Contracts
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Blockchain Integration Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {documentRecordCount ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-yellow-600" />}
                    <div>
                      <p className="font-medium">Polygon Network</p>
                      <p className="text-sm text-muted-foreground">{verificationRecords.length ? getNetworkName(verificationRecords[0].chain_id) : 'No on-chain records have been recorded yet'}</p>
                    </div>
                  </div>
                  <Badge className={verificationRecords.length ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{verificationRecords.length ? 'Recorded' : 'Awaiting deployment'}</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {wallets.length > 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium">Authorised Keys</p>
                      <p className="text-sm text-muted-foreground">{wallets.length} key(s) registered</p>
                    </div>
                  </div>
                  <Badge className={wallets.length > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {wallets.length > 0 ? 'Connected' : 'Pending'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Document Authenticity</p>
                      <p className="text-sm text-muted-foreground">{documentRecordCount ? `${documentRecordCount} document record(s) anchored` : 'No document hashes anchored on-chain yet'}</p>
                    </div>
                  </div>
                  <Badge className={documentRecordCount ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{documentRecordCount ? 'Recorded' : 'Pending'}</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {contractCount ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-yellow-600" />}
                    <div>
                      <p className="font-medium">Automated Agreements</p>
                      <p className="text-sm text-muted-foreground">{contractCount ? `${contractCount} deployed contract record(s)` : 'No deployed contracts recorded for this organization'}</p>
                    </div>
                  </div>
                  <Badge className={contractCount ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{contractCount ? 'Deployed' : 'Not deployed'}</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Blockchain Activity</h2>
              {verificationRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No blockchain activity yet</p>
              ) : (
                <div className="space-y-3">
                  {verificationRecords.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{record.record_type.replaceAll('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.created_at ? new Date(record.created_at).toLocaleString() : 'Date unavailable'}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Records Tab */}
        {activeTab === 'records' && (
          <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">PolygonScan Network Activity</h2>
            {!configuredContractAddresses.length ? (
              <p className="text-muted-foreground text-center py-8">Deploy contracts and set the VITE_PROPERTY_* contract addresses to begin monitoring live activity.</p>
            ) : liveTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions were returned for the configured {configuredNetwork === 'amoy' ? 'Polygon Amoy' : 'Polygon Mainnet'} contracts.</p>
            ) : (
              <div className="overflow-x-auto" role="region" aria-label="Blockchain transactions" tabIndex={0}>
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Transaction</th>
                    <th className="text-left py-3 px-4 font-semibold">Block</th>
                    <th className="text-left py-3 px-4 font-semibold">From / To</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Time</th>
                  </tr></thead>
                  <tbody>{liveTransactions.map((transaction) => (
                    <tr key={transaction.hash} className="border-b border-border hover:bg-secondary/30">
                      <td className="py-3 px-4"><a href={getExplorerUrl(configuredNetwork === 'amoy' ? 80002 : 137, transaction.hash)!} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline">{`${transaction.hash.slice(0, 10)}…${transaction.hash.slice(-8)}`} <ExternalLink className="inline h-3.5 w-3.5" /></a></td>
                      <td className="py-3 px-4 text-sm">{transaction.blockNumber.toLocaleString()}<div className="text-xs text-muted-foreground">{transaction.confirmations.toLocaleString()} confirmations</div></td>
                      <td className="py-3 px-4 font-mono text-xs"><div>{transaction.from ? `${transaction.from.slice(0, 8)}…${transaction.from.slice(-6)}` : 'Contract creation'}</div><div className="text-muted-foreground">→ {transaction.to ? `${transaction.to.slice(0, 8)}…${transaction.to.slice(-6)}` : 'Contract creation'}</div></td>
                      <td className="py-3 px-4">{getStatusBadge(transaction.status)}</td>
                      <td className="py-3 px-4 text-sm">{transaction.timestamp ? new Date(transaction.timestamp).toLocaleString() : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Live Transaction Ledger</h2>
            {verificationRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No Polygon transactions recorded yet. Deploy a contract on Amoy and refresh this page.</p>
            ) : (
              <div className="overflow-x-auto" role="region" aria-label="Recorded Polygon transactions" tabIndex={0}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Record Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Network / Block</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationRecords.map((record) => (
                      <tr key={record.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4">
                          <Badge className="bg-primary/10 text-primary">{record.record_type.replaceAll('_', ' ')}</Badge>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                        <td className="py-3 px-4 text-sm">
                          <div>{getNetworkName(record.chain_id)}</div>
                          <div className="text-xs text-muted-foreground">{record.block_number ? `Block ${record.block_number.toLocaleString()}` : 'Awaiting block'}</div>
                        </td>
                        <td className="py-3 px-4 text-sm">{record.created_at ? new Date(record.created_at).toLocaleString() : '—'}</td>
                        <td className="py-3 px-4">
                          {getExplorerUrl(record.chain_id, record.transaction_hash) ? <a
                            href={getExplorerUrl(record.chain_id, record.transaction_hash)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {`${record.transaction_hash.slice(0, 8)}…${record.transaction_hash.slice(-6)}`} <ExternalLink className="w-4 h-4" />
                          </a> : <span className="font-mono text-xs">{record.transaction_hash}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          </div>
        )}

        {/* Wallets Tab */}
        {activeTab === 'wallets' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Connected Wallets</h2>
              {wallets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No wallets connected yet</p>
              ) : (
                <div className="space-y-3">
                  {wallets.map((wallet: any) => (
                    <div key={wallet.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Coins className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{wallet.wallet_type}</p>
                          <p className="text-sm text-muted-foreground font-mono">{wallet.wallet_address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(wallet.wallet_address, wallet.id)}
                        >
                          <Copy className="w-4 h-4" />
                          {copiedHash === wallet.id ? 'Copied!' : 'Copy'}
                        </Button>
                        {wallet.verified ? (
                          <Badge className="bg-green-100 text-green-800">Verified</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Unverified</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Contracts Tab */}
        {activeTab === 'contracts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Escrow Contracts</p>
                    <p className="text-2xl font-semibold">{contracts?.escrow?.length || 0}</p>
                  </div>
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ownership Contracts</p>
                    <p className="text-2xl font-semibold">{contracts?.ownership?.length || 0}</p>
                  </div>
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Contracts</p>
                    <p className="text-2xl font-semibold">{contracts?.lease?.length || 0}</p>
                  </div>
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </Card>
            </div>

            {contracts && (contracts.escrow.length > 0 || contracts.ownership.length > 0 || contracts.lease.length > 0) ? (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Deployed Contracts</h2>
                <div className="space-y-4">
                  {contracts.escrow.map((contract: any) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Escrow Contract</p>
                          <p className="text-sm text-muted-foreground font-mono">{contract.contract_address}</p>
                        </div>
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>
                  ))}
                  {contracts.ownership.map((contract: any) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">Ownership Contract</p>
                          <p className="text-sm text-muted-foreground font-mono">{contract.contract_address}</p>
                        </div>
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>
                  ))}
                  {contracts.lease.map((contract: any) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Lease Agreement</p>
                          <p className="text-sm text-muted-foreground font-mono">{contract.contract_address}</p>
                        </div>
                      </div>
                      {getStatusBadge(contract.status)}
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <p className="text-muted-foreground text-center py-8">No smart contracts deployed yet</p>
              </Card>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
