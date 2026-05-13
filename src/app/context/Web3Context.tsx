import React, { createContext, useContext, useEffect, useState } from 'react';
import { web3Service, WalletConnectionState } from '../../lib/web3.service';

interface Web3ContextType {
  wallet: WalletConnectionState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToAmoy: () => Promise<void>;
  switchToMainnet: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletConnectionState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: null,
    provider: null,
    signer: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize provider on mount
  useEffect(() => {
    const initProvider = async () => {
      try {
        await web3Service.initializeProvider();
      } catch (err) {
        console.error('Failed to initialize provider:', err);
      }
    };

    initProvider();
  }, []);

  // Subscribe to wallet state changes
  useEffect(() => {
    const unsubscribe = web3Service.subscribe((newState) => {
      setWallet(newState);
    });

    return unsubscribe;
  }, []);

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      await web3Service.connectMetaMask();
      const state = await web3Service.getState();
      setWallet(state);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    try {
      web3Service.disconnect();
      setWallet({
        isConnected: false,
        address: null,
        chainId: null,
        balance: null,
        provider: null,
        signer: null,
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  };

  const switchToAmoy = async () => {
    try {
      setLoading(true);
      setError(null);
      await web3Service.switchToPolygonAmoy();
      const state = await web3Service.getState();
      setWallet(state);
    } catch (err: any) {
      setError(err.message || 'Failed to switch network');
    } finally {
      setLoading(false);
    }
  };

  const switchToMainnet = async () => {
    try {
      setLoading(true);
      setError(null);
      await web3Service.switchToPolygonMainnet();
      const state = await web3Service.getState();
      setWallet(state);
    } catch (err: any) {
      setError(err.message || 'Failed to switch network');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Web3Context.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        switchToAmoy,
        switchToMainnet,
        loading,
        error,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
}
