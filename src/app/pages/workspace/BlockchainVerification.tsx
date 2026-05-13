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
  Zap,
  Coins,
  Key,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { blockchainService } from '../../../lib/blockchain.service';
import { smartContractService } from '../../../lib/smart-contract.service';

interface VerificationRecord {
  id: string;
  transaction_hash: string;
  chain_id: number;
  record_type: string;
  status: string;
  confirmed_at?: string;
  created_at: string;
}

interface BlockchainVerificationProps {
  organizationId: string;
}

export default function BlockchainVerification({ organizationId }: BlockchainVerificationProps) {
  const [verificationRecords, setVerificationRecords] = useState<VerificationRecord[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    loadBlockchainData();
  }, [organizationId]);

  const loadBlockchainData = async () => {
    try {
      setLoading(true);
      // Load verification logs
      const logs = await blockchainService.getVerificationLogs(organizationId);
      setVerificationRecords(logs);

      // Load wallets
      const orgWallets = await blockchainService.getOrganizationWallets(organizationId);
      setWallets(orgWallets);

      // Load contracts
      const orgContracts = await smartContractService.getOrganizationContracts(organizationId);
      setContracts(orgContracts);
    } catch (error) {
      console.error('Error loading blockchain data:', error);
    } finally {
      setLoading(false);
    }
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
          Blockchain Verification
        </h1>
        <p className="text-muted-foreground">
          Manage property verification on Polygon blockchain, track ownership, and verify documents
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Verified Records</p>
              <p className="text-3xl font-semibold">{verificationRecords.length}</p>
              <p className="text-xs text-accent mt-1">Blockchain records</p>
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
                {(contracts?.escrow?.length || 0) + (contracts?.ownership?.length || 0) + (contracts?.lease?.length || 0)}
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
              <p className="text-sm text-muted-foreground mb-1">Chain ID</p>
              <p className="text-3xl font-semibold">137</p>
              <p className="text-xs text-accent mt-1">Polygon mainnet</p>
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
              Verification Records
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
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Polygon Connected</p>
                      <p className="text-sm text-muted-foreground">Chain ID 137 - Mainnet</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {wallets.length > 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium">Wallets Connected</p>
                      <p className="text-sm text-muted-foreground">{wallets.length} wallet(s) registered</p>
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
                      <p className="font-medium">Document Verification</p>
                      <p className="text-sm text-muted-foreground">SHA-256 hashing enabled</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Smart Contracts</p>
                      <p className="text-sm text-muted-foreground">Escrow, Ownership, Lease contracts available</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Ready</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Blockchain Activity</h2>
              {verificationRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No blockchain activity yet</p>
              ) : (
                <div className="space-y-3">
                  {verificationRecords.slice(0, 5).map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{record.verification_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(record.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {record.status === 'verified' ? (
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Records Tab */}
        {activeTab === 'records' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Verification Records</h2>
            {verificationRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No verification records yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Record Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationRecords.map((record: any) => (
                      <tr key={record.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4">
                          <Badge className="bg-primary/10 text-primary">{record.verification_type}</Badge>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                        <td className="py-3 px-4 text-sm">{new Date(record.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <a
                            href={`https://polygonscan.com/tx/${record.blockchain_record_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            View <ExternalLink className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Wallets Tab */}
        {activeTab === 'wallets' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <Button className="bg-primary text-white">
                <Key className="w-4 h-4 mr-2" />
                Add Wallet
              </Button>
            </div>

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
