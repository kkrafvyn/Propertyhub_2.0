import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Button } from './ui/Button';
import { Badge } from './ui/badge';
import {
  Wallet,
  Copy,
  LogOut,
  Network,
  AlertCircle,
  Loader,
  CheckCircle,
} from 'lucide-react';

export function Web3ConnectButton() {
  const { wallet, connectWallet, disconnectWallet, switchToAmoy, loading, error } = useWeb3();
  const [copiedAddress, setCopiedAddress] = useState(false);

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const shortenAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 137:
        return 'Polygon Mainnet';
      case 80002:
        return 'Polygon Amoy';
      default:
        return 'Unknown Network';
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          onClick={connectWallet}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </>
          )}
        </Button>
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-100 text-red-800 rounded text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <div className="flex-1">
          <p className="font-semibold text-green-900">Wallet Connected</p>
          <p className="text-sm text-green-700">{shortenAddress(wallet.address)}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyAddress}
          className="gap-1"
        >
          <Copy className="w-4 h-4" />
          {copiedAddress ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-100 rounded-lg">
        <Network className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm text-blue-900 font-semibold">
            {getNetworkName(wallet.chainId)}
          </p>
          <p className="text-xs text-blue-700">
            Balance: {wallet.balance ? parseFloat(wallet.balance).toFixed(4) : '0'} MATIC
          </p>
        </div>
      </div>

      {wallet.chainId && wallet.chainId !== 80002 && wallet.chainId !== 137 && (
        <div className="flex items-center gap-2 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Please switch to Polygon network</span>
        </div>
      )}

      <div className="flex gap-2">
        {wallet.chainId !== 80002 && (
          <Button
            variant="outline"
            size="sm"
            onClick={switchToAmoy}
            disabled={loading}
            className="flex-1 gap-1"
          >
            <Network className="w-4 h-4" />
            Amoy Testnet
          </Button>
        )}
        {wallet.chainId !== 137 && (
          <Button
            variant="outline"
            size="sm"
            onClick={switchToAmoy}
            disabled={loading}
            className="flex-1 gap-1"
          >
            <Network className="w-4 h-4" />
            Mainnet
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnectWallet}
          className="gap-1"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-100 text-red-800 rounded text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
